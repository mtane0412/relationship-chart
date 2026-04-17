/**
 * SettingsModalコンポーネント
 * アプリケーション設定を管理するモーダル
 *
 * セクション:
 *   1. AI設定 — OpenRouter APIキーとモデルの設定
 *   2. データ管理 — すべてのデータのリセット
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Trash2, Bot, Eye, EyeOff } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';
import {
  useAiSettingsStore,
  OPENROUTER_MODEL_SUGGESTIONS,
} from '@/stores/useAiSettingsStore';

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

  const openRouterApiKey = useAiSettingsStore((s) => s.openRouterApiKey);
  const openRouterModel = useAiSettingsStore((s) => s.openRouterModel);
  const setOpenRouterApiKey = useAiSettingsStore((s) => s.setOpenRouterApiKey);
  const setOpenRouterModel = useAiSettingsStore((s) => s.setOpenRouterModel);

  // APIキーの表示/非表示
  const [showApiKey, setShowApiKey] = useState(false);
  // フォーム内の一時的な値（入力中の値）
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('');

  // モーダルが開いた時に現在の設定値をフォームに反映
  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(openRouterApiKey);
      setModelInput(openRouterModel);
      setShowApiKey(false);
    }
  }, [isOpen, openRouterApiKey, openRouterModel]);

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
        handleClose();
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
  }, [isOpen]); // handleClose は isOpen の変化時に再生成されるため依存配列から除外

  // モーダルの外側をクリックした時にモーダルを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !isConfirmOpenRef.current
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]); // handleClose は isOpen の変化時に再生成されるため依存配列から除外

  /**
   * モーダルを閉じる前に設定を保存する
   */
  const handleClose = () => {
    // フォームの現在値をストアに保存してから閉じる
    setOpenRouterApiKey(apiKeyInput.trim());
    setOpenRouterModel(modelInput.trim() || openRouterModel);
    onClose();
  };

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
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
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
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-6">
          {/* AI設定セクション */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bot size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">AI設定（OpenRouter）</h3>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              テキストからの関係抽出に使用する AI の設定です。
              APIキーは{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                OpenRouter ダッシュボード
              </a>
              {' '}から取得できます。
            </p>

            {/* APIキー入力 */}
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="openrouter-api-key"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  APIキー
                </label>
                <div className="relative">
                  <input
                    id="openrouter-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-or-..."
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showApiKey ? 'APIキーを非表示' : 'APIキーを表示'}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  APIキーはブラウザの localStorage にのみ保存されます。
                </p>
              </div>

              {/* モデル入力 */}
              <div>
                <label
                  htmlFor="openrouter-model"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  モデル
                </label>
                <input
                  id="openrouter-model"
                  type="text"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  list="openrouter-model-suggestions"
                  placeholder="anthropic/claude-sonnet-4-5"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* モデルのサジェストリスト */}
                <datalist id="openrouter-model-suggestions">
                  {OPENROUTER_MODEL_SUGGESTIONS.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-gray-400">
                  OpenRouter のモデル ID を入力（例: anthropic/claude-3.5-haiku）
                </p>
              </div>
            </div>
          </div>

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
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            保存して閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
