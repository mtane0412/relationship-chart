/**
 * 検索ロジックのテスト
 * searchGraph関数の動作を検証する
 */

import { describe, it, expect } from 'vitest';
import { searchGraph, type SearchResult } from './search-utils';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

describe('searchGraph', () => {
  // テスト用データ
  const persons: Person[] = [
    {
      id: 'person1',
      name: '山田太郎',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'person2',
      name: '田中花子',
      createdAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'person3',
      name: 'Yamada Jiro',
      createdAt: '2024-01-03T00:00:00Z',
    },
  ];

  const relationships: Relationship[] = [
    {
      id: 'rel1',
      sourcePersonId: 'person1',
      targetPersonId: 'person2',
      isDirected: true,
      sourceToTargetLabel: '上司',
      targetToSourceLabel: '部下',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'rel2',
      sourcePersonId: 'person1',
      targetPersonId: 'person3',
      isDirected: false,
      sourceToTargetLabel: '友人',
      targetToSourceLabel: null,
      createdAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'rel3',
      sourcePersonId: 'person2',
      targetPersonId: 'person3',
      isDirected: true,
      sourceToTargetLabel: '先輩',
      targetToSourceLabel: '後輩',
      createdAt: '2024-01-03T00:00:00Z',
    },
  ];

  describe('空クエリの場合', () => {
    it('空文字列のクエリに対して空配列を返す', () => {
      const result = searchGraph('', persons, relationships);
      expect(result).toEqual([]);
    });

    it('空白のみのクエリに対して空配列を返す', () => {
      const result = searchGraph('   ', persons, relationships);
      expect(result).toEqual([]);
    });
  });

  describe('人物名検索', () => {
    it('完全一致する人物を検索できる', () => {
      const result = searchGraph('山田太郎', persons, relationships);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'person',
        id: 'person1',
        label: '山田太郎',
      });
    });

    it('部分一致する人物を検索できる', () => {
      const result = searchGraph('山田', persons, relationships);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('山田太郎');
    });

    it('大文字小文字を区別せずに検索できる', () => {
      const result = searchGraph('yamada', persons, relationships);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Yamada Jiro');
    });

    it('複数の人物が一致する場合はすべて返す', () => {
      const result = searchGraph('田', persons, relationships);
      expect(result).toHaveLength(2);
      expect(result.map((r: SearchResult) => r.label)).toContain('山田太郎');
      expect(result.map((r: SearchResult) => r.label)).toContain('田中花子');
    });
  });

  describe('関係ラベル検索', () => {
    it('sourceToTargetLabelで検索できる', () => {
      const result = searchGraph('上司', persons, relationships);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'relationship',
        id: 'rel1',
        label: '上司',
        sourcePersonId: 'person1',
        targetPersonId: 'person2',
      });
    });

    it('targetToSourceLabelで検索できる', () => {
      const result = searchGraph('部下', persons, relationships);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'relationship',
        id: 'rel1',
        label: '部下',
        sourcePersonId: 'person1',
        targetPersonId: 'person2',
      });
    });

    it('部分一致する関係ラベルを検索できる', () => {
      const result = searchGraph('先', persons, relationships);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('先輩');
    });

    it('複数の関係ラベルが一致する場合はすべて返す', () => {
      const result = searchGraph('輩', persons, relationships);
      expect(result).toHaveLength(2);
      expect(result.map((r: SearchResult) => r.label)).toContain('先輩');
      expect(result.map((r: SearchResult) => r.label)).toContain('後輩');
    });
  });

  describe('結果の順序', () => {
    it('人物結果を関係結果よりも先に返す', () => {
      const result = searchGraph('太', persons, relationships);
      // '山田太郎'と'部下'が一致するが、人物が先
      expect(result[0].kind).toBe('person');
      expect(result[0].label).toBe('山田太郎');
    });
  });

  describe('結果の件数制限', () => {
    it('最大20件で切り捨てる', () => {
      // 20件以上の人物を生成
      const manyPersons: Person[] = Array.from({ length: 25 }, (_, i) => ({
        id: `person${i}`,
        name: `テスト太郎${i}`,
        createdAt: '2024-01-01T00:00:00Z',
      }));

      const result = searchGraph('テスト', manyPersons, []);
      expect(result).toHaveLength(20);
    });
  });

  describe('人物と関係の両方にマッチする場合', () => {
    it('人物結果が先、関係結果が後の順序で返す', () => {
      const testPersons: Person[] = [
        {
          id: 'p1',
          name: '友人A',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'p2',
          name: '友人B',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const testRelationships: Relationship[] = [
        {
          id: 'r1',
          sourcePersonId: 'p1',
          targetPersonId: 'p2',
          isDirected: false,
          sourceToTargetLabel: '友人',
          targetToSourceLabel: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const result = searchGraph('友人', testPersons, testRelationships);
      expect(result).toHaveLength(3);
      expect(result[0].kind).toBe('person');
      expect(result[1].kind).toBe('person');
      expect(result[2].kind).toBe('relationship');
    });
  });

  describe('エッジケース', () => {
    it('人物が空配列の場合は関係のみを検索する', () => {
      const result = searchGraph('上司', [], relationships);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('relationship');
    });

    it('関係が空配列の場合は人物のみを検索する', () => {
      const result = searchGraph('山田', persons, []);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('person');
    });

    it('両方が空配列の場合は空配列を返す', () => {
      const result = searchGraph('テスト', [], []);
      expect(result).toEqual([]);
    });

    it('一致する結果がない場合は空配列を返す', () => {
      const result = searchGraph('存在しない名前', persons, relationships);
      expect(result).toEqual([]);
    });
  });
});
