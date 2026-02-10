/**
 * 確認ダイアログコンポーネント
 *
 * アプリケーション全体で使用される確認ダイアログとアラートダイアログのUIコンポーネント。
 * useDialogStoreと連携して動作します。
 *
 * 特徴:
 * - Escapeキーで閉じる
 * - 背景クリックで閉じる
 * - isDangerがtrueの場合、確認ボタンが赤色になる
 * - variantがalertの場合、キャンセルボタンを非表示にする
 */

'use client';

import { useEffect } from 'react';
import { useDialogStore } from '@/stores/useDialogStore';

/**
 * 確認ダイアログコンポーネント
 */
export function ConfirmDialog() {
  const { isOpen, variant, title, message, confirmLabel, cancelLabel, isDanger, closeDialog } =
    useDialogStore();

  // Escapeキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeDialog(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDialog]);

  if (!isOpen) return null;

  // 背景クリックで閉じる
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeDialog(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <h2 id="dialog-title" className="text-lg font-bold mb-4">
          {title}
        </h2>

        {/* メッセージ */}
        <p className="text-gray-700 mb-6 whitespace-pre-wrap">{message}</p>

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          {/* キャンセルボタン（confirmバリアントのみ表示） */}
          {variant === 'confirm' && (
            <button
              onClick={() => closeDialog(false)}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors"
            >
              {cancelLabel}
            </button>
          )}

          {/* 確認ボタン */}
          <button
            onClick={() => closeDialog(true)}
            className={`px-4 py-2 rounded font-medium text-white transition-colors ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
