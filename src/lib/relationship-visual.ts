/**
 * エッジの視覚的属性を導出するユーティリティ
 * RelationshipV9 のプロパティ（タグ・定型数値・colorOverride）から
 * 色・線幅・破線・SVGマーカーキーを決定する。
 *
 * 優先順位:
 *   色: colorOverride → TAG_COLOR_MAP の最初のマッチ → kinship 有無 → trust/tension 差 → グレー
 *   線幅: closeness（null=2px, 0=1px, 1=4px）
 *   破線: secrecy >= 0.5
 *   マーカー: 色から逆引き（未知色は gray）
 */

import type { RelationshipV9 } from '@/types/relationship';
import { TAG_COLOR_MAP } from '@/types/relationship';

/**
 * エッジの視覚的属性
 * SVG 描画に必要な最小限の情報をまとめた型
 */
export type EdgeVisual = {
  /** ストローク色（HEX 文字列） */
  color: string;
  /** ストローク幅（px） */
  strokeWidth: number;
  /** 破線かどうか（secrecy >= 0.5 のとき true） */
  dashed: boolean;
  /** SVG マーカー ID のキー（arrow-{markerKey} に対応） */
  markerKey: 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'gray';
};

/**
 * 既知の 6 色から SVG マーカーキーへの対応表
 * RelationshipGraph.tsx に定義される固定 6 種マーカーに対応する
 */
const COLOR_TO_MARKER: Record<string, EdgeVisual['markerKey']> = {
  '#ef4444': 'red',
  '#3b82f6': 'blue',
  '#22c55e': 'green',
  '#8b5cf6': 'purple',
  '#f97316': 'orange',
  '#64748b': 'gray',
};

/**
 * RelationshipV9 からエッジの視覚的属性を導出する
 *
 * @param relationship - v9 形式の関係データ
 * @returns エッジ描画に使用する EdgeVisual
 */
export function deriveEdgeVisual(relationship: RelationshipV9): EdgeVisual {
  const { symmetric, tags, colorOverride } = relationship;

  // ─── 色の導出（優先順位順） ────────────────────────────────────────────────────
  let color: string;

  if (colorOverride !== null) {
    // 1. 手動上書き色
    color = colorOverride;
  } else {
    // 2. TAG_COLOR_MAP の最初にマッチしたタグの色
    const tagColor = tags.map((tag) => TAG_COLOR_MAP[tag]).find((c) => c !== undefined);
    if (tagColor !== undefined) {
      color = tagColor;
    } else if (symmetric.kinship !== null) {
      // 3. 血縁・親族あり → 緑系
      color = '#22c55e';
    } else if (
      symmetric.trust !== null &&
      symmetric.tension !== null &&
      symmetric.trust > symmetric.tension + 0.2
    ) {
      // 4. 信頼が対立を 0.2 超えて上回る → 青系
      color = '#3b82f6';
    } else if (
      symmetric.tension !== null &&
      symmetric.trust !== null &&
      symmetric.tension > symmetric.trust + 0.2
    ) {
      // 5. 対立が信頼を 0.2 超えて上回る → 赤系
      color = '#ef4444';
    } else {
      // 6. デフォルト → グレー
      color = '#64748b';
    }
  }

  // ─── SVG マーカーキー（既知色から逆引き、未知色は gray） ─────────────────────
  const markerKey = COLOR_TO_MARKER[color] ?? 'gray';

  // ─── ストローク幅（closeness から線形補間） ──────────────────────────────────
  // null=2px, 0=1px, 1=4px（式: closeness * 3 + 1）
  const strokeWidth = symmetric.closeness === null ? 2 : symmetric.closeness * 3 + 1;

  // ─── 破線判定（secrecy >= 0.5） ──────────────────────────────────────────────
  const dashed = symmetric.secrecy !== null && symmetric.secrecy >= 0.5;

  return { color, strokeWidth, dashed, markerKey };
}
