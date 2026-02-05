/**
 * PersonRegistrationModalコンポーネント
 * キャンバスにD&D/ペーストされた画像から人物を登録するためのモーダル
 */

import { useState, useEffect, useRef } from 'react';

/**
 * PersonRegistrationModalのProps
 */
type PersonRegistrationModalProps = {
  /** モーダルの表示/非表示 */
  isOpen: boolean;
  /** ドロップ/ペーストされた画像のData URL（オプショナル） */
  imageDataUrl?: string;
  /** 登録ボタンが押されたときのコールバック */
  onSubmit: (name: string) => void;
  /** キャンセルボタンが押されたときのコールバック */
  onCancel: () => void;
};

/**
 * 人物登録モーダルコンポーネント
 * 画像プレビュー + 名前入力フォームを表示する
 */
export function PersonRegistrationModal({
  isOpen,
  imageDataUrl,
  onSubmit,
  onCancel,
}: PersonRegistrationModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // モーダルが開かれたときに入力フィールドにフォーカス
  useEffect(() => {
    if (isOpen) {
      setName(''); // 名前をリセット
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Escapeキーでキャンセル
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // フォーム送信ハンドラ
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">人物を登録</h2>

        {/* 画像プレビュー（画像がある場合のみ） */}
        {imageDataUrl && (
          <div className="mb-4 flex justify-center">
            <img
              src={imageDataUrl}
              alt="プレビュー"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-md"
            />
          </div>
        )}

        {/* 名前入力フォーム */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="person-name" className="block text-sm font-medium text-gray-700 mb-2">
              名前
            </label>
            <input
              id="person-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="名前を入力してください"
              required
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim()}
            >
              登録
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
