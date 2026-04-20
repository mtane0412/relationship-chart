/**
 * relationship-visual.ts のテスト（v11 プロパティグラフ方式）
 * deriveEdgeVisual 関数の色・線幅・破線・マーカーキー導出ルールを検証する。
 *
 * v11 の主な変更:
 *   - kinship フィールドは廃止（properties に統合）
 *   - closeness/trust/tension/secrecy は properties 配下に移動
 *   - エッジ型（type）に基づく色導出が追加（TYPE_COLOR_MAP）
 */

import { describe, it, expect } from 'vitest';
import { deriveEdgeVisual } from './relationship-visual';
import type { Relationship } from '@/types/relationship';

// ─── テストデータ ヘルパー ─────────────────────────────────────────────────────

/**
 * テスト用の Relationship（v11形式）を生成する
 * すべてのフィールドをデフォルト（null/空）にして、引数で上書きする
 */
function makeRel(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: 'rel-1',
    sourceId: '鈴木一郎',
    targetId: '田中花子',
    type: '知人',
    label: null,
    symmetric: false,
    tags: [],
    narrative: { summary: null, notes: null },
    colorOverride: null,
    properties: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── deriveEdgeVisual のテスト ─────────────────────────────────────────────────

describe('deriveEdgeVisual', () => {
  // ─── 色導出の優先順位 ──────────────────────────────────────────────────────────

  describe('色の導出優先順位', () => {
    it('デフォルト（タグなし・定型値なし・colorOverride なし）はグレー（#64748b）を返す', () => {
      // 前提条件: すべてのフィールドが null/空の関係
      const rel = makeRel();
      const visual = deriveEdgeVisual(rel);
      expect(visual.color).toBe('#64748b');
      expect(visual.markerKey).toBe('gray');
    });

    it('colorOverride が設定されている場合は最優先で使用する', () => {
      // 前提条件: 組織タグ（本来緑）があっても colorOverride が優先される
      const rel = makeRel({
        colorOverride: '#ff0000',
        tags: ['上司'],
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.color).toBe('#ff0000');
    });

    it('TYPE_COLOR_MAP にマッチするエッジ型がある場合はその型の色を使用する', () => {
      // 前提条件: '恋人' は TYPE_COLOR_MAP で赤（#ef4444）にマッピングされる
      const rel = makeRel({ type: '恋人' });
      const visual = deriveEdgeVisual(rel);
      expect(visual.color).toBe('#ef4444');
    });

    it('TAG_COLOR_MAP にマッチするタグがある場合はそのタグの色を使用する', () => {
      // 前提条件: '上司' は organizational 系（#22c55e = 緑）にマッピングされる
      const rel = makeRel({ tags: ['上司'] });
      const visual = deriveEdgeVisual(rel);
      expect(visual.color).toBe('#22c55e');
      expect(visual.markerKey).toBe('green');
    });

    it('TAG_COLOR_MAP にマッチする最初のタグの色が採用される', () => {
      // 前提条件: '対立'（赤）と '上司'（緑）が両方ある場合、最初にマッチした方を採用
      const rel = makeRel({ tags: ['対立', '上司'] });
      const visual = deriveEdgeVisual(rel);
      // '対立' が先なので赤が選ばれる
      expect(visual.color).toBe('#ef4444');
    });

    it('TAG_COLOR_MAP にマッチしない独自タグはグレーにフォールバックする（定型値なし）', () => {
      // 前提条件: TAG_COLOR_MAP に載っていない独自タグ
      const rel = makeRel({ tags: ['元カレ'] });
      const visual = deriveEdgeVisual(rel);
      expect(visual.color).toBe('#64748b');
    });

    it('trust が tension + 0.2 より大きい場合は青（#3b82f6）を使用する', () => {
      // 前提条件: trust=0.9, tension=0.3（差が0.6 > 0.2）
      const rel = makeRel({
        properties: { trust: 0.9, tension: 0.3 },
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.color).toBe('#3b82f6');
      expect(visual.markerKey).toBe('blue');
    });

    it('tension が trust + 0.2 より大きい場合は赤（#ef4444）を使用する', () => {
      // 前提条件: tension=0.9, trust=0.1（差が0.8 > 0.2）
      const rel = makeRel({
        properties: { trust: 0.1, tension: 0.9 },
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.color).toBe('#ef4444');
      expect(visual.markerKey).toBe('red');
    });

    it('trust と tension の差が 0.2 以内の場合はグレーにフォールバックする', () => {
      // 前提条件: trust=0.5, tension=0.5（差がゼロ、0.2 以下）
      const rel = makeRel({
        properties: { trust: 0.5, tension: 0.5 },
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.color).toBe('#64748b');
    });

    it('trust のみ設定されていて tension が null の場合は青にならずグレーを返す', () => {
      // 前提条件: trust=0.9, tension=null（比較不能 → グレー）
      const rel = makeRel({
        properties: { trust: 0.9, tension: null },
      });
      const visual = deriveEdgeVisual(rel);
      // tension が null なので比較できず、グレーにフォールバック
      expect(visual.color).toBe('#64748b');
    });

    it('TYPE_COLOR_MAP の type が trust/tension より優先される', () => {
      // 前提条件: 恋人（赤）type + trust=0.9 tension=0.1（本来なら青）
      const rel = makeRel({
        type: '恋人',
        properties: { trust: 0.9, tension: 0.1 },
      });
      const visual = deriveEdgeVisual(rel);
      // TYPE_COLOR_MAP のマッチが trust/tension より優先される
      expect(visual.color).toBe('#ef4444');
    });
  });

  // ─── strokeWidth ─────────────────────────────────────────────────────────────

  describe('strokeWidth の導出', () => {
    it('closeness が null の場合は 2px を返す', () => {
      const rel = makeRel();
      const visual = deriveEdgeVisual(rel);
      expect(visual.strokeWidth).toBe(2);
    });

    it('closeness が 0 の場合は 1px を返す', () => {
      // 前提条件: closeness=0（最小値）
      const rel = makeRel({
        properties: { closeness: 0 },
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.strokeWidth).toBe(1);
    });

    it('closeness が 1 の場合は 4px を返す', () => {
      // 前提条件: closeness=1（最大値）
      const rel = makeRel({
        properties: { closeness: 1 },
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.strokeWidth).toBe(4);
    });

    it('closeness が 0.5 の場合は 2.5px を返す', () => {
      // 前提条件: closeness=0.5（中間値）: 0.5 * 3 + 1 = 2.5
      const rel = makeRel({
        properties: { closeness: 0.5 },
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.strokeWidth).toBeCloseTo(2.5);
    });
  });

  // ─── 破線 ─────────────────────────────────────────────────────────────────────

  describe('dashed（破線）の導出', () => {
    it('secrecy が null の場合は実線（dashed: false）を返す', () => {
      const rel = makeRel();
      const visual = deriveEdgeVisual(rel);
      expect(visual.dashed).toBe(false);
    });

    it('secrecy が 0.5 の場合は破線（dashed: true）を返す', () => {
      // 前提条件: secrecy=0.5（閾値ちょうど）
      const rel = makeRel({
        properties: { secrecy: 0.5 },
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.dashed).toBe(true);
    });

    it('secrecy が 0.5 未満の場合は実線（dashed: false）を返す', () => {
      // 前提条件: secrecy=0.4（閾値未満）
      const rel = makeRel({
        properties: { secrecy: 0.4 },
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.dashed).toBe(false);
    });

    it('secrecy が 1.0 の場合は破線（dashed: true）を返す', () => {
      // 前提条件: secrecy=1.0（最大値）
      const rel = makeRel({
        properties: { secrecy: 1.0 },
      });
      const visual = deriveEdgeVisual(rel);
      expect(visual.dashed).toBe(true);
    });
  });

  // ─── markerKey ───────────────────────────────────────────────────────────────

  describe('markerKey の導出', () => {
    it('色が #22c55e の場合は green を返す', () => {
      const rel = makeRel({ tags: ['上司'] }); // #22c55e
      expect(deriveEdgeVisual(rel).markerKey).toBe('green');
    });

    it('色が #8b5cf6 の場合は purple を返す', () => {
      const rel = makeRel({ tags: ['正体認知'] }); // #8b5cf6
      expect(deriveEdgeVisual(rel).markerKey).toBe('purple');
    });

    it('色が #ef4444 の場合は red を返す', () => {
      const rel = makeRel({ tags: ['片想い'] }); // #ef4444
      expect(deriveEdgeVisual(rel).markerKey).toBe('red');
    });

    it('色が #3b82f6 の場合は blue を返す', () => {
      // trust > tension + 0.2
      const rel = makeRel({
        properties: { trust: 0.8, tension: 0.1 },
      });
      expect(deriveEdgeVisual(rel).markerKey).toBe('blue');
    });

    it('colorOverride に既知の 6 色以外が設定された場合は gray にフォールバックする', () => {
      // 前提条件: #ff9900（既知のマーカー色ではない）
      const rel = makeRel({ colorOverride: '#ff9900' });
      const visual = deriveEdgeVisual(rel);
      expect(visual.color).toBe('#ff9900'); // color は override 値のまま
      expect(visual.markerKey).toBe('gray'); // markerKey はフォールバック
    });
  });
});
