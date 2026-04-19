/**
 * /api/extract-relationships APIルートのユニットテスト
 * OpenRouter プロバイダをモックして、ルートハンドラのロジックを検証する。
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
    { name: '田中太郎', labels: ['人物'] },
    { name: '山田花子', labels: ['人物'] },
  ],
  relationships: [
    {
      sourcePersonName: '田中太郎',
      targetPersonName: '山田花子',
      type: '好き',
      label: null,
      symmetric: false,
      tags: ['片想い'],
      narrative: { summary: null, notes: null, turningPoints: [] },
      properties: { closeness: 0.8, affection: 0.9, awareness: 'known' },
    },
  ],
  episodes: [],
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/extract-relationships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 有効なリクエストボディの基本形 */
const baseRequestBody = {
  text: '田中太郎と山田花子は幼なじみで、田中は山田のことが好き。',
  existingPersonNames: [],
  apiKey: 'sk-or-test-key',
  model: 'anthropic/claude-sonnet-4-5',
};

describe('POST /api/extract-relationships', () => {
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

  it('text が空文字の場合は 400 を返すこと', async () => {
    const req = makeRequest({ ...baseRequestBody, text: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('text が欠けている場合は 400 を返すこと', async () => {
    const { text: _, ...body } = baseRequestBody;
    const req = makeRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('text が長すぎる場合は 400 を返すこと', async () => {
    // MAX_TEXT_LENGTH（10000文字）を超える 10001 文字のテキストを送信
    const req = makeRequest({ ...baseRequestBody, text: 'a'.repeat(10001) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('existingPersonNames が配列でない場合は 400 を返すこと', async () => {
    const req = makeRequest({ ...baseRequestBody, existingPersonNames: 'invalid' });
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

  it('generateObject がエラーをスローした場合は 500 を返すこと', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('API error'));

    const req = makeRequest(baseRequestBody);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('existingPersonNames が指定された場合はプロンプトに含まれること', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: { persons: [], relationships: [], episodes: [] } } as GenerateObjectResult);

    const req = makeRequest({
      ...baseRequestBody,
      text: '田中は上司で山田は部下',
      existingPersonNames: ['田中太郎', '山田花子'],
    });
    const res = await POST(req);

    // リクエストが成功していること
    expect(res.status).toBe(200);

    const callArgs = mockGenerateObject.mock.calls[0][0];
    // プロンプトに既存人物名が含まれていること
    const prompt = (callArgs as { prompt?: string }).prompt ?? '';
    expect(prompt).toContain('田中太郎');
    expect(prompt).toContain('山田花子');
  });

  it('プロンプトにエピソード抽出指示が含まれること', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: { persons: [], relationships: [], episodes: [] } } as GenerateObjectResult);

    const req = makeRequest(baseRequestBody);
    await POST(req);

    const callArgs = mockGenerateObject.mock.calls[0][0] as { prompt?: string };
    const prompt = callArgs.prompt ?? '';
    // episodes 抽出の指示が含まれていること
    expect(prompt).toContain('episodes');
  });

  it('existingEpisodeTitles が指定された場合はプロンプトに含まれること', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: { persons: [], relationships: [], episodes: [] } } as GenerateObjectResult);

    const req = makeRequest({
      ...baseRequestBody,
      existingEpisodeTitles: ['初めての出会い', '卒業式の告白'],
    });
    const res = await POST(req);

    expect(res.status).toBe(200);

    const callArgs = mockGenerateObject.mock.calls[0][0] as { prompt?: string };
    const prompt = callArgs.prompt ?? '';
    expect(prompt).toContain('初めての出会い');
    expect(prompt).toContain('卒業式の告白');
  });

  it('existingEpisodeTitles が配列でない場合は 400 を返すこと', async () => {
    const req = makeRequest({ ...baseRequestBody, existingEpisodeTitles: '無効な値' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
