/**
 * ChartListItemコンポーネント
 * チャート一覧の各アイテムを表示し、削除・名前変更機能を提供する
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';
import type { ChartMeta } from '@/types/chart';

interface ChartListItemProps {
  /** チャートメタデータ */
  meta: ChartMeta;
  /** アクティブなチャートかどうか */
  isActive: boolean;
  /** チャートをクリックした時のコールバック */
  onClick?: (chartId: string) => void;
}

/**
 * チャート一覧の各アイテムコンポーネント
 */
export function ChartListItem({ meta, isActive, onClick }: ChartListItemProps) {
  const deleteChart = useGraphStore((state) => state.deleteChart);
  const renameChart = useGraphStore((state) => state.renameChart);
  const openConfirm = useDialogStore((state) => state.openConfirm);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(meta.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);

  // 編集モードに切り替わった時に入力フィールドにフォーカス
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  /**
   * チャートをクリックした時の処理
   */
  const handleClick = () => {
    if (onClick && !isEditing) {
      onClick(meta.id);
    }
  };

  /**
   * チャート名をダブルクリックした時の処理（編集モードに切り替え）
   */
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(meta.name);
  };

  /**
   * 名前変更を保存する
   */
  const saveName = () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== meta.name) {
      void renameChart(meta.id, trimmedName);
    }
    setIsEditing(false);

    // Reset on next tick after React has processed the state update
    setTimeout(() => {
      isSavingRef.current = false;
    }, 0);
  };

  /**
   * 名前変更をキャンセルする
   */
  const cancelEdit = () => {
    setIsEditing(false);
    setEditName(meta.name);
  };

  /**
   * 入力フィールドのキーダウンイベント処理
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveName();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  /**
   * 入力フィールドのBlurイベント処理
   */
  const handleBlur = () => {
    saveName();
  };

  /**
   * 削除ボタンをクリックした時の処理
   */
  const handleDelete = async (e: React.MouseEvent) => {
    // イベント伝播を停止（チャート切り替えをトリガーしない）
    e.stopPropagation();

    const confirmed = await openConfirm({
      title: 'チャートを削除',
      message: `「${meta.name}」を削除してもよろしいですか？\nこの操作は元に戻せません。`,
      confirmLabel: '削除',
      isDanger: true,
    });

    if (confirmed) {
      void deleteChart(meta.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 rounded-lg border ${
        isEditing ? 'cursor-default' : 'cursor-pointer'
      } ${
        isActive
          ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              maxLength={50}
              className="w-full px-2 py-1 text-sm font-medium text-gray-900 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="font-medium text-sm text-gray-900"
              onDoubleClick={handleDoubleClick}
              tabIndex={0}
              role="button"
              aria-label="相関図名を編集（ダブルクリックまたはEnterキーで編集）"
              title="相関図名を編集（ダブルクリックまたはEnterキーで編集）"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'F2') {
                  e.preventDefault();
                  handleDoubleClick(e as unknown as React.MouseEvent);
                }
              }}
            >
              {meta.name}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {meta.personCount}人 • {meta.relationshipCount}件の関係
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="ml-2 p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
          aria-label="相関図を削除"
          title="相関図を削除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
