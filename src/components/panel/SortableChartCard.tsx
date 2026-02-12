/**
 * SortableChartCardコンポーネント
 * ドラッグ&ドロップで並び替え可能なチャートカード
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { ChartMeta } from '@/types/chart';
import { ChartPreview } from './ChartPreview';

/**
 * SortableChartCardコンポーネントのプロップス
 */
export type SortableChartCardProps = {
  /** チャートのメタデータ */
  chart: ChartMeta;
  /** アクティブチャートかどうか */
  isActive: boolean;
  /** チャート切り替えハンドラー */
  onSwitch: (chartId: string) => void;
  /** チャート削除ハンドラー */
  onDelete: (chartId: string) => void;
  /** チャート名変更ハンドラー */
  onRename: (chartId: string, newName: string) => void;
};

/**
 * ドラッグ&ドロップで並び替え可能なチャートカード
 */
export function SortableChartCard({
  chart,
  isActive,
  onSwitch,
  onDelete,
  onRename,
}: SortableChartCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chart.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chart.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 編集モードに切り替わった時に入力フィールドにフォーカス
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  /**
   * カードクリックハンドラー
   */
  const handleCardClick = () => {
    if (!isEditing) {
      onSwitch(chart.id);
    }
  };

  /**
   * 名前クリックハンドラー
   */
  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // カードのクリックイベントを伝播させない
    setEditName(chart.name);
    setIsEditing(true);
  };

  /**
   * 名前変更を保存
   */
  const handleRenameSave = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== chart.name) {
      onRename(chart.id, trimmedName);
    }
    setIsEditing(false);
  };

  /**
   * 名前変更をキャンセル
   */
  const handleRenameCancel = () => {
    setEditName(chart.name);
    setIsEditing(false);
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
      handleRenameCancel();
    }
  };

  /**
   * 削除ボタンクリックハンドラー
   */
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // カードのクリックイベントを伝播させない
    onDelete(chart.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
    >
      {/* ドラッグハンドル（ホバー時のみ表示） */}
      <div
        {...attributes}
        {...listeners}
        className="p-3 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="並び替え"
      >
        <GripVertical size={18} />
      </div>

      {/* チャートカード本体 */}
      <div
        onClick={handleCardClick}
        className="flex-1 text-left p-3 flex flex-col gap-2 min-w-0 cursor-pointer"
      >
        {/* チャート名と「Active」バッジ */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditing ? (
            // 編集モード - 入力フィールド
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRenameSave}
              onClick={(e) => e.stopPropagation()}
              maxLength={50}
              className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="チャート名を編集"
            />
          ) : (
            // 通常モード - クリック可能な名前
            <button
              type="button"
              onClick={handleNameClick}
              className="font-medium text-sm truncate hover:text-blue-600 transition-colors text-left"
            >
              {chart.name}
            </button>
          )}
          {isActive && !isEditing && (
            <span className="px-2 py-0.5 text-xs font-semibold text-white bg-blue-500 rounded flex-shrink-0">
              Active
            </span>
          )}
        </div>

        {/* メタデータとアイコンプレビュー（横並び） */}
        {!isEditing && (
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 flex-shrink-0">
              {chart.personCount} {chart.personCount === 1 ? 'node' : 'nodes'},{' '}
              {chart.relationshipCount}{' '}
              {chart.relationshipCount === 1 ? 'edge' : 'edges'}
            </div>
            <ChartPreview chartId={chart.id} isActive={isActive} />
          </div>
        )}
      </div>

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={handleDeleteClick}
        className="m-2 p-2 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors flex-shrink-0"
        aria-label="削除"
        title="削除"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
