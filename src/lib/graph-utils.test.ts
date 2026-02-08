/**
 * graph-utils.tsのテスト
 * Person/Relationship → Node/Edge変換関数の振る舞いを検証
 */

import { describe, it, expect } from 'vitest';
import { personsToNodes, relationshipsToEdges } from './graph-utils';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

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
        },
        position: { x: 0, y: 0 },
      });
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
        },
      });
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
          createdAt: '2026-02-05T00:00:00.000Z',
        },
        {
          id: 'rel-2',
          sourcePersonId: 'person-2',
          targetPersonId: 'person-3',
          isDirected: true,
          sourceToTargetLabel: '同僚',
          targetToSourceLabel: null,
          createdAt: '2026-02-05T00:01:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      expect(edges[0].id).toBe('rel-1');
      expect(edges[1].id).toBe('rel-2');
    });
  });
});
