/**
 * graph-utils.tsのテスト
 * Person/Relationship → Node/Edge変換関数の振る舞いを検証
 */

import { describe, it, expect, vi } from 'vitest';
import { personsToNodes, relationshipsToEdges, matchesEdgeFilter, syncNodePositionsToStore, calculateParallelEdgeOffset } from './graph-utils';
import type { Person } from '@/types/person';
import type { RelationshipV9, EdgeFilter } from '@/types/relationship';
import type { GraphNode } from '@/types/graph';

// ─── テストデータ ヘルパー ─────────────────────────────────────────────────────

/**
 * テスト用の RelationshipV9 を生成する
 * すべてのフィールドをデフォルト（null/空）にして、引数で上書きする
 */
function makeRel(overrides: Partial<RelationshipV9> = {}): RelationshipV9 {
  return {
    id: 'rel-1',
    sourcePersonId: 'person-1',
    targetPersonId: 'person-2',
    isDirected: false,
    symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
    forward: { label: null, affection: null, awareness: null, role: null },
    reverse: { label: null, affection: null, awareness: null, role: null },
    tags: [],
    narrative: { summary: null, notes: null, turningPoints: [] },
    colorOverride: null,
    createdAt: '2026-02-05T00:00:00.000Z',
    updatedAt: '2026-02-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('graph-utils', () => {
  describe('personsToNodes', () => {
    it('Person配列を空のNode配列に変換できる', () => {
      const persons: Person[] = [];
      const nodes = personsToNodes(persons);
      expect(nodes).toEqual([]);
    });

    it('単一のPersonをGraphNodeに変換できる', () => {
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
        type: 'graph',
        data: {
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
          labels: ['人物'],
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

    it('imageDataUrlが未設定のPersonをGraphNodeに変換できる', () => {
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
        type: 'graph',
        data: {
          name: '山田太郎',
          imageDataUrl: undefined,
          labels: ['人物'],
        },
        position: { x: 0, y: 0 },
      });
    });

    it('labels: ["人物"]を持つPersonをGraphNodeに変換できる', () => {
      const persons: Person[] = [
        {
          id: 'person-1',
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual({
        id: 'person-1',
        type: 'graph',
        data: {
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
        },
        position: { x: 0, y: 0 },
      });
    });

    it('labels: ["物"]を持つPersonをGraphNodeに変換できる', () => {
      const persons: Person[] = [
        {
          id: 'item-1',
          name: '伝説の剣',
          imageDataUrl: 'data:image/jpeg;base64,sword',
          labels: ['物'],
          createdAt: '2026-02-05T00:00:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual({
        id: 'item-1',
        type: 'graph',
        data: {
          name: '伝説の剣',
          imageDataUrl: 'data:image/jpeg;base64,sword',
          labels: ['物'],
        },
        position: { x: 0, y: 0 },
      });
    });

    it('labelsが未設定のPersonはデフォルト["人物"]で変換される', () => {
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
        type: 'graph',
        data: {
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
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
          labels: ['人物'],
          createdAt: '2026-02-05T00:00:00.000Z',
        },
        {
          id: 'item-1',
          name: '魔法の杖',
          imageDataUrl: 'data:image/jpeg;base64,wand',
          labels: ['物'],
          createdAt: '2026-02-05T00:01:00.000Z',
        },
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(2);
      expect(nodes[0].type).toBe('graph');
      expect(nodes[0].data.labels).toEqual(['人物']);
      expect(nodes[1].type).toBe('graph');
      expect(nodes[1].data.labels).toEqual(['物']);
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
    it('RelationshipV9 配列が空の場合は空のEdge配列を返す', () => {
      // 前提条件: 空配列
      const edges = relationshipsToEdges([]);
      expect(edges).toEqual([]);
    });

    it('bidirectional（双方向同一ラベル）の RelationshipV9 を RelationshipEdge に変換できる', () => {
      // 前提条件: isDirected=true, forward.label=reverse.label='親子'
      const relationships: RelationshipV9[] = [
        makeRel({
          id: 'rel-親子',
          isDirected: true,
          forward: { label: '親子', affection: null, awareness: null, role: null },
          reverse: { label: '親子', affection: null, awareness: null, role: null },
        }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('rel-親子');
      expect(edges[0].source).toBe('person-1');
      expect(edges[0].target).toBe('person-2');
      expect(edges[0].type).toBe('relationship');
      // bidirectional: 両方向ラベルが同一
      expect(edges[0].data?.displayType).toBe('bidirectional');
      expect(edges[0].data?.forwardLabel).toBe('親子');
      expect(edges[0].data?.reverseLabel).toBe('親子');
      // edgeIndex / totalEdgesInPair
      expect(edges[0].data?.edgeIndex).toBe(0);
      expect(edges[0].data?.totalEdgesInPair).toBe(1);
      // visual が含まれること
      expect(edges[0].data?.visual).toBeDefined();
    });

    it('dual-directed（両方向異なるラベル）の RelationshipV9 を RelationshipEdge に変換できる', () => {
      // 前提条件: isDirected=true, forward.label='好き', reverse.label='無関心'
      const relationships: RelationshipV9[] = [
        makeRel({
          isDirected: true,
          forward: { label: '好き', affection: null, awareness: null, role: null },
          reverse: { label: '無関心', affection: null, awareness: null, role: null },
        }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.displayType).toBe('dual-directed');
      expect(edges[0].data?.forwardLabel).toBe('好き');
      expect(edges[0].data?.reverseLabel).toBe('無関心');
    });

    it('one-way（片方向のみラベル）の RelationshipV9 を RelationshipEdge に変換できる', () => {
      // 前提条件: isDirected=true, forward.label='片想い', reverse.label=null
      const relationships: RelationshipV9[] = [
        makeRel({
          isDirected: true,
          forward: { label: '片想い', affection: null, awareness: null, role: null },
        }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.displayType).toBe('one-way');
      expect(edges[0].data?.forwardLabel).toBe('片想い');
      expect(edges[0].data?.reverseLabel).toBeNull();
    });

    it('undirected（無方向）の RelationshipV9 を RelationshipEdge に変換できる', () => {
      // 前提条件: isDirected=false
      const relationships: RelationshipV9[] = [
        makeRel({
          isDirected: false,
          forward: { label: '同一人物', affection: null, awareness: null, role: null },
          reverse: { label: '同一人物', affection: null, awareness: null, role: null },
        }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.displayType).toBe('undirected');
    });

    it('複数の RelationshipV9 を RelationshipEdge 配列に変換できる', () => {
      // 前提条件: 2件の関係（別々のペア）
      const relationships: RelationshipV9[] = [
        makeRel({ id: 'rel-1', sourcePersonId: 'person-1', targetPersonId: 'person-2' }),
        makeRel({ id: 'rel-2', sourcePersonId: 'person-2', targetPersonId: 'person-3' }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      expect(edges[0].id).toBe('rel-1');
      expect(edges[1].id).toBe('rel-2');
    });

    it('closeness が設定されている場合は visual.strokeWidth が 2px より太くなる', () => {
      // 前提条件: closeness=1.0（最大値 → 4px）
      const relationships: RelationshipV9[] = [
        makeRel({
          symmetric: {
            closeness: 1.0,
            trust: null,
            tension: null,
            secrecy: null,
            kinship: null,
          },
        }),
      ];

      const edges = relationshipsToEdges(relationships);

      // closeness=1.0 → strokeWidth=4
      expect(edges[0].data?.visual.strokeWidth).toBe(4);
    });

    it('tags に TAG_COLOR_MAP のキーが含まれる場合は visual.color がそのタグの色になる', () => {
      // 前提条件: '上司' タグ → #22c55e（緑）
      const relationships: RelationshipV9[] = [
        makeRel({ tags: ['上司'] }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges[0].data?.visual.color).toBe('#22c55e');
      expect(edges[0].data?.visual.markerKey).toBe('green');
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
          type: 'graph',
          data: { name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc', labels: ['人物'] },
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
          type: 'graph',
          data: { name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc', labels: ['人物'] },
          position: { x: 100, y: 200 },
        },
        {
          id: 'person-2',
          type: 'graph',
          data: { name: '佐藤花子', imageDataUrl: 'data:image/jpeg;base64,def', labels: ['人物'] },
          position: { x: 300, y: 400 },
        },
        {
          id: 'item-1',
          type: 'graph',
          data: { name: '伝説の剣', imageDataUrl: 'data:image/jpeg;base64,sword', labels: ['物'] },
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
    it('同じペアの関係が1件の場合、edgeIndex=0 / totalEdgesInPair=1 になる', () => {
      // 前提条件: person-1 ↔ person-2 に1件の関係
      const relationships: RelationshipV9[] = [
        makeRel({ id: 'rel-1', isDirected: true }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.edgeIndex).toBe(0);
      expect(edges[0].data?.totalEdgesInPair).toBe(1);
    });

    it('同じペアの関係が2件の場合、edgeIndex=0,1 / totalEdgesInPair=2 になる', () => {
      // 前提条件: person-1 ↔ person-2 に2件の関係（v9ではペアに複数エッジが来るケースは稀だが可能）
      const relationships: RelationshipV9[] = [
        makeRel({ id: 'rel-1', isDirected: true }),
        makeRel({ id: 'rel-2', isDirected: true }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      expect(edges[0].data?.edgeIndex).toBe(0);
      expect(edges[0].data?.totalEdgesInPair).toBe(2);
      expect(edges[1].data?.edgeIndex).toBe(1);
      expect(edges[1].data?.totalEdgesInPair).toBe(2);
    });

    it('逆方向の関係（source/targetが入れ替わり）も同一ペアとしてカウントされる', () => {
      // 前提条件: person-1→person-2 と person-2→person-1 の2件
      const relationships: RelationshipV9[] = [
        makeRel({ id: 'rel-1', sourcePersonId: 'person-1', targetPersonId: 'person-2', isDirected: true }),
        makeRel({ id: 'rel-2', sourcePersonId: 'person-2', targetPersonId: 'person-1', isDirected: true }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      expect(edges[0].data?.totalEdgesInPair).toBe(2);
      expect(edges[1].data?.totalEdgesInPair).toBe(2);
    });

    it('異なるペアの関係は独立してカウントされる', () => {
      // 前提条件: person-1↔person-2 と person-1↔person-3 の2件
      const relationships: RelationshipV9[] = [
        makeRel({ id: 'rel-1', sourcePersonId: 'person-1', targetPersonId: 'person-2' }),
        makeRel({ id: 'rel-2', sourcePersonId: 'person-1', targetPersonId: 'person-3' }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      // 各エッジは独立したペアなので totalEdgesInPair=1
      expect(edges[0].data?.totalEdgesInPair).toBe(1);
      expect(edges[1].data?.totalEdgesInPair).toBe(1);
    });
  });

  describe('matchesEdgeFilter: エッジフィルタ判定', () => {
    /** フィルタなし（初期値）を表す EdgeFilter */
    const noFilter: EdgeFilter = {
      tags: { mode: 'any', values: [] },
      predicates: [],
    };

    it('フィルタが空（タグなし・述語なし）の場合は全ての関係が通過する', () => {
      // 前提条件: タグあり関係でもフィルタが空なら通過する
      const rel = makeRel({ tags: ['上司', '友人'] });
      expect(matchesEdgeFilter(rel, noFilter)).toBe(true);
    });

    it('タグなし関係もフィルタが空なら通過する', () => {
      const rel = makeRel({ tags: [] });
      expect(matchesEdgeFilter(rel, noFilter)).toBe(true);
    });

    describe('タグフィルタ（ANYモード）', () => {
      it('関係のタグにフィルタのタグが1つでも含まれていれば通過する', () => {
        // 前提条件: 関係タグ ['友人', '同級生']、フィルタタグ ['同級生']
        const rel = makeRel({ tags: ['友人', '同級生'] });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: ['同級生'] },
          predicates: [],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('関係のタグがフィルタのいずれのタグにも一致しない場合は除外される', () => {
        // 前提条件: 関係タグ ['友人']、フィルタタグ ['上司', '部下']
        const rel = makeRel({ tags: ['友人'] });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: ['上司', '部下'] },
          predicates: [],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });

      it('関係のタグが空でフィルタにタグが指定されている場合は除外される', () => {
        const rel = makeRel({ tags: [] });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: ['上司'] },
          predicates: [],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });
    });

    describe('タグフィルタ（ALLモード）', () => {
      it('関係のタグにフィルタの全タグが含まれていれば通過する', () => {
        // 前提条件: 関係タグ ['上司', '同級生', '友人']、フィルタタグ ['上司', '同級生']
        const rel = makeRel({ tags: ['上司', '同級生', '友人'] });
        const filter: EdgeFilter = {
          tags: { mode: 'all', values: ['上司', '同級生'] },
          predicates: [],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('フィルタのタグが関係に一部しか含まれていない場合は除外される', () => {
        // 前提条件: 関係タグ ['上司']、フィルタタグ ['上司', '同級生']（'同級生'がない）
        const rel = makeRel({ tags: ['上司'] });
        const filter: EdgeFilter = {
          tags: { mode: 'all', values: ['上司', '同級生'] },
          predicates: [],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });
    });

    describe('述語フィルタ', () => {
      it('closeness_gte: 閾値以上なら通過する', () => {
        const rel = makeRel({ symmetric: { closeness: 0.8, trust: null, tension: null, secrecy: null, kinship: null } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'closeness_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('closeness_gte: 閾値未満なら除外される', () => {
        const rel = makeRel({ symmetric: { closeness: 0.3, trust: null, tension: null, secrecy: null, kinship: null } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'closeness_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });

      it('closeness_gte: closenessがnullなら除外される', () => {
        const rel = makeRel({ symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'closeness_gte', value: 0.0 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });

      it('trust_gte: 閾値以上なら通過する', () => {
        const rel = makeRel({ symmetric: { closeness: null, trust: 0.7, tension: null, secrecy: null, kinship: null } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'trust_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('tension_gte: 閾値未満なら除外される', () => {
        const rel = makeRel({ symmetric: { closeness: null, trust: null, tension: 0.2, secrecy: null, kinship: null } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'tension_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });

      it('secrecy_gte: 閾値以上なら通過する', () => {
        const rel = makeRel({ symmetric: { closeness: null, trust: null, tension: null, secrecy: 0.6, kinship: null } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'secrecy_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('has_kinship: kinshipが設定されていれば通過する', () => {
        const rel = makeRel({ symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: 'parent' } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'has_kinship' }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('has_kinship: kinshipがnullなら除外される', () => {
        const rel = makeRel({ symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'has_kinship' }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });

      it('複数の述語は全て通過する必要がある（AND条件）', () => {
        // closeness=0.8（OK）、trust=null（NG for trust_gte=0.5）
        const rel = makeRel({ symmetric: { closeness: 0.8, trust: null, tension: null, secrecy: null, kinship: null } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [
            { type: 'closeness_gte', value: 0.5 },
            { type: 'trust_gte', value: 0.5 },
          ],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });
    });

    it('タグフィルタと述語フィルタを組み合わせた場合、両方を通過する関係だけが残る', () => {
      // 前提条件: タグ ['上司']、closeness=0.8 → 通過
      const relPass = makeRel({
        id: 'rel-pass',
        tags: ['上司'],
        symmetric: { closeness: 0.8, trust: null, tension: null, secrecy: null, kinship: null },
      });
      // 前提条件: タグ ['上司']、closeness=0.2 → 述語で除外
      const relFailPredicate = makeRel({
        id: 'rel-fail-pred',
        tags: ['上司'],
        symmetric: { closeness: 0.2, trust: null, tension: null, secrecy: null, kinship: null },
      });
      // 前提条件: タグなし、closeness=0.8 → タグで除外
      const relFailTag = makeRel({
        id: 'rel-fail-tag',
        tags: [],
        symmetric: { closeness: 0.8, trust: null, tension: null, secrecy: null, kinship: null },
      });

      const filter: EdgeFilter = {
        tags: { mode: 'any', values: ['上司'] },
        predicates: [{ type: 'closeness_gte', value: 0.5 }],
      };

      expect(matchesEdgeFilter(relPass, filter)).toBe(true);
      expect(matchesEdgeFilter(relFailPredicate, filter)).toBe(false);
      expect(matchesEdgeFilter(relFailTag, filter)).toBe(false);
    });
  });

  describe('relationshipsToEdges: edgeFilterによる絞り込み', () => {
    it('edgeFilterが未指定の場合、全ての関係がエッジに変換される', () => {
      const relationships: RelationshipV9[] = [
        makeRel({ id: 'rel-1', tags: ['上司'] }),
        makeRel({ id: 'rel-2', tags: ['友人'] }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
    });

    it('edgeFilterのタグ条件に一致する関係のみエッジに変換される', () => {
      const relationships: RelationshipV9[] = [
        makeRel({ id: 'rel-上司', sourcePersonId: 'p1', targetPersonId: 'p2', tags: ['上司'] }),
        makeRel({ id: 'rel-友人', sourcePersonId: 'p3', targetPersonId: 'p4', tags: ['友人'] }),
      ];
      const filter: EdgeFilter = {
        tags: { mode: 'any', values: ['上司'] },
        predicates: [],
      };

      const edges = relationshipsToEdges(relationships, filter);

      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('rel-上司');
    });

    it('edgeFilterの述語条件に一致する関係のみエッジに変換される', () => {
      const relationships: RelationshipV9[] = [
        makeRel({
          id: 'rel-親密',
          sourcePersonId: 'p1',
          targetPersonId: 'p2',
          symmetric: { closeness: 0.9, trust: null, tension: null, secrecy: null, kinship: null },
        }),
        makeRel({
          id: 'rel-疎遠',
          sourcePersonId: 'p3',
          targetPersonId: 'p4',
          symmetric: { closeness: 0.1, trust: null, tension: null, secrecy: null, kinship: null },
        }),
      ];
      const filter: EdgeFilter = {
        tags: { mode: 'any', values: [] },
        predicates: [{ type: 'closeness_gte', value: 0.5 }],
      };

      const edges = relationshipsToEdges(relationships, filter);

      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('rel-親密');
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
