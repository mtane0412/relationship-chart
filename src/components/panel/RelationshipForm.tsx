/**
 * RelationshipFormコンポーネント
 * 2人の人物間の関係を登録するフォーム
 */

'use client';

import { useState } from 'react';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * 関係登録フォームコンポーネント
 */
export function RelationshipForm() {
  const [sourcePersonId, setSourcePersonId] = useState('');
  const [targetPersonId, setTargetPersonId] = useState('');
  const [label, setLabel] = useState('');
  const [isDirected, setIsDirected] = useState(false);
  const [error, setError] = useState('');

  const persons = useGraphStore((state) => state.persons);
  const addRelationship = useGraphStore((state) => state.addRelationship);

  /**
   * フォーム送信ハンドラ
   * @param e - フォームイベント
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // バリデーション
    if (!sourcePersonId || !targetPersonId) {
      setError('2人の人物を選択してください');
      return;
    }

    if (sourcePersonId === targetPersonId) {
      setError('異なる人物を選択してください');
      return;
    }

    if (!label.trim()) {
      setError('関係のラベルを入力してください');
      return;
    }

    // 関係を追加
    addRelationship({
      sourcePersonId,
      targetPersonId,
      type: isDirected ? 'one-way' : 'undirected',
      sourceToTargetLabel: label.trim(),
      targetToSourceLabel: null,
    });

    // フォームをリセット
    setSourcePersonId('');
    setTargetPersonId('');
    setLabel('');
    setIsDirected(false);
    setError('');
  };

  // 人物が2人未満の場合は登録不可
  if (persons.length < 2) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">
          関係を登録するには、2人以上の人物を登録してください
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* エラーメッセージ */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 人物1選択 */}
      <div>
        <label
          htmlFor="sourcePersonId"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          人物1
        </label>
        <select
          id="sourcePersonId"
          value={sourcePersonId}
          onChange={(e) => setSourcePersonId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">選択してください</option>
          {persons.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>

      {/* 人物2選択 */}
      <div>
        <label
          htmlFor="targetPersonId"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          人物2
        </label>
        <select
          id="targetPersonId"
          value={targetPersonId}
          onChange={(e) => setTargetPersonId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">選択してください</option>
          {persons.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>

      {/* 関係ラベル入力 */}
      <div>
        <label
          htmlFor="relationshipLabel"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          関係
        </label>
        <input
          id="relationshipLabel"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="例: 友人、恋人、上司"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 方向性チェックボックス */}
      <div className="flex items-center">
        <input
          id="isDirected"
          type="checkbox"
          checked={isDirected}
          onChange={(e) => setIsDirected(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="isDirected" className="ml-2 text-sm text-gray-700">
          方向性あり（人物1 → 人物2）
        </label>
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        関係を追加
      </button>
    </form>
  );
}
