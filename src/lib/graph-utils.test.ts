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

    it('単一の無向Relationshipを RelationshipEdgeに変換できる', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          label: '友人',
          isDirected: false,
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
          label: '友人',
          isDirected: false,
        },
      });
    });

    it('単一の有向RelationshipをRelationshipEdgeに変換できる', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          label: '上司',
          isDirected: true,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.isDirected).toBe(true);
      expect(edges[0].data?.label).toBe('上司');
    });

    it('複数のRelationshipをRelationshipEdge配列に変換できる', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          sourcePersonId: 'person-1',
          targetPersonId: 'person-2',
          label: '友人',
          isDirected: false,
          createdAt: '2026-02-05T00:00:00.000Z',
        },
        {
          id: 'rel-2',
          sourcePersonId: 'person-2',
          targetPersonId: 'person-3',
          label: '同僚',
          isDirected: false,
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
