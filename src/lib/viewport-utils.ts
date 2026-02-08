/**
 * ビューポート操作に関する定数とユーティリティ関数
 */

import type { Node } from '@xyflow/react';

/**
 * ノードのデフォルト幅（measured がない場合に使用）
 */
export const DEFAULT_NODE_WIDTH = 80;

/**
 * ノードのデフォルト高さ（measured がない場合に使用）
 */
export const DEFAULT_NODE_HEIGHT = 120;

/**
 * ビューポート移動のアニメーション時間（ミリ秒）
 */
export const VIEWPORT_ANIMATION_DURATION = 500;

/**
 * ノードの中心座標を計算する
 * @param node - React Flowのノード
 * @returns ノードの中心座標 { x, y }
 */
export function getNodeCenter(node: Node): { x: number; y: number } {
  const width = node.measured?.width ?? DEFAULT_NODE_WIDTH;
  const height = node.measured?.height ?? DEFAULT_NODE_HEIGHT;

  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}
