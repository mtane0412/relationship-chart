/**
 * collision-resolver.ts
 * ノード衝突解消アルゴリズム
 *
 * React Flow公式のNode Collisions Exampleをベースに、
 * AABB（Axis-Aligned Bounding Box）衝突判定と最小移動軸による押し出しを実装。
 */

import type { Node } from '@xyflow/react';

/**
 * 衝突解消オプション
 */
export interface CollisionResolverOptions {
  /** 最大反復回数（無限ループ防止） */
  maxIterations: number;
  /** 重なり閾値（この値以下の重なりは無視） */
  overlapThreshold: number;
  /** ノード間の最小余白（px） */
  margin: number;
}

/**
 * デフォルトの衝突解消オプション
 */
export const DEFAULT_COLLISION_OPTIONS: CollisionResolverOptions = {
  maxIterations: 50,
  overlapThreshold: 0.5,
  margin: 15,
};

/**
 * デフォルトのノード幅（measured未定義時のフォールバック）
 */
export const DEFAULT_NODE_WIDTH = 100;

/**
 * デフォルトのノード高さ（measured未定義時のフォールバック）
 */
export const DEFAULT_NODE_HEIGHT = 110;

/**
 * forceCollide用の衝突マージン
 * Force Layout有効時にノード同士が触れ合わないよう、半径に追加する余白
 */
export const COLLISION_MARGIN = 10;

/**
 * ノードのバウンディングボックス
 */
interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * ノード配列をバウンディングボックス配列に変換
 */
function nodesToBBoxes(nodes: Node[]): BoundingBox[] {
  return nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH,
    height: node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT,
  }));
}

/**
 * 2つのバウンディングボックスが重なっているかチェック（AABB判定）
 * marginを含めた拡張バウンディングボックスで衝突判定を行う
 */
function checkCollision(
  a: BoundingBox,
  b: BoundingBox,
  margin: number,
  overlapThreshold: number
): { hasCollision: boolean; overlapX: number; overlapY: number } {
  // marginを含めた重なり量を計算
  const overlapX = Math.max(
    0,
    Math.min(a.x + a.width + margin, b.x + b.width + margin) - Math.max(a.x, b.x)
  );
  const overlapY = Math.max(
    0,
    Math.min(a.y + a.height + margin, b.y + b.height + margin) - Math.max(a.y, b.y)
  );

  const hasCollision = overlapX > overlapThreshold && overlapY > overlapThreshold;

  return { hasCollision, overlapX, overlapY };
}

/**
 * ノード配列の衝突を解消する
 *
 * アルゴリズム:
 * 1. 全ノードペアをチェックし、重なりを検出（O(n²)）
 * 2. 重なりが見つかった場合、最小重なり軸（X or Y）に沿って等分割で押し出し
 * 3. 移動が発生しなくなるか、maxIterationsに到達するまで反復
 * 4. 移動したノードのみpositionを更新して返す（未移動ノードは参照同一性を保持）
 *
 * @param nodes - 衝突解消対象のノード配列
 * @param options - 衝突解消オプション
 * @returns 衝突解消後のノード配列
 */
export function resolveCollisions(
  nodes: Node[],
  options: CollisionResolverOptions = DEFAULT_COLLISION_OPTIONS
): Node[] {
  const { maxIterations, overlapThreshold, margin } = options;

  // 空配列または1ノードの場合は処理不要
  if (nodes.length <= 1) {
    return nodes;
  }

  // バウンディングボックス配列を作成
  const bboxes = nodesToBBoxes(nodes);
  let iteration = 0;
  let hasCollisions = true;

  // 衝突が解消されるか、最大反復回数に到達するまで繰り返し
  while (hasCollisions && iteration < maxIterations) {
    hasCollisions = false;

    // 全ペアをチェック
    for (let i = 0; i < bboxes.length; i++) {
      for (let j = i + 1; j < bboxes.length; j++) {
        const a = bboxes[i];
        const b = bboxes[j];

        const collision = checkCollision(a, b, margin, overlapThreshold);

        if (collision.hasCollision) {
          hasCollisions = true;

          // 最小重なり軸を選択（移動距離を最小化）
          // 重なり量（margin含む）を等分割して押し出し
          if (collision.overlapX < collision.overlapY) {
            // X方向に押し出し
            const pushX = collision.overlapX / 2;
            if (a.x < b.x) {
              a.x -= pushX;
              b.x += pushX;
            } else {
              a.x += pushX;
              b.x -= pushX;
            }
          } else {
            // Y方向に押し出し
            const pushY = collision.overlapY / 2;
            if (a.y < b.y) {
              a.y -= pushY;
              b.y += pushY;
            } else {
              a.y += pushY;
              b.y -= pushY;
            }
          }
        }
      }
    }

    iteration++;
  }

  // 移動したノードのみpositionを更新
  return nodes.map((node, index) => {
    const bbox = bboxes[index];
    const originalX = node.position.x;
    const originalY = node.position.y;

    // 位置が変更されていない場合は元のノードをそのまま返す（参照同一性を保持）
    if (Math.abs(bbox.x - originalX) < 0.01 && Math.abs(bbox.y - originalY) < 0.01) {
      return node;
    }

    // 位置が変更された場合は新しいノードオブジェクトを返す
    return {
      ...node,
      position: {
        x: bbox.x,
        y: bbox.y,
      },
    };
  });
}
