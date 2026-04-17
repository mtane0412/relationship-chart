/**
 * AI設定ストア
 *
 * OpenRouter APIキーとモデルをユーザーのブラウザに永続化する。
 * LocalStorage に保存されるため、チャートデータ（IndexedDB）とは分離されている。
 *
 * セキュリティ注記:
 *   APIキーはユーザー自身が管理するもので、ローカルの localStorage にのみ保存される。
 *   サーバーに送信されるのはリクエスト時のみで、サーバー側での永続化は行わない。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** デフォルトモデル（OpenRouter 経由の Anthropic Claude Sonnet 4.5） */
export const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-sonnet-4-5';

/** 人気モデルの候補リスト（設定 UI のサジェストに使用） */
export const OPENROUTER_MODEL_SUGGESTIONS = [
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.3-70b-instruct',
] as const;

/**
 * AI設定ストアの状態型
 */
type AiSettingsState = {
  /** OpenRouter APIキー（空文字 = 未設定） */
  openRouterApiKey: string;
  /** 使用するモデル（OpenRouter モデル ID 形式: "provider/model-name"） */
  openRouterModel: string;
  /** APIキーとモデルが設定済みかを返す */
  isConfigured: () => boolean;
  /** OpenRouter APIキーを設定する */
  setOpenRouterApiKey: (key: string) => void;
  /** OpenRouter モデルを設定する */
  setOpenRouterModel: (model: string) => void;
};

/**
 * AI設定ストア
 * localStorage に "ai-settings" キーで永続化される。
 */
export const useAiSettingsStore = create<AiSettingsState>()(
  persist(
    (set, get) => ({
      openRouterApiKey: '',
      openRouterModel: DEFAULT_OPENROUTER_MODEL,

      isConfigured: () => get().openRouterApiKey.trim().length > 0,

      setOpenRouterApiKey: (key: string) => set({ openRouterApiKey: key }),

      setOpenRouterModel: (model: string) => set({ openRouterModel: model }),
    }),
    {
      name: 'ai-settings',
    }
  )
);
