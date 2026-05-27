import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { generateImage } from '../images';
import { getModelDef } from '../models';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BASE = 'https://api.example.com';

describe('generateImage (msw)', () => {
  it('文生图 → POST /v1/images/generations，JSON 体含 model/prompt', async () => {
    server.use(
      http.post(`${BASE}/v1/images/generations`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.model).toBe('flux-pro');
        expect(body.prompt).toBe('a cat');
        expect(request.headers.get('authorization')).toBe('Bearer sk-test');
        return HttpResponse.json({ created: 1, data: [{ url: 'https://x/y.png' }] });
      }),
    );

    const flux = getModelDef('flux-pro')!;
    const result = await generateImage({
      model: flux,
      baseUrl: BASE,
      apiKey: 'sk-test',
      vars: {
        modelName: flux.name,
        prompt: 'a cat',
        n: 1,
        size: '1024x1024',
        enableSequential: false,
      },
      ctx: { hasReferenceImages: false, hasMask: false, useJimengLocalFile: false },
    });
    expect(result.data[0].url).toBe('https://x/y.png');
  });

  it('图生图 → POST /v1/images/edits 走 multipart，image 字段是 Blob', async () => {
    server.use(
      http.post(`${BASE}/v1/images/edits`, async ({ request }) => {
        const ct = request.headers.get('content-type') ?? '';
        expect(ct).toMatch(/multipart\/form-data/);
        const form = await request.formData();
        expect(form.get('model')).toBe('nano-banana');
        expect(form.get('prompt')).toBe('redraw it');
        const img = form.get('image');
        expect(img).toBeInstanceOf(Blob);
        return HttpResponse.json({ created: 2, data: [{ url: 'https://x/z.png' }] });
      }),
    );

    const nb = getModelDef('nano-banana')!;
    const blob = new Blob(['fake-png'], { type: 'image/png' });
    const result = await generateImage({
      model: nb,
      baseUrl: BASE,
      apiKey: 'sk-test',
      vars: {
        modelName: nb.name,
        prompt: 'redraw it',
        image: blob,
        n: 1,
        size: '1024x1024',
        ratio: '1:1',
        enableSequential: false,
      },
      ctx: { hasReferenceImages: true, hasMask: false, useJimengLocalFile: false },
    });
    expect(result.data[0].url).toBe('https://x/z.png');
  });

  it('wan2.7-image 参考图 → POST /v1/images/generations，image 字段直接传 URL 数组', async () => {
    server.use(
      http.post(`${BASE}/v1/images/generations`, async ({ request }) => {
        const ct = request.headers.get('content-type') ?? '';
        expect(ct).toMatch(/application\/json/);
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.model).toBe('wan2.7-image');
        expect(body.prompt).toBe('use refs');
        expect(body.image).toEqual(['https://tos.example.com/a.png', 'https://tos.example.com/b.png']);
        return HttpResponse.json({ created: 3, data: [{ url: 'https://x/wan.png' }] });
      }),
    );

    const wan = getModelDef('wan2.7-image')!;
    const result = await generateImage({
      model: wan,
      baseUrl: BASE,
      apiKey: 'sk-test',
      vars: {
        modelName: wan.name,
        prompt: 'use refs',
        imageUrls: ['https://tos.example.com/a.png', 'https://tos.example.com/b.png'],
        n: 1,
        size: '1024x1024',
        ratio: '1:1',
        enableSequential: false,
      },
      ctx: { hasReferenceImages: true, hasMask: false, useJimengLocalFile: false },
    });
    expect(result.data[0].url).toBe('https://x/wan.png');
  });

  it('4xx 错误归一为 ApiError，不重试', async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/v1/images/generations`, () => {
        calls += 1;
        return HttpResponse.json(
          { error: { message: 'bad prompt', type: 'invalid_request', code: 'E1' } },
          { status: 400 },
        );
      }),
    );

    const flux = getModelDef('flux-pro')!;
    await expect(
      generateImage({
        model: flux,
        baseUrl: BASE,
        apiKey: 'sk-test',
        vars: {
          modelName: flux.name,
          prompt: 'x',
          n: 1,
          size: '1024x1024',
          enableSequential: false,
        },
        ctx: { hasReferenceImages: false, hasMask: false, useJimengLocalFile: false },
      }),
    ).rejects.toMatchObject({ name: 'ApiError', httpStatus: 400, code: 'E1' });
    expect(calls).toBe(1);
  });
});
