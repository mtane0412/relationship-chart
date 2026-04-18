/**
 * PersonMiniIcon コンポーネント
 * 人物/物のミニアイコンを表示するヘルパーコンポーネント
 * 画像がある場合は画像を、ない場合はイニシャルを表示する
 */

'use client';

import type { Person } from '@/types/person';

/**
 * 人物/物のミニアイコンを表示するコンポーネント
 * - person: 通常の人物（丸型）
 * - item: 物（角丸四角形）
 */
export function PersonMiniIcon({ person }: { person: Person }) {
  const kind = person.kind ?? 'person';
  const isItem = kind === 'item';
  const borderRadius = isItem ? 'rounded-md' : 'rounded-full';

  if (person.imageDataUrl) {
    return (
      <img
        src={person.imageDataUrl}
        alt={person.name}
        className={`w-6 h-6 ${borderRadius} object-cover border border-gray-300`}
      />
    );
  }
  return (
    <div className={`w-6 h-6 ${borderRadius} bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold border border-gray-300`}>
      {person.name.charAt(0).toUpperCase() || '?'}
    </div>
  );
}
