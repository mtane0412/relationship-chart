/**
 * RelationshipRegistrationModalコンポーネント
 * エッジ接続時に関係を登録するためのモーダル（v11 プロパティグラフ方式）
 *
 * v11 の設計:
 *   - type: エッジ型ラベル（例: "友人", "同僚"）を自由入力
 *   - label: 表示ラベル（null の場合は type を使用）
 *   - symmetric: true=矢印なし（無向）、false=矢印あり（有向）
 *   - dual-directed は廃止（2本の有向エッジを個別に登録）
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Minus } from 'lucide-react';
import { MAX_RELATIONSHIP_LABEL_LENGTH } from '@/lib/validation-constants';
import { SUGGESTED_TYPES } from '@/types/relationship';

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
 * 編集時の初期データ（v11 形式）
 */
type InitialRelationship = {
  /** エッジ型ラベル */
  type: string;
  /** 表示ラベル（null の場合は type を使用） */
  label: string | null;
  /** true=無向表示（矢印なし）、false=有向 */
  symmetric: boolean;
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
  /** デフォルトの symmetric 値（省略時は false = 有向） */
  defaultSymmetric?: boolean;
  /** 編集時の初期データ（省略可能） */
  initialRelationship?: InitialRelationship;
  /** 登録ボタンクリック時のコールバック */
  onSubmit: (
    type: string,
    label: string | null,
    symmetric: boolean
  ) => void;
  /** キャンセルボタンクリック時のコールバック */
  onCancel: () => void;
};

/**
 * 関係登録モーダルコンポーネント（v11）
 */
export function RelationshipRegistrationModal({
  isOpen,
  sourcePerson,
  targetPerson,
  defaultSymmetric = false,
  initialRelationship,
  onSubmit,
  onCancel,
}: RelationshipRegistrationModalProps) {
  // 編集モードかどうか
  const isEditMode = Boolean(initialRelationship);
  /** エッジ型ラベル（例: "友人", "同僚"） */
  const [edgeType, setEdgeType] = useState('');
  /** 無向フラグ: true=矢印なし、false=矢印あり */
  const [symmetric, setSymmetric] = useState(defaultSymmetric);
  const typeInputRef = useRef<HTMLInputElement>(null);
  // モーダルが「新たに開いた」直後のフォーカス制御フラグ
  const justOpenedRef = useRef(false);

  // モーダルが開いたときに初期値を設定
  useEffect(() => {
    if (isOpen) {
      justOpenedRef.current = true;

      if (initialRelationship) {
        setEdgeType(initialRelationship.type);
        setSymmetric(initialRelationship.symmetric);
      } else {
        // フォームをリセット
        setEdgeType('');
        setSymmetric(defaultSymmetric);
      }
    }
  }, [isOpen, defaultSymmetric, initialRelationship]);

  // フォーカス制御: モーダルが新たに開いた直後にラベル入力欄にフォーカス
  useEffect(() => {
    if (!isOpen || !justOpenedRef.current) return;
    justOpenedRef.current = false;
    typeInputRef.current?.focus();
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

  // 登録ボタンの有効/無効を判定（type が必須）
  const isSubmitDisabled = !edgeType.trim();

  // 登録処理
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    onSubmit(edgeType.trim(), null, symmetric);
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

        {/* 2人の人物情報表示 + 方向切替 */}
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

          {/* 方向切替（有向 / 無向） */}
          <div className="flex gap-1 bg-gray-100 rounded-md p-1">
            {/* 有向（片方向矢印） */}
            <button
              type="button"
              onClick={() => setSymmetric(false)}
              aria-pressed={!symmetric}
              aria-label="有向（矢印あり）"
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                !symmetric
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'hover:bg-gray-200'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* 無向（矢印なし） */}
            <button
              type="button"
              onClick={() => setSymmetric(true)}
              aria-pressed={symmetric}
              aria-label="無向（矢印なし）"
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                symmetric
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'hover:bg-gray-200'
              }`}
            >
              <Minus className="w-5 h-5" />
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
          {/* エッジ型ラベル入力 */}
          <div className="mb-4">
            <label
              htmlFor="relationship-type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              関係の種類
            </label>
            {/* 方向インジケーター */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span>{sourcePerson.name}</span>
              <span>{symmetric ? '—' : '→'}</span>
              <span>{targetPerson.name}</span>
            </div>
            <input
              ref={typeInputRef}
              id="relationship-type"
              type="text"
              value={edgeType}
              onChange={(e) => setEdgeType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!isSubmitDisabled) {
                    onSubmit(edgeType.trim(), null, symmetric);
                  }
                }
              }}
              maxLength={MAX_RELATIONSHIP_LABEL_LENGTH}
              placeholder="例: 友人、同僚、親子"
              list="suggested-types"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {/* サジェスト候補（datalist） */}
            <datalist id="suggested-types">
              {SUGGESTED_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

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
