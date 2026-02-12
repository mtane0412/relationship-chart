/**
 * ChartCreateModalコンポーネント
 * 新しい相関図を作成するためのモーダル
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * ChartCreateModalのProps
 */
type ChartCreateModalProps = {
  /** モーダルが開いているか */
  isOpen: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
};

/**
 * チャート作成モーダル
 */
export function ChartCreateModal({ isOpen, onClose }: ChartCreateModalProps) {
  const createChart = useGraphStore((state) => state.createChart);
  const [chartName, setChartName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // モーダルが開いた時に入力フィールドにフォーカス
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // デフォルト名を設定
      setChartName('');
    }
  }, [isOpen]);

  // Escapeキーでモーダルを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  /**
   * 作成ボタンをクリックした時の処理
   */
  const handleCreate = () => {
    const trimmedName = chartName.trim();
    if (!trimmedName) {
      // 空の名前では作成しない
      return;
    }

    void createChart(trimmedName);
    onClose();
  };

  /**
   * キーダウンイベント処理
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // IME変換中のEnterは無視（日本語入力の変換確定時の誤動作を防ぐ）
      if (e.nativeEvent.isComposing) {
        return;
      }
      e.preventDefault();
      handleCreate();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="chart-create-modal-title"
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2
            id="chart-create-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            新しい相関図を作成
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* 入力フィールド */}
        <div className="mb-6">
          <label
            htmlFor="chart-name-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            相関図名
          </label>
          <input
            ref={inputRef}
            id="chart-name-input"
            type="text"
            value={chartName}
            onChange={(e) => setChartName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={50}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例: プロジェクトA"
          />
        </div>

        {/* ボタン */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!chartName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
}
