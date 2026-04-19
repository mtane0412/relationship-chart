/**
 * /api/interview-chat APIルートのユニットテスト
 *
 * ストリーミングチャットAPIを検証する。
 * streamText と createOpenRouter をモックしてルートハンドラのロジックを検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// streamText をモック
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    streamText: vi.fn(() => ({
      toTextStreamResponse: vi.fn(() => new Response('test response', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })),
    })),
  };
});

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({
    chat: vi.fn(() => 'mocked-model'),
  })),
}));

import { streamText } from 'ai';

const mockStreamText = vi.mocked(streamText);

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/interview-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 有効なリクエストボディの基本形 */
const baseRequestBody = {
  messages: [
    { role: 'user', content: 'こんにちは' },
  ],
  existingPersonNames: [],
  existingRelationshipSummaries: [],
  apiKey: 'sk-or-test-key',
  model: 'anthropic/claude-sonnet-4-5',
};

describe('POST /api/interview-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常なリクエストに対してストリーミングレスポンスを返すこと', async () => {
    const req = makeRequest(baseRequestBody);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(streamText).toHaveBeenCalledOnce();
  });

  it('messages が空配列の場合は 400 を返すこと', async () => {
    const req = makeRequest({ ...baseRequestBody, messages: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('messages が欠けている場合は 400 を返すこと', async () => {
    const { messages: _, ...body } = baseRequestBody;
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

  it('streamText がエラーをスローした場合は 500 を返すこと', async () => {
    mockStreamText.mockImplementationOnce(() => {
      throw new Error('API error');
    });

    const req = makeRequest(baseRequestBody);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('streamText にシステムプロンプトが渡されること', async () => {
    const req = makeRequest(baseRequestBody);
    await POST(req);

    const callArgs = mockStreamText.mock.calls[0][0] as { system?: string };
    expect(callArgs.system).toBeDefined();
    expect(callArgs.system).toContain('インタビュアー');
  });

  it('既存人物名がシステムプロンプトに含まれること', async () => {
    const req = makeRequest({
      ...baseRequestBody,
      existingPersonNames: ['田中太郎', '佐藤花子'],
    });
    await POST(req);

    const callArgs = mockStreamText.mock.calls[0][0] as { system?: string };
    expect(callArgs.system).toContain('田中太郎');
    expect(callArgs.system).toContain('佐藤花子');
  });

  it('既存関係サマリがシステムプロンプトに含まれること', async () => {
    const req = makeRequest({
      ...baseRequestBody,
      existingRelationshipSummaries: ['田中太郎と佐藤花子は親友', '佐藤花子と鈴木一郎は同僚'],
    });
    await POST(req);

    const callArgs = mockStreamText.mock.calls[0][0] as { system?: string };
    expect(callArgs.system).toContain('田中太郎と佐藤花子は親友');
    expect(callArgs.system).toContain('佐藤花子と鈴木一郎は同僚');
  });

  it('既存エピソードタイトルがシステムプロンプトに含まれること', async () => {
    const req = makeRequest({
      ...baseRequestBody,
      existingEpisodeTitles: ['田中と佐藤の初対面', '部活の合宿での出来事'],
    });
    await POST(req);

    const callArgs = mockStreamText.mock.calls[0][0] as { system?: string };
    expect(callArgs.system).toContain('田中と佐藤の初対面');
    expect(callArgs.system).toContain('部活の合宿での出来事');
  });

  it('existingEpisodeTitles が配列でない場合は 400 を返すこと', async () => {
    const req = makeRequest({ ...baseRequestBody, existingEpisodeTitles: '無効な値' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
