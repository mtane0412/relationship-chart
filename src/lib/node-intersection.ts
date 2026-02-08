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
 * 四角形の境界との交点を計算する
 * @param center - 四角形の中心座標
 * @param width - 四角形の幅
 * @param height - 四角形の高さ
 * @param targetX - ターゲットのx座標
 * @param targetY - ターゲットのy座標
 * @returns 四角形の境界上の交点座標
 */
export function getRectIntersection(
  center: { x: number; y: number },
  width: number,
  height: number,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  // 中心からターゲットへの方向ベクトル
  const dx = targetX - center.x;
  const dy = targetY - center.y;

  // 四角形の半分のサイズ
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // ゼロ除算を避けるための処理
  if (dx === 0 && dy === 0) {
    // ターゲットが中心と同じ位置の場合は右辺の中点を返す
    return { x: center.x + halfWidth, y: center.y };
  }

  // 各辺との交点を計算し、最も近いものを選択
  let minDistance = Infinity;
  let intersection = { x: center.x + halfWidth, y: center.y };

  // 右辺との交点
  if (dx !== 0) {
    const t = halfWidth / Math.abs(dx);
    const y = center.y + (dy * t * Math.sign(dx));
    if (Math.abs(y - center.y) <= halfHeight && dx > 0) {
      const x = center.x + halfWidth;
      const distance = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        intersection = { x, y };
      }
    }
  }

  // 左辺との交点
  if (dx !== 0) {
    const t = halfWidth / Math.abs(dx);
    const y = center.y + (dy * t * Math.sign(dx));
    if (Math.abs(y - center.y) <= halfHeight && dx < 0) {
      const x = center.x - halfWidth;
      const distance = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        intersection = { x, y };
      }
    }
  }

  // 下辺との交点
  if (dy !== 0) {
    const t = halfHeight / Math.abs(dy);
    const x = center.x + (dx * t * Math.sign(dy));
    if (Math.abs(x - center.x) <= halfWidth && dy > 0) {
      const y = center.y + halfHeight;
      const distance = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        intersection = { x, y };
      }
    }
  }

  // 上辺との交点
  if (dy !== 0) {
    const t = halfHeight / Math.abs(dy);
    const x = center.x + (dx * t * Math.sign(dy));
    if (Math.abs(x - center.x) <= halfWidth && dy < 0) {
      const y = center.y - halfHeight;
      const distance = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        intersection = { x, y };
      }
    }
  }

  return intersection;
}

/**
 * ノードの情報（位置とサイズ）
 */
interface NodeInfo {
  id: string;
  type?: string;
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
  // ノードの幅と高さを取得（名前ラベルの幅で可変、デフォルトは画像サイズ）
  const sourceWidth = sourceNode.measured?.width || PERSON_IMAGE_SIZE;
  const sourceHeight = sourceNode.measured?.height || PERSON_IMAGE_SIZE;
  const targetWidth = targetNode.measured?.width || PERSON_IMAGE_SIZE;
  const targetHeight = targetNode.measured?.height || PERSON_IMAGE_SIZE;

  // ノードの中心座標を計算
  // centerX: 名前ラベルの幅に応じて可変
  // centerY: 画像の中心Y座標で固定（position.y + PERSON_IMAGE_RADIUS）
  const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
  const sourceCenterY = sourceNode.position.y + PERSON_IMAGE_RADIUS;
  const targetCenterX = targetNode.position.x + targetWidth / 2;
  const targetCenterY = targetNode.position.y + PERSON_IMAGE_RADIUS;

  // ノードの種別に応じて交点を計算
  const sourceIsItem = sourceNode.type === 'item';
  const targetIsItem = targetNode.type === 'item';

  // ソースノードの境界との交点を計算
  const sourcePoint = sourceIsItem
    ? getRectIntersection(
        { x: sourceCenterX, y: sourceCenterY },
        sourceWidth,
        sourceHeight,
        targetCenterX,
        targetCenterY
      )
    : getCircleIntersection(
        { x: sourceCenterX, y: sourceCenterY },
        PERSON_IMAGE_RADIUS,
        targetCenterX,
        targetCenterY
      );

  // ターゲットノードの境界との交点を計算
  const targetPoint = targetIsItem
    ? getRectIntersection(
        { x: targetCenterX, y: targetCenterY },
        targetWidth,
        targetHeight,
        sourceCenterX,
        sourceCenterY
      )
    : getCircleIntersection(
        { x: targetCenterX, y: targetCenterY },
        PERSON_IMAGE_RADIUS,
        sourceCenterX,
        sourceCenterY
      );

  return {
    sourcePoint,
    targetPoint,
  };
}
