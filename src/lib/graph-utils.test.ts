/**
 * graph-utils.tsのテスト
 * Person/Relationship → Node/Edge変換関数の振る舞いを検証
 */

import { describe, it, expect, vi } from 'vitest';
import { personsToNodes, relationshipsToEdges, syncNodePositionsToStore, calculateParallelEdgeOffset } from './graph-utils';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';
import type { GraphNode } from '@/types/graph';

describe('graph-utils', () => {
  describe('personsToNodes', () => {
    it('Person配列を空のNode配列に変換できる', () => {
      const persons: Person[] = [];
      const nodes = personsToNodes(persons);
      expect(nodes).toEqual([]);
    });

    it('単一のPersonをPersonNodeに変換できる', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual({
        id: 'person-1',
        type: 'person',
        data: {
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
          kind: 'person',
        },
        position: { x: 0, y: 0 },
      });
    });

    it('複数のPersonをPersonNode配列に変換できる', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          createdAt: '2026-02-05T00:00:00.000Z',
        },
        {
          id: 'person-2',
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          createdAt: '2026-02-05T00:01:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).toBe('person-1');
      expect(nodes[0].data.name).toBe('山田太郎');
      expect(nodes[1].id).toBe('person-2');
      expect(nodes[1].data.name).toBe('佐藤花子');
    });

    it('imageDataUrlが未設定のPersonをPersonNodeに変換できる', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual({
        id: 'person-1',
        type: 'person',
        data: {
          name: '山田太郎',
          imageDataUrl: undefined,
          kind: 'person',
        },
        position: { x: 0, y: 0 },
      });
    });

    it('kind: "person"を持つPersonをPersonNodeに変換できる', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          kind: 'person',
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual({
        id: 'person-1',
        type: 'person',
        data: {
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          kind: 'person',
        },
        position: { x: 0, y: 0 },
      });
    });

    it('kind: "item"を持つPersonをItemNodeに変換できる', () => {
      const persons: Person[] = [
        {
          id: 'item-1',
          name: '伝説の剣',
          imageDataUrl: 'data:image/jpeg;base64,sword',
          kind: 'item',
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual({
        id: 'item-1',
        type: 'item',
        data: {
          name: '伝説の剣',
          imageDataUrl: 'data:image/jpeg;base64,sword',
          kind: 'item',
        },
        position: { x: 0, y: 0 },
      });
    });

    it('kindが未設定のPersonはPersonNodeとして変換される', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual({
        id: 'person-1',
        type: 'person',
        data: {
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          kind: 'person',
        },
        position: { x: 0, y: 0 },
      });
    });

    it('人物と物を混在させてノード配列に変換できる', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          kind: 'person',
          createdAt: '2026-02-05T00:00:00.000Z',
        },
        {
          id: 'item-1',
          name: '魔法の杖',
          imageDataUrl: 'data:image/jpeg;base64,wand',
          kind: 'item',
          createdAt: '2026-02-05T00:01:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(2);
      expect(nodes[0].type).toBe('person');
      expect(nodes[0].data.kind).toBe('person');
      expect(nodes[1].type).toBe('item');
      expect(nodes[1].data.kind).toBe('item');
    });

    it('position指定がある場合にその座標がNodeに反映される', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          position: { x: 100, y: 200 },
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].position).toEqual({ x: 100, y: 200 });
    });

    it('position指定がない場合は(0, 0)がNodeに設定される', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    });

    it('position指定が(0, 0)の場合もそのままNodeに反映される', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          position: { x: 0, y: 0 },
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('relationshipsToEdges', () => {
    it('Relationship配列を空のEdge配列に変換できる', () => {
      const relationships: Relationship[] = [];
      const edges = relationshipsToEdges(relationships);
      expect(edges).toEqual([]);
    });

    it('bidirectionalタイプのRelationshipをRelationshipEdgeに変換できる', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: true,
          sourceToTargetLabel: '親子',
          targetToSourceLabel: '親子',
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0]).toEqual({
        id: 'rel-1',
        source: 'person-1',
        target: 'person-2',
        type: 'relationship',
        data: {
          displayType: 'bidirectional',
          sourceToTargetLabel: '親子',
          targetToSourceLabel: '親子',
          layer: 'general',
          weight: null,
          edgeIndex: 0,
          totalEdgesInPair: 1,
        },
      });
    });

    it('RelationshipのlayerがEdgeDataに含まれる', () => {
      // 認知レイヤー（awareness）の関係がEdgeDataに正しく変換されることを検証
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: true,
          sourceToTargetLabel: '知っている',
          targetToSourceLabel: null,
          layer: 'awareness' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges[0].data?.layer).toBe('awareness');
    });

    it('dual-directedタイプのRelationshipをRelationshipEdgeに変換できる', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: true,
          sourceToTargetLabel: '好き',
          targetToSourceLabel: '無関心',
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.displayType).toBe('dual-directed');
      expect(edges[0].data?.sourceToTargetLabel).toBe('好き');
      expect(edges[0].data?.targetToSourceLabel).toBe('無関心');
    });

    it('one-wayタイプのRelationshipをRelationshipEdgeに変換できる', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: true,
          sourceToTargetLabel: '片想い',
          targetToSourceLabel: null,
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.displayType).toBe('one-way');
      expect(edges[0].data?.sourceToTargetLabel).toBe('片想い');
      expect(edges[0].data?.targetToSourceLabel).toBeNull();
    });

    it('undirectedタイプのRelationshipをRelationshipEdgeに変換できる', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: false,
          sourceToTargetLabel: '同一人物',
          targetToSourceLabel: '同一人物',
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.displayType).toBe('undirected');
      expect(edges[0].data?.sourceToTargetLabel).toBe('同一人物');
      expect(edges[0].data?.targetToSourceLabel).toBe('同一人物');
    });

    it('複数のRelationshipをRelationshipEdge配列に変換できる', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: true,
          sourceToTargetLabel: '友人',
          targetToSourceLabel: '友人',
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
        {
          id: 'rel-2',
          sourcePersonId: 'person-2',
          targetPersonId: 'person-3',
          isDirected: true,
          sourceToTargetLabel: '同僚',
          targetToSourceLabel: null,
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:01:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      expect(edges[0].id).toBe('rel-1');
      expect(edges[1].id).toBe('rel-2');
    });

    it('visibleLayersを指定すると非表示レイヤーのエッジが除外される', () => {
      // 同じペア間の一般・感情・認知レイヤーの関係
      const relationships: Relationship[] = [
        {
          id: 'rel-general',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: false,
          sourceToTargetLabel: '同僚',
          targetToSourceLabel: '同僚',
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
        {
          id: 'rel-awareness',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: true,
          sourceToTargetLabel: '知っている',
          targetToSourceLabel: null,
          layer: 'awareness' as const,
          weight: null,
          createdAt: '2026-02-05T00:01:00.000Z',
        },
        {
          id: 'rel-emotional',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: true,
          sourceToTargetLabel: '信頼',
          targetToSourceLabel: null,
          layer: 'emotional' as const,
          weight: null,
          createdAt: '2026-02-05T00:02:00.000Z',
        },
      ];

      // generalのみ表示
      const edges = relationshipsToEdges(relationships, new Set(['general' as const]));

      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('rel-general');
    });

    it('visibleLayersを省略すると全レイヤーのエッジが含まれる', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-public',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: false,
          sourceToTargetLabel: '同僚',
          targetToSourceLabel: '同僚',
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
        {
          id: 'rel-hidden',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          isDirected: true,
          sourceToTargetLabel: '裏の関係',
          targetToSourceLabel: '裏の関係',
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:01:00.000Z',
        },
      ];

      // visibleLayersを省略（全レイヤー表示）
      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
    });
  });

  describe('syncNodePositionsToStore', () => {
    it('空のノード配列でも正常に動作する', () => {
      const nodes: GraphNode[] = [];
      const mockUpdatePositions = vi.fn();

      syncNodePositionsToStore(nodes, mockUpdatePositions);

      // 空のMapで呼ばれる
      expect(mockUpdatePositions).toHaveBeenCalledTimes(1);
      const calledMap = mockUpdatePositions.mock.calls[0][0] as Map<string, { x: number; y: number }>;
      expect(calledMap.size).toBe(0);
    });

    it('単一ノードの位置をMapに変換してコールバックを呼ぶ', () => {
      const nodes: GraphNode[] = [
        {
          id: 'person-1',
          type: 'person',
          data: { name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc', kind: 'person' },
          position: { x: 100, y: 200 },
        },
      ];
      const mockUpdatePositions = vi.fn();

      syncNodePositionsToStore(nodes, mockUpdatePositions);

      expect(mockUpdatePositions).toHaveBeenCalledTimes(1);
      const calledMap = mockUpdatePositions.mock.calls[0][0] as Map<string, { x: number; y: number }>;
      expect(calledMap.size).toBe(1);
      expect(calledMap.get('person-1')).toEqual({ x: 100, y: 200 });
    });

    it('複数ノードの位置をMapに変換してコールバックを呼ぶ', () => {
      const nodes: GraphNode[] = [
        {
          id: 'person-1',
          type: 'person',
          data: { name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc', kind: 'person' },
          position: { x: 100, y: 200 },
        },
        {
          id: 'person-2',
          type: 'person',
          data: { name: '佐藤花子', imageDataUrl: 'data:image/jpeg;base64,def', kind: 'person' },
          position: { x: 300, y: 400 },
        },
        {
          id: 'item-1',
          type: 'item',
          data: { name: '伝説の剣', imageDataUrl: 'data:image/jpeg;base64,sword', kind: 'item' },
          position: { x: 500, y: 600 },
        },
      ];
      const mockUpdatePositions = vi.fn();

      syncNodePositionsToStore(nodes, mockUpdatePositions);

      expect(mockUpdatePositions).toHaveBeenCalledTimes(1);
      const calledMap = mockUpdatePositions.mock.calls[0][0] as Map<string, { x: number; y: number }>;
      expect(calledMap.size).toBe(3);
      expect(calledMap.get('person-1')).toEqual({ x: 100, y: 200 });
      expect(calledMap.get('person-2')).toEqual({ x: 300, y: 400 });
      expect(calledMap.get('item-1')).toEqual({ x: 500, y: 600 });
    });
  });

  describe('relationshipsToEdges: 同一ペア間の並列描画インデックス', () => {
    const baseRelationship = {
      sourcePersonId: 'person-1',
      targetPersonId: 'person-2',
      isDirected: true,
      createdAt: '2026-02-05T00:00:00.000Z',
    };

    it('同じペアの関係が1件の場合、edgeIndex=0 / totalEdgesInPair=1 になる', () => {
      const relationships: Relationship[] = [
        {
          ...baseRelationship,
          id: 'rel-1',
          sourceToTargetLabel: '好き',
          targetToSourceLabel: null,
          layer: 'general' as const,
          weight: null,
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.edgeIndex).toBe(0);
      expect(edges[0].data?.totalEdgesInPair).toBe(1);
    });

    it('同じペアの関係が2件の場合、edgeIndex=0,1 / totalEdgesInPair=2 になる', () => {
      const relationships: Relationship[] = [
        {
          ...baseRelationship,
          id: 'rel-1',
          sourceToTargetLabel: '好き',
          targetToSourceLabel: null,
          layer: 'general' as const,
          weight: null,
        },
        {
          ...baseRelationship,
          id: 'rel-2',
          sourceToTargetLabel: '知っている',
          targetToSourceLabel: null,
          layer: 'awareness' as const,
          weight: null,
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      expect(edges[0].data?.edgeIndex).toBe(0);
      expect(edges[0].data?.totalEdgesInPair).toBe(2);
      expect(edges[1].data?.edgeIndex).toBe(1);
      expect(edges[1].data?.totalEdgesInPair).toBe(2);
    });

    it('逆方向の関係（source/targetが入れ替わり）も同一ペアとしてカウントされる', () => {
      const relationships: Relationship[] = [
        {
          ...baseRelationship,
          id: 'rel-1',
          sourceToTargetLabel: '上司',
          targetToSourceLabel: null,
          layer: 'organizational' as const,
          weight: null,
        },
        {
          id: 'rel-2',
          // source/targetが逆
          sourcePersonId: 'person-2',
          targetPersonId: 'person-1',
          isDirected: true,
          sourceToTargetLabel: '部下',
          targetToSourceLabel: null,
          layer: 'emotional' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      expect(edges[0].data?.totalEdgesInPair).toBe(2);
      expect(edges[1].data?.totalEdgesInPair).toBe(2);
    });

    it('異なるペアの関係は独立してカウントされる', () => {
      const relationships: Relationship[] = [
        {
          ...baseRelationship,
          id: 'rel-1',
          sourceToTargetLabel: '友人',
          targetToSourceLabel: null,
          layer: 'general' as const,
          weight: null,
        },
        {
          id: 'rel-2',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-3', // 別のペア
          isDirected: false,
          sourceToTargetLabel: '同僚',
          targetToSourceLabel: null,
          layer: 'general' as const,
          weight: null,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      // 各エッジは独立したペアなので totalEdgesInPair=1
      expect(edges[0].data?.totalEdgesInPair).toBe(1);
      expect(edges[1].data?.totalEdgesInPair).toBe(1);
    });
  });

  describe('calculateParallelEdgeOffset: 並列エッジの垂直オフセット計算', () => {
    it('エッジが1本の場合、オフセットは0になる', () => {
      const offset = calculateParallelEdgeOffset(0, 1, 20);
      expect(offset).toBe(0);
    });

    it('エッジが2本の場合、0番目は-spacing/2、1番目は+spacing/2になる', () => {
      const offset0 = calculateParallelEdgeOffset(0, 2, 20);
      const offset1 = calculateParallelEdgeOffset(1, 2, 20);
      expect(offset0).toBe(-10);
      expect(offset1).toBe(10);
    });

    it('エッジが3本の場合、中央が0・両端が±spacingになる', () => {
      const offset0 = calculateParallelEdgeOffset(0, 3, 20);
      const offset1 = calculateParallelEdgeOffset(1, 3, 20);
      const offset2 = calculateParallelEdgeOffset(2, 3, 20);
      expect(offset0).toBe(-20);
      expect(offset1).toBe(0);
      expect(offset2).toBe(20);
    });

    it('spacingを省略するとデフォルト値が使用される', () => {
      // デフォルトのspacing (20) を使用
      const offset0 = calculateParallelEdgeOffset(0, 2);
      const offset1 = calculateParallelEdgeOffset(1, 2);
      // 合計間隔が正の値であること
      expect(offset1 - offset0).toBeGreaterThan(0);
    });
  });
});
