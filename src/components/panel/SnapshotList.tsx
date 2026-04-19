/**
 * スナップショット一覧コンポーネント
 *
 * サイドパネル（DefaultPanel）内に配置され、以下の機能を提供する:
 * - スナップショット一覧の表示（ラベル・作成日時）
 * - タイムライン再生モードの開始/終了
 * - 各スナップショットへのジャンプ
 * - スナップショットの削除
 * - ドラッグ&ドロップによるスナップショットの並び替え（タイムラインモード外のみ）
 *
 * スナップショットが0件の場合は空状態メッセージを表示する。
 */

'use client';

import { Play, StopCircle } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '@/stores/useGraphStore';
import { SortableSnapshotItem } from './SortableSnapshotItem';

/**
 * スナップショット一覧コンポーネント
 */
export function SnapshotList() {
  const {
    snapshots,
    timelineMode,
    activeSnapshotIndex,
    setTimelineMode,
    goToSnapshot,
    goToLive,
    deleteSnapshot,
    reorderSnapshots,
  } = useGraphStore(
    useShallow((state) => ({
      snapshots: state.snapshots,
      timelineMode: state.timelineMode,
      activeSnapshotIndex: state.activeSnapshotIndex,
      setTimelineMode: state.setTimelineMode,
      goToSnapshot: state.goToSnapshot,
      goToLive: state.goToLive,
      deleteSnapshot: state.deleteSnapshot,
      reorderSnapshots: state.reorderSnapshots,
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * ドラッグ終了時に並び替えを適用する。
   * タイムラインモード中は早期returnして操作を無視する。
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = snapshots.findIndex((s) => s.id === active.id);
    const newIndex = snapshots.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...snapshots];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, removed);
    reorderSnapshots(newOrder.map((s) => s.id));
  };

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          タイムライン
          {snapshots.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              ({snapshots.length}件)
            </span>
          )}
        </h2>

        {/* 再生開始/終了ボタン（スナップショットが1件以上の場合） */}
        {snapshots.length > 0 && (
          timelineMode ? (
            <button
              onClick={() => setTimelineMode(false)}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              aria-label="再生を終了"
            >
              <StopCircle size={14} />
              再生を終了
            </button>
          ) : (
            <button
              onClick={() => setTimelineMode(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
              aria-label="再生を開始"
            >
              <Play size={14} />
              再生を開始
            </button>
          )
        )}
      </div>

      {/* スナップショットが0件の場合 */}
      {snapshots.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">
          スナップショットはまだありません
        </p>
      )}

      {/* スナップショット一覧 */}
      {snapshots.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={snapshots.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1">
              {snapshots.map((snapshot, index) => {
                const isActive = timelineMode && activeSnapshotIndex === index;
                return (
                  <SortableSnapshotItem
                    key={snapshot.id}
                    snapshot={snapshot}
                    index={index}
                    isActive={isActive}
                    timelineMode={timelineMode}
                    onGoToSnapshot={goToSnapshot}
                    onSetTimelineMode={setTimelineMode}
                    onGoToLive={goToLive}
                    onDelete={deleteSnapshot}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
