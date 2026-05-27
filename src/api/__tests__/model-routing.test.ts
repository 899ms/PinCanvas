import { describe, expect, it } from 'vitest';
import { splitImageBatch } from '../../utils/batch';
import { getModelDef } from '../models';
import { rewriteSoraPrompt, routeRequest } from '../model-routing';
import { buildVideoRequest } from '../videos';
import type { RouteCtx, TaskInput } from '../model-routing';

const ctxNoRef: RouteCtx = {
  hasReferenceImages: false,
  hasMask: false,
  useJimengLocalFile: false,
};
const ctxWithRef: RouteCtx = { ...ctxNoRef, hasReferenceImages: true };
const ctxWithRefJimengLocal: RouteCtx = { ...ctxWithRef, useJimengLocalFile: true };

const image: TaskInput = { type: 'image' };
const video: TaskInput = { type: 'video' };
const chat: TaskInput = { type: 'chat' };

function mustGet(id: string) {
  const m = getModelDef(id);
  if (!m) throw new Error(`unknown model ${id}`);
  return m;
}

describe('routeRequest', () => {
  it('1. image + no ref + flux-pro → generations json', () => {
    const r = routeRequest(image, mustGet('flux-pro'), ctxNoRef);
    expect(r.endpoint).toBe('/v1/images/generations');
    expect(r.bodyKind).toBe('json');
    expect(r.async).toBe(false);
  });

  it('1b. image n > 4 → 前端拆成每批最多 4 张', () => {
    expect(splitImageBatch(1)).toEqual([1]);
    expect(splitImageBatch(4)).toEqual([4]);
    expect(splitImageBatch(9)).toEqual([4, 4, 1]);
  });

  it('2. image + 1 ref + nano-banana → edits form (sync)', () => {
    const r = routeRequest(image, mustGet('nano-banana'), ctxWithRef);
    expect(r.endpoint).toBe('/v1/images/edits');
    expect(r.bodyKind).toBe('form');
    expect(r.async).toBe(false);
  });

  it('2b. image + 1 ref + wan2.7-image → generations json URL', () => {
    const r = routeRequest(image, mustGet('wan2.7-image'), ctxWithRef);
    expect(r.endpoint).toBe('/v1/images/generations');
    expect(r.bodyKind).toBe('json');
    expect(r.bodyTemplate).toHaveProperty('image', '{{imageUrls}}');
  });

  it('3. image + 1 ref + nano-banana-2 → edits?async=true form (async)', () => {
    const r = routeRequest(image, mustGet('nano-banana-2'), ctxWithRef);
    expect(r.endpoint).toBe('/v1/images/edits?async=true');
    expect(r.bodyKind).toBe('form');
    expect(r.async).toBe(true);
  });

  it('4. image + 2 ref + qwen-image → edits form', () => {
    const r = routeRequest(image, mustGet('qwen-image'), ctxWithRef);
    expect(r.endpoint).toBe('/v1/images/edits');
    expect(r.bodyKind).toBe('form');
  });

  it('5. image + 1 ref + gpt-4o-image → generations json (image as field)', () => {
    const r = routeRequest(image, mustGet('gpt-4o-image'), ctxWithRef);
    expect(r.endpoint).toBe('/v1/images/generations');
    expect(r.bodyKind).toBe('json');
    expect(r.bodyTemplate).toHaveProperty('image');
  });

  it('6. image + 1 ref + mj-v6 → midjourney provider', () => {
    const r = routeRequest(image, mustGet('mj-v6'), ctxWithRef);
    expect(r.provider).toBe('midjourney');
    expect(r.endpoint).toMatch(/^\/mj\//);
  });

  it('7. image + 1 ref + jimeng-xl + useJimengLocalFile=true → edits form blob', () => {
    const r = routeRequest(image, mustGet('jimeng-xl'), ctxWithRefJimengLocal);
    expect(r.endpoint).toBe('/v1/images/edits');
    expect(r.bodyKind).toBe('form');
    expect(r.bodyTemplate).toHaveProperty('image', '{{image:blob}}');
  });

  it('7b. image + 1 ref + jimeng-xl + useJimengLocalFile=false → generations json (1 fallback)', () => {
    // jimeng-xl 名字不含 banana/edit/qwen，且未开本地文件，落到默认文生图
    const r = routeRequest(image, mustGet('jimeng-xl'), ctxWithRef);
    expect(r.endpoint).toBe('/v1/images/generations');
    expect(r.bodyKind).toBe('json');
  });

  it('8. video + wan2.6-r2v-flash → video/generations json', () => {
    const r = routeRequest(video, mustGet('wan2.6-r2v-flash'), ctxNoRef);
    expect(r.endpoint).toBe('/v1/video/generations');
    expect(r.bodyKind).toBe('json');
    expect(r.bodyTemplate).toHaveProperty('size', '{{size:optional}}');
  });

  it('8e. video + doubao-seedance-2-0-260128 uses async video generations', () => {
    const r = routeRequest(video, mustGet('doubao-seedance-2-0-260128'), ctxNoRef);
    expect(r.endpoint).toBe('/v1/video/generations');
    expect(r.bodyKind).toBe('json');
    expect(r.async).toBe(true);
  });

  it('8f. happyhorse video omits size and keeps resolution', () => {
    const r = buildVideoRequest({
      model: mustGet('happyhorse-1.0-i2v'),
      baseUrl: 'https://example.com',
      vars: {
        modelName: 'happyhorse-1.0-i2v',
        prompt: 'animate this',
        duration: '5s',
        ratio: '16:9',
        resolution: '720P',
      },
      ctx: ctxWithRef,
    });
    expect(r.body).not.toHaveProperty('size');
    expect(r.body).toMatchObject({
      model: 'happyhorse-1.0-i2v',
      resolution: '720P',
      ratio: '16:9',
    });
  });

  it('8b. rewriteSoraPrompt 把 @hero 改成 @{hero}，不重复包裹 @{hero}', () => {
    expect(rewriteSoraPrompt('a @hero walking with @her-mom')).toBe(
      'a @{hero} walking with @{her-mom}',
    );
    expect(rewriteSoraPrompt('a @{hero} walking')).toBe('a @{hero} walking');
  });

  it('9. chat → chat/completions', () => {
    const r = routeRequest(chat, mustGet('gpt-4o'), ctxNoRef);
    expect(r.endpoint).toBe('/v1/chat/completions');
    expect(r.bodyKind).toBe('json');
  });
});
