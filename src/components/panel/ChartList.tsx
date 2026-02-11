/**
 * ChartListコンポーネント
 * チャート一覧をドロップダウンで表示し、切り替え・削除・名前変更機能を提供する
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, Pencil, Trash2 } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';

/**
 * チャート一覧コンポーネント
 */
export function ChartList() {
  const chartMetas = useGraphStore((state) => state.chartMetas);
  const activeChartId = useGraphStore((state) => state.activeChartId);
  const switchChart = useGraphStore((state) => state.switchChart);
  const createChart = useGraphStore((state) => state.createChart);
  const deleteChart = useGraphStore((state) => state.deleteChart);
  const renameChart = useGraphStore((state) => state.renameChart);
  const openConfirm = useDialogStore((state) => state.openConfirm);

  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeChart = chartMetas.find((m) => m.id === activeChartId);

  // 編集モードに切り替わった時に入力フィールドにフォーカス
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  /**
   * ドロップダウンでチャートを選択した時の処理
   */
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === '__create_new__') {
      // 新規作成
      void createChart();
    } else if (value !== activeChartId) {
      // チャート切り替え
      void switchChart(value);
    }
  };

  /**
   * 歯車アイコンをクリックした時の処理
   */
  const handleSettingsClick = () => {
    setShowMenu(!showMenu);
  };

  /**
   * 名前変更を開始
   */
  const handleRenameStart = () => {
    if (!activeChart) return;
    setEditName(activeChart.name);
    setIsRenaming(true);
    setShowMenu(false);
  };

  /**
   * 名前変更を保存
   */
  const handleRenameSave = () => {
    if (!activeChart) return;
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== activeChart.name) {
      void renameChart(activeChart.id, trimmedName);
    }
    setIsRenaming(false);
  };

  /**
   * 名前変更をキャンセル
   */
  const handleRenameCancel = () => {
    setIsRenaming(false);
    if (activeChart) {
      setEditName(activeChart.name);
    }
  };

  /**
   * 入力フィールドのキーダウンイベント処理
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameSave();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  /**
   * 削除を実行
   */
  const handleDelete = async () => {
    if (!activeChart) return;

    setShowMenu(false);

    const confirmed = await openConfirm({
      title: 'チャートを削除',
      message: `「${activeChart.name}」を削除してもよろしいですか？\nこの操作は元に戻せません。`,
      confirmLabel: '削除',
      isDanger: true,
    });

    if (confirmed) {
      void deleteChart(activeChart.id);
    }
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
    <div className="space-y-3">
      {/* ドロップダウンと歯車アイコン */}
      <div className="flex items-center gap-2">
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRenameSave}
            maxLength={50}
            className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <>
            <select
              value={activeChartId || ''}
              onChange={handleChange}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="相関図を選択"
            >
              {chartMetas.map((meta) => (
                <option key={meta.id} value={meta.id}>
                  {meta.name}
                </option>
              ))}
              <option value="__create_new__">+ 新規作成</option>
            </select>

            {/* 歯車アイコン */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={handleSettingsClick}
                className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                aria-label="設定"
                title="設定"
              >
                <Settings size={18} />
              </button>

              {/* メニュー */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    type="button"
                    onClick={handleRenameStart}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil size={16} />
                    名前を変更
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    削除
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* チャート情報 */}
      {activeChart && !isRenaming && (
        <div className="text-xs text-gray-500">
          {activeChart.personCount}人 • {activeChart.relationshipCount}件の関係
        </div>
      )}
    </div>
  );
}
