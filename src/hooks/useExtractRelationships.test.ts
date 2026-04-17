/**
 * useExtractRelationships フックのユニットテスト
 * fetch をモックして、状態遷移を検証する。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExtractRelationships } from './useExtractRelationships';

// useGraphStore をモック（既存人物名の取得のため）
const mockPersons = [{ id: 'p1', name: '田中太郎', createdAt: '2024-01-01T00:00:00.000Z' }];
vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn((selector: (s: { persons: typeof mockPersons }) => unknown) => {
    const store = { persons: mockPersons };
    return selector ? selector(store) : store;
  }),
}));

const validResult = {
  persons: [{ name: '田中太郎', kind: 'person' }],
  relationships: [],
};

describe('useExtractRelationships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // グローバルスタブを確実にクリーンアップ
    vi.unstubAllGlobals();
  });

  it('初期状態が正しいこと', () => {
    const { result } = renderHook(() => useExtractRelationships());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.extractionResult).toBeNull();
  });

  it('extract 呼び出し中は isLoading が true になること', async () => {
    let resolvePromise!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    vi.stubGlobal('fetch', vi.fn(() => fetchPromise));

    const { result } = renderHook(() => useExtractRelationships());

    act(() => {
      result.current.extract('テスト');
    });

    expect(result.current.isLoading).toBe(true);

    // テスト終了のために pending なプロミスを解決する
    resolvePromise(new Response(JSON.stringify(validResult), { status: 200 }));
  });

  it('成功時に extractionResult がセットされること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(validResult), { status: 200 }))
      )
    );

    const { result } = renderHook(() => useExtractRelationships());

    await act(async () => {
      await result.current.extract('テスト');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.extractionResult).toEqual(validResult);
  });

  it('APIエラー時に error がセットされること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'APIエラー' }), { status: 500 })
        )
      )
    );

    const { result } = renderHook(() => useExtractRelationships());

    await act(async () => {
      await result.current.extract('テスト');
    });

    expect(result.current.isLoading).toBe(false);
    // エラーメッセージが文字列として設定されていること
    expect(typeof result.current.error).toBe('string');
    expect(result.current.error).toContain('APIエラー');
    expect(result.current.extractionResult).toBeNull();
  });

  it('ネットワークエラー時に error がセットされること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error')))
    );

    const { result } = renderHook(() => useExtractRelationships());

    await act(async () => {
      await result.current.extract('テスト');
    });

    // エラーメッセージがネットワークエラーを示していること
    expect(typeof result.current.error).toBe('string');
    expect(result.current.error).toMatch(/Network error/i);
    expect(result.current.isLoading).toBe(false);
  });

  it('reset 後に状態がリセットされること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(validResult), { status: 200 }))
      )
    );

    const { result } = renderHook(() => useExtractRelationships());

    await act(async () => {
      await result.current.extract('テスト');
    });

    expect(result.current.extractionResult).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.extractionResult).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('既存人物名がリクエストに含まれること', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(validResult), { status: 200 }))
    );
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useExtractRelationships());

    await act(async () => {
      await result.current.extract('テスト');
    });

    // fetch の第2引数（RequestInit）から body を取り出して検証
    const calls = mockFetch.mock.calls as unknown as [string, RequestInit][];
    const requestInit = calls[0][1];
    const body = JSON.parse(requestInit.body as string);
    expect(body.existingPersonNames).toContain('田中太郎');
  });
});
