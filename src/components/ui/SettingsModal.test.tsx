/**
 * SettingsModal コンポーネントのユニットテスト
 * OpenRouter モデル一覧の動的フェッチ動作を検証する。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';

// useGraphStore をモック
vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn((selector: (s: { resetAllData: () => void }) => unknown) => {
    const store = { resetAllData: vi.fn() };
    return selector ? selector(store) : store;
  }),
}));

// useDialogStore をモック
vi.mock('@/stores/useDialogStore', () => ({
  useDialogStore: vi.fn((selector: (s: { openConfirm: () => void }) => unknown) => {
    const store = { openConfirm: vi.fn() };
    return selector ? selector(store) : store;
  }),
}));

// useAiSettingsStore をモック
vi.mock('@/stores/useAiSettingsStore', () => ({
  useAiSettingsStore: vi.fn((selector: (s: {
    openRouterApiKey: string;
    openRouterModel: string;
    setOpenRouterApiKey: () => void;
    setOpenRouterModel: () => void;
  }) => unknown) => {
    const store = {
      openRouterApiKey: 'sk-or-test',
      openRouterModel: 'anthropic/claude-sonnet-4-5',
      setOpenRouterApiKey: vi.fn(),
      setOpenRouterModel: vi.fn(),
    };
    return selector ? selector(store) : store;
  }),
}));

/** OpenRouter モデル一覧 API のモックレスポンス */
const mockModelsResponse = {
  data: [
    { id: 'anthropic/claude-opus-4-5', name: 'Anthropic: Claude Opus 4.5' },
    { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o' },
    { id: 'google/gemini-2.0-flash-001', name: 'Google: Gemini 2.0 Flash' },
  ],
};

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('モーダルが開いた時に OpenRouter モデル一覧を取得してdatalistに表示すること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(mockModelsResponse), { status: 200 }))
      )
    );

    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    // モデル一覧がフェッチされて datalist に反映されることを確認
    await waitFor(() => {
      const datalist = document.getElementById('openrouter-model-suggestions');
      expect(datalist).not.toBeNull();
      const options = datalist?.querySelectorAll('option');
      expect(options?.length).toBe(3);
      expect(options?.[0].value).toBe('anthropic/claude-opus-4-5');
    });
  });

  it('フェッチに失敗しても datalist が空で表示されること', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error')))
    );

    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    // エラー時は datalist が空のまま（モーダルは表示される）
    await waitFor(() => {
      expect(screen.getByLabelText('モデル')).toBeInTheDocument();
      const datalist = document.getElementById('openrouter-model-suggestions');
      const options = datalist?.querySelectorAll('option');
      expect(options?.length ?? 0).toBe(0);
    });
  });

  it('モーダルが閉じている時はフェッチしないこと', () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    render(<SettingsModal isOpen={false} onClose={vi.fn()} />);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
