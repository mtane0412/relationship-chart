/**
 * ChartPreviewコンポーネント
 * 相関図の人物画像サムネイル一覧をプレビュー表示する
 */

'use client';

import { useEffect, useState } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';
import { getChart } from '@/lib/chart-db';
import type { Person } from '@/types/person';

/**
 * 表示する最大アバター数
 */
const MAX_DISPLAY_COUNT = 5;

/**
 * ChartPreviewのProps
 */
type ChartPreviewProps = {
  /** 相関図ID */
  chartId: string;
  /** trueならストアから、falseならIndexedDBからデータ取得 */
  isActive: boolean;
};

/**
 * 人物データ取得フックの戻り値型
 */
type UseChartPreviewDataResult = {
  persons: Person[];
  isLoading: boolean;
  error: Error | null;
};

/**
 * 人物データを取得するカスタムフック
 * @param chartId - 相関図ID
 * @param isActive - アクティブチャートかどうか
 * @returns 人物データ、ローディング状態、エラー
 */
function useChartPreviewData(
  chartId: string,
  isActive: boolean
): UseChartPreviewDataResult {
  const storePersons = useGraphStore((state) => state.persons);
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // アクティブチャートの場合はストアから直接取得
  useEffect(() => {
    if (!isActive) return;

    setPersons(storePersons);
    setIsLoading(false);
    setError(null);
  }, [isActive, storePersons]);

  // 非アクティブチャートの場合はIndexedDBから取得
  useEffect(() => {
    if (isActive) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    void getChart(chartId)
      .then((chart) => {
        if (!isMounted) return;
        if (chart) {
          setPersons(chart.persons);
        } else {
          // チャートが存在しない場合は空配列
          setPersons([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [chartId, isActive]);

  return { persons, isLoading, error };
}

/**
 * 名前から背景色を生成する
 * @param name - 人物の名前
 * @returns 色のクラス名
 */
function getInitialBackgroundColor(name: string): string {
  // 名前の文字コードの合計を使って色を決定
  const colorIndex =
    name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5;

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
  ];

  return colors[colorIndex];
}

/**
 * チャートプレビューコンポーネント
 */
export function ChartPreview({ chartId, isActive }: ChartPreviewProps) {
  const { persons, isLoading, error } = useChartPreviewData(chartId, isActive);

  // ローディング中
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-1"
        data-testid="chart-preview-loading"
        aria-label="読み込み中"
      >
        {/* スケルトンローディング（5個表示） */}
        {Array.from({ length: MAX_DISPLAY_COUNT }).map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // エラー時
  if (error) {
    return (
      <div className="text-xs text-red-500" role="alert">
        読み込みに失敗しました
      </div>
    );
  }

  // 0人の場合
  if (persons.length === 0) {
    return (
      <div className="text-xs text-gray-400" aria-label="空の相関図">
        空の相関図
      </div>
    );
  }

  // 表示する人物と超過分
  const displayPersons = persons.slice(0, MAX_DISPLAY_COUNT);
  const remainingCount = persons.length - MAX_DISPLAY_COUNT;

  return (
    <div className="flex items-center gap-1" aria-label="人物プレビュー">
      {displayPersons.map((person) => (
        <div
          key={person.id}
          className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-xs text-white font-semibold"
          title={person.name}
        >
          {person.imageDataUrl ? (
            // 画像がある場合
            <img
              src={person.imageDataUrl}
              alt={person.name}
              className="w-full h-full object-cover"
            />
          ) : (
            // 画像がない場合はイニシャルを表示
            <div
              className={`w-full h-full flex items-center justify-center ${getInitialBackgroundColor(person.name)}`}
            >
              {person.name.charAt(0)}
            </div>
          )}
        </div>
      ))}

      {/* 超過分の表示 */}
      {remainingCount > 0 && (
        <div
          className="text-xs text-gray-500 font-semibold"
          aria-label={`他${remainingCount}人`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
