/**
 * useAiSettingsStore のユニットテスト
 * OpenRouter 設定（APIキー・モデル）の状態管理を検証する。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAiSettingsStore } from './useAiSettingsStore';

describe('useAiSettingsStore', () => {
  beforeEach(() => {
    // persist ミドルウェアによる localStorage 汚染をクリアしてからストアをリセット
    localStorage.clear();
    act(() => {
      useAiSettingsStore.setState({
        openRouterApiKey: '',
        openRouterModel: useAiSettingsStore.getState().openRouterModel,
      });
    });
  });

  it('初期状態でAPIキーが空文字であること', () => {
    const { result } = renderHook(() => useAiSettingsStore());
    expect(result.current.openRouterApiKey).toBe('');
  });

  it('初期状態でデフォルトモデルが設定されていること', () => {
    const { result } = renderHook(() => useAiSettingsStore());
    expect(result.current.openRouterModel).toBeTruthy();
    expect(typeof result.current.openRouterModel).toBe('string');
  });

  it('setOpenRouterApiKey でAPIキーを設定できること', () => {
    const { result } = renderHook(() => useAiSettingsStore());

    act(() => {
      result.current.setOpenRouterApiKey('sk-or-test-key');
    });

    expect(result.current.openRouterApiKey).toBe('sk-or-test-key');
  });

  it('setOpenRouterModel でモデルを設定できること', () => {
    const { result } = renderHook(() => useAiSettingsStore());

    act(() => {
      result.current.setOpenRouterModel('openai/gpt-4o-mini');
    });

    expect(result.current.openRouterModel).toBe('openai/gpt-4o-mini');
  });

  it('isConfigured は APIキーが設定されている場合のみ true を返すこと', () => {
    const { result } = renderHook(() => useAiSettingsStore());

    // APIキーなし
    act(() => {
      result.current.setOpenRouterApiKey('');
    });
    expect(result.current.isConfigured()).toBe(false);

    // APIキーあり
    act(() => {
      result.current.setOpenRouterApiKey('sk-or-valid-key');
    });
    expect(result.current.isConfigured()).toBe(true);
  });
});
