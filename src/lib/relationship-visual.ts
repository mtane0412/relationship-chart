/**
 * エッジの視覚的属性を導出するユーティリティ
 * Relationship のプロパティ（type・tags・定型数値・colorOverride）から
 * 色・線幅・破線・SVGマーカーキーを決定する。
 *
 * 優先順位:
 *   色: colorOverride → TYPE_COLOR_MAP のtypeマッチ → TAG_COLOR_MAP の最初のマッチ → trust/tension 差 → グレー
 *   線幅: properties.closeness（null=2px, 0=1px, 1=4px）
 *   破線: properties.secrecy >= 0.5
 *   マーカー: 色から逆引き（未知色は gray）
 */

import type { Relationship } from '@/types/relationship';
import { TYPE_COLOR_MAP, TAG_COLOR_MAP } from '@/types/relationship';

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
 * Relationship からエッジの視覚的属性を導出する
 *
 * @param relationship - v11 形式の関係データ
 * @returns エッジ描画に使用する EdgeVisual
 */
export function deriveEdgeVisual(relationship: Relationship): EdgeVisual {
  const { type, properties, tags, colorOverride } = relationship;

  // ─── 色の導出（優先順位順） ────────────────────────────────────────────────────
  let color: string;

  if (colorOverride !== null) {
    // 1. 手動上書き色
    color = colorOverride;
  } else {
    // 2. TYPE_COLOR_MAP のエッジ型マッチ
    const typeColor = TYPE_COLOR_MAP[type];
    if (typeColor !== undefined) {
      color = typeColor;
    } else {
      // 3. TAG_COLOR_MAP の最初にマッチしたタグの色
      const tagColor = tags.map((tag) => TAG_COLOR_MAP[tag]).find((c) => c !== undefined);
      if (tagColor !== undefined) {
        color = tagColor;
      } else if (
        properties.trust != null &&
        properties.tension != null &&
        properties.trust > properties.tension + 0.2
      ) {
        // 4. 信頼が対立を 0.2 超えて上回る → 青系
        color = '#3b82f6';
      } else if (
        properties.tension != null &&
        properties.trust != null &&
        properties.tension > properties.trust + 0.2
      ) {
        // 5. 対立が信頼を 0.2 超えて上回る → 赤系
        color = '#ef4444';
      } else {
        // 6. デフォルト → グレー
        color = '#64748b';
      }
    }
  }

  // ─── SVG マーカーキー（既知色から逆引き、未知色は gray） ─────────────────────
  // colorOverride に大文字 HEX（例: #EF4444）が渡された場合もルックアップできるよう小文字に正規化する
  const markerKey = COLOR_TO_MARKER[color.toLowerCase()] ?? 'gray';

  // ─── ストローク幅（closeness から線形補間） ──────────────────────────────────
  // null/undefined=2px, 0=1px, 1=4px（式: closeness * 3 + 1）
  const closeness = properties.closeness;
  const strokeWidth = closeness == null ? 2 : closeness * 3 + 1;

  // ─── 破線判定（secrecy >= 0.5） ──────────────────────────────────────────────
  const secrecy = properties.secrecy;
  const dashed = secrecy != null && secrecy >= 0.5;

  return { color, strokeWidth, dashed, markerKey };
}
