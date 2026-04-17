/**
 * OpenRouter モデル一覧取得フック
 *
 * OpenRouter の公開APIからモデルID一覧を取得する。
 * APIキー不要の公開エンドポイント（https://openrouter.ai/api/v1/models）を使用。
 *
 * 使用例:
 *   const { models, isLoading, error, fetchModels } = useOpenRouterModels();
 *   await fetchModels(); // モーダル表示時などに呼び出す
 */

'use client';

import { useState, useCallback } from 'react';

/** OpenRouter モデル一覧APIのエンドポイント */
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

/** フックの戻り値型 */
export type UseOpenRouterModelsReturn = {
  /** 取得したモデルID一覧（例: ["anthropic/claude-sonnet-4-5", ...]） */
  models: string[];
  /** フェッチ中は true */
  isLoading: boolean;
  /** エラーメッセージ（エラーなしは null） */
  error: string | null;
  /** モデル一覧をフェッチする関数 */
  fetchModels: () => Promise<void>;
};

/** OpenRouter モデルオブジェクトの型 */
type OpenRouterModel = {
  id: string;
  name: string;
};

/** OpenRouter モデル一覧APIのレスポンス型 */
type OpenRouterModelsResponse = {
  data: OpenRouterModel[];
};

/**
 * レスポンスが OpenRouterModelsResponse 形式かを検証する型ガード
 */
function isOpenRouterModelsResponse(value: unknown): value is OpenRouterModelsResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

/**
 * OpenRouter モデル一覧取得フック
 *
 * fetchModels() を呼び出すと、OpenRouter の公開APIからモデルID一覧を取得する。
 * 結果は models 配列に格納される。
 */
export function useOpenRouterModels(): UseOpenRouterModelsReturn {
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(OPENROUTER_MODELS_URL);

      if (!response.ok) {
        setError(`モデル一覧の取得に失敗しました（HTTP ${response.status}）`);
        return;
      }

      const data: unknown = await response.json();

      if (!isOpenRouterModelsResponse(data)) {
        setError('モデル一覧のレスポンス形式が不正です。');
        return;
      }

      const modelIds = data.data.map((m) => m.id);
      setModels(modelIds);
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(`モデル一覧の取得中にエラーが発生しました。${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { models, isLoading, error, fetchModels };
}
