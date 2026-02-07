/**
 * RelationshipRegistrationModalコンポーネント
 * エッジ接続時に関係を登録するためのモーダル
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { RelationshipType } from '@/types/relationship';

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
  onSubmit: (
    type: RelationshipType,
    sourceToTargetLabel: string,
    targetToSourceLabel: string | null
  ) => void;
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
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('bidirectional');
  const [sourceToTargetLabel, setSourceToTargetLabel] = useState('');
  const [targetToSourceLabel, setTargetToSourceLabel] = useState('');
  const labelInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開いたときにラベル入力にフォーカス
  useEffect(() => {
    if (isOpen) {
      labelInputRef.current?.focus();
      // フォームをリセット
      setRelationshipType('bidirectional');
      setSourceToTargetLabel('');
      setTargetToSourceLabel('');
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

  // 登録ボタンの有効/無効を判定
  const isSubmitDisabled =
    !sourceToTargetLabel.trim() ||
    (relationshipType === 'dual-directed' && !targetToSourceLabel.trim());

  // 登録処理
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    const finalTargetToSourceLabel =
      relationshipType === 'dual-directed' ? targetToSourceLabel.trim() : null;

    onSubmit(relationshipType, sourceToTargetLabel.trim(), finalTargetToSourceLabel);
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
                {sourcePerson.name.charAt(0).toUpperCase() || '?'}
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
                {targetPerson.name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <span className="font-medium">{targetPerson.name}</span>
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}>
          {/* 関係タイプ選択 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              関係のタイプ
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="relationshipType"
                  value="bidirectional"
                  checked={relationshipType === 'bidirectional'}
                  onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">双方向（例: 親子）↔</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="relationshipType"
                  value="dual-directed"
                  checked={relationshipType === 'dual-directed'}
                  onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">片方向×2（例: 好きと無関心）→ ←</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="relationshipType"
                  value="one-way"
                  checked={relationshipType === 'one-way'}
                  onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">片方向×1（例: 片想い）→</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="relationshipType"
                  value="undirected"
                  checked={relationshipType === 'undirected'}
                  onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">無方向（例: 同一人物）</span>
              </label>
            </div>
          </div>

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
              value={sourceToTargetLabel}
              onChange={(e) => setSourceToTargetLabel(e.target.value)}
              placeholder="例: 友人、上司、同僚"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* dual-directed選択時のみ2つ目のラベル入力を表示 */}
          {relationshipType === 'dual-directed' && (
            <div className="mb-4">
              <label
                htmlFor="reverse-relationship-label"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                逆方向のラベル
              </label>
              <input
                id="reverse-relationship-label"
                type="text"
                value={targetToSourceLabel}
                onChange={(e) => setTargetToSourceLabel(e.target.value)}
                placeholder="例: 無関心、嫌い"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
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
