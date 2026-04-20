/**
 * マイグレーションロジックのテスト
 * LocalStorageに保存された古い形式のデータを最新形式に変換する
 */

import { describe, it, expect } from 'vitest';
import {
  migrateGraphState,
  migrateV8ToV9,
  migrateV9ToV10,
  migrateV10ToV11,
  migratePersonsV10ToV11,
  normalizeChart,
  migrateTurningPointsToEpisodes,
  CURRENT_SCHEMA_VERSION,
} from './migration';
import type { Person } from '@/types/person';
import type { LegacyRelationshipV8, LegacyRelationshipV9, LegacyPersonV10, LegacyRelationshipV13 } from './migration';
import { DEFAULT_FORCE_PARAMS } from '@/stores/useGraphStore';
import { DEFAULT_EGO_LAYOUT_PARAMS } from './ego-layout';

describe('migrateGraphState', () => {
  // v8以降は変換不要
  describe('v8以降のデータ', () => {
    it('そのまま返す', () => {
      const state = {
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
        sidePanelOpen: true,
      };

      const result = migrateGraphState(state, 8);

      expect(result).toEqual(state);
    });
  });

  // 初回ユーザー（永続化データがない場合）
  describe('永続化データがない場合', () => {
    it('null をそのまま返す', () => {
      const result = migrateGraphState(null, 0);
      expect(result).toBeNull();
    });

    it('undefined をそのまま返す', () => {
      const result = migrateGraphState(undefined, 0);
      expect(result).toBeUndefined();
    });

    it('オブジェクト以外をそのまま返す', () => {
      const result = migrateGraphState('invalid', 0);
      expect(result).toBe('invalid');
    });
  });

  // v0からv1への変換
  describe('v0からv1への変換', () => {
    it('selectedPersonIdをselectedPersonIdsに変換する', () => {
      const v0State = {
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonId: 'person-1',
      };

      const result = migrateGraphState(v0State, 0);

      expect(result).toMatchObject({
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonIds: ['person-1'],
      });
      // selectedPersonId が除去されていることを確認
      expect(result).not.toHaveProperty('selectedPersonId');
    });

    it('selectedPersonIdがnullの場合は空配列に変換する', () => {
      const v0State = {
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonId: null,
      };

      const result = migrateGraphState(v0State, 0);

      expect(result).toMatchObject({
        selectedPersonIds: [],
      });
      // selectedPersonId が除去されていることを確認
      expect(result).not.toHaveProperty('selectedPersonId');
    });
  });

  // v1からv9への変換（v3形式を経由して最終的にv9形式になることを確認）
  describe('v1からv9への変換', () => {
    it('Relationshipの形式を変換する（directed）', () => {
      const person1: Person = {
        id: 'person-1',
        name: '田中太郎',
        labels: ['人物'],
        properties: {},
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      const person2: Person = {
        id: 'person-2',
        name: '鈴木花子',
        labels: ['人物'],
        properties: {},
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const v1State = {
        persons: [person1, person2],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            label: '好き',
            isDirected: true,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
      };

      const result = migrateGraphState(v1State, 1) as {
        persons: Person[];
        relationships: Array<{ id: string; symmetric: boolean; label: string | null; type: string; sourceId: string; targetId: string; tags: string[] }>;
        forceEnabled: boolean;
        selectedPersonIds: string[];
      };

      // v11 形式に変換されること（persons に labels が付与される）
      expect(result.persons).toMatchObject([
        { id: 'person-1', name: '田中太郎', labels: ['人物'] },
        { id: 'person-2', name: '鈴木花子', labels: ['人物'] },
      ]);
      expect(result.forceEnabled).toBe(false);
      expect(result.selectedPersonIds).toEqual([]);
      expect(result.relationships).toHaveLength(1);
      // directed（one-way）なので symmetric: false に変換される
      expect(result.relationships[0].id).toBe('rel-1');
      expect(result.relationships[0].symmetric).toBe(false);
      expect(result.relationships[0].label).toBe('好き');
      // general レイヤー由来なのでタグに入る
      expect(result.relationships[0].tags).toContain('好き');
      expect(result.relationships[0].tags).toContain('layer-general');
    });

    it('Relationshipの形式を変換する（undirected）', () => {
      const v1State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            label: '友達',
            isDirected: false,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
      };

      const result = migrateGraphState(v1State, 1) as {
        relationships: Array<{ id: string; symmetric: boolean; label: string | null; tags: string[] }>;
      };

      // v11 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].id).toBe('rel-1');
      // undirected → symmetric: true に変換される
      expect(result.relationships[0].symmetric).toBe(true);
      expect(result.relationships[0].label).toBe('友達');
      // general レイヤー由来なのでタグに入る
      expect(result.relationships[0].tags).toContain('友達');
      expect(result.relationships[0].tags).toContain('layer-general');
    });
  });

  // v2からv9への変換（v2→v3→...→v9 の連続変換。最終形は v9 形式になる）
  describe('v2からv9への変換', () => {
    it('bidirectionalタイプを変換する', () => {
      // 前提条件: v2 形式の bidirectional 関係（親子関係）
      const v2State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            type: 'bidirectional' as const,
            sourceToTargetLabel: '親子',
            targetToSourceLabel: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
      };

      const result = migrateGraphState(v2State, 2) as {
        relationships: Array<{
          id: string;
          sourceId: string;
          targetId: string;
          symmetric: boolean;
          label: string | null;
          tags: string[];
        }>;
      };

      // 最終的に v11 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.sourceId).toBe('person-1');
      expect(rel.targetId).toBe('person-2');
      // bidirectional は symmetric: true に変換される
      expect(rel.symmetric).toBe(true);
      // sourceToTargetLabel（'親子'）が label に写像されること
      expect(rel.label).toBe('親子');
      // general レイヤー由来タグが付与されること
      expect(rel.tags).toContain('layer-general');
    });

    it('dual-directedタイプを変換する', () => {
      // 前提条件: v2 形式の dual-directed 関係（好き / 無関心）
      const v2State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            type: 'dual-directed' as const,
            sourceToTargetLabel: '好き',
            targetToSourceLabel: '無関心',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
      };

      const result = migrateGraphState(v2State, 2) as {
        relationships: Array<{
          sourceId: string;
          targetId: string;
          symmetric: boolean;
          label: string | null;
          tags: string[];
        }>;
      };

      // 最終的に v11 形式に変換されること（dual-directed は2本のエッジに分割）
      expect(result.relationships).toHaveLength(2);
      // 順方向エッジ（source→target）
      const fwd = result.relationships.find((r) => r.sourceId === 'person-1');
      expect(fwd).toBeDefined();
      expect(fwd!.symmetric).toBe(false);
      expect(fwd!.label).toBe('好き');
      // 逆方向エッジ（target→source）
      const rev = result.relationships.find((r) => r.sourceId === 'person-2');
      expect(rev).toBeDefined();
      expect(rev!.symmetric).toBe(false);
      expect(rev!.label).toBe('無関心');
      // general レイヤー由来タグが付与されること
      expect(fwd!.tags).toContain('layer-general');
    });

    it('one-wayタイプを変換する', () => {
      // 前提条件: v2 形式の one-way 関係（片想い）
      const v2State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            type: 'one-way' as const,
            sourceToTargetLabel: '片想い',
            targetToSourceLabel: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
      };

      const result = migrateGraphState(v2State, 2) as {
        relationships: Array<{
          symmetric: boolean;
          label: string | null;
          tags: string[];
        }>;
      };

      // 最終的に v11 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      // one-way は symmetric: false に変換される
      expect(rel.symmetric).toBe(false);
      // ラベルが label に写像されること
      expect(rel.label).toBe('片想い');
      // general レイヤー由来タグが付与されること
      expect(rel.tags).toContain('layer-general');
    });

    it('undirectedタイプを変換する', () => {
      // 前提条件: v2 形式の undirected 関係（同級生）
      const v2State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            type: 'undirected' as const,
            sourceToTargetLabel: '同級生',
            targetToSourceLabel: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
      };

      const result = migrateGraphState(v2State, 2) as {
        relationships: Array<{
          symmetric: boolean;
          label: string | null;
          tags: string[];
        }>;
      };

      // 最終的に v11 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      // undirected は symmetric: true に変換される
      expect(rel.symmetric).toBe(true);
      // ラベルが label に写像されること
      expect(rel.label).toBe('同級生');
      // general レイヤー由来タグが付与されること
      expect(rel.tags).toContain('layer-general');
    });
  });

  // v3からv4への変換（forceParamsの補完）
  describe('v3からv4への変換', () => {
    it('forceParamsがない場合はデフォルト値を追加する', () => {
      const v3State = {
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonIds: [],
      };

      const result = migrateGraphState(v3State, 3);

      expect(result).toMatchObject({
        forceParams: DEFAULT_FORCE_PARAMS,
      });
    });

    it('forceParamsがある場合はそのまま維持する', () => {
      const customForceParams = {
        linkDistance: 200,
        linkStrength: 0.8,
        chargeStrength: -500,
      };

      const v3State = {
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: customForceParams,
      };

      const result = migrateGraphState(v3State, 3);

      expect(result).toMatchObject({
        forceParams: customForceParams,
      });
    });
  });

  // v4からv5への変換（sidePanelOpenの補完）
  describe('v4からv5への変換', () => {
    it('sidePanelOpenがない場合はデフォルト値（true）を追加する', () => {
      const v4State = {
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
      };

      const result = migrateGraphState(v4State, 4);

      expect(result).toMatchObject({
        sidePanelOpen: true,
      });
    });

    it('sidePanelOpenがある場合はそのまま維持する', () => {
      const v4State = {
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: false,
      };

      const result = migrateGraphState(v4State, 4);

      expect(result).toMatchObject({
        sidePanelOpen: false,
      });
    });
  });

  // v5からv6への変換（egoLayoutParamsの補完）
  describe('v5からv6への変換', () => {
    it('egoLayoutParamsがない場合はデフォルト値を追加する', () => {
      const v5State = {
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
      };

      const result = migrateGraphState(v5State, 5);

      expect(result).toMatchObject({
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      });
    });

    it('egoLayoutParamsがある場合はそのまま維持する', () => {
      const customEgoLayoutParams = {
        ringSpacing: 300,
        firstRingRadius: 150,
      };

      const v5State = {
        persons: [],
        relationships: [],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
        egoLayoutParams: customEgoLayoutParams,
      };

      const result = migrateGraphState(v5State, 5);

      expect(result).toMatchObject({
        egoLayoutParams: customEgoLayoutParams,
      });
    });
  });

  // v6からv7への変換（layerフィールドの補完）→v8→v9も連続適用される
  describe('v6からv7への変換', () => {
    it('layerフィールドがないrelationshipsにgeneralを補完する（v7→v8→v9も連続適用）', () => {
      // 前提条件: layer フィールドなしの v6 形式データ
      const v6State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '幼馴染',
            targetToSourceLabel: '幼馴染',
            createdAt: '2024-01-01T00:00:00.000Z',
            // layerフィールドなし
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      };

      const result = migrateGraphState(v6State, 6) as {
        relationships: Array<{
          id: string;
          symmetric: boolean;
          label: string | null;
          tags: string[];
        }>;
      };

      // layer なし → general を補完 → v11 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      // general レイヤーとして処理されるため label に変換されること
      expect(rel.label).toBe('幼馴染');
      // general レイヤー由来タグが付与されること
      expect(rel.tags).toContain('layer-general');
    });

    it('hiddenレイヤーのrelationshipsはv8でgeneralにリネームされv9に変換される', () => {
      // 前提条件: layer='hidden' の v6 形式データ
      const v6State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '正体を知っている',
            targetToSourceLabel: '正体を知っている',
            layer: 'hidden',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      };

      const result = migrateGraphState(v6State, 6) as {
        relationships: Array<{
          id: string;
          label: string | null;
          tags: string[];
        }>;
      };

      // v8 で hidden→general にリネームされ、v11 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      // hidden は v8 で general にリネームされるため、general レイヤーとして処理される
      expect(rel.label).toBe('正体を知っている');
      expect(rel.tags).toContain('layer-general');
    });
  });

  // v7からv8への変換（レイヤーリネーム + weightフィールドの追加）→ v9 も連続適用
  describe('v7からv8への変換', () => {
    it('publicレイヤーをgeneralにリネームしてv9形式に変換する', () => {
      // 前提条件: layer='public' の v7 形式データ（旧 public レイヤー）
      const v7State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: false,
            sourceToTargetLabel: '友人',
            targetToSourceLabel: '友人',
            layer: 'public',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      };

      const result = migrateGraphState(v7State, 7) as {
        relationships: Array<{
          id: string;
          symmetric: boolean;
          label: string | null;
          tags: string[];
        }>;
      };

      // v8 で public→general にリネームされ、v11 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.label).toBe('友人');
      expect(rel.tags).toContain('layer-general');
    });

    it('hiddenレイヤーをgeneralにリネームしてv9形式に変換する', () => {
      // 前提条件: layer='hidden' の v7 形式データ
      const v7State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '正体を知っている',
            targetToSourceLabel: null,
            layer: 'hidden',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      };

      const result = migrateGraphState(v7State, 7) as {
        relationships: Array<{
          id: string;
          label: string | null;
          tags: string[];
        }>;
      };

      // v8 で hidden→general にリネームされ、v11 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.label).toBe('正体を知っている');
      expect(rel.tags).toContain('layer-general');
    });

    it('emotionalレイヤーが v9 の emotional タグに変換される', () => {
      // 前提条件: layer='emotional' の v7 形式データ（weight なし）
      const v7State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '好き',
            targetToSourceLabel: null,
            layer: 'emotional',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      };

      const result = migrateGraphState(v7State, 7) as {
        relationships: Array<{
          id: string;
          label: string | null;
          tags: string[];
        }>;
      };

      // emotional レイヤーは v11 の layer-emotional タグに変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.label).toBe('好き');
      expect(rel.tags).toContain('layer-emotional');
    });

    it('organizationalレイヤーのラベルがタグに変換される', () => {
      // 前提条件: layer='organizational' の v7 形式データ
      const v7State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '上司',
            targetToSourceLabel: null,
            layer: 'organizational',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      };

      const result = migrateGraphState(v7State, 7) as {
        relationships: Array<{
          id: string;
          label: string | null;
          tags: string[];
        }>;
      };

      // organizational のラベルがタグに変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.label).toBe('上司');
      expect(rel.tags).toContain('上司');
      expect(rel.tags).toContain('layer-organizational');
    });

    it('既存のweightフィールドがある場合はclosenessに変換される', () => {
      // 前提条件: emotional レイヤーで weight=0.8 が設定されている v7 形式データ
      const v7State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '好き',
            targetToSourceLabel: null,
            layer: 'emotional',
            weight: 0.8,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      };

      const result = migrateGraphState(v7State, 7) as {
        relationships: Array<{
          id: string;
          properties: { closeness: number | null };
        }>;
      };

      // weight=0.8 が v11 の properties.closeness に写像されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.properties.closeness).toBe(0.8);
    });

    it('同一ペアの複数レイヤーが1本のv9エッジにマージされる', () => {
      // 前提条件: p1-p2 間に public・hidden・emotional の3レイヤーが存在する v7 形式データ
      const v7State = {
        persons: [],
        relationships: [
          { id: 'rel-1', sourcePersonId: 'p1', targetPersonId: 'p2',
            isDirected: false, sourceToTargetLabel: '友人', targetToSourceLabel: '友人',
            layer: 'public', createdAt: '2024-01-01T00:00:00.000Z' },
          { id: 'rel-2', sourcePersonId: 'p1', targetPersonId: 'p2',
            isDirected: true, sourceToTargetLabel: '好き', targetToSourceLabel: null,
            layer: 'hidden', createdAt: '2024-01-01T00:00:00.000Z' },
          { id: 'rel-3', sourcePersonId: 'p1', targetPersonId: 'p2',
            isDirected: true, sourceToTargetLabel: '上司', targetToSourceLabel: null,
            layer: 'emotional', createdAt: '2024-01-01T00:00:00.000Z' },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
        forceParams: DEFAULT_FORCE_PARAMS,
        sidePanelOpen: true,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      };

      const result = migrateGraphState(v7State, 7) as {
        relationships: Array<{
          id: string;
          label: string | null;
          tags: string[];
        }>;
      };

      // 3本が同一ペアとしてマージされ1本になること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      // id は最初にソートされたエントリを採用
      expect(rel.id).toBe('rel-1');
      // 各レイヤーの情報がタグに保存されること
      expect(rel.tags).toContain('layer-general');
      expect(rel.tags).toContain('layer-emotional');
    });
  });

  // 複数バージョンの連続マイグレーション
  // ─── v8 → v9 マイグレーション ────────────────────────────────────────────────
  describe('v8からv9への変換', () => {
    // ──────────────────── migrateV8ToV9 関数のユニットテスト ────────────────────

    describe('migrateV8ToV9', () => {
      it('単一の emotional レイヤーのデータを変換する（weight → closeness + forward.affection）', () => {
        // 前提条件: emotional レイヤーで weight=0.9 の関係
        const legacy: LegacyRelationshipV8[] = [
          {
            id: 'rel-1',
            sourcePersonId: 'コナン',
            targetPersonId: '蘭',
            isDirected: true,
            sourceToTargetLabel: '好き',
            targetToSourceLabel: null,
            layer: 'emotional',
            weight: 0.9,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ];

        const result = migrateV8ToV9(legacy);

        // 1本のエッジにまとめられること
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('rel-1');
        expect(result[0].sourcePersonId).toBe('コナン');
        expect(result[0].targetPersonId).toBe('蘭');
        // weight が closeness に写像されること
        expect(result[0].symmetric.closeness).toBe(0.9);
        // ラベルが forward.label に写像されること
        expect(result[0].forward.label).toBe('好き');
        // 旧レイヤー名がタグとして保存されること（可逆性の保険）
        expect(result[0].tags).toContain('layer-emotional');
        // narrative は初期値
        expect(result[0].narrative.summary).toBeNull();
        expect(result[0].narrative.turningPoints).toHaveLength(0);
        // colorOverride は初期値
        expect(result[0].colorOverride).toBeNull();
      });

      it('単一の awareness レイヤーのラベルから forward.awareness を推論する', () => {
        // 前提条件: awareness レイヤーのデータ（正体認知の3パターン）
        const legacy: LegacyRelationshipV8[] = [
          {
            id: 'rel-known',
            sourcePersonId: '灰原',
            targetPersonId: 'コナン',
            isDirected: true,
            sourceToTargetLabel: '知っている',
            targetToSourceLabel: null,
            layer: 'awareness',
            weight: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ];

        const result = migrateV8ToV9(legacy);

        expect(result).toHaveLength(1);
        // "知っている" → awareness: 'known'
        expect(result[0].forward.awareness).toBe('known');
        expect(result[0].tags).toContain('layer-awareness');
      });

      it('"疑っている" を suspected に変換する', () => {
        const legacy: LegacyRelationshipV8[] = [
          {
            id: 'rel-suspected',
            sourcePersonId: '蘭',
            targetPersonId: 'コナン',
            isDirected: true,
            sourceToTargetLabel: '疑っている',
            targetToSourceLabel: null,
            layer: 'awareness',
            weight: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ];

        const result = migrateV8ToV9(legacy);

        expect(result[0].forward.awareness).toBe('suspected');
      });

      it('"知らない" を unknown に変換する', () => {
        const legacy: LegacyRelationshipV8[] = [
          {
            id: 'rel-unknown',
            sourcePersonId: '小五郎',
            targetPersonId: 'コナン',
            isDirected: true,
            sourceToTargetLabel: '知らない',
            targetToSourceLabel: null,
            layer: 'awareness',
            weight: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ];

        const result = migrateV8ToV9(legacy);

        expect(result[0].forward.awareness).toBe('unknown');
      });

      it('organizational レイヤーのラベルをタグとして追加する', () => {
        // 前提条件: organizational レイヤーで上司・部下の関係
        const legacy: LegacyRelationshipV8[] = [
          {
            id: 'rel-org',
            sourcePersonId: '目暮警部',
            targetPersonId: '毛利小五郎',
            isDirected: true,
            sourceToTargetLabel: '上司',
            targetToSourceLabel: null,
            layer: 'organizational',
            weight: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ];

        const result = migrateV8ToV9(legacy);

        expect(result[0].tags).toContain('上司');
        expect(result[0].tags).toContain('layer-organizational');
      });

      it('general レイヤーの "父" ラベルから kinship: parent を推論する', () => {
        // 前提条件: 父親関係を general レイヤーで記録したデータ
        const legacy: LegacyRelationshipV8[] = [
          {
            id: 'rel-kinship',
            sourcePersonId: '工藤優作',
            targetPersonId: '工藤新一',
            isDirected: false,
            sourceToTargetLabel: '父',
            targetToSourceLabel: '父',
            layer: 'general',
            weight: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ];

        const result = migrateV8ToV9(legacy);

        expect(result[0].symmetric.kinship).toBe('parent');
      });

      it('同一ペアの複数レイヤーをマージして1本のエッジにする', () => {
        // 前提条件: コナン→灰原 間に emotional + awareness + organizational の3レイヤーが存在
        const legacy: LegacyRelationshipV8[] = [
          {
            id: 'rel-emotional',
            sourcePersonId: 'コナン',
            targetPersonId: '灰原',
            isDirected: true,
            sourceToTargetLabel: '信頼',
            targetToSourceLabel: null,
            layer: 'emotional',
            weight: 0.9,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'rel-awareness',
            sourcePersonId: 'コナン',
            targetPersonId: '灰原',
            isDirected: true,
            sourceToTargetLabel: '知っている',
            targetToSourceLabel: null,
            layer: 'awareness',
            weight: null,
            createdAt: '2024-01-02T00:00:00.000Z',
          },
          {
            id: 'rel-org',
            sourcePersonId: 'コナン',
            targetPersonId: '灰原',
            isDirected: false,
            sourceToTargetLabel: '同級生',
            targetToSourceLabel: '同級生',
            layer: 'organizational',
            weight: null,
            createdAt: '2024-01-03T00:00:00.000Z',
          },
        ];

        const result = migrateV8ToV9(legacy);

        // 3本が1本にまとめられること
        expect(result).toHaveLength(1);
        // emotional の weight が closeness に写像されること
        expect(result[0].symmetric.closeness).toBe(0.9);
        // awareness が推論されること
        expect(result[0].forward.awareness).toBe('known');
        // organizational のラベルがタグに入ること
        expect(result[0].tags).toContain('同級生');
        // 旧レイヤー名が全タグとして保存されること
        expect(result[0].tags).toContain('layer-emotional');
        expect(result[0].tags).toContain('layer-awareness');
        expect(result[0].tags).toContain('layer-organizational');
        // id は最も古いエッジのものを採用
        expect(result[0].id).toBe('rel-emotional');
        expect(result[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
      });

      it('source/target が逆方向のレイヤーもペアとしてマージする', () => {
        // 前提条件: A→B と B→A が別レイヤーに入っているケース
        const legacy: LegacyRelationshipV8[] = [
          {
            id: 'rel-ab',
            sourcePersonId: '蘭',
            targetPersonId: 'コナン',
            isDirected: true,
            sourceToTargetLabel: '疑っている',
            targetToSourceLabel: null,
            layer: 'awareness',
            weight: null,
            createdAt: '2024-02-01T00:00:00.000Z',
          },
          {
            id: 'rel-ba',
            sourcePersonId: 'コナン',
            targetPersonId: '蘭',
            isDirected: true,
            sourceToTargetLabel: '好き',
            targetToSourceLabel: null,
            layer: 'emotional',
            weight: 0.95,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ];

        const result = migrateV8ToV9(legacy);

        // 逆方向のペアも1本にまとめられること
        expect(result).toHaveLength(1);
        // id は最も古い createdAt のものを採用（rel-ba が古い）
        expect(result[0].id).toBe('rel-ba');
      });

      it('v9 データをそのまま受け入れる（冪等性）: 空配列', () => {
        // 前提条件: 空配列を渡すと変換されずに空配列が返ってくる
        const result = migrateV8ToV9([]);
        expect(result).toHaveLength(0);
      });

      it('v9 データをそのまま受け入れる（冪等性）: v9形式データ', () => {
        // 前提条件: v9形式データ（layer フィールドなし）を渡す
        // migrateV8ToV9 は layer フィールドを参照してラベルを決定するため、
        // v9形式データではラベル抽出がスキップされるが、ペアキーでグループ化されて1件のv9エッジが返ってくる
        const v9Data = [
          {
            id: 'rel-v9',
            sourcePersonId: '山田太郎',
            targetPersonId: '佐藤花子',
            isDirected: false,
            symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
            forward: { label: '友人', affection: null, awareness: null, role: null },
            reverse: { label: '友人', affection: null, awareness: null, role: null },
            tags: ['友人'],
            narrative: { summary: null, notes: null, turningPoints: [] },
            colorOverride: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ] as unknown as LegacyRelationshipV8[];

        const result = migrateV8ToV9(v9Data);

        // v9形式データを渡しても1件のエッジとしてまとめられる（ペアキーでグループ化される）
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('rel-v9');
        // layer フィールドがないためラベルはそのまま null（v8→v9変換の仕様）
        expect(result[0].forward.label).toBeNull();
      });

      it('負のラベル（"嫌"を含む）を持つ emotional レイヤーは affection を負値にする', () => {
        const legacy: LegacyRelationshipV8[] = [
          {
            id: 'rel-hate',
            sourcePersonId: 'ジン',
            targetPersonId: '灰原',
            isDirected: true,
            sourceToTargetLabel: '嫌い',
            targetToSourceLabel: null,
            layer: 'emotional',
            weight: 0.8,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ];

        const result = migrateV8ToV9(legacy);

        // "嫌" を含む場合は affection が負値
        expect(result[0].forward.affection).toBeLessThan(0);
        expect(result[0].symmetric.closeness).toBe(0.8);
      });
    });

    // ──────────────── migrateGraphState 経由のインテグレーションテスト ───────────

    describe('migrateGraphState 経由の変換', () => {
      it('v8のデータを v9 形式に変換する', () => {
        const v8State = {
          persons: [],
          relationships: [
            {
              id: 'rel-1',
              sourcePersonId: 'コナン',
              targetPersonId: '灰原',
              isDirected: true,
              sourceToTargetLabel: '信頼',
              targetToSourceLabel: null,
              layer: 'emotional',
              weight: 0.9,
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          ],
          forceEnabled: false,
          selectedPersonIds: [],
          forceParams: DEFAULT_FORCE_PARAMS,
          sidePanelOpen: true,
          egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
        };

        const result = migrateGraphState(v8State, 8) as {
          relationships: Array<{ id: string; properties: { closeness: number | null } }>;
        };

        // v11 形式に変換されること（weight=0.9 → properties.closeness）
        expect(result.relationships).toHaveLength(1);
        expect(result.relationships[0].id).toBe('rel-1');
        expect(result.relationships[0].properties.closeness).toBe(0.9);
      });

      it('v9 以降のデータはそのまま返す', () => {
        const v9State = {
          persons: [],
          relationships: [],
          forceEnabled: false,
          selectedPersonIds: [],
          forceParams: DEFAULT_FORCE_PARAMS,
          sidePanelOpen: true,
          egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
        };

        const result = migrateGraphState(v9State, 9);

        expect(result).toEqual(v9State);
      });
    });
  });

  describe('複数バージョンの連続マイグレーション', () => {
    it('v0からv9まで連続で変換する', () => {
      // 前提条件: v0 形式の状態（selectedPersonId、v1 形式の label フィールド）
      const v0State = {
        persons: [],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            label: '友達',
            isDirected: false,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonId: 'person-1',
      };

      const result = migrateGraphState(v0State, 0) as {
        selectedPersonIds: string[];
        relationships: Array<{
          id: string;
          symmetric: boolean;
          label: string | null;
          tags: string[];
        }>;
        forceParams: typeof DEFAULT_FORCE_PARAMS;
        sidePanelOpen: boolean;
        egoLayoutParams: typeof DEFAULT_EGO_LAYOUT_PARAMS;
      };

      // v0 → v1: selectedPersonId → selectedPersonIds
      expect(result.selectedPersonIds).toEqual(['person-1']);
      // selectedPersonId が除去されていることを確認
      expect(result).not.toHaveProperty('selectedPersonId');

      // v3 → v4: forceParams 補完
      expect(result.forceParams).toEqual(DEFAULT_FORCE_PARAMS);

      // v4 → v5: sidePanelOpen 補完
      expect(result.sidePanelOpen).toBe(true);

      // v5 → v6: egoLayoutParams 補完
      expect(result.egoLayoutParams).toEqual(DEFAULT_EGO_LAYOUT_PARAMS);

      // 最終的に v11 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      // v1 の label='友達'（undirected）→ v11 で symmetric: true、label: '友達'
      expect(rel.symmetric).toBe(true);
      expect(rel.label).toBe('友達');
      // general レイヤー由来タグが付与されること
      expect(rel.tags).toContain('layer-general');
    });
  });
});

// ─── migrateV10ToV11 のテスト ─────────────────────────────────────────────────

/**
 * v9 形式の関係（RelationshipV9 相当）のテストデータ作成ヘルパー
 * migration.ts 内で定義される LegacyRelationshipV9 に対応する
 */
function makeV9Rel(overrides: Record<string, unknown>): unknown {
  return {
    id: 'rel-1',
    sourcePersonId: 'p1',
    targetPersonId: 'p2',
    isDirected: true,
    symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
    forward: { label: null, affection: null, awareness: null, role: null },
    reverse: { label: null, affection: null, awareness: null, role: null },
    tags: [],
    narrative: { summary: null, notes: null, turningPoints: [] },
    colorOverride: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('migrateV10ToV11', () => {
  it('片方向 (one-way) の関係を symmetric=false の単一エッジに変換する', () => {
    // 前提条件: コナン→蘭 の片方向「好き」関係
    const rels = [
      makeV9Rel({
        id: 'rel-好き',
        sourcePersonId: 'コナン',
        targetPersonId: '蘭',
        isDirected: true,
        forward: { label: '好き', affection: 0.9, awareness: null, role: null },
        reverse: { label: null, affection: null, awareness: null, role: null },
        tags: ['片想い'],
      }),
    ];

    
    const result = migrateV10ToV11(rels as LegacyRelationshipV9[]);

    // 1本のエッジになること
    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe('コナン');
    expect(result[0].targetId).toBe('蘭');
    // 有向（矢印あり）であること
    expect(result[0].symmetric).toBe(false);
    // ラベルが forward.label から移行されること
    expect(result[0].label).toBe('好き');
    // type がタグから導出されること
    expect(result[0].type).toBe('片想い');
    // properties に affection が移行されること
    expect(result[0].properties.affection).toBe(0.9);
  });

  it('双方向 (bidirectional) の関係を symmetric=true の単一エッジに変換する', () => {
    // 前提条件: コナン↔蘭 の双方向「友人」関係（forward.label == reverse.label）
    const rels = [
      makeV9Rel({
        id: 'rel-友人',
        sourcePersonId: 'コナン',
        targetPersonId: '蘭',
        isDirected: true,
        forward: { label: '友人', affection: null, awareness: null, role: null },
        reverse: { label: '友人', affection: null, awareness: null, role: null },
        tags: [],
      }),
    ];

    
    const result = migrateV10ToV11(rels as LegacyRelationshipV9[]);

    // 1本のエッジになること
    expect(result).toHaveLength(1);
    // 無向表示（矢印なし）であること
    expect(result[0].symmetric).toBe(true);
    expect(result[0].label).toBe('友人');
  });

  it('無方向 (undirected / isDirected=false) の関係を symmetric=true の単一エッジに変換する', () => {
    // 前提条件: isDirected=false の関係
    const rels = [
      makeV9Rel({
        id: 'rel-同一人物',
        isDirected: false,
        forward: { label: '同一人物', affection: null, awareness: null, role: null },
        reverse: { label: '同一人物', affection: null, awareness: null, role: null },
        tags: [],
      }),
    ];

    
    const result = migrateV10ToV11(rels as LegacyRelationshipV9[]);

    expect(result).toHaveLength(1);
    expect(result[0].symmetric).toBe(true);
    expect(result[0].label).toBe('同一人物');
  });

  it('dual-directed の関係を2本のエッジに分割する', () => {
    // 前提条件: コナン→蘭「好き」、蘭→コナン「親友」という非対称関係
    const rels = [
      makeV9Rel({
        id: 'rel-非対称',
        sourcePersonId: 'コナン',
        targetPersonId: '蘭',
        isDirected: true,
        forward: { label: '好き', affection: 0.9, awareness: null, role: null },
        reverse: { label: '親友', affection: 0.5, awareness: null, role: null },
        symmetric: { closeness: 0.8, trust: 0.7, tension: 0.1, secrecy: 0.0, kinship: null },
        tags: [],
      }),
    ];

    
    const result = migrateV10ToV11(rels as LegacyRelationshipV9[]);

    // 2本に分割されること
    expect(result).toHaveLength(2);

    // 1本目: コナン→蘭「好き」
    const fwd = result.find((r) => r.sourceId === 'コナン');
    expect(fwd).toBeDefined();
    expect(fwd!.targetId).toBe('蘭');
    expect(fwd!.label).toBe('好き');
    expect(fwd!.symmetric).toBe(false);
    expect(fwd!.properties.affection).toBe(0.9);

    // 2本目: 蘭→コナン「親友」
    const rev = result.find((r) => r.sourceId === '蘭');
    expect(rev).toBeDefined();
    expect(rev!.targetId).toBe('コナン');
    expect(rev!.label).toBe('親友');
    expect(rev!.symmetric).toBe(false);
    expect(rev!.properties.affection).toBe(0.5);

    // 両方に symmetric プロパティ（closeness等）がコピーされること
    expect(fwd!.properties.closeness).toBe(0.8);
    expect(rev!.properties.closeness).toBe(0.8);
  });

  it('kinship から type を導出する（親 → "親子"）', () => {
    // 前提条件: kinship=parent の関係（タグなし）
    const rels = [
      makeV9Rel({
        symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: 'parent' },
        forward: { label: '父', affection: null, awareness: null, role: null },
        tags: [],
      }),
    ];

    
    const result = migrateV10ToV11(rels as LegacyRelationshipV9[]);

    // kinship から type が導出されること
    expect(result[0].type).toBe('親子');
  });

  it('tags[0] から type を導出する（kinshipなしの場合）', () => {
    // 前提条件: tags=['同僚'] でkinshipなし
    const rels = [
      makeV9Rel({
        tags: ['同僚', 'layer-general'],
        forward: { label: '同僚', affection: null, awareness: null, role: null },
      }),
    ];

    
    const result = migrateV10ToV11(rels as LegacyRelationshipV9[]);

    expect(result[0].type).toBe('同僚');
  });

  it('タグも kinship もない場合は forward.label を type にする', () => {
    // 前提条件: tags=[] でkinshipなし、forward.label='師匠'
    const rels = [
      makeV9Rel({
        tags: [],
        forward: { label: '師匠', affection: null, awareness: null, role: null },
      }),
    ];

    
    const result = migrateV10ToV11(rels as LegacyRelationshipV9[]);

    expect(result[0].type).toBe('師匠');
  });

  it('ラベルも何もない場合は type を "一般" にする', () => {
    // 前提条件: タグも kinship も label も全てnull
    const rels = [makeV9Rel({ tags: [] })];

    
    const result = migrateV10ToV11(rels as LegacyRelationshipV9[]);

    expect(result[0].type).toBe('一般');
  });

  it('symmetric プロパティ（closeness/trust/tension/secrecy）が properties に移行される', () => {
    // 前提条件: 全ての定型値が設定された関係
    const rels = [
      makeV9Rel({
        symmetric: { closeness: 0.9, trust: 0.8, tension: 0.2, secrecy: 0.5, kinship: null },
        forward: { label: '親友', affection: 0.7, awareness: 'known', role: '師匠' },
        tags: [],
      }),
    ];

    
    const result = migrateV10ToV11(rels as LegacyRelationshipV9[]);

    const props = result[0].properties;
    expect(props.closeness).toBe(0.9);
    expect(props.trust).toBe(0.8);
    expect(props.tension).toBe(0.2);
    expect(props.secrecy).toBe(0.5);
    expect(props.affection).toBe(0.7);
    expect(props.awareness).toBe('known');
    expect(props.role).toBe('師匠');
  });

  it('Person に properties フィールドが追加される', () => {
    // 前提条件: v10 形式（properties なし）の Person
    const persons = [
      {
        id: 'p1',
        labels: ['人物'],
        name: '江戸川コナン',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    
    const result = migratePersonsV10ToV11(persons as LegacyPersonV10[]);

    expect(result[0].properties).toEqual({});
    expect(result[0].labels).toEqual(['人物']);
    expect(result[0].name).toBe('江戸川コナン');
  });

  it('Person にすでに properties がある場合はそのまま保持する', () => {
    // 前提条件: すでに properties を持つ Person
    const persons = [
      {
        id: 'p1',
        labels: ['人物'],
        name: '阿笠博士',
        properties: { organization: 'APTX研究所' },
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    
    const result = migratePersonsV10ToV11(persons as LegacyPersonV10[]);

    expect(result[0].properties).toEqual({ organization: 'APTX研究所' });
  });
});

// ─── migrateV9ToV10 のテスト ──────────────────────────────────────────────────

describe('migrateV9ToV10', () => {
  it('kind: "person" の人物を labels: ["人物"] に変換する', () => {
    const persons = [
      { id: '1', name: '田中一郎', kind: 'person', createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const result = migrateV9ToV10(persons as unknown as Person[]);

    expect(result[0].labels).toEqual(['人物']);
    expect(result[0]).not.toHaveProperty('kind');
  });

  it('kind: "item" の物を labels: ["物"] に変換する', () => {
    const persons = [
      { id: '2', name: '宝剣エクスカリバー', kind: 'item', createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const result = migrateV9ToV10(persons as unknown as Person[]);

    expect(result[0].labels).toEqual(['物']);
    expect(result[0]).not.toHaveProperty('kind');
  });

  it('kind が未設定の人物を labels: ["人物"] に変換する', () => {
    const persons = [
      { id: '3', name: '鈴木花子', createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const result = migrateV9ToV10(persons as unknown as Person[]);

    expect(result[0].labels).toEqual(['人物']);
    expect(result[0]).not.toHaveProperty('kind');
  });

  it('すでに labels が設定されている場合はそのまま保持し kind を削除する', () => {
    const persons = [
      { id: '4', name: '佐藤次郎', labels: ['武将'], createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const result = migrateV9ToV10(persons as Person[]);

    expect(result[0].labels).toEqual(['武将']);
    expect(result[0]).not.toHaveProperty('kind');
  });

  it('複数の人物を混在変換する', () => {
    const persons = [
      { id: '5', name: '上杉謙信', kind: 'person', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: '6', name: '名刀村正', kind: 'item', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: '7', name: '武田信玄', createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const result = migrateV9ToV10(persons as Person[]);

    expect(result[0].labels).toEqual(['人物']);
    expect(result[1].labels).toEqual(['物']);
    expect(result[2].labels).toEqual(['人物']);
    result.forEach((p) => expect(p).not.toHaveProperty('kind'));
  });
});

describe('normalizeChart', () => {
  // v12/v13マイグレーションのテスト

  // v11チャートのベースデータ（スナップショットなし）
  const baseV11Chart = {
    id: 'chart-001',
    name: '戦国時代の相関図',
    persons: [
      {
        id: 'p1',
        labels: ['人物'],
        name: '織田信長',
        properties: {},
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    relationships: [],
    forceEnabled: false,
    forceParams: DEFAULT_FORCE_PARAMS,
    egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
    schemaVersion: 11,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  describe('v11チャートのv13への正規化', () => {
    it('schemaVersion: 11 のチャートに snapshots/episodes/episodeParticipations を補完する', () => {
      const result = normalizeChart({ ...baseV11Chart });

      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.snapshots).toEqual([]);
      expect(result.episodes).toEqual([]);
      expect(result.episodeParticipations).toEqual([]);
    });

    it('既に snapshots が設定されている場合はそのまま保持する', () => {
      const existingSnapshot = {
        id: 'snap-001',
        label: '第1話',
        persons: [],
        relationships: [],
        createdAt: '2024-06-01T00:00:00.000Z',
      };
      const chartWithSnapshots = {
        ...baseV11Chart,
        snapshots: [existingSnapshot],
        schemaVersion: 11,
      };

      const result = normalizeChart(chartWithSnapshots);

      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.snapshots).toHaveLength(1);
      expect(result.snapshots?.[0].label).toBe('第1話');
    });
  });

  describe('v12チャートのv13への正規化', () => {
    it('schemaVersion: 12 のチャートに episodes: [] と episodeParticipations: [] を補完する', () => {
      // NOTE: v12 → v13 のマイグレーション。schemaVersion: 12 はもはや早期リターンしない
      const v12Chart = {
        ...baseV11Chart,
        snapshots: [],
        schemaVersion: 12,
      };

      const result = normalizeChart(v12Chart as Parameters<typeof normalizeChart>[0]);

      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.episodes).toEqual([]);
      expect(result.episodeParticipations).toEqual([]);
    });

    it('既に episodes が設定されている v12 チャートはその値を保持する', () => {
      const v12ChartWithEpisodes = {
        ...baseV11Chart,
        snapshots: [],
        episodes: [
          {
            id: 'ep-001',
            title: '運命の出会い',
            relatedRelationshipIds: [],
            properties: {},
            createdAt: '2024-06-01T00:00:00.000Z',
            updatedAt: '2024-06-01T00:00:00.000Z',
          },
        ],
        episodeParticipations: [],
        schemaVersion: 12,
      };

      const result = normalizeChart(v12ChartWithEpisodes as Parameters<typeof normalizeChart>[0]);

      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.episodes).toHaveLength(1);
      expect(result.episodes?.[0].title).toBe('運命の出会い');
    });

    it('既存スナップショットに episodes: [] と episodeParticipations: [] を補完する', () => {
      const v12ChartWithSnapshot = {
        ...baseV11Chart,
        snapshots: [
          {
            id: 'snap-001',
            label: '第1話',
            persons: [],
            relationships: [],
            createdAt: '2024-06-01T00:00:00.000Z',
            // episodes/episodeParticipationsは未設定（古いスナップショット）
          },
        ],
        schemaVersion: 12,
      };

      const result = normalizeChart(v12ChartWithSnapshot as Parameters<typeof normalizeChart>[0]);

      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.snapshots?.[0].episodes).toEqual([]);
      expect(result.snapshots?.[0].episodeParticipations).toEqual([]);
    });

    it('既存スナップショットに episodes が設定済みの場合はそのまま保持する', () => {
      const v12ChartWithEpisodeSnapshot = {
        ...baseV11Chart,
        snapshots: [
          {
            id: 'snap-001',
            label: '第2話',
            persons: [],
            relationships: [],
            episodes: [{ episodeId: 'ep-001', title: '再会', relatedRelationshipIds: [], properties: {} }],
            episodeParticipations: [],
            createdAt: '2024-06-01T00:00:00.000Z',
          },
        ],
        schemaVersion: 12,
      };

      const result = normalizeChart(v12ChartWithEpisodeSnapshot as Parameters<typeof normalizeChart>[0]);

      expect(result.snapshots?.[0].episodes).toHaveLength(1);
      expect(result.snapshots?.[0].episodes?.[0].title).toBe('再会');
    });
  });

  describe('v14（最新）チャートはそのまま返す', () => {
    it('schemaVersion が CURRENT_SCHEMA_VERSION のチャートはデータ変更なしで返す', () => {
      const latestChart = {
        ...baseV11Chart,
        snapshots: [],
        episodes: [],
        episodeParticipations: [],
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };

      const result = normalizeChart(latestChart as Parameters<typeof normalizeChart>[0]);

      expect(result).toBe(latestChart);
    });
  });

  describe('v13チャートのv14への正規化 (turningPoints → Episode)', () => {
    // ターニングポイントを持つ v13 形式の関係
    const v13RelWithTurningPoints = {
      id: 'rel-001',
      type: '友人',
      sourceId: 'person-001',
      targetId: 'person-002',
      label: null,
      symmetric: false,
      tags: [],
      narrative: {
        summary: '幼なじみ',
        notes: null,
        turningPoints: [
          { at: '第1話', note: '初めて出会った' },
          { at: '第5話', note: '再会を誓った' },
        ],
      },
      colorOverride: null,
      properties: {},
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const baseV13Chart = {
      ...baseV11Chart,
      persons: [
        { id: 'person-001', name: '山田太郎', labels: ['人物'], properties: {}, createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'person-002', name: '田中花子', labels: ['人物'], properties: {}, createdAt: '2024-01-01T00:00:00.000Z' },
      ],
      relationships: [v13RelWithTurningPoints],
      snapshots: [],
      episodes: [],
      episodeParticipations: [],
      schemaVersion: 13,
    };

    it('ライブ turningPoints が Episode と EpisodeParticipation に変換される', () => {
      const result = normalizeChart(baseV13Chart as Parameters<typeof normalizeChart>[0]);

      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      // turningPoints が 2 件 → Episodes が 2 件
      expect(result.episodes).toHaveLength(2);
      expect(result.episodes?.[0].title).toBe('初めて出会った');
      expect(result.episodes?.[0].occurredAt).toBe('第1話');
      expect(result.episodes?.[0].relatedRelationshipIds).toEqual(['rel-001']);
      expect(result.episodes?.[1].title).toBe('再会を誓った');
      // 各 Episode に source/target 両方の参加者が付く → 2 Episode × 2 人 = 4 件
      expect(result.episodeParticipations).toHaveLength(4);
    });

    it('変換後の Relationship の narrative に turningPoints フィールドが存在しないこと', () => {
      const result = normalizeChart(baseV13Chart as Parameters<typeof normalizeChart>[0]);

      const narrative = result.relationships[0].narrative as Record<string, unknown>;
      expect(narrative.turningPoints).toBeUndefined();
      // summary/notes は保持されること
      expect(narrative.summary).toBe('幼なじみ');
    });

    it('Snapshot 内の SnapshotRelationship.narrative から turningPoints フィールドが削除される', () => {
      const v13ChartWithSnapshot = {
        ...baseV13Chart,
        snapshots: [
          {
            id: 'snap-001',
            label: '第1話',
            persons: [],
            relationships: [
              {
                relationshipId: 'rel-001',
                type: '友人',
                sourceId: 'person-001',
                targetId: 'person-002',
                label: null,
                symmetric: false,
                tags: [],
                colorOverride: null,
                properties: {},
                narrative: {
                  summary: null,
                  notes: null,
                  turningPoints: [{ at: '第1話', note: '出会い' }],
                },
              },
            ],
            episodes: [],
            episodeParticipations: [],
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      const result = normalizeChart(v13ChartWithSnapshot as Parameters<typeof normalizeChart>[0]);

      const snapshotNarrative = result.snapshots?.[0].relationships[0].narrative as Record<string, unknown>;
      expect(snapshotNarrative.turningPoints).toBeUndefined();
    });

    it('turningPoints が空の Relationship は Episode を生成しない', () => {
      const v13ChartEmpty = {
        ...baseV11Chart,
        persons: [
          { id: 'person-001', name: '山田太郎', labels: ['人物'], properties: {}, createdAt: '2024-01-01T00:00:00.000Z' },
        ],
        relationships: [
          {
            id: 'rel-002',
            type: '知人',
            sourceId: 'person-001',
            targetId: 'person-001',
            label: null,
            symmetric: false,
            tags: [],
            narrative: { summary: null, notes: null, turningPoints: [] },
            colorOverride: null,
            properties: {},
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        snapshots: [],
        episodes: [],
        episodeParticipations: [],
        schemaVersion: 13,
      };

      const result = normalizeChart(v13ChartEmpty as Parameters<typeof normalizeChart>[0]);

      expect(result.episodes).toHaveLength(0);
      expect(result.episodeParticipations).toHaveLength(0);
    });

    it('既に v14 以上のチャートは no-op で返す', () => {
      const v14Chart = {
        ...baseV11Chart,
        snapshots: [],
        episodes: [],
        episodeParticipations: [],
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };

      const result = normalizeChart(v14Chart as Parameters<typeof normalizeChart>[0]);

      // 同一オブジェクト参照が返ること（no-op）
      expect(result).toBe(v14Chart);
    });
  });
});

describe('migrateTurningPointsToEpisodes', () => {
  /** テスト用の LegacyRelationshipV13 ヘルパー */
  const makeLegacyRel = (overrides: Partial<LegacyRelationshipV13> = {}): LegacyRelationshipV13 => ({
    id: 'rel-001',
    type: '友人',
    sourceId: 'person-001',
    targetId: 'person-002',
    label: null,
    symmetric: false,
    tags: [],
    narrative: {
      summary: null,
      notes: null,
      turningPoints: [],
    },
    colorOverride: null,
    properties: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  /** テスト用の Person ヘルパー */
  const makePerson = (id: string, name: string, labels: string[] = ['人物']): Person => ({
    id,
    name,
    labels,
    properties: {},
    createdAt: '2024-01-01T00:00:00.000Z',
  });

  const persons = [
    makePerson('person-001', '山田太郎'),
    makePerson('person-002', '田中花子'),
  ];

  it('turningPoints が Episode に変換されること', () => {
    const rel = makeLegacyRel({
      narrative: {
        summary: 'テスト',
        notes: null,
        turningPoints: [{ at: '第1話', note: '初めて出会った' }],
      },
    });

    const result = migrateTurningPointsToEpisodes([rel], persons);

    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].title).toBe('初めて出会った');
    expect(result.episodes[0].occurredAt).toBe('第1話');
    expect(result.episodes[0].relatedRelationshipIds).toEqual(['rel-001']);
    // source と target 両方が参加者になること
    const participantIds = result.episodeParticipations.map((p) => p.personId);
    expect(participantIds).toContain('person-001');
    expect(participantIds).toContain('person-002');
    // 変換後の Relationship に turningPoints が存在しないこと
    const narrative = result.relationships[0].narrative as Record<string, unknown>;
    expect(narrative.turningPoints).toBeUndefined();
  });

  it('note と at がどちらも空のエントリはスキップされること', () => {
    const rel = makeLegacyRel({
      narrative: {
        summary: null,
        notes: null,
        turningPoints: [
          { at: '', note: '' },       // 両方空 → スキップ
          { at: '第2話', note: '再会した' }, // 正常 → 変換
        ],
      },
    });

    const result = migrateTurningPointsToEpisodes([rel], persons);

    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].title).toBe('再会した');
  });

  it('note が空で at がある場合は at が title になること', () => {
    const rel = makeLegacyRel({
      narrative: {
        summary: null,
        notes: null,
        turningPoints: [{ at: '第3話', note: '' }],
      },
    });

    const result = migrateTurningPointsToEpisodes([rel], persons);

    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].title).toBe('第3話');
    // at は occurredAt にもセットされること
    expect(result.episodes[0].occurredAt).toBe('第3話');
  });

  it("labels に '人物' を含まない Person は Participation に含まれないこと", () => {
    const personsWithObject = [
      makePerson('person-001', '山田太郎', ['人物']),
      makePerson('person-002', '謎の武器', ['物']), // '人物' ではない
    ];

    const rel = makeLegacyRel({
      narrative: {
        summary: null,
        notes: null,
        turningPoints: [{ at: '第1話', note: '武器を手に入れた' }],
      },
    });

    const result = migrateTurningPointsToEpisodes([rel], personsWithObject);

    expect(result.episodes).toHaveLength(1);
    // '人物' の person-001 のみ参加者になること
    expect(result.episodeParticipations).toHaveLength(1);
    expect(result.episodeParticipations[0].personId).toBe('person-001');
  });

  it('turningPoints が空の Relationship は Episode を生成しないこと', () => {
    const rel = makeLegacyRel({
      narrative: {
        summary: 'サマリー',
        notes: null,
        turningPoints: [],
      },
    });

    const result = migrateTurningPointsToEpisodes([rel], persons);

    expect(result.episodes).toHaveLength(0);
    expect(result.episodeParticipations).toHaveLength(0);
    expect(result.relationships).toHaveLength(1);
  });

  it('source と target が同一 Person の場合に Participation が重複しないこと', () => {
    const selfLoopRel = makeLegacyRel({
      sourceId: 'person-001',
      targetId: 'person-001', // 自己ループ
      narrative: {
        summary: null,
        notes: null,
        turningPoints: [{ at: '第4話', note: '独白' }],
      },
    });

    const result = migrateTurningPointsToEpisodes([selfLoopRel], persons);

    expect(result.episodes).toHaveLength(1);
    // 重複排除で 1 件のみ
    expect(result.episodeParticipations).toHaveLength(1);
    expect(result.episodeParticipations[0].personId).toBe('person-001');
  });

  it('複数 turningPoints から複数の Episode が生成されること', () => {
    const rel = makeLegacyRel({
      narrative: {
        summary: null,
        notes: null,
        turningPoints: [
          { at: '第1話', note: '出会い' },
          { at: '第5話', note: '別れ' },
        ],
      },
    });

    const result = migrateTurningPointsToEpisodes([rel], persons);

    expect(result.episodes).toHaveLength(2);
    expect(result.episodes[0].title).toBe('出会い');
    expect(result.episodes[1].title).toBe('別れ');
    // 各 Episode に source/target 2 人ずつ → 4 件
    expect(result.episodeParticipations).toHaveLength(4);
  });

  it('narrative の summary と notes が変換後も保持されること', () => {
    const rel = makeLegacyRel({
      narrative: {
        summary: '幼なじみの二人',
        notes: 'メモ',
        turningPoints: [],
      },
    });

    const result = migrateTurningPointsToEpisodes([rel], persons);

    expect(result.relationships[0].narrative.summary).toBe('幼なじみの二人');
    expect(result.relationships[0].narrative.notes).toBe('メモ');
  });

  it('CURRENT_SCHEMA_VERSION が 14 であること', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(14);
  });
});
