/**
 * SortableSnapshotItemコンポーネント
 *
 * @dnd-kit/sortableを使用してドラッグ&ドロップで並び替え可能なスナップショット項目。
 * SnapshotList内で使用され、GripVerticalアイコンのドラッグハンドルで並び替えを行う。
 *
 * 注意: タイムラインモード中はドラッグハンドル・編集ボタン・削除ボタンを非表示にする。
 * activeSnapshotIndexがインデックスベースのため、再生中の並び替えは禁止。
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, Pencil } from 'lucide-react';
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
  /** スナップショットのラベルを変更するハンドラー */
  onRenameSnapshot: (snapshotId: string, newLabel: string) => void;
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
  onRenameSnapshot,
}: SortableSnapshotItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: snapshot.id });

  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  /** blur/Enter/Escapeの競合を防ぐフラグ */
  const isSavingRef = useRef<boolean>(false);

  // 編集モードに切り替わった時に入力フィールドにフォーカスして全選択
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  /**
   * 編集ボタンクリックで編集モード開始
   */
  const handleEditClick = () => {
    setEditLabel(snapshot.label);
    setIsEditing(true);
  };

  /**
   * ラベル変更を保存する。
   * 空文字・変更なしの場合は保存しない。
   */
  const handleRenameSave = () => {
    // 既に保存処理中またはキャンセル済みの場合は何もしない
    if (isSavingRef.current) return;

    isSavingRef.current = true;

    const trimmedLabel = editLabel.trim();
    if (trimmedLabel && trimmedLabel !== snapshot.label) {
      onRenameSnapshot(snapshot.id, trimmedLabel);
    }
    setIsEditing(false);

    setTimeout(() => {
      isSavingRef.current = false;
    }, 0);
  };

  /**
   * ラベル変更をキャンセルする。
   * Escapeキー押下時に呼ばれ、blurによる誤保存を防ぐためisSavingRefを先にセットする。
   */
  const handleRenameCancel = () => {
    // 保存処理をブロック（Escape→blurの順で発火した場合にblur側の保存を防ぐ）
    isSavingRef.current = true;

    setIsEditing(false);
    setEditLabel(snapshot.label);

    setTimeout(() => {
      isSavingRef.current = false;
    }, 0);
  };

  /**
   * 入力フィールドのキーダウンイベント処理
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // IME変換中のEnterは無視（日本語入力の変換確定時の誤動作を防ぐ）
      if (e.nativeEvent.isComposing) {
        return;
      }
      e.preventDefault();
      handleRenameSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Escapeキーが押された時点で保存処理をブロック（blurより先に設定）
      isSavingRef.current = true;
      handleRenameCancel();
    }
  };

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

      {/* ラベル（編集モードでinputに切り替わる） */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleRenameSave}
          onClick={(e) => e.stopPropagation()}
          maxLength={50}
          className="flex-1 px-1 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
          aria-label="ラベルを編集"
        />
      ) : (
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
      )}

      {/* ライブに戻るボタン（タイムラインモード中のアクティブ項目） */}
      {isActive && (
        <button
          onClick={onGoToLive}
          className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap transition-colors"
        >
          ライブへ
        </button>
      )}

      {/* 編集ボタン（タイムラインモード外かつ非編集中のみ表示） */}
      {!timelineMode && !isEditing && (
        <button
          onClick={handleEditClick}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-gray-400 hover:text-blue-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded"
          aria-label={`${snapshot.label}を編集`}
          title={`${snapshot.label}を編集`}
        >
          <Pencil size={14} />
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
