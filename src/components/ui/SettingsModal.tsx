/**
 * SettingsModalコンポーネント
 * アプリケーション設定を管理するモーダル
 */

'use client';

import { useEffect, useRef } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';

/**
 * SettingsModalのProps
 */
type SettingsModalProps = {
  /** モーダルの表示/非表示 */
  isOpen: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
};

/**
 * 設定モーダルコンポーネント
 */
export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const resetAllData = useGraphStore((state) => state.resetAllData);
  const openConfirm = useDialogStore((state) => state.openConfirm);
  const modalRef = useRef<HTMLDivElement>(null);
  const isConfirmOpenRef = useRef(false);

  // モーダル表示時に最初のフォーカス可能な要素にフォーカス
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [isOpen]);

  // Escapeキーでモーダルを閉じる & フォーカストラップ
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isConfirmOpenRef.current) {
        onClose();
        return;
      }

      // Tab/Shift+Tabでフォーカストラップ
      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // モーダルの外側をクリックした時にモーダルを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !isConfirmOpenRef.current
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // すべてのデータをリセット
  const handleResetAllData = async () => {
    try {
      isConfirmOpenRef.current = true;
      const confirmed = await openConfirm({
        title: 'すべてのデータをリセット',
        message:
          'すべての相関図とデータを削除してリセットしてもよろしいですか？\nこの操作は元に戻せません。',
        confirmLabel: 'リセット',
        isDanger: true,
      });

      if (confirmed) {
        await resetAllData();
        onClose();
      }
    } catch (error) {
      console.error('データリセット中にエラーが発生しました:', error);
    } finally {
      isConfirmOpenRef.current = false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="settings-modal-title" className="text-lg font-bold text-gray-900">
            設定
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* データ管理セクション */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">データ管理</h3>
            <button
              type="button"
              onClick={handleResetAllData}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              <span>すべてのデータをリセット</span>
            </button>
            <p className="mt-2 text-xs text-gray-500">
              すべての相関図とデータを削除し、初期状態に戻します。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
