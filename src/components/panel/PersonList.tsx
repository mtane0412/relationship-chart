/**
 * PersonListコンポーネント
 * 登録された人物の一覧を表示する
 */

'use client';

import { useGraphStore } from '@/stores/useGraphStore';

/**
 * 人物一覧コンポーネント
 */
export function PersonList() {
  const persons = useGraphStore((state) => state.persons);
  const removePerson = useGraphStore((state) => state.removePerson);

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

        return (
          <div
            key={person.id}
            className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
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
              onClick={() => removePerson(person.id)}
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
