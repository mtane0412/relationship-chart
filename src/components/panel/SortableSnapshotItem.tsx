/**
 * SortableSnapshotItemコンポーネント
 *
 * @dnd-kit/sortableを使用してドラッグ&ドロップで並び替え可能なスナップショット項目。
 * SnapshotList内で使用され、GripVerticalアイコンのドラッグハンドルで並び替えを行う。
 *
 * 注意: タイムラインモード中はドラッグハンドルを非表示にする。
 * activeSnapshotIndexがインデックスベースのため、再生中の並び替えは禁止。
 */

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical } from 'lucide-react';
import type { Snapshot } from '@/types/snapshot';

/**
 * SortableSnapshotItemのプロップス
 */
export type SortableSnapshotItemProps = {
  /** 表示するスナップショット */
  snapshot: Snapshot;
  /** スナップショット番号（0始まりのインデックス） */
  index: number;
  /** タイムラインモード中かつこの項目がアクティブかどうか */
  isActive: boolean;
  /** タイムラインモード中かどうか */
  timelineMode: boolean;
  /** スナップショットへジャンプするハンドラー */
  onGoToSnapshot: (index: number) => void;
  /** タイムラインモードを切り替えるハンドラー */
  onSetTimelineMode: (enabled: boolean) => void;
  /** ライブ状態に戻るハンドラー */
  onGoToLive: () => void;
  /** スナップショットを削除するハンドラー */
  onDelete: (snapshotId: string) => void;
};

/**
 * ドラッグ&ドロップで並び替え可能なスナップショット項目コンポーネント
 */
export function SortableSnapshotItem({
  snapshot,
  index,
  isActive,
  timelineMode,
  onGoToSnapshot,
  onSetTimelineMode,
  onGoToLive,
  onDelete,
}: SortableSnapshotItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: snapshot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 group ${
        isActive
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-gray-50'
      }`}
    >
      {/* ドラッグハンドル（タイムラインモード中は非表示） */}
      {!timelineMode && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:outline-none flex-shrink-0"
          aria-label="並び替え"
        >
          <GripVertical size={14} />
        </button>
      )}

      {/* スナップショット番号 */}
      <span className="text-xs text-gray-400 min-w-[1.5rem] text-right flex-shrink-0">
        {index + 1}.
      </span>

      {/* ラベル（クリックでジャンプ） */}
      <button
        onClick={() => {
          if (!timelineMode) {
            onSetTimelineMode(true);
          }
          onGoToSnapshot(index);
        }}
        className={`flex-1 text-left text-sm truncate ${
          isActive ? 'text-blue-700 font-medium' : 'text-gray-700 hover:text-gray-900'
        }`}
        title={snapshot.description ?? snapshot.label}
      >
        {snapshot.label}
      </button>

      {/* ライブに戻るボタン（タイムラインモード中のアクティブ項目） */}
      {isActive && (
        <button
          onClick={onGoToLive}
          className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap transition-colors"
        >
          ライブへ
        </button>
      )}

      {/* 削除ボタン（タイムラインモード外のみ表示） */}
      {!timelineMode && (
        <button
          onClick={() => onDelete(snapshot.id)}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-gray-400 hover:text-red-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded"
          aria-label={`${snapshot.label}を削除`}
          title={`${snapshot.label}を削除`}
        >
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
}
