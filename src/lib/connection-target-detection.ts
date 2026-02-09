/**
 * 接続ターゲットノード検出ユーティリティ
 * ConnectionLineとRelationshipGraphで共通使用するロジック
 */

import type { Node } from '@xyflow/react';
import { PERSON_IMAGE_SIZE } from './node-intersection';

/**
 * マウス位置から最も近いターゲットノードを検出する
 * @param toX - マウスのX座標
 * @param toY - マウスのY座標
 * @param allNodes - すべてのノード
 * @param fromNodeId - 接続元ノードのID（除外する）
 * @param connectionRadius - 接続検出範囲（デフォルト: 60px）
 * @returns 最も近いターゲットノード、または null
 */
export function findClosestTargetNode(
  toX: number,
  toY: number,
  allNodes: Node[],
  fromNodeId: string,
  connectionRadius = 60
): Node | null {
  // connectionRadius内にあるすべての候補ノードを取得
  const candidateNodes = allNodes
    .filter((node) => {
      if (node.id === fromNodeId) return false; // 自分自身は除外

      const nodeWidth = node.measured?.width ?? PERSON_IMAGE_SIZE;
      const nodeHeight = node.measured?.height ?? PERSON_IMAGE_SIZE;

      // ノードの範囲を計算（connectionRadiusを考慮して拡張）
      const expandedMargin = connectionRadius;
      const left = node.position.x - expandedMargin;
      const right = node.position.x + nodeWidth + expandedMargin;
      const top = node.position.y - expandedMargin;
      const bottom = node.position.y + nodeHeight + expandedMargin;

      // マウス位置がノードの拡張範囲内にあるかチェック
      return toX >= left && toX <= right && toY >= top && toY <= bottom;
    })
    .map((node) => {
      // ノード中心座標を計算
      const nodeWidth = node.measured?.width ?? PERSON_IMAGE_SIZE;
      const nodeHeight = node.measured?.height ?? PERSON_IMAGE_SIZE;
      const centerX = node.position.x + nodeWidth / 2;
      const centerY = node.position.y + nodeHeight / 2;

      // マウス位置からノード中心までの距離を計算
      const distance = Math.sqrt(
        Math.pow(toX - centerX, 2) + Math.pow(toY - centerY, 2)
      );

      return { node, distance };
    })
    .sort((a, b) => a.distance - b.distance); // 距離が近い順にソート

  // 最も近いノードを取得
  return candidateNodes.length > 0 ? candidateNodes[0].node : null;
}
