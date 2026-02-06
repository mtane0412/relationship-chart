/**
 * ノードの境界との交点計算ユーティリティ
 * エッジが最短距離でノードに接続できるように、円形ノードの境界との交点を計算します
 */

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
  // ノードのサイズを取得（デフォルトは80x80）
  const sourceWidth = sourceNode.measured?.width || 80;
  const sourceHeight = sourceNode.measured?.height || 80;
  const targetWidth = targetNode.measured?.width || 80;
  const targetHeight = targetNode.measured?.height || 80;

  // ノードの中心座標を計算
  const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
  const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
  const targetCenterX = targetNode.position.x + targetWidth / 2;
  const targetCenterY = targetNode.position.y + targetHeight / 2;

  // 円形ノードの半径を計算（幅と高さの平均）
  const sourceRadius = (sourceWidth + sourceHeight) / 4;
  const targetRadius = (targetWidth + targetHeight) / 4;

  // ソースノードの境界との交点を計算
  const sourcePoint = getCircleIntersection(
    { x: sourceCenterX, y: sourceCenterY },
    sourceRadius,
    targetCenterX,
    targetCenterY
  );

  // ターゲットノードの境界との交点を計算
  const targetPoint = getCircleIntersection(
    { x: targetCenterX, y: targetCenterY },
    targetRadius,
    sourceCenterX,
    sourceCenterY
  );

  return {
    sourcePoint,
    targetPoint,
  };
}
