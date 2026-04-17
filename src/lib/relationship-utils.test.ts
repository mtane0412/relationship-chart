/**
 * relationship-utils.tsのテスト
 * 関係のユーティリティ関数の検証（v9 RelationshipV9 形式）
 */

import { describe, it, expect } from 'vitest';
import type { RelationshipV9 } from '@/types/relationship';
import { getRelationshipDisplayType, getRelationshipFromPerspective } from './relationship-utils';

/** テスト用の最小 RelationshipV9 を生成するヘルパー */
function makeRel(
  overrides: {
    id?: string;
    sourcePersonId?: string;
    targetPersonId?: string;
    isDirected?: boolean;
    forwardLabel?: string | null;
    reverseLabel?: string | null;
  } = {}
): RelationshipV9 {
  return {
    id: overrides.id ?? '1',
    sourcePersonId: overrides.sourcePersonId ?? 'personA',
    targetPersonId: overrides.targetPersonId ?? 'personB',
    isDirected: overrides.isDirected ?? true,
    symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
    forward: {
      label: overrides.forwardLabel ?? null,
      affection: null,
      awareness: null,
      role: null,
    },
    reverse: {
      label: overrides.reverseLabel ?? null,
      affection: null,
      awareness: null,
      role: null,
    },
    tags: [],
    narrative: { summary: null, notes: null, turningPoints: [] },
    colorOverride: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('getRelationshipDisplayType', () => {
  it('双方向（両方向に同一ラベル）を返す', () => {
    const relationship = makeRel({ forwardLabel: '好き', reverseLabel: '好き' });
    expect(getRelationshipDisplayType(relationship)).toBe('bidirectional');
  });

  it('片方向（forward.labelのみラベルあり）を返す', () => {
    const relationship = makeRel({ forwardLabel: '好き', reverseLabel: null });
    expect(getRelationshipDisplayType(relationship)).toBe('one-way');
  });

  it('逆方向の片方向（reverse.labelのみラベルあり）を返す', () => {
    const relationship = makeRel({ forwardLabel: null, reverseLabel: '好き' });
    expect(getRelationshipDisplayType(relationship)).toBe('one-way');
  });

  it('片方向×2（両方向に異なるラベル）を返す', () => {
    const relationship = makeRel({ forwardLabel: '好き', reverseLabel: '嫌い' });
    expect(getRelationshipDisplayType(relationship)).toBe('dual-directed');
  });

  it('無方向を返す', () => {
    const relationship = makeRel({
      isDirected: false,
      forwardLabel: '同一人物',
      reverseLabel: '同一人物',
    });
    expect(getRelationshipDisplayType(relationship)).toBe('undirected');
  });
});

describe('getRelationshipFromPerspective', () => {
  describe('双方向の関係', () => {
    const relationship = makeRel({ forwardLabel: '親子', reverseLabel: '親子' });

    it('source側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personA');
      expect(result).toEqual([
        { label: '親子', direction: '↔', otherPersonId: 'personB' },
      ]);
    });

    it('target側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personB');
      expect(result).toEqual([
        { label: '親子', direction: '↔', otherPersonId: 'personA' },
      ]);
    });
  });

  describe('片方向の関係（source→target）', () => {
    const relationship = makeRel({ forwardLabel: '片想い', reverseLabel: null });

    it('source側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personA');
      expect(result).toEqual([
        { label: '片想い', direction: '→', otherPersonId: 'personB' },
      ]);
    });

    it('target側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personB');
      expect(result).toEqual([
        { label: '片想い', direction: '←', otherPersonId: 'personA' },
      ]);
    });
  });

  describe('逆方向の片方向の関係（target→source）', () => {
    const relationship = makeRel({ forwardLabel: null, reverseLabel: '片想い' });

    it('source側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personA');
      expect(result).toEqual([
        { label: '片想い', direction: '←', otherPersonId: 'personB' },
      ]);
    });

    it('target側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personB');
      expect(result).toEqual([
        { label: '片想い', direction: '→', otherPersonId: 'personA' },
      ]);
    });
  });

  describe('片方向×2の関係', () => {
    const relationship = makeRel({ forwardLabel: '好き', reverseLabel: '嫌い' });

    it('source側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personA');
      expect(result).toEqual([
        { label: '好き', direction: '→', otherPersonId: 'personB' },
        { label: '嫌い', direction: '←', otherPersonId: 'personB' },
      ]);
    });

    it('target側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personB');
      expect(result).toEqual([
        { label: '好き', direction: '←', otherPersonId: 'personA' },
        { label: '嫌い', direction: '→', otherPersonId: 'personA' },
      ]);
    });
  });

  describe('無方向の関係', () => {
    const relationship = makeRel({
      isDirected: false,
      forwardLabel: '同一人物',
      reverseLabel: '同一人物',
    });

    it('source側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personA');
      expect(result).toEqual([
        { label: '同一人物', direction: '', otherPersonId: 'personB' },
      ]);
    });

    it('target側から見た関係を返す', () => {
      const result = getRelationshipFromPerspective(relationship, 'personB');
      expect(result).toEqual([
        { label: '同一人物', direction: '', otherPersonId: 'personA' },
      ]);
    });
  });

  describe('エッジケース', () => {
    it('関係者以外の人物IDを指定した場合は空配列を返す', () => {
      const relationship = makeRel({ forwardLabel: '好き', reverseLabel: null });
      const result = getRelationshipFromPerspective(relationship, 'personC');
      expect(result).toEqual([]);
    });
  });
});
