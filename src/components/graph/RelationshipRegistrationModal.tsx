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
 * 編集時の初期データ
 */
type InitialRelationship = {
  /** 関係のタイプ */
  type: RelationshipType;
  /** sourceからtargetへのラベル */
  sourceToTargetLabel: string;
  /** targetからsourceへのラベル（dual-directedのみ） */
  targetToSourceLabel: string | null;
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
  /** デフォルトの関係タイプ（省略時はbidirectional） */
  defaultType?: RelationshipType;
  /** 編集時の初期データ（省略可能） */
  initialRelationship?: InitialRelationship;
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
 * 人物のミニアイコンを表示するヘルパーコンポーネント
 * ラベル入力の方向コンテキスト表示に使用
 */
function PersonMiniIcon({ person, testId }: { person: ModalPersonInfo; testId: string }) {
  if (person.imageDataUrl) {
    return (
      <img
        data-testid={testId}
        src={person.imageDataUrl}
        alt={person.name}
        className="w-6 h-6 rounded-full object-cover border border-gray-300"
      />
    );
  }
  return (
    <div
      data-testid={testId}
      className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold border border-gray-300"
    >
      {person.name.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

/**
 * 関係タイプに応じたプレースホルダーを返す
 */
function getPlaceholder(type: RelationshipType, isReverse = false): string {
  if (type === 'one-way') {
    return '例: 片想い、憧れ';
  }
  if (type === 'bidirectional') {
    return '例: 友人、親子、同僚';
  }
  if (type === 'dual-directed') {
    return isReverse ? '例: 無関心、嫌い' : '例: 好き、憧れ';
  }
  if (type === 'undirected') {
    return '例: 同一人物、別名';
  }
  return '例: 関係を入力';
}

/**
 * 関係登録モーダルコンポーネント
 */
export function RelationshipRegistrationModal({
  isOpen,
  sourcePerson,
  targetPerson,
  defaultType = 'bidirectional',
  initialRelationship,
  onSubmit,
  onCancel,
}: RelationshipRegistrationModalProps) {
  // 編集モードかどうか
  const isEditMode = Boolean(initialRelationship);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('bidirectional');
  const [sourceToTargetLabel, setSourceToTargetLabel] = useState('');
  const [targetToSourceLabel, setTargetToSourceLabel] = useState('');
  const labelInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開いたときにフォーカスと初期値設定
  useEffect(() => {
    if (isOpen) {
      labelInputRef.current?.focus();

      // 初期値を設定（編集モードの場合は initialRelationship から、そうでなければデフォルト値）
      if (initialRelationship) {
        setRelationshipType(initialRelationship.type);
        setSourceToTargetLabel(initialRelationship.sourceToTargetLabel);
        setTargetToSourceLabel(initialRelationship.targetToSourceLabel || '');
      } else {
        // フォームをリセット（defaultTypeを使用）
        setRelationshipType(defaultType);
        setSourceToTargetLabel('');
        setTargetToSourceLabel('');
      }
    }
  }, [isOpen, defaultType, initialRelationship]);

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
          {isEditMode ? '関係を編集' : '関係を登録'}
        </h2>

        {/* 2人の人物情報表示 + セグメントコントロール */}
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

          {/* セグメントコントロール（関係タイプ選択） */}
          <div className="flex gap-1 bg-gray-100 rounded-md p-1">
            {/* 片方向 (one-way) */}
            <button
              type="button"
              onClick={() => setRelationshipType('one-way')}
              aria-pressed={relationshipType === 'one-way'}
              aria-label="片方向"
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                relationshipType === 'one-way'
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'hover:bg-gray-200'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>

            {/* 双方向 (bidirectional) */}
            <button
              type="button"
              onClick={() => setRelationshipType('bidirectional')}
              aria-pressed={relationshipType === 'bidirectional'}
              aria-label="双方向"
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                relationshipType === 'bidirectional'
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'hover:bg-gray-200'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M5 12h14M11 6l-6 6 6 6M13 6l6 6-6 6" />
              </svg>
            </button>

            {/* 片方向×2 (dual-directed) */}
            <button
              type="button"
              onClick={() => setRelationshipType('dual-directed')}
              aria-pressed={relationshipType === 'dual-directed'}
              aria-label="片方向×2"
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                relationshipType === 'dual-directed'
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'hover:bg-gray-200'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M5 9h14M13 3l6 6-6 6" />
                <path d="M19 15h-14M11 21l-6-6 6-6" />
              </svg>
            </button>

            {/* 無方向 (undirected) */}
            <button
              type="button"
              onClick={() => setRelationshipType('undirected')}
              aria-pressed={relationshipType === 'undirected'}
              aria-label="無方向"
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                relationshipType === 'undirected'
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'hover:bg-gray-200'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M4 12h16" />
              </svg>
            </button>
          </div>

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
          {/* ラベル入力（方向コンテキスト付き） */}
          {relationshipType === 'dual-directed' ? (
            // dual-directed: 2つのラベル入力セット
            <>
              <div className="mb-4">
                <label
                  htmlFor="relationship-label"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  関係のラベル
                </label>
                {/* 方向インジケーター（A → B） */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <PersonMiniIcon person={sourcePerson} testId="mini-icon-source-forward" />
                  <span>→</span>
                  <PersonMiniIcon person={targetPerson} testId="mini-icon-target-forward" />
                </div>
                <input
                  ref={labelInputRef}
                  id="relationship-label"
                  type="text"
                  value={sourceToTargetLabel}
                  onChange={(e) => setSourceToTargetLabel(e.target.value)}
                  placeholder={getPlaceholder('dual-directed', false)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="reverse-relationship-label"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  逆方向のラベル
                </label>
                {/* 方向インジケーター（A ← B） */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <PersonMiniIcon person={sourcePerson} testId="mini-icon-source-reverse" />
                  <span>←</span>
                  <PersonMiniIcon person={targetPerson} testId="mini-icon-target-reverse" />
                </div>
                <input
                  id="reverse-relationship-label"
                  type="text"
                  value={targetToSourceLabel}
                  onChange={(e) => setTargetToSourceLabel(e.target.value)}
                  placeholder={getPlaceholder('dual-directed', true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          ) : (
            // one-way / bidirectional / undirected: 単一ラベル入力
            <div className="mb-4">
              <label
                htmlFor="relationship-label"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                関係のラベル
              </label>
              {/* 方向インジケーター */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <PersonMiniIcon person={sourcePerson} testId="mini-icon-source-single" />
                <span>
                  {relationshipType === 'one-way' && '→'}
                  {relationshipType === 'bidirectional' && '↔'}
                  {relationshipType === 'undirected' && '—'}
                </span>
                <PersonMiniIcon person={targetPerson} testId="mini-icon-target-single" />
              </div>
              <input
                ref={labelInputRef}
                id="relationship-label"
                type="text"
                value={sourceToTargetLabel}
                onChange={(e) => setSourceToTargetLabel(e.target.value)}
                placeholder={getPlaceholder(relationshipType)}
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
              {isEditMode ? '更新' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
