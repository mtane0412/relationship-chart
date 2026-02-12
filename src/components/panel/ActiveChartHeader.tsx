/**
 * ActiveChartHeaderコンポーネント
 * 現在アクティブなチャートの情報を表示し、名前変更・削除・チャート一覧を開く操作を提供する
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Network, FilePlus, Trash2, FolderOpen } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';
import { ChartBrowserModal } from './ChartBrowserModal';
import { ChartCreateModal } from './ChartCreateModal';

/**
 * アクティブチャートヘッダーコンポーネント
 */
export function ActiveChartHeader() {
  const chartMetas = useGraphStore((state) => state.chartMetas);
  const activeChartId = useGraphStore((state) => state.activeChartId);
  const deleteChart = useGraphStore((state) => state.deleteChart);
  const renameChart = useGraphStore((state) => state.renameChart);
  const openConfirm = useDialogStore((state) => state.openConfirm);

  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState('');
  const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef<boolean>(false);

  const activeChart = chartMetas.find((m) => m.id === activeChartId);

  // 編集モードに切り替わった時に入力フィールドにフォーカス
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  /**
   * 名前クリックで編集モード開始
   */
  const handleNameClick = () => {
    if (!activeChart) return;
    setEditName(activeChart.name);
    setIsRenaming(true);
  };

  /**
   * 名前変更を保存
   */
  const handleRenameSave = () => {
    // 既に保存処理中またはキャンセル済みの場合は何もしない
    if (isSavingRef.current) return;

    if (!activeChart) return;

    // 保存処理開始をマーク
    isSavingRef.current = true;

    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== activeChart.name) {
      void renameChart(activeChart.id, trimmedName);
    }
    setIsRenaming(false);

    // フラグをリセット
    setTimeout(() => {
      isSavingRef.current = false;
    }, 0);
  };

  /**
   * 名前変更をキャンセル
   */
  const handleRenameCancel = () => {
    // 保存処理をブロック
    isSavingRef.current = true;

    setIsRenaming(false);
    if (activeChart) {
      setEditName(activeChart.name);
    }

    // フラグをリセット
    setTimeout(() => {
      isSavingRef.current = false;
    }, 0);
  };

  /**
   * 入力フィールドのキーダウンイベント処理
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Escapeキーが押された時点で保存処理をブロック（blurより先に設定）
      isSavingRef.current = true;
      handleRenameCancel();
    }
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

  /**
   * 削除を実行
   */
  const handleDelete = async () => {
    if (!activeChart) return;

    // 確認ダイアログ表示中のチャート切り替えによるstale deleteを防ぐため、
    // 削除対象のIDと名前を事前にキャプチャ
    const chartId = activeChart.id;
    const chartName = activeChart.name;

    const confirmed = await openConfirm({
      title: 'チャートを削除',
      message: `「${chartName}」を削除してもよろしいですか？\nこの操作は元に戻せません。`,
      confirmLabel: '削除',
      isDanger: true,
    });

    if (confirmed) {
      void deleteChart(chartId);
    }
  };

  /**
   * チャート一覧モーダルを開く
   */
  const handleOpenBrowserModal = () => {
    setIsBrowserModalOpen(true);
  };

  /**
   * チャート一覧モーダルを閉じる
   */
  const handleCloseBrowserModal = () => {
    setIsBrowserModalOpen(false);
  };

  // チャートがない場合はメッセージを表示
  if (chartMetas.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        チャートがありません
      </div>
    );
  }

  // アクティブチャートがない場合は何も表示しない
  if (!activeChart) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        {/* アクションボタン行 */}
        <div className="flex items-center gap-2">
          {/* 新規作成ボタン */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="新規作成"
            title="新しい相関図を作成"
          >
            <FilePlus size={18} />
          </button>

          {/* 開くボタン */}
          <button
            type="button"
            onClick={handleOpenBrowserModal}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="開く"
            title="他の相関図を開く"
          >
            <FolderOpen size={18} />
          </button>
        </div>

        {/* チャート名とボタン */}
        <div className="flex items-center gap-2">
          {/* 相関図アイコン */}
          <Network size={18} className="text-gray-500 flex-shrink-0" />

          {/* チャート名（編集モードで切り替わる） */}
          {isRenaming ? (
            // 編集モード - 入力フィールド
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRenameSave}
              maxLength={50}
              className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="チャート名を編集"
            />
          ) : (
            // 通常モード - クリック可能な名前
            <button
              type="button"
              onClick={handleNameClick}
              className="flex-1 text-left px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded transition-colors"
              aria-label="チャート名をクリックして編集"
            >
              {activeChart.name}
            </button>
          )}

          {/* ゴミ箱ボタン */}
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
            aria-label="削除"
            title="削除"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* チャート情報（メタデータ） */}
        {!isRenaming && (
          <div className="text-xs text-gray-500 px-3">
            {activeChart.personCount}{' '}
            {activeChart.personCount === 1 ? 'node' : 'nodes'},{' '}
            {activeChart.relationshipCount}{' '}
            {activeChart.relationshipCount === 1 ? 'edge' : 'edges'}
          </div>
        )}
      </div>

      {/* チャート作成モーダル */}
      <ChartCreateModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
      />

      {/* チャート一覧モーダル */}
      <ChartBrowserModal
        isOpen={isBrowserModalOpen}
        onClose={handleCloseBrowserModal}
      />
    </>
  );
}
