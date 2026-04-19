/**
 * EpisodeCaptureDialogコンポーネント
 * エピソードの作成・編集ダイアログ
 *
 * 入力項目:
 * - タイトル（必須）
 * - 説明（任意、複数行）
 * - 発生日時（任意、自由文字列）
 * - 参加人物（任意、複数選択）
 * - 関連関係（任意、ID参照）
 *
 * 特徴:
 * - タイトルが空の場合は保存ボタンを無効化
 * - Enterキーで保存（IME変換中は無視）
 * - Escapeキーでキャンセル
 * - 背景クリックでキャンセル
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * EpisodeCaptureDialogの保存データ
 */
export type EpisodeCaptureValues = {
  title: string;
  description?: string;
  occurredAt?: string;
  participantPersonIds: string[];
  relatedRelationshipIds: string[];
};

/**
 * EpisodeCaptureDialogのプロパティ
 */
type EpisodeCaptureDialogProps = {
  /** ダイアログを表示するかどうか */
  isOpen: boolean;
  /** 保存ボタン押下時のコールバック */
  onSave: (values: EpisodeCaptureValues) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
  /** 編集モード時の初期値 */
  initialValues?: EpisodeCaptureValues;
};

/**
 * エピソード作成・編集ダイアログ
 */
export function EpisodeCaptureDialog({
  isOpen,
  onSave,
  onCancel,
  initialValues,
}: EpisodeCaptureDialogProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [occurredAt, setOccurredAt] = useState(initialValues?.occurredAt ?? '');
  const [participantPersonIds, setParticipantPersonIds] = useState<string[]>(
    initialValues?.participantPersonIds ?? []
  );

  const titleInputRef = useRef<HTMLInputElement>(null);
  const persons = useGraphStore((state) => state.persons);

  // ダイアログが開くたびに入力値をリセット（または初期値を反映）してフォーカス
  useEffect(() => {
    if (isOpen) {
      setTitle(initialValues?.title ?? '');
      setDescription(initialValues?.description ?? '');
      setOccurredAt(initialValues?.occurredAt ?? '');
      setParticipantPersonIds(initialValues?.participantPersonIds ?? []);
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
    // isOpen の変化時のみリセットする（initialValues の参照変化では再初期化しない）
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

  const isValid = title.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      occurredAt: occurredAt.trim() || undefined,
      participantPersonIds,
      relatedRelationshipIds: initialValues?.relatedRelationshipIds ?? [],
    });
  };

  /**
   * タイトル入力のEnterキー処理（IME変換中は無視）
   */
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSave();
    }
  };

  /**
   * 参加人物トグル
   */
  const toggleParticipant = (personId: string) => {
    setParticipantPersonIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
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
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="episode-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <h2 id="episode-dialog-title" className="text-lg font-bold mb-4">
          {initialValues ? 'エピソードを編集' : 'エピソードを追加'}
        </h2>

        {/* タイトル（必須） */}
        <div className="mb-4">
          <label htmlFor="episode-title" className="block text-sm font-medium text-gray-700 mb-1">
            タイトル
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          </label>
          <input
            ref={titleInputRef}
            id="episode-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="例: 初めての出会い、決別の夜"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            aria-required="true"
          />
        </div>

        {/* 発生日時（任意） */}
        <div className="mb-4">
          <label htmlFor="episode-occurred-at" className="block text-sm font-medium text-gray-700 mb-1">
            発生日時
            <span className="text-gray-400 ml-1 text-xs font-normal">（任意）</span>
          </label>
          <input
            id="episode-occurred-at"
            type="text"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            placeholder="例: 第5話、2024年春"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>

        {/* 説明（任意） */}
        <div className="mb-4">
          <label htmlFor="episode-description" className="block text-sm font-medium text-gray-700 mb-1">
            説明
            <span className="text-gray-400 ml-1 text-xs font-normal">（任意）</span>
          </label>
          <textarea
            id="episode-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="このエピソードの概要や背景メモを入力"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
          />
        </div>

        {/* 参加人物（任意） */}
        {persons.length > 0 && (
          <div className="mb-6">
            <span className="block text-sm font-medium text-gray-700 mb-2">
              参加人物
              <span className="text-gray-400 ml-1 text-xs font-normal">（任意）</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {persons.map((person) => {
                const isSelected = participantPersonIds.includes(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => toggleParticipant(person.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors text-sm"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
