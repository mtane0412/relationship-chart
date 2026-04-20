/**
 * graph-utils.tsのテスト
 * Person/Relationship → Node/Edge変換関数の振る舞いを検証（v11プロパティグラフ方式）
 */

import { describe, it, expect, vi } from 'vitest';
import { personsToNodes, relationshipsToEdges, matchesEdgeFilter, syncNodePositionsToStore, calculateParallelEdgeOffset, episodesToNodes, participationsToEdges } from './graph-utils';
import type { Person } from '@/types/person';
import type { Relationship, EdgeFilter } from '@/types/relationship';
import { makePerson } from '@/test/factories';
import type { GraphNode } from '@/types/graph';
import type { Episode, EpisodeParticipation } from '@/types/episode';

// ─── テストデータ ヘルパー ─────────────────────────────────────────────────────

/**
 * テスト用の v11 Relationship を生成する
 * すべてのフィールドをデフォルト（null/空）にして、引数で上書きする
 */
function makeRel(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: 'rel-1',
    type: '関係',
    sourceId: 'person-1',
    targetId: 'person-2',
    label: null,
    symmetric: false,
    tags: [],
    narrative: { summary: null, notes: null },
    colorOverride: null,
    properties: {},
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
        makePerson({ id: 'person-1', name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...' }),
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
        makePerson({ id: 'person-1', name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc' }),
        makePerson({ id: 'person-2', name: '佐藤花子', imageDataUrl: 'data:image/jpeg;base64,def' }),
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
        makePerson({ id: 'person-1', name: '山田太郎' }),
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
        makePerson({ id: 'person-1', name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc' }),
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
        makePerson({ id: 'item-1', name: '伝説の剣', imageDataUrl: 'data:image/jpeg;base64,sword', labels: ['物'] }),
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
      // labels フィールドを意図的に欠落させて personsToNodes のフォールバックを検証する
      const { labels: _labels, ...personWithoutLabels } = makePerson({
        id: 'person-1',
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,abc',
      });
      const persons: Person[] = [personWithoutLabels as Person];

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
        makePerson({ id: 'person-1', name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc' }),
        makePerson({ id: 'item-1', name: '魔法の杖', imageDataUrl: 'data:image/jpeg;base64,wand', labels: ['物'] }),
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
        makePerson({ id: 'person-1', name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc', position: { x: 100, y: 200 } }),
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].position).toEqual({ x: 100, y: 200 });
    });

    it('position指定がない場合は(0, 0)がNodeに設定される', () => {
      const persons: Person[] = [
        makePerson({ id: 'person-1', name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc' }),
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    });

    it('position指定が(0, 0)の場合もそのままNodeに反映される', () => {
      const persons: Person[] = [
        makePerson({ id: 'person-1', name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,abc', position: { x: 0, y: 0 } }),
      ];

      const nodes = personsToNodes(persons);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('relationshipsToEdges', () => {
    it('Relationship 配列が空の場合は空のEdge配列を返す', () => {
      // 前提条件: 空配列
      const edges = relationshipsToEdges([]);
      expect(edges).toEqual([]);
    });

    it('symmetric=false の Relationship を RelationshipEdge に変換できる（有向）', () => {
      // 前提条件: type='親子', symmetric=false（有向）
      const relationships: Relationship[] = [
        makeRel({
          id: 'rel-親子',
          type: '親子',
          sourceId: 'person-1',
          targetId: 'person-2',
          symmetric: false,
        }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('rel-親子');
      expect(edges[0].source).toBe('person-1');
      expect(edges[0].target).toBe('person-2');
      expect(edges[0].type).toBe('relationship');
      // v11: edgeType / label / symmetric
      expect(edges[0].data?.edgeType).toBe('親子');
      expect(edges[0].data?.label).toBeNull();
      expect(edges[0].data?.symmetric).toBe(false);
      // edgeIndex / totalEdgesInPair
      expect(edges[0].data?.edgeIndex).toBe(0);
      expect(edges[0].data?.totalEdgesInPair).toBe(1);
      // visual が含まれること
      expect(edges[0].data?.visual).toBeDefined();
    });

    it('symmetric=true の Relationship を RelationshipEdge に変換できる（無向）', () => {
      // 前提条件: type='友人', symmetric=true（無向・矢印なし）
      const relationships: Relationship[] = [
        makeRel({
          type: '友人',
          symmetric: true,
        }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.edgeType).toBe('友人');
      expect(edges[0].data?.symmetric).toBe(true);
    });

    it('label が設定されている場合は label が RelationshipEdge に反映される', () => {
      // 前提条件: type='同僚', label='仕事仲間'
      const relationships: Relationship[] = [
        makeRel({
          type: '同僚',
          label: '仕事仲間',
        }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.edgeType).toBe('同僚');
      expect(edges[0].data?.label).toBe('仕事仲間');
    });

    it('複数の Relationship を RelationshipEdge 配列に変換できる', () => {
      // 前提条件: 2件の関係（別々のペア）
      const relationships: Relationship[] = [
        makeRel({ id: 'rel-1', sourceId: 'person-1', targetId: 'person-2' }),
        makeRel({ id: 'rel-2', sourceId: 'person-2', targetId: 'person-3' }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      expect(edges[0].id).toBe('rel-1');
      expect(edges[1].id).toBe('rel-2');
    });

    it('properties.closeness が設定されている場合は visual.strokeWidth が 2px より太くなる', () => {
      // 前提条件: closeness=1.0（最大値 → 4px）
      const relationships: Relationship[] = [
        makeRel({
          properties: { closeness: 1.0 },
        }),
      ];

      const edges = relationshipsToEdges(relationships);

      // closeness=1.0 → strokeWidth=4
      expect(edges[0].data?.visual.strokeWidth).toBe(4);
    });

    it('tags に TAG_COLOR_MAP のキーが含まれる場合は visual.color がそのタグの色になる', () => {
      // 前提条件: '上司' タグ → #22c55e（緑）
      const relationships: Relationship[] = [
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
      const relationships: Relationship[] = [
        makeRel({ id: 'rel-1' }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(1);
      expect(edges[0].data?.edgeIndex).toBe(0);
      expect(edges[0].data?.totalEdgesInPair).toBe(1);
    });

    it('同じペアの関係が2件の場合、edgeIndex=0,1 / totalEdgesInPair=2 になる（マルチグラフ）', () => {
      // 前提条件: person-1 ↔ person-2 に2件の関係（v11マルチグラフ対応）
      const relationships: Relationship[] = [
        makeRel({ id: 'rel-1', type: '友人' }),
        makeRel({ id: 'rel-2', type: '同僚' }),
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
      const relationships: Relationship[] = [
        makeRel({ id: 'rel-1', sourceId: 'person-1', targetId: 'person-2' }),
        makeRel({ id: 'rel-2', sourceId: 'person-2', targetId: 'person-1' }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
      expect(edges[0].data?.totalEdgesInPair).toBe(2);
      expect(edges[1].data?.totalEdgesInPair).toBe(2);
    });

    it('異なるペアの関係は独立してカウントされる', () => {
      // 前提条件: person-1↔person-2 と person-1↔person-3 の2件
      const relationships: Relationship[] = [
        makeRel({ id: 'rel-1', sourceId: 'person-1', targetId: 'person-2' }),
        makeRel({ id: 'rel-2', sourceId: 'person-1', targetId: 'person-3' }),
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
        // 前提条件: properties.closeness=0.8 ≥ 0.5 → 通過
        const rel = makeRel({ properties: { closeness: 0.8 } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'closeness_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('closeness_gte: 閾値未満なら除外される', () => {
        // 前提条件: properties.closeness=0.3 < 0.5 → 除外
        const rel = makeRel({ properties: { closeness: 0.3 } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'closeness_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });

      it('closeness_gte: closenessがnullなら除外される', () => {
        // 前提条件: properties.closeness=null → 述語を満たさない
        const rel = makeRel({ properties: { closeness: null } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'closeness_gte', value: 0.0 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });

      it('trust_gte: 閾値以上なら通過する', () => {
        // 前提条件: properties.trust=0.7 ≥ 0.5 → 通過
        const rel = makeRel({ properties: { trust: 0.7 } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'trust_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('tension_gte: 閾値未満なら除外される', () => {
        // 前提条件: properties.tension=0.2 < 0.5 → 除外
        const rel = makeRel({ properties: { tension: 0.2 } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'tension_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });

      it('secrecy_gte: 閾値以上なら通過する', () => {
        // 前提条件: properties.secrecy=0.6 ≥ 0.5 → 通過
        const rel = makeRel({ properties: { secrecy: 0.6 } });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'secrecy_gte', value: 0.5 }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('edge_type_is: typeが一致すれば通過する', () => {
        // 前提条件: type='親子' → 通過
        const rel = makeRel({ type: '親子' });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'edge_type_is', value: '親子' }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(true);
      });

      it('edge_type_is: typeが一致しなければ除外される', () => {
        // 前提条件: type='友人'、フィルタ='同僚' → 除外
        const rel = makeRel({ type: '友人' });
        const filter: EdgeFilter = {
          tags: { mode: 'any', values: [] },
          predicates: [{ type: 'edge_type_is', value: '同僚' }],
        };
        expect(matchesEdgeFilter(rel, filter)).toBe(false);
      });

      it('複数の述語は全て通過する必要がある（AND条件）', () => {
        // closeness=0.8（OK）、trust=null（NG for trust_gte=0.5）
        const rel = makeRel({ properties: { closeness: 0.8, trust: null } });
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
        properties: { closeness: 0.8 },
      });
      // 前提条件: タグ ['上司']、closeness=0.2 → 述語で除外
      const relFailPredicate = makeRel({
        id: 'rel-fail-pred',
        tags: ['上司'],
        properties: { closeness: 0.2 },
      });
      // 前提条件: タグなし、closeness=0.8 → タグで除外
      const relFailTag = makeRel({
        id: 'rel-fail-tag',
        tags: [],
        properties: { closeness: 0.8 },
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
      const relationships: Relationship[] = [
        makeRel({ id: 'rel-1', tags: ['上司'] }),
        makeRel({ id: 'rel-2', tags: ['友人'] }),
      ];

      const edges = relationshipsToEdges(relationships);

      expect(edges).toHaveLength(2);
    });

    it('edgeFilterのタグ条件に一致する関係のみエッジに変換される', () => {
      const relationships: Relationship[] = [
        makeRel({ id: 'rel-上司', sourceId: 'p1', targetId: 'p2', tags: ['上司'] }),
        makeRel({ id: 'rel-友人', sourceId: 'p3', targetId: 'p4', tags: ['友人'] }),
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
      const relationships: Relationship[] = [
        makeRel({
          id: 'rel-親密',
          sourceId: 'p1',
          targetId: 'p2',
          properties: { closeness: 0.9 },
        }),
        makeRel({
          id: 'rel-疎遠',
          sourceId: 'p3',
          targetId: 'p4',
          properties: { closeness: 0.1 },
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

// ─── episodesToNodes / participationsToEdges ──────────────────────────────────

/** テスト用エピソードのヘルパー */
function makeEpisode(overrides: Partial<Episode> & { id: string; title: string }): Episode {
  return {
    relatedRelationshipIds: [],
    properties: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('episodesToNodes', () => {
  it('Episode配列をEpisodeNodeの配列に変換する', () => {
    const episodes: Episode[] = [
      makeEpisode({ id: 'ep-001', title: '初めての出会い' }),
    ];

    const nodes = episodesToNodes(episodes);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('ep-001');
    expect(nodes[0].type).toBe('episode');
    expect(nodes[0].data.title).toBe('初めての出会い');
  });

  it('説明・日時・関連関係IDがdataに含まれる', () => {
    const episodes: Episode[] = [
      makeEpisode({
        id: 'ep-002',
        title: '決別の朝',
        description: '二人の関係が壊れた',
        occurredAt: '第5話',
        relatedRelationshipIds: ['rel-001'],
      }),
    ];

    const nodes = episodesToNodes(episodes);

    expect(nodes[0].data.description).toBe('二人の関係が壊れた');
    expect(nodes[0].data.occurredAt).toBe('第5話');
    expect(nodes[0].data.relatedRelationshipIds).toEqual(['rel-001']);
  });

  it('position が設定されている場合はそれを使用する', () => {
    const episodes: Episode[] = [
      makeEpisode({ id: 'ep-003', title: '再会', position: { x: 200, y: 300 } }),
    ];

    const nodes = episodesToNodes(episodes);

    expect(nodes[0].position).toEqual({ x: 200, y: 300 });
  });

  it('position がない場合は (0, 0) をデフォルトにする', () => {
    const episodes: Episode[] = [
      makeEpisode({ id: 'ep-004', title: '別れ' }),
    ];

    const nodes = episodesToNodes(episodes);

    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it('空配列を渡すと空配列が返る', () => {
    const nodes = episodesToNodes([]);
    expect(nodes).toEqual([]);
  });
});

describe('participationsToEdges', () => {
  it('EpisodeParticipation配列をParticipationEdgeの配列に変換する', () => {
    const participations: EpisodeParticipation[] = [
      {
        id: 'part-001',
        episodeId: 'ep-001',
        personId: 'person-001',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const edges = participationsToEdges(participations);

    expect(edges).toHaveLength(1);
    expect(edges[0].id).toBe('part-001');
    expect(edges[0].type).toBe('participation');
    expect(edges[0].source).toBe('ep-001');
    expect(edges[0].target).toBe('person-001');
  });

  it('roleがある場合はdataに含まれる', () => {
    const participations: EpisodeParticipation[] = [
      {
        id: 'part-002',
        episodeId: 'ep-002',
        personId: 'person-002',
        role: '主人公',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const edges = participationsToEdges(participations);

    expect(edges[0].data?.role).toBe('主人公');
  });

  it('空配列を渡すと空配列が返る', () => {
    const edges = participationsToEdges([]);
    expect(edges).toEqual([]);
  });
});
