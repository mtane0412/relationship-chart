/**
 * 関係のユーティリティ関数
 * 関係データの変換・表示ロジックを提供する（v9 RelationshipV9 対応）
 */

import type { RelationshipV9, RelationshipType } from '@/types/relationship';

/**
 * 関係の表示タイプを判定する
 *
 * @param relationship - 判定対象の関係（v9形式）
 * @returns 表示タイプ（bidirectional / one-way / dual-directed / undirected）
 */
export function getRelationshipDisplayType(relationship: RelationshipV9): RelationshipType {
  // 無方向の場合
  if (!relationship.isDirected) {
    return 'undirected';
  }

  // 有向の場合
  const hasFwd = relationship.forward.label !== null;
  const hasRev = relationship.reverse.label !== null;

  // 両方向にラベルがある場合
  if (hasFwd && hasRev) {
    // ラベルが同一なら双方向、異なるなら片方向×2
    return relationship.forward.label === relationship.reverse.label
      ? 'bidirectional'
      : 'dual-directed';
  }

  // 片方向のみラベルがある場合（どちら向きでもone-way）
  return 'one-way';
}

/**
 * 特定の人物から見た関係情報を取得する
 *
 * @param relationship - 対象の関係（v9形式）
 * @param viewerPersonId - 視点となる人物のID
 * @returns 関係情報の配列（ラベル、方向記号、相手のID）
 */
export function getRelationshipFromPerspective(
  relationship: RelationshipV9,
  viewerPersonId: string
): Array<{ label: string; direction: string; otherPersonId: string }> {
  // 関係者以外の人物IDが指定された場合は空配列を返す
  const isSource = relationship.sourcePersonId === viewerPersonId;
  const isTarget = relationship.targetPersonId === viewerPersonId;

  if (!isSource && !isTarget) {
    return [];
  }

  const otherPersonId = isSource ? relationship.targetPersonId : relationship.sourcePersonId;

  // 無方向の場合
  if (!relationship.isDirected) {
    // forward.label と reverse.label は同一値のはずだが、念のためnullチェック
    // 空文字も有効なラベルとして扱うため ?? を使用する（|| は空文字を falsy 扱いする）
    const label = relationship.forward.label ?? relationship.reverse.label ?? '';
    return [{ label, direction: '', otherPersonId }];
  }

  // 有向の場合
  const results: Array<{ label: string; direction: string; otherPersonId: string }> = [];

  if (isSource) {
    // source側から見た場合
    if (relationship.forward.label !== null) {
      const displayType = getRelationshipDisplayType(relationship);
      const direction = displayType === 'bidirectional' ? '↔' : '→';
      results.push({
        label: relationship.forward.label,
        direction,
        otherPersonId,
      });
    }
    if (
      relationship.reverse.label !== null &&
      relationship.forward.label !== relationship.reverse.label
    ) {
      // reverse.labelが存在し、forward.labelと異なる場合は逆方向のラベルも追加
      // （dual-directedまたは逆方向のone-wayの場合に該当）
      results.push({
        label: relationship.reverse.label,
        direction: '←',
        otherPersonId,
      });
    }
  } else {
    // target側から見た場合
    // forward.labelが存在し、reverse.labelと異なる場合は相手からのラベルを表示
    // （dual-directedまたは通常のone-wayの場合に該当）
    if (
      relationship.forward.label !== null &&
      relationship.forward.label !== relationship.reverse.label
    ) {
      results.push({
        label: relationship.forward.label,
        direction: '←',
        otherPersonId,
      });
    }
    // 次にreverse.label（自分からの矢印）を表示
    if (relationship.reverse.label !== null) {
      const displayType = getRelationshipDisplayType(relationship);
      const direction = displayType === 'bidirectional' ? '↔' : '→';
      results.push({
        label: relationship.reverse.label,
        direction,
        otherPersonId,
      });
    }
  }

  return results;
}
