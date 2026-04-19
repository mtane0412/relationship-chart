/**
 * LLM テキスト→関係抽出フック
 *
 * /api/extract-relationships へのリクエストを管理し、
 * ローディング・エラー・結果の状態を提供する。
 *
 * useAiSettingsStore から OpenRouter APIキーとモデルを取得してリクエストに含める。
 * APIキーが未設定の場合は即座にエラーをセットする。
 *
 * 使用例:
 *   const { extract, isLoading, error, extractionResult, reset } = useExtractRelationships();
 *   await extract('田中と山田は親友で...'); // 抽出実行
 */

'use client';

import { useState, useCallback } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';
import { useAiSettingsStore } from '@/stores/useAiSettingsStore';
import { LlmExtractionResultSchema, type LlmExtractionResult } from '@/lib/llm-extraction-schema';

/** フックの戻り値型 */
export type UseExtractRelationshipsReturn = {
  /** LLM 抽出を実行する関数。テキストを受け取り、結果を extractionResult にセットする */
  extract: (text: string) => Promise<void>;
  /** リクエスト中は true */
  isLoading: boolean;
  /** エラーメッセージ（エラーなしは null） */
  error: string | null;
  /** 抽出結果（未実行または失敗時は null） */
  extractionResult: LlmExtractionResult | null;
  /** 状態をリセットする */
  reset: () => void;
};

/**
 * LLM テキスト→関係抽出フック
 *
 * useGraphStore から既存人物名を取得し、
 * useAiSettingsStore から APIキーとモデルを取得して、
 * /api/extract-relationships に POST して抽出結果を返す。
 */
export function useExtractRelationships(): UseExtractRelationshipsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<LlmExtractionResult | null>(null);

  const persons = useGraphStore((s) => s.persons);
  const episodes = useGraphStore((s) => s.episodes);
  const openRouterApiKey = useAiSettingsStore((s) => s.openRouterApiKey);
  const openRouterModel = useAiSettingsStore((s) => s.openRouterModel);
  const isConfigured = useAiSettingsStore((s) => s.isConfigured);

  const extract = useCallback(
    async (text: string) => {
      // APIキー未設定チェック
      if (!isConfigured()) {
        setError(
          'OpenRouter APIキーが設定されていません。設定モーダルからAPIキーを入力してください。'
        );
        return;
      }

      setIsLoading(true);
      setError(null);
      setExtractionResult(null);

      const existingPersonNames = persons.map((p) => p.name);
      const existingEpisodeTitles = episodes.map((e) => e.title);

      try {
        const response = await fetch('/api/extract-relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            existingPersonNames,
            existingEpisodeTitles,
            apiKey: openRouterApiKey,
            model: openRouterModel,
          }),
        });

        const data: unknown = await response.json();

        if (!response.ok) {
          const errorData = data as { error?: string };
          setError(errorData.error ?? `エラーが発生しました（HTTP ${response.status}）`);
          return;
        }

        // レスポンスを zod でバリデーション
        const parsed = LlmExtractionResultSchema.safeParse(data);
        if (!parsed.success) {
          setError('抽出結果の形式が不正です。再度お試しください。');
          return;
        }

        setExtractionResult(parsed.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : '不明なエラー';
        setError(`通信エラーが発生しました。${message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [persons, episodes, openRouterApiKey, openRouterModel, isConfigured]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setExtractionResult(null);
  }, []);

  return { extract, isLoading, error, extractionResult, reset };
}
