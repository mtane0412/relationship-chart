/**
 * マイグレーションロジック
 * LocalStorageに保存された古い形式のデータを最新形式に変換する
 */

import type { Person } from '@/types/person';
import type { Relationship, LegacyRelationshipV8, RelationshipV9, KinshipKind, AwarenessKind } from '@/types/relationship';
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

// ─── v8 → v9 変換ロジック ─────────────────────────────────────────────────────

/**
 * ラベル文字列から血縁関係を推論する
 * @param label - 関係ラベル（例: "父", "母", "兄"）
 * @returns 推論した KinshipKind（推論できない場合は null）
 */
function inferKinship(label: string): KinshipKind {
  if (/父|母|親/.test(label)) return 'parent';
  if (/子|息子|娘/.test(label)) return 'child';
  if (/兄|姉|弟|妹/.test(label)) return 'sibling';
  if (/妻|夫|配偶者/.test(label)) return 'spouse';
  return null;
}

/**
 * awareness レイヤーのラベルから認知状況を推論する
 * @param label - 関係ラベル（例: "知っている", "疑っている", "知らない"）
 * @returns 推論した AwarenessKind（推論できない場合は null）
 */
function inferAwareness(label: string): AwarenessKind {
  if (/知っている|知ってい/.test(label)) return 'known';
  if (/疑っている|疑ってい|疑/.test(label)) return 'suspected';
  if (/知らない|知ら/.test(label)) return 'unknown';
  return null;
}

/**
 * v8 形式の関係グループ（同一ペア）を1本の RelationshipV9 にマージする
 * @param group - 同一ペアの LegacyRelationshipV8 配列
 * @returns マージされた RelationshipV9
 */
function mergeLegacyGroup(group: LegacyRelationshipV8[]): RelationshipV9 {
  // createdAt の昇順にソートし、最も古いエントリをプライマリとして使用
  const sorted = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const primary = sorted[0];
  const now = new Date().toISOString();

  // プライマリの source/target を正規の向きとする
  const sourceId = primary.sourcePersonId;
  const targetId = primary.targetPersonId;

  // マージ先のプロパティ
  let closeness: number | null = null;
  let forwardLabel: string | null = null;
  let reverseLabel: string | null = null;
  let isDirected = primary.isDirected;
  let forwardAffection: number | null = null;
  let forwardAwareness: AwarenessKind = null;
  let kinship: KinshipKind = null;
  const tags: string[] = [];

  for (const r of group) {
    // レコードの向きが正規方向と逆かどうかを判定
    const isReversed = r.sourcePersonId !== sourceId;
    // 正規方向に揃えた source→target / target→source ラベル
    const stl = isReversed ? r.targetToSourceLabel : r.sourceToTargetLabel;
    const tsl = isReversed ? r.sourceToTargetLabel : r.targetToSourceLabel;

    // 旧レイヤー名をタグとして保存（可逆性の保険。r.layer が undefined の v9 データは除外）
    if (r.layer) {
      const layerTag = `layer-${r.layer}`;
      if (!tags.includes(layerTag)) {
        tags.push(layerTag);
      }
    }

    switch (r.layer) {
      case 'emotional': {
        // weight → closeness（複数あれば最大値を採用。undefined は null として扱う）
        if (typeof r.weight === 'number') {
          closeness = closeness === null ? r.weight : Math.max(closeness, r.weight);
          // ラベルに否定的な感情語が含まれる場合は affection を負値にする
          const label = stl ?? '';
          const isNegative = /嫌|憎|苦手/.test(label);
          const affectionValue = isNegative ? -r.weight : r.weight;
          // 最初の emotional レイヤーの affection を採用
          if (forwardAffection === null) {
            forwardAffection = affectionValue;
          }
        }
        if (stl && !forwardLabel) forwardLabel = stl;
        if (tsl && !reverseLabel) reverseLabel = tsl;
        // いずれか1本でも有向なら有向扱いにする（OR 演算で既存値を保持する）
        isDirected = isDirected || r.isDirected;
        break;
      }

      case 'awareness': {
        // ラベルから認知状況を推論
        if (stl) {
          if (!forwardLabel) forwardLabel = stl;
          if (!forwardAwareness) {
            forwardAwareness = inferAwareness(stl);
          }
        }
        break;
      }

      case 'organizational': {
        // ラベルをタグとして追加
        if (stl && !tags.includes(stl)) tags.push(stl);
        if (tsl && !tags.includes(tsl)) tags.push(tsl);
        if (stl && !forwardLabel) forwardLabel = stl;
        break;
      }

      case 'general': {
        // ラベルをタグとして追加し、kinship を推論
        if (stl) {
          if (!tags.includes(stl)) tags.push(stl);
          if (!forwardLabel) forwardLabel = stl;
          if (!kinship) kinship = inferKinship(stl);
        }
        if (tsl) {
          if (!tags.includes(tsl)) tags.push(tsl);
          // dual-directed ケースで逆方向ラベルも保存
          if (!reverseLabel) reverseLabel = tsl;
        }
        break;
      }
    }
  }

  // forward.label からも kinship を推論（general レイヤー以外のケース）
  if (!kinship && forwardLabel) {
    kinship = inferKinship(forwardLabel);
  }

  return {
    id: primary.id,
    sourcePersonId: sourceId,
    targetPersonId: targetId,
    isDirected,
    symmetric: {
      closeness,
      trust: null,
      tension: null,
      secrecy: null,
      kinship,
    },
    forward: {
      label: forwardLabel,
      affection: forwardAffection,
      awareness: forwardAwareness,
      role: null,
    },
    reverse: {
      label: reverseLabel,
      affection: null,
      awareness: null,
      role: null,
    },
    tags,
    narrative: {
      summary: null,
      notes: null,
      turningPoints: [],
    },
    colorOverride: null,
    createdAt: primary.createdAt,
    updatedAt: now,
  };
}

