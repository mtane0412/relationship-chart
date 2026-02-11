/**
 * ChartListコンポーネント
 * チャート一覧を表示し、切り替え・削除・名前変更機能を提供する
 */

'use client';

import { useGraphStore } from '@/stores/useGraphStore';
import { ChartListItem } from './ChartListItem';

/**
 * チャート一覧コンポーネント
 */
export function ChartList() {
  const chartMetas = useGraphStore((state) => state.chartMetas);
  const activeChartId = useGraphStore((state) => state.activeChartId);
  const switchChart = useGraphStore((state) => state.switchChart);

  /**
   * チャートをクリックした時の処理
   * @param chartId - 切り替え先のチャートID
   */
  const handleChartClick = (chartId: string) => {
    // 既にアクティブな場合は何もしない
    if (chartId === activeChartId) {
      return;
    }
    void switchChart(chartId);
  };

  // チャートがない場合はメッセージを表示
  if (chartMetas.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        チャートがありません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chartMetas.map((meta) => {
        const isActive = meta.id === activeChartId;
        return (
          <ChartListItem
            key={meta.id}
            meta={meta}
            isActive={isActive}
            onClick={handleChartClick}
          />
        );
      })}
    </div>
  );
}
