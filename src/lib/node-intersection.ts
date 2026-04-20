/**
 * ノードの境界との交点計算ユーティリティ
 * エッジが最短距離でノードに接続できるように、ノードの境界との交点を計算します
 * ノードの形状（円形/角丸四角形）は labels 配列から動的に決定します
 */

import { deriveNodeVisual } from './node-visual';

/**
 * グラフノードの画像サイズ（固定値）
 * GraphNodeComponent の画像は w-20 h-20 (80px x 80px)
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

  // 各辺との交点を計算し、中心に最も近いものを選択
  let minDistanceFromCenter = Infinity;
  let intersection = { x: center.x + halfWidth, y: center.y };

  // 右辺（x = center.x + halfWidth）との交点
  if (dx > 0) {
    // パラメータ t: center + t * (dx, dy) = (center.x + halfWidth, y)
    // t = halfWidth / dx
    const t = halfWidth / dx;
    const y = center.y + dy * t;
    // 交点が右辺の範囲内にあるか確認
    if (Math.abs(y - center.y) <= halfHeight) {
      const distanceFromCenter = Math.sqrt(halfWidth ** 2 + (y - center.y) ** 2);
      if (distanceFromCenter < minDistanceFromCenter) {
        minDistanceFromCenter = distanceFromCenter;
        intersection = { x: center.x + halfWidth, y };
      }
    }
  }

  // 左辺（x = center.x - halfWidth）との交点
  if (dx < 0) {
    // t = -halfWidth / dx
    const t = -halfWidth / dx;
    const y = center.y + dy * t;
    // 交点が左辺の範囲内にあるか確認
    if (Math.abs(y - center.y) <= halfHeight) {
      const distanceFromCenter = Math.sqrt(halfWidth ** 2 + (y - center.y) ** 2);
      if (distanceFromCenter < minDistanceFromCenter) {
        minDistanceFromCenter = distanceFromCenter;
        intersection = { x: center.x - halfWidth, y };
      }
    }
  }

  // 下辺（y = center.y + halfHeight）との交点
  if (dy > 0) {
    // t = halfHeight / dy
    const t = halfHeight / dy;
    const x = center.x + dx * t;
    // 交点が下辺の範囲内にあるか確認
    if (Math.abs(x - center.x) <= halfWidth) {
      const distanceFromCenter = Math.sqrt((x - center.x) ** 2 + halfHeight ** 2);
      if (distanceFromCenter < minDistanceFromCenter) {
        minDistanceFromCenter = distanceFromCenter;
        intersection = { x, y: center.y + halfHeight };
      }
    }
  }

  // 上辺（y = center.y - halfHeight）との交点
  if (dy < 0) {
    // t = -halfHeight / dy
    const t = -halfHeight / dy;
    const x = center.x + dx * t;
    // 交点が上辺の範囲内にあるか確認
    if (Math.abs(x - center.x) <= halfWidth) {
      const distanceFromCenter = Math.sqrt((x - center.x) ** 2 + halfHeight ** 2);
      if (distanceFromCenter < minDistanceFromCenter) {
        // 注: minDistanceFromCenterへの代入はこの後使われないが、
        // すべての辺で同じパターンを維持するために保持している
        minDistanceFromCenter = distanceFromCenter;
        intersection = { x, y: center.y - halfHeight };
      }
    }
  }

  return intersection;
}

/**
 * Episodeノードのデフォルトサイズ（フォールバック用）
 * EpisodeNodeComponentのカードサイズに対応
 */
export const EPISODE_DEFAULT_WIDTH = 180;
export const EPISODE_DEFAULT_HEIGHT = 72;

/**
 * ノードの情報（位置とサイズ）
 * type が 'episode' の場合は矩形として扱い、それ以外は labels から形状を導出する
 */
interface NodeInfo {
  id: string;
  type?: string;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
  /** ノードデータ（labels から形状を導出する） */
  data?: { labels?: string[] };
}

/**
 * ノードのバウンディングボックス情報（中心座標・幅・高さ・形状）
 */
interface NodeBounds {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  /** 'circle' = 円形（Personノード）、'rect' = 矩形（Episodeノード・物アイコン） */
  shape: 'circle' | 'rect';
}

/**
 * ノードのバウンディングボックスを計算する
 * - Episodeノード（type='episode'）: 矩形 180x72、中心は左上 + (w/2, h/2)
 * - Personノード（デフォルト）: labelsから形状を導出し、中心は position + (w/2, PERSON_IMAGE_RADIUS)
 */
function getNodeBounds(node: NodeInfo): NodeBounds {
  if (node.type === 'episode') {
    const width = node.measured?.width ?? EPISODE_DEFAULT_WIDTH;
    const height = node.measured?.height ?? EPISODE_DEFAULT_HEIGHT;
    return {
      centerX: node.position.x + width / 2,
      centerY: node.position.y + height / 2,
      width,
      height,
      shape: 'rect',
    };
  }

  // Personノード: 視覚的なバウンディングボックスはPERSON_IMAGE_SIZE固定
  // centerX/centerY はノード内の円形アバター中心に合わせる
  const isRoundedRect = deriveNodeVisual(node.data?.labels ?? ['人物']).shape === 'rounded-rect';
  return {
    centerX: node.position.x + PERSON_IMAGE_SIZE / 2,
    centerY: node.position.y + PERSON_IMAGE_RADIUS,
    width: PERSON_IMAGE_SIZE,
    height: PERSON_IMAGE_SIZE,
    shape: isRoundedRect ? 'rect' : 'circle',
  };
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
  const src = getNodeBounds(sourceNode);
  const tgt = getNodeBounds(targetNode);

  // ソースノードの境界との交点を計算
  const sourcePoint =
    src.shape === 'rect'
      ? getRectIntersection(
          { x: src.centerX, y: src.centerY },
          src.width,
          src.height,
          tgt.centerX,
          tgt.centerY
        )
      : getCircleIntersection(
          { x: src.centerX, y: src.centerY },
          src.width / 2,
          tgt.centerX,
          tgt.centerY
        );

  // ターゲットノードの境界との交点を計算
  const targetPoint =
    tgt.shape === 'rect'
      ? getRectIntersection(
          { x: tgt.centerX, y: tgt.centerY },
          tgt.width,
          tgt.height,
          src.centerX,
          src.centerY
        )
      : getCircleIntersection(
          { x: tgt.centerX, y: tgt.centerY },
          tgt.width / 2,
          src.centerX,
          src.centerY
        );

  return {
    sourcePoint,
    targetPoint,
  };
}
