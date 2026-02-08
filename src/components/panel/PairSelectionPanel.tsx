/**
 * PairSelectionPanelコンポーネント
 * 2人の人物が選択されている場合に表示されるパネル
 */

'use client';

import { useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
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
 * 関係タイプに応じたSVGアイコンを返す
 */
function getRelationshipIcon(type: RelationshipType, hasRelationship: boolean): React.ReactElement {
  if (!hasRelationship) {
    // 関係なしの場合は点線
    return (
      <svg width="40" height="24" viewBox="0 0 40 24" className="shrink-0">
        <line
          x1="0"
          y1="12"
          x2="40"
          y2="12"
          stroke="#d1d5db"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  switch (type) {
    case 'bidirectional':
      return (
        <svg width="40" height="24" viewBox="0 0 40 24" className="shrink-0">
          <line x1="4" y1="12" x2="36" y2="12" stroke="#3b82f6" strokeWidth="2" />
          <polygon points="36,12 32,9 32,15" fill="#3b82f6" />
          <polygon points="4,12 8,9 8,15" fill="#3b82f6" />
        </svg>
      );
    case 'dual-directed':
      return (
        <svg width="40" height="24" viewBox="0 0 40 24" className="shrink-0">
          <line x1="4" y1="8" x2="36" y2="8" stroke="#3b82f6" strokeWidth="2" />
          <polygon points="36,8 32,5 32,11" fill="#3b82f6" />
          <line x1="36" y1="16" x2="4" y2="16" stroke="#10b981" strokeWidth="2" />
          <polygon points="4,16 8,13 8,19" fill="#10b981" />
        </svg>
      );
    case 'one-way':
      return (
        <svg width="40" height="24" viewBox="0 0 40 24" className="shrink-0">
          <line x1="4" y1="12" x2="36" y2="12" stroke="#3b82f6" strokeWidth="2" />
          <polygon points="36,12 32,9 32,15" fill="#3b82f6" />
        </svg>
      );
    case 'undirected':
      return (
        <svg width="40" height="24" viewBox="0 0 40 24" className="shrink-0">
          <line x1="4" y1="12" x2="36" y2="12" stroke="#64748b" strokeWidth="2" />
        </svg>
      );
  }
}

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

  const { getNode, setCenter } = useReactFlow();

  const [person1, person2] = persons;

  // persons が変更されたときにフォーム状態をリセット
  useEffect(() => {
    setRelationshipType('bidirectional');
    setSourceToTargetLabel('');
    setTargetToSourceLabel('');
  }, [persons]);

  // ビューポートを2ノードの中点に移動
  useEffect(() => {
    const node1 = getNode(person1.id);
    const node2 = getNode(person2.id);
    if (node1 && node2) {
      const w1 = node1.measured?.width ?? 80;
      const h1 = node1.measured?.height ?? 120;
      const w2 = node2.measured?.width ?? 80;
      const h2 = node2.measured?.height ?? 120;

      const midX = (node1.position.x + w1 / 2 + node2.position.x + w2 / 2) / 2;
      const midY = (node1.position.y + h1 / 2 + node2.position.y + h2 / 2) / 2;

      setCenter(midX, midY, { duration: 500 });
    }
  }, [person1.id, person2.id, getNode, setCenter]);

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

  // 相手のイニシャル（画像がない場合）
  const person1Initial = person1.name.charAt(0).toUpperCase() || '?';
  const person2Initial = person2.name.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">2人を選択中</h2>
          <button
            onClick={() => clearSelection()}
            className="text-xs text-gray-500 hover:text-gray-700"
            aria-label="選択を解除"
          >
            ✕ 選択解除
          </button>
        </div>

        {/* 選択された2人のアバター表示 */}
        <div className="flex items-center justify-center gap-3 mb-3">
          {/* 人物1のアバター */}
          <div className="flex flex-col items-center gap-1">
            {person1.imageDataUrl ? (
              <img
                src={person1.imageDataUrl}
                alt={person1.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-white text-lg font-bold">{person1Initial}</span>
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 truncate max-w-[80px]">
              {person1.name}
            </span>
          </div>

          {/* 関係アイコン */}
          {getRelationshipIcon(
            existingRelationship?.type ?? 'bidirectional',
            !!existingRelationship
          )}

          {/* 人物2のアバター */}
          <div className="flex flex-col items-center gap-1">
            {person2.imageDataUrl ? (
              <img
                src={person2.imageDataUrl}
                alt={person2.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-white text-lg font-bold">{person2Initial}</span>
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 truncate max-w-[80px]">
              {person2.name}
            </span>
          </div>
        </div>

        {/* 関係のラベル（既存関係がある場合） */}
        {existingRelationship && (
          <div className="text-center">
            {existingRelationship.type === 'dual-directed' ? (
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-blue-700">
                  {existingRelationship.sourceToTargetLabel}
                </div>
                <div className="text-xs font-medium text-green-700">
                  {existingRelationship.targetToSourceLabel}
                </div>
              </div>
            ) : (
              <div className="text-xs font-medium text-gray-700">
                「{existingRelationship.sourceToTargetLabel}」
              </div>
            )}
          </div>
        )}
      </div>

      {/* 関係登録フォーム（既存関係がある場合は非表示） */}
      {!existingRelationship ? (
        <div className="flex-1 overflow-y-auto p-4">
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
      ) : null}

      {/* 削除ボタン（既存関係がある場合のみ、パネル最下部） */}
      {existingRelationship && (
        <div className="p-4 border-t border-gray-200 mt-auto">
          <button
            onClick={() => removeRelationship(existingRelationship.id)}
            className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            この関係を削除
          </button>
        </div>
      )}
    </div>
  );
}
