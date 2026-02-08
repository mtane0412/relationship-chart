/**
 * エッジラベル位置計算ユーティリティ
 * dual-directedエッジのラベル位置を計算します
 */

/**
 * ラベル位置計算結果
 */
export interface LabelPosition {
  /** X座標 */
  labelX: number;
  /** Y座標 */
  labelY: number;
}

/**
 * エッジ上の指定した比率の位置にラベルを配置するための座標を計算します
 *
 * @param sourceX - 開始点のX座標
 * @param sourceY - 開始点のY座標
 * @param targetX - 終点のX座標
 * @param targetY - 終点のY座標
 * @param ratio - 開始点からの比率（0.0-1.0）。0.3なら開始点から30%の位置
 * @returns ラベル位置の座標
 */
export function calculateLabelPositionOnEdge(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  ratio: number
): LabelPosition {
  // 開始点から終点への方向ベクトルにratioを掛けた位置を計算
  const labelX = sourceX + (targetX - sourceX) * ratio;
  const labelY = sourceY + (targetY - sourceY) * ratio;

  return {
    labelX,
    labelY,
  };
}
