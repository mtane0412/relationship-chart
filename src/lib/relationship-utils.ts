/**
 * 関係のユーティリティ関数
 * 関係データの変換・表示ロジックを提供する（v11 Relationship 対応）
 */

import type { Relationship } from '@/types/relationship';

/**
 * 特定の人物から見た関係情報を取得する
 *
 * v11 では 1 エッジ = 1 方向（sourceId → targetId）。
 * symmetric: true の場合は無向扱いで双方向表示する。
 *
 * @param relationship - 対象の関係（v11形式）
 * @param viewerPersonId - 視点となる人物のID
 * @returns 関係情報の配列（ラベル、方向記号、相手のID）
 */
export function getRelationshipFromPerspective(
  relationship: Relationship,
  viewerPersonId: string
): Array<{ label: string; direction: string; otherPersonId: string }> {
  const isSource = relationship.sourceId === viewerPersonId;
  const isTarget = relationship.targetId === viewerPersonId;

  // 関係者以外の人物IDが指定された場合は空配列を返す
  if (!isSource && !isTarget) {
    return [];
  }

  // 表示ラベル（label が null の場合は type を使用）
  const displayLabel = relationship.label ?? relationship.type;
  const otherPersonId = isSource ? relationship.targetId : relationship.sourceId;

  if (relationship.symmetric) {
    // 無向表示: 視点に関わらず "—" で表示（対称な関係なので方向なし）
    return [{ label: displayLabel, direction: '—', otherPersonId }];
  }

  if (isSource) {
    // 起点側から見た場合: 自分 → 相手 方向
    return [{ label: displayLabel, direction: '→', otherPersonId }];
  }

  // 終点側から見た場合: 相手 → 自分 方向（矢印は自分に向かっている）
  return [{ label: displayLabel, direction: '←', otherPersonId }];
}
