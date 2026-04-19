/**
 * スナップショット保存ダイアログコンポーネント
 *
 * ユーザーが「スナップショットを保存」ボタンを押したときに表示されるダイアログ。
 * ラベル（必須）と説明（任意）を入力して、スナップショットとして保存できる。
 *
 * 特徴:
 * - ラベルが空の場合は保存ボタンを無効化
 * - Enterキーで保存（IME変換中は無視）
 * - Escapeキーでキャンセル
 * - 背景クリックでキャンセル
 */

'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * SnapshotCaptureDialogのプロパティ
 * @property isOpen - ダイアログを表示するかどうか
 * @property onCapture - 保存ボタン押下時のコールバック（label, description を受け取る）
 * @property onCancel - キャンセル時のコールバック
 */
type SnapshotCaptureDialogProps = {
  isOpen: boolean;
  onCapture: (label: string, description?: string) => void;
  onCancel: () => void;
};

/**
 * スナップショット保存ダイアログ
 */
export function SnapshotCaptureDialog({ isOpen, onCapture, onCancel }: SnapshotCaptureDialogProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const labelInputRef = useRef<HTMLInputElement>(null);

  // ダイアログが開くたびに入力値をリセットしてフォーカス
  useEffect(() => {
    if (isOpen) {
      setLabel('');
      setDescription('');
      // 次フレームでフォーカス（DOM更新後）
      const timer = setTimeout(() => {
        labelInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escapeキーでキャンセル
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isValid = label.trim().length > 0;

  /**
   * 保存処理
   */
  const handleCapture = () => {
    if (!isValid) return;
    onCapture(label.trim(), description.trim() || undefined);
  };

  /**
   * ラベル入力のEnterキー処理（IME変換中は無視）
   */
  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // IME変換中のEnterは無視（日本語入力の変換確定時の誤動作を防ぐ）
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleCapture();
    }
  };

  /**
   * 背景クリックでキャンセル
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snapshot-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <h2 id="snapshot-dialog-title" className="text-lg font-bold mb-4">
          スナップショットを保存
        </h2>

        {/* ラベル入力（必須） */}
        <div className="mb-4">
          <label
            htmlFor="snapshot-label"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            ラベル
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          </label>
          <input
            ref={labelInputRef}
            id="snapshot-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleLabelKeyDown}
            placeholder="例: 第1話、2024年春"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            aria-required="true"
          />
        </div>

        {/* 説明入力（任意） */}
        <div className="mb-6">
          <label
            htmlFor="snapshot-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            説明
            <span className="text-gray-400 ml-1 text-xs font-normal">（任意）</span>
          </label>
          <input
            id="snapshot-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="このシーンの説明を入力"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors text-sm"
          >
            キャンセル
          </button>
          <button
            onClick={handleCapture}
            disabled={!isValid}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
