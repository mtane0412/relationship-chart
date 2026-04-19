/**
 * /api/interview-extract APIルートのユニットテスト
 *
 * インタビューセッション終了時にチャット履歴から人物・関係を抽出するAPIを検証する。
 * generateObject と createOpenRouter をモックしてルートハンドラのロジックを検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// generateObject をモック
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateObject: vi.fn(),
    jsonSchema: vi.fn((schema: Record<string, unknown>) => ({ _schema: schema })),
  };
});

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({
    chat: vi.fn(() => 'mocked-model'),
  })),
}));

import { generateObject } from 'ai';

const mockGenerateObject = vi.mocked(generateObject);

/** generateObject の戻り値型 */
type GenerateObjectResult = Awaited<ReturnType<typeof generateObject>>;

/** v11 プロパティグラフ方式の抽出結果モックデータ */
const validExtractionResult = {
  persons: [
    { name: '太宰治', labels: ['人物'] },
    { name: '芥川龍之介', labels: ['人物'] },
  ],
  relationships: [
    {
      sourcePersonName: '太宰治',
      targetPersonName: '芥川龍之介',
      type: '尊敬',
      label: null,
      symmetric: false,
      tags: ['文学仲間'],
      narrative: { summary: '太宰は芥川を尊敬していた', notes: null, turningPoints: [] },
      properties: { closeness: 0.7, affection: 0.8, awareness: 'known' },
    },
  ],
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/interview-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 有効なリクエストボディの基本形 */
const baseRequestBody = {
  chatHistory: [
    { role: 'assistant', content: '登場人物を教えてください。' },
    { role: 'user', content: '太宰治と芥川龍之介が登場します。太宰は芥川を尊敬していました。' },
  ],
  existingPersonNames: [],
  apiKey: 'sk-or-test-key',
  model: 'anthropic/claude-sonnet-4-5',
};

describe('POST /api/interview-extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常なリクエストに対して抽出結果を返すこと', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: validExtractionResult } as GenerateObjectResult);

    const req = makeRequest(baseRequestBody);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('persons');
    expect(json).toHaveProperty('relationships');
    expect(json.persons).toHaveLength(2);
  });

  it('chatHistory が空配列の場合は 400 を返すこと', async () => {
    const req = makeRequest({ ...baseRequestBody, chatHistory: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('chatHistory が欠けている場合は 400 を返すこと', async () => {
    const { chatHistory: _, ...body } = baseRequestBody;
    const req = makeRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('apiKey が欠けている場合は 400 を返すこと', async () => {
    const { apiKey: _, ...body } = baseRequestBody;
    const req = makeRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('apiKey が空文字の場合は 400 を返すこと', async () => {
    const req = makeRequest({ ...baseRequestBody, apiKey: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('model が欠けている場合は 400 を返すこと', async () => {
    const { model: _, ...body } = baseRequestBody;
    const req = makeRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('model が空文字の場合は 400 を返すこと', async () => {
    const req = makeRequest({ ...baseRequestBody, model: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('generateObject がエラーをスローした場合は 500 を返すこと', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('API error'));

    const req = makeRequest(baseRequestBody);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('generateObject に渡されるプロンプトにチャット履歴が含まれること', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: { persons: [], relationships: [] } } as GenerateObjectResult);

    const req = makeRequest(baseRequestBody);
    await POST(req);

    const callArgs = mockGenerateObject.mock.calls[0][0] as { prompt?: string };
    const prompt = callArgs.prompt ?? '';
    // チャット履歴のテキストが含まれていること
    expect(prompt).toContain('太宰治と芥川龍之介が登場します');
  });
});
