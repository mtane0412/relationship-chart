/**
 * 検索ロジックのテスト（v11 プロパティグラフ方式）
 * searchGraph 関数の動作を検証する。
 *
 * v11 の主な変更:
 *   - Relationship は 1 エッジ = 1 ラベル（label ?? type で検索）
 *   - SearchResult の関係結果は relationshipType の代わりに symmetric: boolean を持つ
 *   - forward.label / reverse.label の概念は廃止
 */

import { describe, it, expect } from 'vitest';
import { searchGraph, type SearchResult } from './search-utils';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

/**
 * テスト用の最小 Relationship（v11形式）を生成するヘルパー
 */
function makeSearchRel(overrides: {
  id: string;
  sourceId: string;
  targetId: string;
  type?: string;
  label?: string | null;
  symmetric?: boolean;
}): Relationship {
  return {
    id: overrides.id,
    sourceId: overrides.sourceId,
    targetId: overrides.targetId,
    type: overrides.type ?? '関係',
    label: overrides.label ?? null,
    symmetric: overrides.symmetric ?? false,
    tags: [],
    narrative: { summary: null, notes: null },
    colorOverride: null,
    properties: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

describe('searchGraph', () => {
  // テスト用データ
  const persons: Person[] = [
    {
      id: 'person1',
      name: '山田太郎',
      labels: ['人物'],
      properties: {},
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'person2',
      name: '田中花子',
      labels: ['人物'],
      properties: {},
      createdAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'person3',
      name: 'Yamada Jiro',
      labels: ['人物'],
      properties: {},
      createdAt: '2024-01-03T00:00:00Z',
    },
  ];

  // v11 では 1 エッジ = 1 ラベル。dual-directed は 2 本の別エッジ。
  const relationships: Relationship[] = [
    makeSearchRel({
      id: 'rel1',
      sourceId: 'person1',
      targetId: 'person2',
      type: '上司',
      label: '上司',
    }),
    makeSearchRel({
      id: 'rel1-rev',
      sourceId: 'person2',
      targetId: 'person1',
      type: '部下',
      label: '部下',
    }),
    makeSearchRel({
      id: 'rel2',
      sourceId: 'person1',
      targetId: 'person3',
      type: '友人',
      label: '友人',
      symmetric: true,
    }),
    makeSearchRel({
      id: 'rel3',
      sourceId: 'person2',
      targetId: 'person3',
      type: '先輩',
      label: '先輩',
    }),
    makeSearchRel({
      id: 'rel3-rev',
      sourceId: 'person3',
      targetId: 'person2',
      type: '後輩',
      label: '後輩',
    }),
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
        nodeLabels: ['人物'],
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
        labels: ['物'],
        properties: {},
        createdAt: '2024-01-04T00:00:00Z',
      };

      const result = searchGraph('テストアイテム', [itemPerson], []);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'person',
        id: 'item1',
        label: 'テストアイテム',
        nodeLabels: ['物'],
        imageDataUrl: undefined,
      });
    });

    it('画像付き人物を検索すると画像URLが含まれる', () => {
      const personWithImage: Person = {
        id: 'person-with-image',
        name: '画像付き太郎',
        labels: ['人物'],
        properties: {},
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        createdAt: '2024-01-04T00:00:00Z',
      };

      const result = searchGraph('画像付き', [personWithImage], []);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'person',
        id: 'person-with-image',
        label: '画像付き太郎',
        nodeLabels: ['人物'],
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      });
    });
  });

  describe('関係ラベル検索', () => {
    it('label で検索できる（有向エッジ）', () => {
      const result = searchGraph('上司', persons, relationships);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'relationship',
        id: 'rel1',
        label: '上司',
        sourceId: 'person1',
        targetId: 'person2',
        symmetric: false,
        sourceImageDataUrl: undefined,
        targetImageDataUrl: undefined,
        sourceNodeLabels: ['人物'],
        targetNodeLabels: ['人物'],
      });
    });

    it('逆方向のエッジのラベルで検索できる', () => {
      const result = searchGraph('部下', persons, relationships);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'relationship',
        id: 'rel1-rev',
        label: '部下',
        sourceId: 'person2',
        targetId: 'person1',
        symmetric: false,
        sourceImageDataUrl: undefined,
        targetImageDataUrl: undefined,
        sourceNodeLabels: ['人物'],
        targetNodeLabels: ['人物'],
      });
    });

    it('symmetric: true の関係を検索できる', () => {
      const result = searchGraph('友人', persons, relationships);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'relationship',
        id: 'rel2',
        label: '友人',
        sourceId: 'person1',
        targetId: 'person3',
        symmetric: true,
        sourceImageDataUrl: undefined,
        targetImageDataUrl: undefined,
        sourceNodeLabels: ['人物'],
        targetNodeLabels: ['人物'],
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
          labels: ['人物'],
          properties: {},
          imageDataUrl: 'data:image/png;base64,image1',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'p2',
          name: '花子',
          labels: ['人物'],
          properties: {},
          imageDataUrl: 'data:image/png;base64,image2',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ];

      const relWithImages = makeSearchRel({
        id: 'r1',
        sourceId: 'p1',
        targetId: 'p2',
        type: '友達',
        label: '友達',
        symmetric: false,
      });

      const result = searchGraph('友達', personsWithImages, [relWithImages]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: 'relationship',
        id: 'r1',
        label: '友達',
        sourceId: 'p1',
        targetId: 'p2',
        symmetric: false,
        sourceImageDataUrl: 'data:image/png;base64,image1',
        targetImageDataUrl: 'data:image/png;base64,image2',
        sourceNodeLabels: ['人物'],
        targetNodeLabels: ['人物'],
      });
    });

    it('label が null の場合は type で検索される', () => {
      // v11: label が null の場合は type が表示ラベルになる
      const relWithNullLabel = makeSearchRel({
        id: 'r1',
        sourceId: 'person1',
        targetId: 'person2',
        type: '親子',
        label: null,
      });

      const result = searchGraph('親子', persons, [relWithNullLabel]);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('親子');
    });
  });

  describe('結果の順序', () => {
    it('人物結果を関係結果よりも先に返す', () => {
      const result = searchGraph('太', persons, relationships);
      // '山田太郎' がヒットし、先頭に来る
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
        labels: ['人物'],
        properties: {},
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
          labels: ['人物'],
          properties: {},
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'p2',
          name: '友人B',
          labels: ['人物'],
          properties: {},
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const testRel = makeSearchRel({
        id: 'r1',
        sourceId: 'p1',
        targetId: 'p2',
        type: '友人',
        label: '友人',
        symmetric: true,
      });

      const result = searchGraph('友人', testPersons, [testRel]);
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
