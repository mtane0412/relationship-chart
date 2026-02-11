/**
 * マイグレーションロジックのテスト
 * LocalStorageに保存された古い形式のデータを最新形式に変換する
 */

import { describe, it, expect } from 'vitest';
import { migrateGraphState } from './migration';
import type { Person } from '@/types/person';
import { DEFAULT_FORCE_PARAMS } from '@/stores/useGraphStore';
import { DEFAULT_EGO_LAYOUT_PARAMS } from './ego-layout';

describe('migrateGraphState', () => {
  // v6以降は変換不要
  describe('v6以降のデータ', () => {
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

      const result = migrateGraphState(state, 6);

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

  // v1からv3への変換
  describe('v1からv3への変換', () => {
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

      const result = migrateGraphState(v1State, 1);

      expect(result).toMatchObject({
        persons: [person1, person2],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '好き',
            targetToSourceLabel: null, // directedの場合はnull
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        forceEnabled: false,
        selectedPersonIds: [],
      });
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

      const result = migrateGraphState(v1State, 1);

      expect(result).toMatchObject({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: false,
            sourceToTargetLabel: '友達',
            targetToSourceLabel: '友達', // undirectedの場合は同一ラベル
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });
    });
  });

  // v2からv3への変換
  describe('v2からv3への変換', () => {
    it('bidirectionalタイプを変換する', () => {
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

      const result = migrateGraphState(v2State, 2);

      expect(result).toMatchObject({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '親子',
            targetToSourceLabel: '親子', // 同一ラベルに変換
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });
    });

    it('dual-directedタイプを変換する', () => {
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

      const result = migrateGraphState(v2State, 2);

      expect(result).toMatchObject({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '好き',
            targetToSourceLabel: '無関心', // そのまま維持
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });
    });

    it('one-wayタイプを変換する', () => {
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

      const result = migrateGraphState(v2State, 2);

      expect(result).toMatchObject({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: true,
            sourceToTargetLabel: '片想い',
            targetToSourceLabel: null, // 片方向のみ
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });
    });

    it('undirectedタイプを変換する', () => {
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

      const result = migrateGraphState(v2State, 2);

      expect(result).toMatchObject({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: false,
            sourceToTargetLabel: '同級生',
            targetToSourceLabel: '同級生', // 同一ラベルに変換
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });
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

  // 複数バージョンの連続マイグレーション
  describe('複数バージョンの連続マイグレーション', () => {
    it('v0からv6まで連続で変換する', () => {
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

      const result = migrateGraphState(v0State, 0);

      // v0 → v1: selectedPersonId → selectedPersonIds
      expect(result).toMatchObject({
        selectedPersonIds: ['person-1'],
      });
      // selectedPersonId が除去されていることを確認
      expect(result).not.toHaveProperty('selectedPersonId');

      // v1 → v3: Relationship形式の変換
      expect(result).toMatchObject({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-1',
            targetPersonId: 'person-2',
            isDirected: false,
            sourceToTargetLabel: '友達',
            targetToSourceLabel: '友達',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      // v3 → v4: forceParams補完
      expect(result).toMatchObject({
        forceParams: DEFAULT_FORCE_PARAMS,
      });

      // v4 → v5: sidePanelOpen補完
      expect(result).toMatchObject({
        sidePanelOpen: true,
      });

      // v5 → v6: egoLayoutParams補完
      expect(result).toMatchObject({
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      });
    });
  });
});
