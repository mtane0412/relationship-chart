/**
 * PersonMiniIcon コンポーネント
 * 人物/物のミニアイコンを表示するヘルパーコンポーネント
 * 画像がある場合は画像を、ない場合はイニシャルを表示する
 */

'use client';

import type { Person } from '@/types/person';
import { deriveNodeVisual } from '@/lib/node-visual';

/**
 * 人物/物のミニアイコンを表示するコンポーネント
 * labels配列から形状を導出してアイコンを描画する
 */
export function PersonMiniIcon({ person }: { person: Person }) {
  const visual = deriveNodeVisual(person.labels ?? ['人物']);
  const borderRadius = visual.shape === 'rounded-rect' ? 'rounded-md' : 'rounded-full';

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
      {person.name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}
