/**
 * マイグレーションロジック
 * LocalStorageに保存された古い形式のデータを最新形式に変換する
 */

import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';
import { DEFAULT_FORCE_PARAMS, type ForceParams } from '@/stores/useGraphStore';
import { DEFAULT_EGO_LAYOUT_PARAMS, type EgoLayoutParams } from './ego-layout';

/**
 * マイグレーション対象のグラフストア状態型
 * （永続化されたデータの最新形式）
 */
export type PersistedGraphState = {
  persons: Person[];
  relationships: Relationship[];
  forceEnabled: boolean;
  selectedPersonIds: string[];
  forceParams: ForceParams;
  egoLayoutParams: EgoLayoutParams;
  sidePanelOpen: boolean;
};

/**
 * v0形式の状態（selectedPersonIdを使用）
 */
type GraphStateV0 = {
  persons: Person[];
  relationships: Relationship[];
  forceEnabled: boolean;
  selectedPersonId: string | null;
};

/**
 * v1形式のRelationship（label, isDirectedを使用）
 */
type RelationshipV1 = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  label: string;
  isDirected: boolean;
  createdAt: string;
};

/**
 * v1形式の状態
 */
type GraphStateV1 = {
  persons: Person[];
  relationships: RelationshipV1[];
  forceEnabled: boolean;
  selectedPersonIds: string[];
};

/**
 * v2形式のRelationship（type, sourceToTargetLabel, targetToSourceLabelを使用）
 */
type RelationshipV2 = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  type: 'bidirectional' | 'dual-directed' | 'one-way' | 'undirected';
  sourceToTargetLabel: string;
  targetToSourceLabel: string | null;
  createdAt: string;
};

/**
 * v2形式の状態
 */
type GraphStateV2 = {
  persons: Person[];
  relationships: RelationshipV2[];
  forceEnabled: boolean;
  selectedPersonIds: string[];
};

/**
 * グラフストアの状態をマイグレーションする
 * @param persistedState - 永続化された状態
 * @param version - バージョン番号
 * @returns マイグレーション後の状態
 */
export function migrateGraphState(persistedState: unknown, version: number): unknown {
  // v6以降は変換不要
  if (version >= 6) {
    return persistedState;
  }

  // 初回ユーザー（永続化データがない場合）は変換不要
  if (!persistedState || typeof persistedState !== 'object') {
    return persistedState;
  }

  let state: unknown = persistedState;

  // v0からv1への変換
  if (version === 0) {
    const oldState = state as GraphStateV0;
    // selectedPersonId を除外して selectedPersonIds に変換
    const { selectedPersonId, ...rest } = oldState;
    state = {
      ...rest,
      selectedPersonIds: selectedPersonId ? [selectedPersonId] : [],
    };
  }

  // v1からv3への変換（v2を経由せず直接v3に変換）
  if (version <= 1) {
    const v1State = state as GraphStateV1;
    const v3Relationships: Relationship[] = v1State.relationships.map((r) => ({
      id: r.id,
      sourcePersonId: r.sourcePersonId,
      targetPersonId: r.targetPersonId,
      isDirected: r.isDirected,
      sourceToTargetLabel: r.label,
      targetToSourceLabel: r.isDirected ? null : r.label, // undirectedの場合は同一ラベル
      createdAt: r.createdAt,
    }));

    state = {
      persons: v1State.persons,
      relationships: v3Relationships,
      forceEnabled: v1State.forceEnabled,
      selectedPersonIds: v1State.selectedPersonIds,
    };
  }

  // v2からv3への変換
  if (version === 2) {
    const v2State = state as GraphStateV2;
    const v3Relationships: Relationship[] = v2State.relationships.map((r) => {
      // typeフィールドから新しいisDirectedとラベルを導出
      if (r.type === 'bidirectional') {
        return {
          id: r.id,
          sourcePersonId: r.sourcePersonId,
          targetPersonId: r.targetPersonId,
          isDirected: true,
          sourceToTargetLabel: r.sourceToTargetLabel,
          targetToSourceLabel: r.sourceToTargetLabel, // 同一ラベルにする
          createdAt: r.createdAt,
        };
      } else if (r.type === 'dual-directed') {
        return {
          id: r.id,
          sourcePersonId: r.sourcePersonId,
          targetPersonId: r.targetPersonId,
          isDirected: true,
          sourceToTargetLabel: r.sourceToTargetLabel,
          targetToSourceLabel: r.targetToSourceLabel, // そのまま維持
          createdAt: r.createdAt,
        };
      } else if (r.type === 'one-way') {
        return {
          id: r.id,
          sourcePersonId: r.sourcePersonId,
          targetPersonId: r.targetPersonId,
          isDirected: true,
          sourceToTargetLabel: r.sourceToTargetLabel,
          targetToSourceLabel: null, // 片方向のみ
          createdAt: r.createdAt,
        };
      } else {
        // undirected
        return {
          id: r.id,
          sourcePersonId: r.sourcePersonId,
          targetPersonId: r.targetPersonId,
          isDirected: false,
          sourceToTargetLabel: r.sourceToTargetLabel,
          targetToSourceLabel: r.sourceToTargetLabel, // 同一ラベルにする
          createdAt: r.createdAt,
        };
      }
    });

    state = {
      persons: v2State.persons,
      relationships: v3Relationships,
      forceEnabled: v2State.forceEnabled,
      selectedPersonIds: v2State.selectedPersonIds,
    };
  }

  // v3からv4への変換（forceParamsを補完）
  // v0/v1/v2からの変換後も必ずここを通るため、すべてのバージョンでforceParamsが補完される
  if (version <= 3) {
    const v3State = state as Partial<PersistedGraphState>;
    // forceParamsがない場合はデフォルト値を追加
    if (!v3State.forceParams) {
      state = {
        ...v3State,
        forceParams: DEFAULT_FORCE_PARAMS,
      };
    }
  }

  // v4からv5への変換（sidePanelOpenを補完）
  // v0/v1/v2/v3からの変換後も必ずここを通るため、すべてのバージョンでsidePanelOpenが補完される
  if (version <= 4) {
    const v4State = state as Partial<PersistedGraphState>;
    // sidePanelOpenがない場合はデフォルト値（true）を追加
    if (v4State.sidePanelOpen === undefined) {
      state = {
        ...v4State,
        sidePanelOpen: true,
      };
    }
  }

  // v5からv6への変換（egoLayoutParamsを補完）
  // v0/v1/v2/v3/v4からの変換後も必ずここを通るため、すべてのバージョンでegoLayoutParamsが補完される
  if (version <= 5) {
    const v5State = state as Partial<PersistedGraphState>;
    // egoLayoutParamsがない場合はデフォルト値を追加
    if (!v5State.egoLayoutParams) {
      state = {
        ...v5State,
        egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
      };
    }
  }

  return state;
}
