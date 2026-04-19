/**
 * スナップショットdiffハイライトのスタイルユーティリティ
 *
 * スナップショット間の差分（追加/削除/変更）に対応する色・スタイルを提供する。
 * RelationshipEdge コンポーネントから参照され、エッジの視覚的なdiff表示に使用する。
 *
 * 色定義:
 *   - 追加エッジ: 緑色 (#22c55e)
 *   - 削除エッジ: 赤色 (#ef4444)
 *   - 変更エッジ: 青色 (#3b82f6)
 */

/**
 * エッジのdiff状態を表す型
 * null / undefined はdiffハイライトなし（通常表示）
 */
export type DiffStatus = 'added' | 'removed' | 'changed' | null;

/**
 * diffStatusに対応するエッジストローク色の定数
 */
export const DIFF_HIGHLIGHT_COLORS = {
  /** 追加エッジ: 緑色 */
  added: '#22c55e',
  /** 削除エッジ: 赤色 */
  removed: '#ef4444',
  /** 変更エッジ: 青色 */
  changed: '#3b82f6',
} as const;

/** diffハイライト時のストローク幅 */
const DIFF_STROKE_WIDTH = 3;

/**
 * diffStatusに対応するエッジのstyleを返す
 *
 * @param diffStatus - エッジのdiff状態
 * @returns エッジのstyle（stroke / strokeWidth）、diffなしの場合は null
 */
export function getDiffEdgeStyle(
  diffStatus: DiffStatus | undefined
): { stroke: string; strokeWidth: number } | null {
  if (!diffStatus) return null;
  return {
    stroke: DIFF_HIGHLIGHT_COLORS[diffStatus],
    strokeWidth: DIFF_STROKE_WIDTH,
  };
}

/**
 * diffStatusに対応するSVGマーカーキーを返す
 * RelationshipGraph に定義された固定6色マーカー（red/blue/green等）と対応する。
 *
 * @param diffStatus - エッジのdiff状態
 * @returns マーカーキー文字列、diffなしの場合は null
 */
export function getDiffMarkerKey(
  diffStatus: DiffStatus | undefined
): 'green' | 'red' | 'blue' | null {
  if (!diffStatus) return null;
  const markerMap = {
    added: 'green',
    removed: 'red',
    changed: 'blue',
  } as const;
  return markerMap[diffStatus];
}
