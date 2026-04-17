/**
 * /api/extract-relationships APIルートのユニットテスト
 * Anthropic SDK をモックして、ルートハンドラのロジックを検証する。
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

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn(() => 'mocked-model')),
}));

import { generateObject } from 'ai';

const mockGenerateObject = vi.mocked(generateObject);

/** generateObject の戻り値型 */
type GenerateObjectResult = Awaited<ReturnType<typeof generateObject>>;

const validExtractionResult = {
  persons: [
    { name: '田中太郎', kind: 'person' },
    { name: '山田花子', kind: 'person' },
  ],
  relationships: [
    {
      sourcePersonName: '田中太郎',
      targetPersonName: '山田花子',
      isDirected: true,
      symmetric: { closeness: 0.8, trust: null, tension: null, secrecy: null, kinship: null },
      forward: { label: '好き', affection: 0.9, awareness: 'known', role: null },
      reverse: { label: null, affection: null, awareness: null, role: null },
      tags: ['片想い'],
      narrative: { summary: null, notes: null, turningPoints: [] },
    },
  ],
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/extract-relationships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/extract-relationships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  it('正常なテキストに対して抽出結果を返すこと', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: validExtractionResult } as GenerateObjectResult);

    const req = makeRequest({ text: '田中太郎と山田花子は幼なじみで、田中は山田のことが好き。', existingPersonNames: [] });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('persons');
    expect(json).toHaveProperty('relationships');
    expect(json.persons).toHaveLength(2);
  });

  it('text が空文字の場合は 400 を返すこと', async () => {
    const req = makeRequest({ text: '', existingPersonNames: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('text が欠けている場合は 400 を返すこと', async () => {
    const req = makeRequest({ existingPersonNames: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('text が長すぎる場合は 400 を返すこと', async () => {
    // MAX_TEXT_LENGTH（10000文字）を超える 10001 文字のテキストを送信
    const req = makeRequest({ text: 'a'.repeat(10001), existingPersonNames: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('existingPersonNames が配列でない場合は 400 を返すこと', async () => {
    const req = makeRequest({ text: 'テスト', existingPersonNames: 'invalid' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('ANTHROPIC_API_KEY が未設定の場合は 500 を返すこと', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const req = makeRequest({ text: 'テスト', existingPersonNames: [] });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('generateObject がエラーをスローした場合は 500 を返すこと', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('API error'));

    const req = makeRequest({ text: 'テスト', existingPersonNames: [] });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('existingPersonNames が指定された場合はプロンプトに含まれること', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: { persons: [], relationships: [] } } as GenerateObjectResult);

    const req = makeRequest({
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
});
