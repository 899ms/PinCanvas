import { describe, expect, it } from 'vitest';
import { TemplateMissingError } from '../errors';
import { resolveTemplate } from '../template';

describe('resolveTemplate', () => {
  it('字符串简单替换 → JSON', () => {
    const r = resolveTemplate(
      { model: '{{model}}', prompt: '{{prompt}}' },
      { model: 'flux-pro', prompt: 'a cat' },
    );
    expect(r.kind).toBe('json');
    expect(r.body).toEqual({ model: 'flux-pro', prompt: 'a cat' });
  });

  it('缺变量抛 TemplateMissingError', () => {
    expect(() => resolveTemplate({ model: '{{model}}' }, {})).toThrow(TemplateMissingError);
  });

  it(':number 把字符串转 number', () => {
    const r = resolveTemplate({ n: '{{n:number}}' }, { n: '3' });
    expect(r.kind).toBe('json');
    expect(r.body).toEqual({ n: 3 });
  });

  it(':number 非数字值抛 TemplateMissingError', () => {
    expect(() => resolveTemplate({ n: '{{n:number}}' }, { n: 'abc' })).toThrow(
      TemplateMissingError,
    );
  });

  it(':blob 触发 FormData 模式', () => {
    const blob = new Blob(['hello'], { type: 'image/png' });
    const r = resolveTemplate(
      { model: '{{model}}', image: '{{image:blob}}' },
      { model: 'nano-banana', image: blob },
    );
    expect(r.kind).toBe('form');
    const form = r.body as FormData;
    expect(form.get('model')).toBe('nano-banana');
    const img = form.get('image');
    expect(img).toBeInstanceOf(Blob);
    expect((img as Blob).size).toBe(blob.size);
    expect((img as Blob).type).toBe(blob.type);
  });

  it('嵌套对象内的占位符递归替换', () => {
    const r = resolveTemplate(
      { messages: [{ role: 'user', content: '{{prompt}}' }] },
      { prompt: 'hi' },
    );
    expect(r.kind).toBe('json');
    expect(r.body).toEqual({ messages: [{ role: 'user', content: 'hi' }] });
  });

  it('完整占位变量缺失时省略字段', () => {
    const r = resolveTemplate(
      { model: '{{model}}', image: '{{imageUrls:optional}}', prompt: '{{prompt}}' },
      { model: 'wan2.6-r2v-flash', prompt: 'a cat' },
    );
    expect(r.kind).toBe('json');
    expect(r.body).toEqual({ model: 'wan2.6-r2v-flash', prompt: 'a cat' });
  });

  it('JSON 模式支持多参考图数组', () => {
    const r = resolveTemplate(
      { model: '{{model}}', image: '{{imageUrls}}' },
      { model: 'qwen-image-2.0', imageUrls: ['https://x/a.png', 'https://x/b.png'] },
    );
    expect(r.kind).toBe('json');
    expect(r.body).toEqual({
      model: 'qwen-image-2.0',
      image: ['https://x/a.png', 'https://x/b.png'],
    });
  });

  it('嵌套变量路径 provider.key', () => {
    const r = resolveTemplate(
      { auth: 'Bearer {{provider.key}}' },
      { provider: { key: 'sk-xxx' } },
    );
    expect(r.kind).toBe('json');
    expect(r.body).toEqual({ auth: 'Bearer sk-xxx' });
  });

  it('数组里多个 blob 占位符按同 key 多次 append', () => {
    const b1 = new Blob(['a']);
    const b2 = new Blob(['b']);
    const r = resolveTemplate(
      { model: '{{model}}', image: ['{{ref0:blob}}', '{{ref1:blob}}'] },
      { model: 'nano-banana', ref0: b1, ref1: b2 },
    );
    expect(r.kind).toBe('form');
    const form = r.body as FormData;
    const images = form.getAll('image');
    expect(images).toHaveLength(2);
    expect(images[0]).toBeInstanceOf(Blob);
    expect(images[1]).toBeInstanceOf(Blob);
    expect((images[0] as Blob).size).toBe(b1.size);
    expect((images[1] as Blob).size).toBe(b2.size);
  });

  it('单 blob 占位 + Blob[] vars → form 下每张按同 key 多次 append', () => {
    const b1 = new Blob(['a']);
    const b2 = new Blob(['b']);
    const b3 = new Blob(['c']);
    const r = resolveTemplate(
      { model: '{{model}}', image: '{{image:blob}}' },
      { model: 'nano', image: [b1, b2, b3] },
    );
    expect(r.kind).toBe('form');
    const images = (r.body as FormData).getAll('image');
    expect(images).toHaveLength(3);
    expect(images.every((x) => x instanceof Blob)).toBe(true);
  });

  it('混合字符串里 number 占位符被转字符串拼接', () => {
    const r = resolveTemplate(
      { desc: 'count={{n:number}}' },
      { n: 5 },
    );
    expect(r.kind).toBe('json');
    expect(r.body).toEqual({ desc: 'count=5' });
  });
});
