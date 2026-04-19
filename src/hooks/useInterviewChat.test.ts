/**
 * useInterviewChat フックのユニットテスト
 *
 * ストリーミングチャット機能とセッション終了時の抽出API呼び出しを検証する。
 * fetch をモックして状態遷移を確認する。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInterviewChat } from './useInterviewChat';
import { useInterviewStore } from '@/stores/useInterviewStore';

// useAiSettingsStore をモック
const mockIsConfigured = vi.fn(() => true);
vi.mock('@/stores/useAiSettingsStore', () => ({
  useAiSettingsStore: vi.fn(
    (selector: (s: { openRouterApiKey: string; openRouterModel: string; isConfigured: () => boolean }) => unknown) => {
      const store = {
        openRouterApiKey: 'sk-or-test-key',
        openRouterModel: 'anthropic/claude-sonnet-4-5',
        isConfigured: mockIsConfigured,
      };
      return selector ? selector(store) : store;
    }
  ),
}));

// useGraphStore をモック
const mockEpisodes = [
  { id: 'ep1', title: '部活での初対面', relatedRelationshipIds: [], properties: {}, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
];
vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn((selector: (s: { persons: unknown[]; relationships: unknown[]; episodes: typeof mockEpisodes }) => unknown) => {
    const store = { persons: [], relationships: [], episodes: mockEpisodes };
    return selector ? selector(store) : store;
  }),
}));

/** ストア状態をリセットするヘルパー */
function resetStore() {
  useInterviewStore.setState({
    isModalOpen: false,
    session: null,
    extractionResult: null,
    error: null,
  });
}

/**
 * テキストストリームをシミュレートするモックレスポンスを作成する
 */
function createStreamResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

describe('useInterviewChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
    resetStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('初期状態が正しいこと', () => {
    const { result } = renderHook(() => useInterviewChat());
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.chatError).toBeNull();
  });

  it('append でユーザーメッセージが追加されてAI応答が受信されること', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      createStreamResponse('こんにちは！どのような登場人物がいますか？')
    ));

    const { result } = renderHook(() => useInterviewChat());

    await act(async () => {
      await result.current.append({ role: 'user', content: 'テスト開始' });
    });

    // ユーザーメッセージとAI応答の2件が存在すること
    expect(result.current.messages).toHaveLength(2);
    // 1件目: ユーザーメッセージ
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: 'テスト開始',
    });
    // 2件目: AI応答（ストリーミング内容が反映されていること）
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'こんにちは！どのような登場人物がいますか？',
    });
  });

  it('endSession でセッション状態が preview に変わること', async () => {
    useInterviewStore.getState().startSession('chart-001');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ persons: [], relationships: [], episodes: [] }),
    }));

    const { result } = renderHook(() => useInterviewChat());

    await act(async () => {
      await result.current.endSession();
    });

    const { session, extractionResult } = useInterviewStore.getState();
    expect(session?.status).toBe('preview');
    expect(extractionResult).not.toBeNull();
  });

  it('endSession でAPIキー未設定の場合エラーがセットされること', async () => {
    mockIsConfigured.mockReturnValue(false);
    useInterviewStore.getState().startSession('chart-001');

    const { result } = renderHook(() => useInterviewChat());

    await act(async () => {
      await result.current.endSession();
    });

    expect(useInterviewStore.getState().error).not.toBeNull();
  });

  it('endSession でセッションがない場合は何もしないこと', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useInterviewChat());

    await act(async () => {
      await result.current.endSession();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('append で既存エピソードタイトルがリクエストに含まれること', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      createStreamResponse('テスト応答')
    ));

    const { result } = renderHook(() => useInterviewChat());

    await act(async () => {
      await result.current.append({ role: 'user', content: 'テスト' });
    });

    const fetchMock = vi.mocked(global.fetch);
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const body = JSON.parse(calls[0][1].body as string);
    // mockEpisodes に含まれる '部活での初対面' が interview-chat リクエストに含まれていること
    expect(body.existingEpisodeTitles).toContain('部活での初対面');
  });

  it('endSession で既存エピソードタイトルが抽出APIリクエストに含まれること', async () => {
    useInterviewStore.getState().startSession('chart-001');

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ persons: [], relationships: [], episodes: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useInterviewChat());

    await act(async () => {
      await result.current.endSession();
    });

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const body = JSON.parse(calls[0][1].body as string);
    // mockEpisodes に含まれる '部活での初対面' が interview-extract リクエストに含まれていること
    expect(body.existingEpisodeTitles).toContain('部活での初対面');
  });

  it('endSession で抽出API失敗時にエラーがセットされること', async () => {
    useInterviewStore.getState().startSession('chart-001');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    }));

    const { result } = renderHook(() => useInterviewChat());

    await act(async () => {
      await result.current.endSession();
    });

    expect(useInterviewStore.getState().error).not.toBeNull();
    expect(useInterviewStore.getState().session?.status).toBe('active');
  });
});
