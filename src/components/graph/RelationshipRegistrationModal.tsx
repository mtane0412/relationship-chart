/**
 * RelationshipRegistrationModalコンポーネント
 * エッジ接続時に関係を登録するためのモーダル
 */

'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * モーダルで表示する人物情報
 */
type ModalPersonInfo = {
  /** 人物名 */
  name: string;
  /** 人物の画像データURL（任意） */
  imageDataUrl?: string;
};

/**
 * RelationshipRegistrationModalのプロパティ
 */
type RelationshipRegistrationModalProps = {
  /** モーダルの表示/非表示 */
  isOpen: boolean;
  /** 接続元の人物情報 */
  sourcePerson: ModalPersonInfo;
  /** 接続先の人物情報 */
  targetPerson: ModalPersonInfo;
  /** 登録ボタンクリック時のコールバック */
  onSubmit: (label: string, isDirected: boolean) => void;
  /** キャンセルボタンクリック時のコールバック */
  onCancel: () => void;
};

/**
 * 関係登録モーダルコンポーネント
 */
export function RelationshipRegistrationModal({
  isOpen,
  sourcePerson,
  targetPerson,
  onSubmit,
  onCancel,
}: RelationshipRegistrationModalProps) {
  const [label, setLabel] = useState('');
  const [isDirected, setIsDirected] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開いたときにラベル入力にフォーカス
  useEffect(() => {
    if (isOpen) {
      labelInputRef.current?.focus();
      // フォームをリセット
      setLabel('');
      setIsDirected(false);
    }
  }, [isOpen]);

  // Escapeキーでキャンセル
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // 登録処理
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (label.trim()) {
      onSubmit(label.trim(), isDirected);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(event) => {
        // キーボードトリガーや合成クリック（detail === 0）は無視
        if (event.detail === 0) {
          return;
        }
        onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="relationship-modal-title"
        className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="relationship-modal-title"
          className="text-xl font-bold text-gray-900 mb-4"
        >
          関係を登録
        </h2>

        {/* 2人の人物情報表示 */}
        <div className="mb-4 flex items-center justify-center gap-3 text-gray-700">
          {/* 接続元の人物 */}
          <div className="flex items-center gap-2">
            {sourcePerson.imageDataUrl ? (
              <img
                src={sourcePerson.imageDataUrl}
                alt={sourcePerson.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div
                data-testid="person-initial-source"
                className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold border border-gray-300"
              >
                {sourcePerson.name.charAt(0)}
              </div>
            )}
            <span className="font-medium">{sourcePerson.name}</span>
          </div>

          {/* 矢印 */}
          <span className="text-gray-400 text-lg">→</span>

          {/* 接続先の人物 */}
          <div className="flex items-center gap-2">
            {targetPerson.imageDataUrl ? (
              <img
                src={targetPerson.imageDataUrl}
                alt={targetPerson.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div
                data-testid="person-initial-target"
                className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold border border-gray-300"
              >
                {targetPerson.name.charAt(0)}
              </div>
            )}
            <span className="font-medium">{targetPerson.name}</span>
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}>
          {/* ラベル入力 */}
          <div className="mb-4">
            <label
              htmlFor="relationship-label"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              関係のラベル
            </label>
            <input
              ref={labelInputRef}
              id="relationship-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例: 友人、上司、同僚"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 方向性チェックボックス */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDirected}
                onChange={(e) => setIsDirected(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">方向性あり</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              方向性ありの場合、矢印が表示されます
            </p>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!label.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              登録
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
