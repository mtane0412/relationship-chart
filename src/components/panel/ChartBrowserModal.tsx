/**
 * ChartBrowserModalコンポーネント
 * 相関図一覧をプレビュー付きで表示し、切り替え・削除・新規作成・並び替えを行うモーダル
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useGraphStore } from '@/stores/useGraphStore';
import { SortableChartCard } from './SortableChartCard';
import { ChartCreateModal } from './ChartCreateModal';

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
  const deleteChart = useGraphStore((state) => state.deleteChart);
  const renameChart = useGraphStore((state) => state.renameChart);
  const reorderCharts = useGraphStore((state) => state.reorderCharts);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  /**
   * チャート削除ハンドラー
   */
  const handleChartDelete = (chartId: string) => {
    void deleteChart(chartId);
  };

  /**
   * チャート名変更ハンドラー
   */
  const handleChartRename = (chartId: string, newName: string) => {
    void renameChart(chartId, newName);
  };

  /**
   * ドラッグ終了ハンドラー
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = chartMetas.findIndex((m) => m.id === active.id);
    const newIndex = chartMetas.findIndex((m) => m.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // 新しい並び順を計算
    const newOrder = [...chartMetas];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, removed);

    // reorderChartsを呼び出し
    void reorderCharts(newOrder.map((m) => m.id));
  };

  /**
   * 新規作成モーダルを開く
   */
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  /**
   * 新規作成モーダルを閉じる
   */
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
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

          {/* チャート一覧（D&D対応） */}
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={chartMetas.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mb-4">
                {chartMetas.map((meta) => {
                  const isActive = meta.id === activeChartId;

                  return (
                    <SortableChartCard
                      key={meta.id}
                      chart={meta}
                      isActive={isActive}
                      onSwitch={handleChartClick}
                      onDelete={handleChartDelete}
                      onRename={handleChartRename}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* 新規作成ボタン */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="w-full p-4 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span className="font-medium">新規作成</span>
          </button>
        </div>
      </div>

      {/* チャート作成モーダル */}
      <ChartCreateModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
      />
    </>
  );
}
