/**
 * PersonListコンポーネント
 * 登録された人物の一覧を表示する
 */

'use client';

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';

/**
 * 人物一覧コンポーネント
 */
export function PersonList() {
  const persons = useGraphStore((state) => state.persons);
  const removePerson = useGraphStore((state) => state.removePerson);
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const selectPerson = useGraphStore((state) => state.selectPerson);
  const togglePersonSelection = useGraphStore((state) => state.togglePersonSelection);

  const { getNode, setCenter } = useReactFlow();

  /**
   * ノードを画面中央に移動する
   * @param personId - 人物ID
   */
  const focusNode = useCallback(
    (personId: string) => {
      const node = getNode(personId);
      if (node) {
        const center = getNodeCenter(node);
        setCenter(center.x, center.y, { duration: VIEWPORT_ANIMATION_DURATION });
      }
    },
    [getNode, setCenter]
  );

  if (persons.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">人物が登録されていません</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {persons.map((person) => {
        // 名前の最初の1文字をイニシャルとして取得
        const initial = person.name.charAt(0).toUpperCase();
        const isSelected = selectedPersonIds.includes(person.id);

        return (
          <div
            key={person.id}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              // Shiftキーが押されている場合は複数選択、そうでなければ単一選択
              if (e.shiftKey) {
                togglePersonSelection(person.id);
              } else {
                selectPerson(person.id);
                // 単一選択時のみノードを画面中央に移動
                focusNode(person.id);
              }
            }}
            onKeyDown={(e) => {
              // インタラクティブ要素からのイベントは無視
              if (e.target instanceof HTMLElement && e.target.closest('button')) {
                return;
              }

              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // Shiftキーが押されている場合は複数選択、そうでなければ単一選択
                if (e.shiftKey) {
                  togglePersonSelection(person.id);
                } else {
                  selectPerson(person.id);
                  // 単一選択時のみノードを画面中央に移動
                  focusNode(person.id);
                }
              }
            }}
            aria-label={`${person.name}を選択`}
            className={`flex items-center gap-3 p-2 border rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            {/* 人物の画像またはデフォルトアバター */}
            {person.imageDataUrl ? (
              <img
                src={person.imageDataUrl}
                alt={person.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center">
                <span className="text-white text-lg font-bold">{initial}</span>
              </div>
            )}

            {/* 人物の名前 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {person.name}
              </p>
            </div>

            {/* 削除ボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // 親のクリックイベントを防ぐ
                removePerson(person.id);
              }}
              className="shrink-0 p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
              aria-label={`${person.name}を削除`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
