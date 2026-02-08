/**
 * 関係のユーティリティ関数
 * 関係データの変換・表示ロジックを提供する
 */

import type { Relationship, RelationshipType } from '@/types/relationship';

/**
 * 関係の表示タイプを判定する
 *
 * @param relationship - 判定対象の関係
 * @returns 表示タイプ（bidirectional / one-way / dual-directed / undirected）
 */
export function getRelationshipDisplayType(relationship: Relationship): RelationshipType {
  // 無方向の場合
  if (!relationship.isDirected) {
    return 'undirected';
  }

  // 有向の場合
  const hasSourceToTarget = relationship.sourceToTargetLabel !== null;
  const hasTargetToSource = relationship.targetToSourceLabel !== null;

  // 両方向にラベルがある場合
  if (hasSourceToTarget && hasTargetToSource) {
    // ラベルが同一なら双方向、異なるなら片方向×2
    return relationship.sourceToTargetLabel === relationship.targetToSourceLabel
      ? 'bidirectional'
      : 'dual-directed';
  }

  // 片方向のみラベルがある場合（どちら向きでもone-way）
  return 'one-way';
}

/**
 * 特定の人物から見た関係情報を取得する
 *
 * @param relationship - 対象の関係
 * @param viewerPersonId - 視点となる人物のID
 * @returns 関係情報の配列（ラベル、方向記号、相手のID）
 */
export function getRelationshipFromPerspective(
  relationship: Relationship,
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
    // sourceToTargetLabelとtargetToSourceLabelは同一値のはずだが、念のためnullチェック
    const label = relationship.sourceToTargetLabel || relationship.targetToSourceLabel || '';
    return [{ label, direction: '', otherPersonId }];
  }

  // 有向の場合
  const results: Array<{ label: string; direction: string; otherPersonId: string }> = [];

  if (isSource) {
    // source側から見た場合
    if (relationship.sourceToTargetLabel !== null) {
      const displayType = getRelationshipDisplayType(relationship);
      const direction = displayType === 'bidirectional' ? '↔' : '→';
      results.push({
        label: relationship.sourceToTargetLabel,
        direction,
        otherPersonId,
      });
    }
    if (relationship.targetToSourceLabel !== null && relationship.sourceToTargetLabel !== relationship.targetToSourceLabel) {
      // targetToSourceLabelが存在し、sourceToTargetLabelと異なる場合は逆方向のラベルも追加
      // （dual-directedまたは逆方向のone-wayの場合に該当）
      results.push({
        label: relationship.targetToSourceLabel,
        direction: '←',
        otherPersonId,
      });
    }
  } else {
    // target側から見た場合
    // sourceToTargetLabelが存在し、targetToSourceLabelと異なる場合は相手からのラベルを表示
    // （dual-directedまたは通常のone-wayの場合に該当）
    if (relationship.sourceToTargetLabel !== null && relationship.sourceToTargetLabel !== relationship.targetToSourceLabel) {
      results.push({
        label: relationship.sourceToTargetLabel,
        direction: '←',
        otherPersonId,
      });
    }
    // 次にtargetToSourceLabel（自分からの矢印）を表示
    if (relationship.targetToSourceLabel !== null) {
      const displayType = getRelationshipDisplayType(relationship);
      const direction = displayType === 'bidirectional' ? '↔' : '→';
      results.push({
        label: relationship.targetToSourceLabel,
        direction,
        otherPersonId,
      });
    }
  }

  return results;
}
