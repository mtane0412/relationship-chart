/**
 * PairSelectionPanelコンポーネント
 * 2人の人物が選択されている場合に表示されるパネル
 */

'use client';

import { useState } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Person } from '@/types/person';

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
  const [label, setLabel] = useState('');
  const [isDirected, setIsDirected] = useState(false);
  const relationships = useGraphStore((state) => state.relationships);
  const addRelationship = useGraphStore((state) => state.addRelationship);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const clearSelection = useGraphStore((state) => state.clearSelection);

  const [person1, person2] = persons;

  // 2人の間の既存関係を取得
  const existingRelationships = relationships.filter(
    (r) =>
      (r.sourcePersonId === person1.id && r.targetPersonId === person2.id) ||
      (r.sourcePersonId === person2.id && r.targetPersonId === person1.id)
  );

  // フォーム送信ハンドラ
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    // 関係を追加
    addRelationship({
      sourcePersonId: person1.id,
      targetPersonId: person2.id,
      label: label.trim(),
      isDirected,
    });

    // フォームをリセット
    setLabel('');
    setIsDirected(false);
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

      {/* 関係登録フォーム */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          関係を追加
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
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
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例: 友人、上司、同僚"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 方向性チェックボックス */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDirected}
                onChange={(e) => setIsDirected(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">方向性あり</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              {person1.name} → {person2.name}
            </p>
          </div>

          {/* 登録ボタン */}
          <button
            type="submit"
            disabled={!label.trim()}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            関係を追加
          </button>
        </form>
      </div>

      {/* 既存の関係一覧 */}
      {existingRelationships.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            既存の関係
          </h3>
          <div className="space-y-2">
            {existingRelationships.map((relationship) => {
              const isForward = relationship.sourcePersonId === person1.id;
              return (
                <div
                  key={relationship.id}
                  className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50"
                >
                  {/* 関係の表示 */}
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 truncate">
                        {isForward ? person1.name : person2.name}
                      </span>
                      <span className="font-medium text-gray-700">
                        {relationship.label}
                      </span>
                      {relationship.isDirected && (
                        <span className="text-gray-400">→</span>
                      )}
                      <span className="text-gray-600 truncate">
                        {isForward ? person2.name : person1.name}
                      </span>
                    </div>
                  </div>

                  {/* 削除ボタン */}
                  <button
                    onClick={() => removeRelationship(relationship.id)}
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
