/**
 * ChartBrowserModalコンポーネント
 * 相関図一覧をプレビュー付きで表示し、切り替え・新規作成を行うモーダル
 */

'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { ChartPreview } from './ChartPreview';

/**
 * ChartBrowserModalのProps
 */
type ChartBrowserModalProps = {
  /** モーダルが開いているか */
  isOpen: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
};

/**
 * チャート一覧モーダル
 */
export function ChartBrowserModal({ isOpen, onClose }: ChartBrowserModalProps) {
  const chartMetas = useGraphStore((state) => state.chartMetas);
  const activeChartId = useGraphStore((state) => state.activeChartId);
  const switchChart = useGraphStore((state) => state.switchChart);

  // Escapeキーでモーダルを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  /**
   * チャートをクリックした時の処理
   */
  const handleChartClick = (chartId: string) => {
    // アクティブチャートの場合は切り替えずにモーダルを閉じる
    if (chartId === activeChartId) {
      onClose();
      return;
    }

    // 別のチャートに切り替え
    void switchChart(chartId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="chart-browser-title"
    >
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2
            id="chart-browser-title"
            className="text-xl font-semibold text-gray-900"
          >
            相関図を開く
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* チャート一覧 */}
        <div className="space-y-2 mb-4">
          {chartMetas.map((meta) => {
            const isActive = meta.id === activeChartId;

            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => handleChartClick(meta.id)}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* チャート名と「現在」バッジ */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    {meta.name}
                  </h3>
                  {isActive && (
                    <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                      現在
                    </span>
                  )}
                </div>

                {/* メタデータ */}
                <p className="text-sm text-gray-500 mb-3">
                  {meta.personCount}{' '}
                  {meta.personCount === 1 ? 'node' : 'nodes'},{' '}
                  {meta.relationshipCount}{' '}
                  {meta.relationshipCount === 1 ? 'edge' : 'edges'} • Last
                  update: {new Date(meta.updatedAt).toLocaleDateString()}
                </p>

                {/* 人物プレビュー */}
                <ChartPreview chartId={meta.id} isActive={isActive} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
