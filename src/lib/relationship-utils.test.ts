/**
 * relationship-utils.ts のテスト（v11 プロパティグラフ方式）
 * getRelationshipFromPerspective 関数の振る舞いを検証する。
 *
 * v11 では 1 エッジ = 1 方向（sourceId → targetId）。
 * symmetric: true の場合は無向扱いで "—" 記号を使用する。
 * getRelationshipDisplayType は v11 では廃止されたため、テスト対象外。
 */

import { describe, it, expect } from 'vitest';
import type { Relationship } from '@/types/relationship';
import { getRelationshipFromPerspective } from './relationship-utils';

/**
 * テスト用の最小 Relationship（v11形式）を生成するヘルパー
 */
function makeRel(overrides: {
  id?: string;
  sourceId?: string;
  targetId?: string;
  type?: string;
  label?: string | null;
  symmetric?: boolean;
}): Relationship {
  return {
    id: overrides.id ?? '1',
    sourceId: overrides.sourceId ?? 'personA',
    targetId: overrides.targetId ?? 'personB',
    type: overrides.type ?? '関係',
    label: overrides.label ?? null,
    symmetric: overrides.symmetric ?? false,
    tags: [],
    narrative: { summary: null, notes: null },
    colorOverride: null,
    properties: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('getRelationshipFromPerspective', () => {
  describe('有向関係（symmetric: false）', () => {
    const relationship = makeRel({ label: '片想い', symmetric: false });

    it('source 側から見た場合: → 方向を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personA');
      expect(result).toEqual([
        { label: '片想い', direction: '→', otherPersonId: 'personB' },
      ]);
    });

    it('target 側から見た場合: ← 方向を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personB');
      expect(result).toEqual([
        { label: '片想い', direction: '←', otherPersonId: 'personA' },
      ]);
    });
  });

  describe('対称な関係（symmetric: true）', () => {
    const relationship = makeRel({ label: '友人', symmetric: true });

    it('source 側から見た場合: — 方向を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personA');
      expect(result).toEqual([
        { label: '友人', direction: '—', otherPersonId: 'personB' },
      ]);
    });

    it('target 側から見た場合でも: — 方向を返す（対称なので向き不問）', () => {
      const result = getRelationshipFromPerspective(relationship, 'personB');
      expect(result).toEqual([
        { label: '友人', direction: '—', otherPersonId: 'personA' },
      ]);
    });
  });

  describe('label が null のとき type を使用する', () => {
    it('label が null なら type（"上司"）が表示ラベルになる（source視点）', () => {
      const relationship = makeRel({ type: '上司', label: null, symmetric: false });
      const result = getRelationshipFromPerspective(relationship, 'personA');
      expect(result).toEqual([
        { label: '上司', direction: '→', otherPersonId: 'personB' },
      ]);
    });

    it('label が null なら type（"上司"）が表示ラベルになる（target視点）', () => {
      // 前提条件: label=null のとき、target側から見ても type が表示ラベルとして使われる
      const relationship = makeRel({ type: '上司', label: null, symmetric: false });
      const result = getRelationshipFromPerspective(relationship, 'personB');
      expect(result).toEqual([
        { label: '上司', direction: '←', otherPersonId: 'personA' },
      ]);
    });
  });

  describe('エッジケース', () => {
    it('関係者以外の人物IDを指定した場合は空配列を返す', () => {
      const relationship = makeRel({ label: '好き', symmetric: false });
      const result = getRelationshipFromPerspective(relationship, 'personC');
      expect(result).toEqual([]);
    });
  });
});
