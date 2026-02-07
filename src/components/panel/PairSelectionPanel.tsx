/**
 * PairSelectionPanelコンポーネント
 * 2人の人物が選択されている場合に表示されるパネル
 */

'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Person } from '@/types/person';
import type { RelationshipType } from '@/types/relationship';

/**
 * PairSelectionPanelのプロパティ
 */
type PairSelectionPanelProps = {
  /** 選択されている2人の人物 */
  persons: [Person, Person];
};

/**
 * 2人選択パネルコンポーネント
 */
export function PairSelectionPanel({ persons }: PairSelectionPanelProps) {
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('bidirectional');
  const [sourceToTargetLabel, setSourceToTargetLabel] = useState('');
  const [targetToSourceLabel, setTargetToSourceLabel] = useState('');
  const relationships = useGraphStore((state) => state.relationships);
  const addRelationship = useGraphStore((state) => state.addRelationship);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const clearSelection = useGraphStore((state) => state.clearSelection);

  const [person1, person2] = persons;

  // persons が変更されたときにフォーム状態をリセット
  useEffect(() => {
    setRelationshipType('bidirectional');
    setSourceToTargetLabel('');
    setTargetToSourceLabel('');
  }, [persons]);

  // 2人の間の既存関係を取得（方向問わず）
  const existingRelationship = relationships.find(
    (r) =>
      (r.sourcePersonId === person1.id && r.targetPersonId === person2.id) ||
      (r.sourcePersonId === person2.id && r.targetPersonId === person1.id)
  );

  // フォーム送信ハンドラ
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceToTargetLabel.trim()) return;
    if (relationshipType === 'dual-directed' && !targetToSourceLabel.trim()) return;

    // 関係を追加
    addRelationship({
      sourcePersonId: person1.id,
      targetPersonId: person2.id,
      type: relationshipType,
      sourceToTargetLabel: sourceToTargetLabel.trim(),
      targetToSourceLabel: relationshipType === 'dual-directed' ? targetToSourceLabel.trim() : null,
    });

    // フォームをリセット
    setSourceToTargetLabel('');
    setTargetToSourceLabel('');
    setRelationshipType('bidirectional');
  };

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">2人を選択中</h2>
          <button
            onClick={() => clearSelection()}
            className="text-xs text-gray-500 hover:text-gray-700"
            aria-label="選択を解除"
          >
            ✕ 選択解除
          </button>
        </div>

        {/* 選択された2人の表示 */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">{person1.name}</span>
          <span className="text-gray-400">↔</span>
          <span className="font-medium text-gray-700">{person2.name}</span>
        </div>
      </div>

      {/* 関係登録フォーム（既存関係がある場合は非表示） */}
      {!existingRelationship ? (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            関係を追加
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 関係タイプ選択 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                関係のタイプ
              </label>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="relationshipType"
                    value="bidirectional"
                    checked={relationshipType === 'bidirectional'}
                    onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">双方向 ↔</span>
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
                  <span className="text-xs text-gray-700">片方向×2 → ←</span>
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
                  <span className="text-xs text-gray-700">片方向×1 →</span>
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
                  <span className="text-xs text-gray-700">無方向</span>
                </label>
              </div>
            </div>

            {/* ラベル入力 */}
            <div>
              <label
                htmlFor="pair-relationship-label"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                関係のラベル
              </label>
              <input
                id="pair-relationship-label"
                type="text"
                value={sourceToTargetLabel}
                onChange={(e) => setSourceToTargetLabel(e.target.value)}
                placeholder="例: 友人、上司、同僚"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* dual-directed選択時のみ2つ目のラベル入力を表示 */}
            {relationshipType === 'dual-directed' && (
              <div>
                <label
                  htmlFor="pair-reverse-relationship-label"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  逆方向のラベル
                </label>
                <input
                  id="pair-reverse-relationship-label"
                  type="text"
                  value={targetToSourceLabel}
                  onChange={(e) => setTargetToSourceLabel(e.target.value)}
                  placeholder="例: 無関心、嫌い"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* 登録ボタン */}
            <button
              type="submit"
              disabled={
                !sourceToTargetLabel.trim() ||
                (relationshipType === 'dual-directed' && !targetToSourceLabel.trim())
              }
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              関係を追加
            </button>
          </form>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            既に関係が登録されています
          </p>
        </div>
      )}

      {/* 既存の関係表示 */}
      {existingRelationship && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            既存の関係
          </h3>
          <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
            {/* 関係の表示 */}
            <div className="flex-1 min-w-0 text-sm">
              {existingRelationship.type === 'dual-directed' ? (
                // dual-directed: 2つのラベルを表示
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-blue-700">
                      {existingRelationship.sourceToTargetLabel}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-600">
                      ({person1.id === existingRelationship.sourcePersonId ? person2.name : person1.name})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">
                      ({person1.id === existingRelationship.sourcePersonId ? person2.name : person1.name})
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-green-700">
                      {existingRelationship.targetToSourceLabel}
                    </span>
                  </div>
                </div>
              ) : (
                // bidirectional / one-way / undirected
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700">
                    {existingRelationship.sourceToTargetLabel}
                  </span>
                  {existingRelationship.type === 'bidirectional' && (
                    <span className="text-gray-400">↔</span>
                  )}
                  {existingRelationship.type === 'one-way' && (
                    <span className="text-gray-400">
                      {existingRelationship.sourcePersonId === person1.id ? '→' : '←'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 削除ボタン */}
            <button
              onClick={() => removeRelationship(existingRelationship.id)}
              className="shrink-0 p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
              aria-label="関係を削除"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
