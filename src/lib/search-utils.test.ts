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
        nodeKind: 'person',
        imageDataUrl: undefined,
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

    it('物ノードも検索できる', () => {
      const itemPerson: Person = {
        id: 'item1',
        name: 'テストアイテム',
        kind: 'item',
        createdAt: '2024-01-04T00:00:00Z',
      };

      const result = searchGraph('テストアイテム', [itemPerson], []);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'person',
        id: 'item1',
        label: 'テストアイテム',
        nodeKind: 'item',
        imageDataUrl: undefined,
      });
    });

    it('画像付き人物を検索すると画像URLが含まれる', () => {
      const personWithImage: Person = {
        id: 'person-with-image',
        name: '画像付き太郎',
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        createdAt: '2024-01-04T00:00:00Z',
      };

      const result = searchGraph('画像付き', [personWithImage], []);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'person',
        id: 'person-with-image',
        label: '画像付き太郎',
        nodeKind: 'person',
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      });
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
        relationshipType: 'dual-directed',
        sourceImageDataUrl: undefined,
        targetImageDataUrl: undefined,
        sourceNodeKind: 'person',
        targetNodeKind: 'person',
      });
    });

    it('targetToSourceLabelで検索すると起点と終点が入れ替わる', () => {
      const result = searchGraph('部下', persons, relationships);
      expect(result).toHaveLength(1);
      // 逆方向のラベルなので、起点と終点が入れ替わる
      expect(result[0]).toEqual({
        kind: 'relationship',
        id: 'rel1',
        label: '部下',
        sourcePersonId: 'person2', // 元のtargetPersonId
        targetPersonId: 'person1', // 元のsourcePersonId
        relationshipType: 'dual-directed',
        sourceImageDataUrl: undefined,
        targetImageDataUrl: undefined,
        sourceNodeKind: 'person',
        targetNodeKind: 'person',
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

    it('関係検索時に起点と終点の人物画像URLが含まれる', () => {
      const personsWithImages: Person[] = [
        {
          id: 'p1',
          name: '太郎',
          imageDataUrl: 'data:image/png;base64,image1',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'p2',
          name: '花子',
          imageDataUrl: 'data:image/png;base64,image2',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ];

      const relationshipsWithImages: Relationship[] = [
        {
          id: 'r1',
          sourcePersonId: 'p1',
          targetPersonId: 'p2',
          isDirected: true,
          sourceToTargetLabel: '友達',
          targetToSourceLabel: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const result = searchGraph('友達', personsWithImages, relationshipsWithImages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'relationship',
        id: 'r1',
        label: '友達',
        sourcePersonId: 'p1',
        targetPersonId: 'p2',
        relationshipType: 'one-way',
        sourceImageDataUrl: 'data:image/png;base64,image1',
        targetImageDataUrl: 'data:image/png;base64,image2',
        sourceNodeKind: 'person',
        targetNodeKind: 'person',
      });
    });

    it('双方向関係（同じラベル）は重複せず1件のみ返す', () => {
      const bidirectionalPersons: Person[] = [
        {
          id: 'p1',
          name: '親',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'p2',
          name: '子',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ];

      const bidirectionalRelationships: Relationship[] = [
        {
          id: 'r1',
          sourcePersonId: 'p1',
          targetPersonId: 'p2',
          isDirected: true,
          sourceToTargetLabel: '親子',
          targetToSourceLabel: '親子',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const result = searchGraph('親子', bidirectionalPersons, bidirectionalRelationships);
      // 双方向関係でsourceToTargetLabelとtargetToSourceLabelが同じ場合は1件のみ
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'relationship',
        id: 'r1',
        label: '親子',
        sourcePersonId: 'p1',
        targetPersonId: 'p2',
        relationshipType: 'bidirectional',
        sourceImageDataUrl: undefined,
        targetImageDataUrl: undefined,
        sourceNodeKind: 'person',
        targetNodeKind: 'person',
      });
    });

    it('片方向×2で逆方向のラベルを検索すると起点と終点が入れ替わる', () => {
      const dualDirectedPersons: Person[] = [
        {
          id: 'conan',
          name: '江戸川コナン',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'ran',
          name: '毛利蘭',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ];

      const dualDirectedRelationships: Relationship[] = [
        {
          id: 'r1',
          sourcePersonId: 'conan',
          targetPersonId: 'ran',
          isDirected: true,
          sourceToTargetLabel: '正体を隠している',
          targetToSourceLabel: '新一?',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      // 順方向のラベルを検索
      const forwardResult = searchGraph('正体を隠している', dualDirectedPersons, dualDirectedRelationships);
      expect(forwardResult).toHaveLength(1);
      expect(forwardResult[0]).toEqual({
        kind: 'relationship',
        id: 'r1',
        label: '正体を隠している',
        sourcePersonId: 'conan',
        targetPersonId: 'ran',
        relationshipType: 'dual-directed',
        sourceImageDataUrl: undefined,
        targetImageDataUrl: undefined,
        sourceNodeKind: 'person',
        targetNodeKind: 'person',
      });

      // 逆方向のラベルを検索（起点と終点が入れ替わる）
      const reverseResult = searchGraph('新一?', dualDirectedPersons, dualDirectedRelationships);
      expect(reverseResult).toHaveLength(1);
      expect(reverseResult[0]).toEqual({
        kind: 'relationship',
        id: 'r1',
        label: '新一?',
        sourcePersonId: 'ran', // 入れ替わる
        targetPersonId: 'conan', // 入れ替わる
        relationshipType: 'dual-directed',
        sourceImageDataUrl: undefined,
        targetImageDataUrl: undefined,
        sourceNodeKind: 'person',
        targetNodeKind: 'person',
      });
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
