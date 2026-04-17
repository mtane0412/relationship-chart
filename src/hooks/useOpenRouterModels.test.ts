/**
 * useOpenRouterModels フックのユニットテスト
 * OpenRouter の公開モデル一覧APIをフェッチし、モデルID一覧を返す。
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOpenRouterModels } from './useOpenRouterModels';

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockModelsResponse = {
  data: [
    { id: 'anthropic/claude-sonnet-4-5', name: 'Anthropic: Claude Sonnet 4.5' },
    { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o' },
    { id: 'google/gemini-2.0-flash-001', name: 'Google: Gemini 2.0 Flash' },
  ],
};

describe('useOpenRouterModels', () => {
  it('初期状態が正しいこと', () => {
    const { result } = renderHook(() => useOpenRouterModels());
    expect(result.current.models).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchModels 呼び出し後にモデルID一覧が取得されること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockModelsResponse), { status: 200 })
        )
      )
    );

    const { result } = renderHook(() => useOpenRouterModels());

    await act(async () => {
      await result.current.fetchModels();
    });

    expect(result.current.models).toEqual([
      'anthropic/claude-sonnet-4-5',
      'openai/gpt-4o',
      'google/gemini-2.0-flash-001',
    ]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchModels 実行中は isLoading が true になること', async () => {
    let resolvePromise!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvePromise = resolve;
          })
      )
    );

    const { result } = renderHook(() => useOpenRouterModels());

    act(() => {
      result.current.fetchModels();
    });

    expect(result.current.isLoading).toBe(true);

    resolvePromise(
      new Response(JSON.stringify(mockModelsResponse), { status: 200 })
    );
  });

  it('ネットワークエラー時に error がセットされること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error')))
    );

    const { result } = renderHook(() => useOpenRouterModels());

    await act(async () => {
      await result.current.fetchModels();
    });

    expect(result.current.error).toMatch(/Network error/i);
    expect(result.current.models).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('APIエラー（非200レスポンス）時に error がセットされること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response('Internal Server Error', { status: 500 }))
      )
    );

    const { result } = renderHook(() => useOpenRouterModels());

    await act(async () => {
      await result.current.fetchModels();
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.models).toEqual([]);
  });

  it('不正なレスポンス形式の場合に error がセットされること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ invalid: 'structure' }), { status: 200 })
        )
      )
    );

    const { result } = renderHook(() => useOpenRouterModels());

    await act(async () => {
      await result.current.fetchModels();
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.models).toEqual([]);
  });
});
