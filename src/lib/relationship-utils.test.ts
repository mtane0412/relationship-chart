/**
 * relationship-utils.tsのテスト
 * 関係のユーティリティ関数の検証
 */

import { describe, it, expect } from 'vitest';
import type { Relationship } from '@/types/relationship';
import { getRelationshipDisplayType, getRelationshipFromPerspective } from './relationship-utils';

describe('getRelationshipDisplayType', () => {
  it('双方向（両方向に同一ラベル）を返す', () => {
    const relationship: Relationship = {
      id: '1',
      sourcePersonId: 'person1',
      targetPersonId: 'person2',
      isDirected: true,
      sourceToTargetLabel: '好き',
      targetToSourceLabel: '好き',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    expect(getRelationshipDisplayType(relationship)).toBe('bidirectional');
  });

  it('片方向（片方向のみラベルあり）を返す', () => {
    const relationship: Relationship = {
      id: '2',
      sourcePersonId: 'person1',
      targetPersonId: 'person2',
      isDirected: true,
      sourceToTargetLabel: '好き',
      targetToSourceLabel: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    expect(getRelationshipDisplayType(relationship)).toBe('one-way');
  });

  it('逆方向の片方向（targetToSourceのみラベルあり）を返す', () => {
    const relationship: Relationship = {
      id: '3',
      sourcePersonId: 'person1',
      targetPersonId: 'person2',
      isDirected: true,
      sourceToTargetLabel: null,
      targetToSourceLabel: '好き',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    expect(getRelationshipDisplayType(relationship)).toBe('one-way');
  });

  it('片方向×2（両方向に異なるラベル）を返す', () => {
    const relationship: Relationship = {
      id: '4',
      sourcePersonId: 'person1',
      targetPersonId: 'person2',
      isDirected: true,
      sourceToTargetLabel: '好き',
      targetToSourceLabel: '嫌い',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    expect(getRelationshipDisplayType(relationship)).toBe('dual-directed');
  });

  it('無方向を返す', () => {
    const relationship: Relationship = {
      id: '5',
      sourcePersonId: 'person1',
      targetPersonId: 'person2',
      isDirected: false,
      sourceToTargetLabel: '同一人物',
      targetToSourceLabel: '同一人物',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    expect(getRelationshipDisplayType(relationship)).toBe('undirected');
  });
});

describe('getRelationshipFromPerspective', () => {
  describe('双方向の関係', () => {
    const relationship: Relationship = {
      id: '1',
      sourcePersonId: 'personA',
      targetPersonId: 'personB',
      isDirected: true,
      sourceToTargetLabel: '親子',
      targetToSourceLabel: '親子',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

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
    const relationship: Relationship = {
      id: '2',
      sourcePersonId: 'personA',
      targetPersonId: 'personB',
      isDirected: true,
      sourceToTargetLabel: '片想い',
      targetToSourceLabel: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

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
    const relationship: Relationship = {
      id: '3',
      sourcePersonId: 'personA',
      targetPersonId: 'personB',
      isDirected: true,
      sourceToTargetLabel: null,
      targetToSourceLabel: '片想い',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

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
    const relationship: Relationship = {
      id: '4',
      sourcePersonId: 'personA',
      targetPersonId: 'personB',
      isDirected: true,
      sourceToTargetLabel: '好き',
      targetToSourceLabel: '嫌い',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

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
    const relationship: Relationship = {
      id: '5',
      sourcePersonId: 'personA',
      targetPersonId: 'personB',
      isDirected: false,
      sourceToTargetLabel: '同一人物',
      targetToSourceLabel: '同一人物',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

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
      const relationship: Relationship = {
        id: '6',
        sourcePersonId: 'personA',
        targetPersonId: 'personB',
        isDirected: true,
        sourceToTargetLabel: '好き',
        targetToSourceLabel: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const result = getRelationshipFromPerspective(relationship, 'personC');
      expect(result).toEqual([]);
    });
  });
});
