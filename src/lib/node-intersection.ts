/**
 * ノードの境界との交点計算ユーティリティ
 * エッジが最短距離でノードに接続できるように、円形ノードの境界との交点を計算します
 */

/**
 * PersonNodeの画像サイズ（固定値）
 * PersonNode.tsxの画像は w-20 h-20 (80px x 80px)
 */
export const PERSON_IMAGE_SIZE = 80;

/**
 * PersonNodeの画像半径（固定値）
 */
export const PERSON_IMAGE_RADIUS = PERSON_IMAGE_SIZE / 2;

/**
 * 円の境界との交点を計算する
 * @param center - 円の中心座標
 * @param radius - 円の半径
 * @param targetX - ターゲットのx座標
 * @param targetY - ターゲットのy座標
 * @returns 円の境界上の交点座標
 */
export function getCircleIntersection(
  center: { x: number; y: number },
  radius: number,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  // 中心からターゲットへの方向を計算
  const dx = targetX - center.x;
  const dy = targetY - center.y;

  // 角度を計算
  const angle = Math.atan2(dy, dx);

  // 円の境界上の点を計算
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

/**
 * ノードの情報（位置とサイズ）
 */
interface NodeInfo {
  id: string;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
}

/**
 * 2つのノード間のエッジの交点を計算する
 * @param sourceNode - ソースノードの情報
 * @param targetNode - ターゲットノードの情報
 * @returns ソースとターゲットの境界上の交点座標
 */
export function getEdgeIntersectionPoints(
  sourceNode: NodeInfo,
  targetNode: NodeInfo
): {
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
} {
  // ノードの幅を取得（名前ラベルの幅で可変、デフォルトは画像サイズ）
  const sourceWidth = sourceNode.measured?.width || PERSON_IMAGE_SIZE;
  const targetWidth = targetNode.measured?.width || PERSON_IMAGE_SIZE;

  // ノードの中心座標を計算
  // centerX: 名前ラベルの幅に応じて可変
  // centerY: 画像の中心Y座標で固定（position.y + PERSON_IMAGE_RADIUS）
  const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
  const sourceCenterY = sourceNode.position.y + PERSON_IMAGE_RADIUS;
  const targetCenterX = targetNode.position.x + targetWidth / 2;
  const targetCenterY = targetNode.position.y + PERSON_IMAGE_RADIUS;

  // 円形ノードの半径（画像サイズ固定）
  const radius = PERSON_IMAGE_RADIUS;

  // ソースノードの境界との交点を計算
  const sourcePoint = getCircleIntersection(
    { x: sourceCenterX, y: sourceCenterY },
    radius,
    targetCenterX,
    targetCenterY
  );

  // ターゲットノードの境界との交点を計算
  const targetPoint = getCircleIntersection(
    { x: targetCenterX, y: targetCenterY },
    radius,
    sourceCenterX,
    sourceCenterY
  );

  return {
    sourcePoint,
    targetPoint,
  };
}