/**
 * v8 形式の関係配列を v9 プロパティグラフ形式に変換する
 * 同一ペア（source/target の順序を問わない）の複数レイヤーは1本のエッジにマージされる。
 *
 * @param legacy - v8 形式の LegacyRelationshipV8 配列
 * @returns v9 形式の RelationshipV9 配列
 */
export function migrateV8ToV9(legacy: LegacyRelationshipV8[]): RelationshipV9[] {
  // ペアキーでグループ化（source/target をソートして正規化し、順序を問わず同一ペアとみなす）
  const byPair = new Map<string, LegacyRelationshipV8[]>();
  for (const r of legacy) {
    const key = [r.sourcePersonId, r.targetPersonId].sort().join(':');
    const existing = byPair.get(key);
    if (existing) {
      existing.push(r);
    } else {
      byPair.set(key, [r]);
    }
  }
  return Array.from(byPair.values()).map(mergeLegacyGroup);
}

// ─── マイグレーションステートマシン ──────────────────────────────────────────

/**
 * グラフストアの状態をマイグレーションする
 * @param persistedState - 永続化された状態
 * @param version - バージョン番号
 * @returns マイグレーション後の状態
 */
export function migrateGraphState(persistedState: unknown, version: number): unknown {
  // v9以降は変換不要
  if (version >= 9) {
    return persistedState;
  }

  // v8は v9 への変換のみ実施（他のフィールドはそのまま）
  if (version === 8) {
    if (!persistedState || typeof persistedState !== 'object') {
      return persistedState;
    }
    const v8State = persistedState as Record<string, unknown>;
    if (Array.isArray(v8State.relationships)) {
      const legacyRels = v8State.relationships as LegacyRelationshipV8[];
      return {
        ...v8State,
        relationships: migrateV8ToV9(legacyRels),
      };
    }
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
      layer: 'general' as const, // v1データはlayerなし → generalをデフォルト設定
      weight: null,
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
          layer: 'general' as const, // v2データはlayerなし → generalをデフォルト設定
          weight: null,
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
          layer: 'general' as const,
          weight: null,
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
          layer: 'general' as const,
          weight: null,
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
          layer: 'general' as const,
          weight: null,
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

  // v6からv7への変換（layerフィールドを補完）
  // v0〜v5からの変換後も必ずここを通るため、すべてのバージョンでlayerが補完される
  if (version <= 6) {
    const v6State = state as Partial<PersistedGraphState>;
    if (v6State.relationships) {
      v6State.relationships = v6State.relationships.map((r) => ({
        ...r,
        // layerフィールドがない場合はgeneralをデフォルト値として設定
        // 既存データに'public'/'hidden'がある場合はv8マイグレーションでリネームされる
        layer: ((r as Relationship & { layer?: string }).layer ?? 'general') as Relationship['layer'],
      }));
      state = v6State;
    }
  }

  // v7からv8への変換（レイヤーリネーム + weightフィールド追加）
  // public/hiddenをgeneralにリネームし、weightフィールドをnullで補完する
  if (version <= 7) {
    const v7State = state as Partial<PersistedGraphState>;
    if (v7State.relationships) {
      v7State.relationships = v7State.relationships.map((r) => {
        // 旧レイヤー名（TypeScriptの型に含まれないが実データに存在しうる）
        const oldLayer = (r as Relationship & { layer?: string }).layer as string | undefined;
        // public/hiddenはgeneralに統合する（両者ともに「基本的な関係」次元として扱う）
        const newLayer: Relationship['layer'] =
          oldLayer === 'public' || oldLayer === 'hidden' || !oldLayer
            ? 'general'
            : (oldLayer as Relationship['layer']);
        return {
          ...r,
          layer: newLayer,
          // weightフィールドがない場合はnullを補完
          weight: (r as Relationship & { weight?: number | null }).weight ?? null,
        };
      });
      state = v7State;
    }
  }

  // v0〜v7 から変換されてきた v8 形式のデータを v9 形式に変換する
  // migrateV8ToV9 はレイヤー分割された複数の v8 レコードをプロパティグラフ方式の1本に集約する。
  // v9 形式データ（layer フィールドを持たない）が渡された場合は変換をスキップする。
  {
    const v8State = state as Record<string, unknown>;
    if (Array.isArray(v8State.relationships)) {
      const relationships = v8State.relationships as Record<string, unknown>[];
      // v8 レコードの特徴的なフィールド（layer / sourceToTargetLabel / weight）が存在するか確認
      const hasLegacyFields = relationships.some(
        (r) =>
          r != null &&
          typeof r === 'object' &&
          ('layer' in r || 'sourceToTargetLabel' in r || 'targetToSourceLabel' in r || 'weight' in r)
      );

      if (hasLegacyFields) {
        const legacyRels = v8State.relationships as LegacyRelationshipV8[];
        state = {
          ...v8State,
          relationships: migrateV8ToV9(legacyRels),
        };
      }
    }
  }

  return state;
}
