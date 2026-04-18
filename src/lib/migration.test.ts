/**
 * マイグレーションロジックのテスト
 * LocalStorageに保存された古い形式のデータを最新形式に変換する
 */

import { describe, it, expect } from 'vitest';
import { migrateGraphState, migrateV8ToV9, migrateV9ToV10 } from './migration';
import type { Person } from '@/types/person';
import type { LegacyRelationshipV8 } from '@/types/relationship';
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
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      const person2: Person = {
        id: 'person-2',
        name: '鈴木花子',
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
        relationships: Array<{ id: string; isDirected: boolean; forward: { label: string | null }; tags: string[] }>;
        forceEnabled: boolean;
        selectedPersonIds: string[];
      };

      // v10 形式に変換されること（persons に labels が付与される）
      expect(result.persons).toMatchObject([
        { id: 'person-1', name: '田中太郎', labels: ['人物'] },
        { id: 'person-2', name: '鈴木花子', labels: ['人物'] },
      ]);
      expect(result.forceEnabled).toBe(false);
      expect(result.selectedPersonIds).toEqual([]);
      expect(result.relationships).toHaveLength(1);
      // directed なので forward.label に変換される
      expect(result.relationships[0].id).toBe('rel-1');
      expect(result.relationships[0].isDirected).toBe(true);
      expect(result.relationships[0].forward.label).toBe('好き');
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
        relationships: Array<{ id: string; isDirected: boolean; forward: { label: string | null }; tags: string[] }>;
      };

      // v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].id).toBe('rel-1');
      expect(result.relationships[0].isDirected).toBe(false);
      expect(result.relationships[0].forward.label).toBe('友達');
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
          sourcePersonId: string;
          targetPersonId: string;
          isDirected: boolean;
          forward: { label: string | null };
          reverse: { label: string | null };
          tags: string[];
        }>;
      };

      // 最終的に v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.sourcePersonId).toBe('person-1');
      expect(rel.targetPersonId).toBe('person-2');
      // bidirectional は isDirected: true に変換される
      expect(rel.isDirected).toBe(true);
      // sourceToTargetLabel（'親子'）が forward.label に写像されること
      expect(rel.forward.label).toBe('親子');
      // bidirectional では両方向に同一ラベルがつくため reverse.label も '親子'
      expect(rel.reverse.label).toBe('親子');
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
          isDirected: boolean;
          forward: { label: string | null };
          reverse: { label: string | null };
          tags: string[];
        }>;
      };

      // 最終的に v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      // dual-directed は isDirected: true に変換される
      expect(rel.isDirected).toBe(true);
      // 各方向のラベルが forward / reverse に写像されること
      expect(rel.forward.label).toBe('好き');
      expect(rel.reverse.label).toBe('無関心');
      // general レイヤー由来タグが付与されること
      expect(rel.tags).toContain('layer-general');
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
          isDirected: boolean;
          forward: { label: string | null };
          reverse: { label: string | null };
          tags: string[];
        }>;
      };

      // 最終的に v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      // one-way は isDirected: true に変換される
      expect(rel.isDirected).toBe(true);
      // forward.label のみ設定され、reverse.label は null のまま
      expect(rel.forward.label).toBe('片想い');
      expect(rel.reverse.label).toBeNull();
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
          isDirected: boolean;
          forward: { label: string | null };
          reverse: { label: string | null };
          tags: string[];
        }>;
      };

      // 最終的に v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      // undirected は isDirected: false のまま
      expect(rel.isDirected).toBe(false);
      // v3 で両方向に同一ラベルがつくため forward / reverse ともに '同級生'
      expect(rel.forward.label).toBe('同級生');
      expect(rel.reverse.label).toBe('同級生');
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
          forward: { label: string | null };
          tags: string[];
        }>;
      };

      // layer なし → general を補完 → v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      // general レイヤーとして処理されるため forward.label に変換されること
      expect(rel.forward.label).toBe('幼馴染');
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
          forward: { label: string | null };
          tags: string[];
        }>;
      };

      // v8 で hidden→general にリネームされ、v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      // hidden は v8 で general にリネームされるため、general レイヤーとして処理される
      expect(rel.forward.label).toBe('正体を知っている');
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
          forward: { label: string | null };
          tags: string[];
        }>;
      };

      // v8 で public→general にリネームされ、v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.forward.label).toBe('友人');
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
          forward: { label: string | null };
          tags: string[];
        }>;
      };

      // v8 で hidden→general にリネームされ、v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.forward.label).toBe('正体を知っている');
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
          forward: { label: string | null };
          tags: string[];
        }>;
      };

      // emotional レイヤーは v9 の layer-emotional タグに変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.forward.label).toBe('好き');
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
          forward: { label: string | null };
          tags: string[];
        }>;
      };

      // organizational のラベルがタグに変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.forward.label).toBe('上司');
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
          symmetric: { closeness: number | null };
        }>;
      };

      // weight=0.8 が v9 の symmetric.closeness に写像されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      expect(rel.symmetric.closeness).toBe(0.8);
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
          forward: { label: string | null };
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
          relationships: Array<{ id: string; symmetric: { closeness: number | null } }>;
        };

        // v9 形式に変換されること
        expect(result.relationships).toHaveLength(1);
        expect(result.relationships[0].id).toBe('rel-1');
        expect(result.relationships[0].symmetric.closeness).toBe(0.9);
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
          isDirected: boolean;
          forward: { label: string | null };
          reverse: { label: string | null };
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

      // 最終的に v9 形式に変換されること
      expect(result.relationships).toHaveLength(1);
      const rel = result.relationships[0];
      expect(rel.id).toBe('rel-1');
      // v1 の label='友達'（undirected）→ v3 で sourceToTargetLabel='友達', targetToSourceLabel='友達'
      // → v9 で forward.label='友達', reverse.label='友達'
      expect(rel.isDirected).toBe(false);
      expect(rel.forward.label).toBe('友達');
      expect(rel.reverse.label).toBe('友達');
      // general レイヤー由来タグが付与されること
      expect(rel.tags).toContain('layer-general');
    });
  });
});

// ─── migrateV9ToV10 のテスト ──────────────────────────────────────────────────

describe('migrateV9ToV10', () => {
  it('kind: "person" の人物を labels: ["人物"] に変換する', () => {
    const persons = [
      { id: '1', name: '田中一郎', kind: 'person', createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const result = migrateV9ToV10(persons as Person[]);

    expect(result[0].labels).toEqual(['人物']);
    expect(result[0]).not.toHaveProperty('kind');
  });

  it('kind: "item" の物を labels: ["物"] に変換する', () => {
    const persons = [
      { id: '2', name: '宝剣エクスカリバー', kind: 'item', createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const result = migrateV9ToV10(persons as Person[]);

    expect(result[0].labels).toEqual(['物']);
    expect(result[0]).not.toHaveProperty('kind');
  });

  it('kind が未設定の人物を labels: ["人物"] に変換する', () => {
    const persons = [
      { id: '3', name: '鈴木花子', createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const result = migrateV9ToV10(persons as Person[]);

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
