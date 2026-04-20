/**
 * マイグレーションロジック
 * LocalStorage/IndexedDB に保存された古い形式のデータを最新形式に変換する
 *
 * スキーマ履歴:
 *   v0-v8: レイヤーベース方式（layer フィールドで関係を分類）
 *   v9: プロパティグラフ方式（forward/reverse/symmetric 構造）
 *   v10: labels[] 方式（Person.kind → Person.labels）
 *   v11: 正統プロパティグラフ方式（type/sourceId/targetId/properties 構造、マルチエッジ）
 *   v12: snapshots フィールドの追加（タイムライン機能対応）
 *   v13: episodes/episodeParticipations フィールドの追加（エピソードノード対応）
 *   v14: Relationship.narrative.turningPoints → Episode への変換（turningPoints 完全削除）
 *   v15: Person に tags / narrative / colorOverride / updatedAt を追加（Relationship との対称性）
 */

import { nanoid } from 'nanoid';
import type { Person, PersonNarrative } from '@/types/person';
import type { Relationship, AwarenessKind } from '@/types/relationship';
import type { Episode, EpisodeParticipation } from '@/types/episode';
import { DEFAULT_FORCE_PARAMS, type ForceParams } from '@/stores/useGraphStore';
import { DEFAULT_EGO_LAYOUT_PARAMS, type EgoLayoutParams } from './ego-layout';
import type { Chart } from '@/types/chart';

/** IndexedDB Chart スキーマの現在バージョン */
export const CURRENT_SCHEMA_VERSION = 15;

// ─── レガシー型定義（マイグレーション内部でのみ使用） ──────────────────────────

/**
 * v13 以前の Relationship 型（narrative.turningPoints を含む）
 * v14 マイグレーション専用のレガシー型。
 * @deprecated v14 以降は Relationship（turningPoints なし）を使用すること
 */
export type LegacyRelationshipV13 = Omit<Relationship, 'narrative'> & {
  narrative: {
    summary: string | null;
    notes: string | null;
    turningPoints: Array<{ at: string; note: string }>;
  };
};

/**
 * v8 以前のレイヤーベース関係型
 * @deprecated v11 以降は Relationship を使用すること
 */
export type LegacyRelationshipV8 = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  isDirected: boolean;
  sourceToTargetLabel: string | null;
  targetToSourceLabel: string | null;
  layer: 'general' | 'emotional' | 'organizational' | 'awareness';
  weight: number | null;
  createdAt: string;
};

/**
 * v9/v10 のプロパティグラフ関係型（forward/reverse 構造）
 * @deprecated v11 以降は Relationship を使用すること
 */
export type LegacyRelationshipV9 = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  isDirected: boolean;
  symmetric: {
    closeness: number | null;
    trust: number | null;
    tension: number | null;
    secrecy: number | null;
    kinship:
      | 'parent'
      | 'child'
      | 'sibling'
      | 'spouse'
      | 'partner'
      | 'grandparent'
      | 'grandchild'
      | 'cousin'
      | 'relative'
      | null;
  };
  forward: {
    label: string | null;
    affection: number | null;
    awareness: AwarenessKind;
    role: string | null;
  };
  reverse: {
    label: string | null;
    affection: number | null;
    awareness: AwarenessKind;
    role: string | null;
  };
  tags: string[];
  narrative: {
    summary: string | null;
    notes: string | null;
    turningPoints: Array<{ at: string; note: string }>;
  };
  colorOverride: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * v10 の Person 型（properties フィールドなし）
 * @deprecated v11 以降は Person を使用すること
 */
export type LegacyPersonV10 = {
  id: string;
  labels: string[];
  name: string;
  imageDataUrl?: string;
  position?: { x: number; y: number };
  properties?: Record<string, unknown>;
  createdAt: string;
};

/**
 * v14 以前の Person 型（tags / narrative / colorOverride / updatedAt なし）
 * v15 マイグレーション専用のレガシー型。
 * @deprecated v15 以降は Person を使用すること
 */
export type LegacyPersonV14 = {
  id: string;
  labels: string[];
  name: string;
  imageDataUrl?: string;
  position?: { x: number; y: number };
  properties: Record<string, unknown>;
  createdAt: string;
};

// ─── v3 までの内部型（レガシー） ───────────────────────────────────────────────

type LegacyRelationshipV3 = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  isDirected: boolean;
  sourceToTargetLabel: string | null;
  targetToSourceLabel: string | null;
  layer: 'general' | 'emotional' | 'organizational' | 'awareness' | string;
  weight?: number | null;
  createdAt: string;
};

/**
 * マイグレーション対象のグラフストア状態型（最新: v11）
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

// v0-v2 の内部型
type GraphStateV0 = {
  persons: LegacyPersonV10[];
  relationships: LegacyRelationshipV3[];
  forceEnabled: boolean;
  selectedPersonId: string | null;
};

type RelationshipV1 = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  label: string;
  isDirected: boolean;
  createdAt: string;
};

type GraphStateV1 = {
  persons: LegacyPersonV10[];
  relationships: RelationshipV1[];
  forceEnabled: boolean;
  selectedPersonIds: string[];
};

type RelationshipV2 = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  type: 'bidirectional' | 'dual-directed' | 'one-way' | 'undirected';
  sourceToTargetLabel: string;
  targetToSourceLabel: string | null;
  createdAt: string;
};

type GraphStateV2 = {
  persons: LegacyPersonV10[];
  relationships: RelationshipV2[];
  forceEnabled: boolean;
  selectedPersonIds: string[];
};

// ─── v8 → v9 変換ロジック ─────────────────────────────────────────────────────

function inferKinshipFromLabel(
  label: string
): LegacyRelationshipV9['symmetric']['kinship'] {
  if (/父|母|親/.test(label)) return 'parent';
  if (/子|息子|娘/.test(label)) return 'child';
  if (/兄|姉|弟|妹/.test(label)) return 'sibling';
  if (/妻|夫|配偶者/.test(label)) return 'spouse';
  return null;
}

function inferAwarenessFromLabel(label: string): AwarenessKind {
  if (/知っている|知ってい/.test(label)) return 'known';
  if (/疑っている|疑ってい|疑/.test(label)) return 'suspected';
  if (/知らない|知ら/.test(label)) return 'unknown';
  return null;
}

function mergeLegacyGroup(group: LegacyRelationshipV8[]): LegacyRelationshipV9 {
  const sorted = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const primary = sorted[0];
  const now = new Date().toISOString();

  const sourceId = primary.sourcePersonId;
  const targetId = primary.targetPersonId;

  let closeness: number | null = null;
  let forwardLabel: string | null = null;
  let reverseLabel: string | null = null;
  let isDirected = primary.isDirected;
  let forwardAffection: number | null = null;
  let forwardAwareness: AwarenessKind = null;
  let kinship: LegacyRelationshipV9['symmetric']['kinship'] = null;
  const tags: string[] = [];

  for (const r of group) {
    const isReversed = r.sourcePersonId !== sourceId;
    const stl = isReversed ? r.targetToSourceLabel : r.sourceToTargetLabel;
    const tsl = isReversed ? r.sourceToTargetLabel : r.targetToSourceLabel;

    if (r.layer) {
      const layerTag = `layer-${r.layer}`;
      if (!tags.includes(layerTag)) tags.push(layerTag);
    }

    switch (r.layer) {
      case 'emotional': {
        if (typeof r.weight === 'number') {
          closeness = closeness === null ? r.weight : Math.max(closeness, r.weight);
          const label = stl ?? '';
          const isNegative = /嫌|憎|苦手/.test(label);
          const affectionValue = isNegative ? -r.weight : r.weight;
          if (forwardAffection === null) forwardAffection = affectionValue;
        }
        if (stl && !forwardLabel) forwardLabel = stl;
        if (tsl && !reverseLabel) reverseLabel = tsl;
        isDirected = isDirected || r.isDirected;
        break;
      }
      case 'awareness': {
        if (stl) {
          if (!forwardLabel) forwardLabel = stl;
          if (!forwardAwareness) forwardAwareness = inferAwarenessFromLabel(stl);
        }
        break;
      }
      case 'organizational': {
        if (stl && !tags.includes(stl)) tags.push(stl);
        if (tsl && !tags.includes(tsl)) tags.push(tsl);
        if (stl && !forwardLabel) forwardLabel = stl;
        break;
      }
      case 'general': {
        if (stl) {
          if (!tags.includes(stl)) tags.push(stl);
          if (!forwardLabel) forwardLabel = stl;
          if (!kinship) kinship = inferKinshipFromLabel(stl);
        }
        if (tsl) {
          if (!tags.includes(tsl)) tags.push(tsl);
          if (!reverseLabel) reverseLabel = tsl;
        }
        break;
      }
    }
  }

  if (!kinship && forwardLabel) kinship = inferKinshipFromLabel(forwardLabel);

  return {
    id: primary.id,
    sourcePersonId: sourceId,
    targetPersonId: targetId,
    isDirected,
    symmetric: { closeness, trust: null, tension: null, secrecy: null, kinship },
    forward: { label: forwardLabel, affection: forwardAffection, awareness: forwardAwareness, role: null },
    reverse: { label: reverseLabel, affection: null, awareness: null, role: null },
    tags,
    narrative: { summary: null, notes: null, turningPoints: [] },
    colorOverride: null,
    createdAt: primary.createdAt,
    updatedAt: now,
  };
}

/**
 * v8 形式の関係配列を v9 形式に変換する（内部用）
 */
export function migrateV8ToV9(legacy: LegacyRelationshipV8[]): LegacyRelationshipV9[] {
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

// ─── v9 → v10 変換ロジック ────────────────────────────────────────────────────

/**
 * v9 形式の Person 配列を v10 形式に変換する（kind → labels）
 */
export function migrateV9ToV10(persons: LegacyPersonV10[]): LegacyPersonV10[] {
  return persons.map((p) => {
    const legacy = p as LegacyPersonV10 & { kind?: string };
    const { kind, ...rest } = legacy;
    if (rest.labels !== undefined) return rest;
    const labels = kind === 'item' ? ['物'] : ['人物'];
    return { ...rest, labels };
  });
}

// ─── v10 → v11 変換ロジック ───────────────────────────────────────────────────

/**
 * kinship から日本語エッジ型ラベルを導出する
 */
const KINSHIP_TO_TYPE: Record<string, string> = {
  parent: '親子',
  child: '親子',
  sibling: '兄弟',
  spouse: '配偶者',
  partner: 'パートナー',
  grandparent: '祖父母',
  grandchild: '祖父母',
  cousin: 'いとこ',
  relative: '親族',
};

/**
 * v9 形式の関係から表示タイプを判定する
 */
function getV9DisplayType(
  rel: LegacyRelationshipV9
): 'bidirectional' | 'dual-directed' | 'one-way-fwd' | 'one-way-rev' | 'undirected' {
  if (!rel.isDirected) return 'undirected';
  const hasFwd = rel.forward.label !== null;
  const hasRev = rel.reverse.label !== null;
  if (hasFwd && hasRev) {
    return rel.forward.label === rel.reverse.label ? 'bidirectional' : 'dual-directed';
  }
  if (hasFwd) return 'one-way-fwd';
  if (hasRev) return 'one-way-rev';
  // ラベルが両方 null の場合は bidirectional として扱う
  return 'bidirectional';
}

/**
 * v9 形式の関係から v11 のエッジ型（type フィールド）を導出する
 *
 * 優先順位: kinship → tags[0] → forward.label → '一般'
 */
function deriveEdgeType(rel: LegacyRelationshipV9): string {
  if (rel.symmetric.kinship !== null) {
    return KINSHIP_TO_TYPE[rel.symmetric.kinship] ?? '親族';
  }
  if (rel.tags.length > 0) return rel.tags[0];
  if (rel.forward.label !== null) return rel.forward.label;
  if (rel.reverse.label !== null) return rel.reverse.label;
  return '一般';
}

/**
 * v9 関係の共通プロパティを v11 RelationshipProperties に変換する
 */
function buildProperties(
  rel: LegacyRelationshipV9,
  dirProps: LegacyRelationshipV9['forward']
): Relationship['properties'] {
  return {
    closeness: rel.symmetric.closeness,
    trust: rel.symmetric.trust,
    tension: rel.symmetric.tension,
    secrecy: rel.symmetric.secrecy,
    affection: dirProps.affection,
    awareness: dirProps.awareness,
    role: dirProps.role,
  };
}

/**
 * v10 形式の関係配列（RelationshipV9 相当）を v11 形式（Relationship）に変換する
 *
 * dual-directed は2本のエッジに分割される。
 *
 * @param rels - v9/v10 形式の LegacyRelationshipV9 配列
 * @returns v11 形式の Relationship 配列
 */
export function migrateV10ToV11(rels: LegacyRelationshipV9[]): Relationship[] {
  const result: Relationship[] = [];
  const now = new Date().toISOString();

  for (const rel of rels) {
    const displayType = getV9DisplayType(rel);
    const edgeType = deriveEdgeType(rel);

    // tags・narrative は各エッジで独立したコピーを持つ（共有参照によるバグを防ぐ）
    const cloneMeta = () => ({
      type: edgeType,
      tags: [...rel.tags],
      narrative: {
        summary: rel.narrative.summary,
        notes: rel.narrative.notes,
        turningPoints: rel.narrative.turningPoints.map((tp) => ({ ...tp })),
      },
      colorOverride: rel.colorOverride,
      createdAt: rel.createdAt,
      updatedAt: rel.updatedAt ?? now,
    });

    if (displayType === 'dual-directed') {
      // 非対称な関係は2本のエッジに分割する（各エッジに独立したメタデータをコピー）
      result.push({
        ...cloneMeta(),
        id: rel.id,
        sourceId: rel.sourcePersonId,
        targetId: rel.targetPersonId,
        label: rel.forward.label,
        symmetric: false,
        properties: buildProperties(rel, rel.forward),
      });
      result.push({
        ...cloneMeta(),
        id: nanoid(),
        sourceId: rel.targetPersonId,
        targetId: rel.sourcePersonId,
        label: rel.reverse.label,
        symmetric: false,
        properties: buildProperties(rel, rel.reverse),
      });
    } else if (displayType === 'one-way-rev') {
      // 逆方向のみラベルがある場合は sourceId/targetId を入れ替える
      result.push({
        ...cloneMeta(),
        id: rel.id,
        sourceId: rel.targetPersonId,
        targetId: rel.sourcePersonId,
        label: rel.reverse.label,
        symmetric: false,
        properties: buildProperties(rel, rel.reverse),
      });
    } else {
      // one-way-fwd / bidirectional / undirected → 1本のエッジ
      // forward.label が null の場合は reverse.label をフォールバックとして使用（歪な v9 データ対策）
      const isSymmetric = displayType === 'bidirectional' || displayType === 'undirected';
      result.push({
        ...cloneMeta(),
        id: rel.id,
        sourceId: rel.sourcePersonId,
        targetId: rel.targetPersonId,
        label: rel.forward.label ?? rel.reverse.label,
        symmetric: isSymmetric,
        properties: buildProperties(rel, rel.forward),
      });
    }
  }

  return result;
}

/**
 * v10 形式の Person 配列を v11 形式に変換する（properties フィールドを追加）
 *
 * @param persons - v10 形式の LegacyPersonV10 配列
 * @returns v11 形式の Person 配列（properties フィールドを持つ）
 */
export function migratePersonsV10ToV11(persons: LegacyPersonV10[]): LegacyPersonV14[] {
  return persons.map((p) => ({
    ...p,
    labels: p.labels ?? ['人物'],
    properties: p.properties ?? {},
  }));
}

// ─── v14 → v15: Person に tags / narrative / colorOverride / updatedAt 追加 ───

/** v14 以前の Person に存在しないフィールドのデフォルト値 */
const DEFAULT_PERSON_NARRATIVE: PersonNarrative = { summary: null, notes: null };

/**
 * v14 以前の Person 配列に tags / narrative / colorOverride / updatedAt を補完する
 *
 * - 既にフィールドが存在する場合は上書きしない（冪等性）
 * - updatedAt は createdAt と同値を設定する
 *
 * @param persons - v14 以前の Person 配列
 * @returns v15 形式の Person 配列
 */
export function migratePersonsV14ToV15(persons: LegacyPersonV14[]): Person[] {
  return persons.map((p) => ({
    ...p,
    tags: (p as Partial<Person>).tags ?? [],
    narrative: (p as Partial<Person>).narrative ?? DEFAULT_PERSON_NARRATIVE,
    colorOverride: (p as Partial<Person>).colorOverride ?? null,
    updatedAt: (p as Partial<Person>).updatedAt ?? p.createdAt,
  }));
}

// ─── v13 → v14: turningPoints → Episode 変換 ──────────────────────────────────

/**
 * v13 形式の Relationship.narrative.turningPoints を Episode + EpisodeParticipation に変換する
 *
 * 変換ルール:
 * - tp.note.trim() が非空なら title に使用。空なら tp.at.trim() を title に使用。
 * - 両方空のエントリはスキップする（無意味なデータを生成しない）。
 * - 各 Episode の relatedRelationshipIds に元 Relationship.id を設定する。
 * - labels に '人物' が含まれる source/target のみ EpisodeParticipation を生成する。
 * - 同一 Person が source/target 両方（自己ループ）の場合は重複を排除する。
 * - 変換後の Relationship.narrative から turningPoints フィールドを除去する。
 *
 * @param legacyRels - turningPoints を含む v13 形式の Relationship 配列
 * @param persons - ラベル照合用の現在の Person 配列
 * @returns 変換後の relationships / 新規 episodes / 新規 episodeParticipations
 */
export function migrateTurningPointsToEpisodes(
  legacyRels: LegacyRelationshipV13[],
  persons: Person[],
): {
  relationships: Relationship[];
  episodes: Episode[];
  episodeParticipations: EpisodeParticipation[];
} {
  const personMap = new Map(persons.map((p) => [p.id, p]));

  const relationships: Relationship[] = [];
  const episodes: Episode[] = [];
  const episodeParticipations: EpisodeParticipation[] = [];

  for (const rel of legacyRels) {
    for (const tp of (rel.narrative.turningPoints ?? [])) {
      const note = tp.note.trim();
      const at = tp.at.trim();

      // 両方空のエントリはスキップ
      if (!note && !at) continue;

      const title = note || at;
      const occurredAt = at || undefined;
      const now = rel.updatedAt;

      const episodeId = nanoid();
      episodes.push({
        id: episodeId,
        title,
        occurredAt,
        relatedRelationshipIds: [rel.id],
        properties: {},
        createdAt: now,
        updatedAt: now,
      });

      // source/target のうち labels に '人物' を含む Person のみ参加者として登録（重複排除）
      const seenPersonIds = new Set<string>();
      for (const personId of [rel.sourceId, rel.targetId]) {
        if (seenPersonIds.has(personId)) continue;
        const person = personMap.get(personId);
        if (!person || !person.labels.includes('人物')) continue;
        seenPersonIds.add(personId);
        episodeParticipations.push({
          id: nanoid(),
          episodeId,
          personId,
          createdAt: now,
        });
      }
    }

    // turningPoints フィールドを除いた narrative で Relationship を再構築
    const { turningPoints: _tp, ...narrativeWithoutTurningPoints } = rel.narrative;
    void _tp;
    relationships.push({
      ...rel,
      narrative: narrativeWithoutTurningPoints,
    } as Relationship);
  }

  return { relationships, episodes, episodeParticipations };
}

// ─── マイグレーションステートマシン ──────────────────────────────────────────

/**
 * グラフストアの状態をマイグレーションする（LocalStorage）
 * @param persistedState - 永続化された状態
 * @param version - バージョン番号
 * @returns マイグレーション後の v11 形式の状態
 */
export function migrateGraphState(persistedState: unknown, version: number): unknown {
  // v11以降は変換不要
  if (version >= 11) {
    return persistedState;
  }

  // 初回ユーザー（永続化データがない場合）は変換不要
  if (!persistedState || typeof persistedState !== 'object') {
    return persistedState;
  }

  let state: unknown = persistedState;

  // v0からv1への変換（selectedPersonId → selectedPersonIds）
  if (version === 0) {
    const oldState = state as GraphStateV0;
    const { selectedPersonId, ...rest } = oldState;
    state = {
      ...rest,
      selectedPersonIds: selectedPersonId ? [selectedPersonId] : [],
    };
  }

  // v1からv3への変換
  if (version <= 1) {
    const v1State = state as GraphStateV1;
    const v3Relationships: LegacyRelationshipV3[] = v1State.relationships.map((r) => ({
      id: r.id,
      sourcePersonId: r.sourcePersonId,
      targetPersonId: r.targetPersonId,
      isDirected: r.isDirected,
      sourceToTargetLabel: r.label,
      targetToSourceLabel: r.isDirected ? null : r.label,
      layer: 'general' as const,
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
    const v3Relationships: LegacyRelationshipV3[] = v2State.relationships.map((r) => {
      if (r.type === 'bidirectional') {
        return {
          id: r.id,
          sourcePersonId: r.sourcePersonId,
          targetPersonId: r.targetPersonId,
          isDirected: true,
          sourceToTargetLabel: r.sourceToTargetLabel,
          targetToSourceLabel: r.sourceToTargetLabel,
          layer: 'general' as const,
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
          targetToSourceLabel: r.targetToSourceLabel,
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
          targetToSourceLabel: null,
          layer: 'general' as const,
          weight: null,
          createdAt: r.createdAt,
        };
      } else {
        return {
          id: r.id,
          sourcePersonId: r.sourcePersonId,
          targetPersonId: r.targetPersonId,
          isDirected: false,
          sourceToTargetLabel: r.sourceToTargetLabel,
          targetToSourceLabel: r.sourceToTargetLabel,
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
  if (version <= 3) {
    const v3State = state as Partial<PersistedGraphState>;
    if (!v3State.forceParams) {
      state = { ...v3State, forceParams: DEFAULT_FORCE_PARAMS };
    }
  }

  // v4からv5への変換（sidePanelOpenを補完）
  if (version <= 4) {
    const v4State = state as Partial<PersistedGraphState>;
    if (v4State.sidePanelOpen === undefined) {
      state = { ...v4State, sidePanelOpen: true };
    }
  }

  // v5からv6への変換（egoLayoutParamsを補完）
  if (version <= 5) {
    const v5State = state as Partial<PersistedGraphState>;
    if (!v5State.egoLayoutParams) {
      state = { ...v5State, egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS };
    }
  }

  // v6からv7への変換（layerフィールドを補完）
  if (version <= 6) {
    const v6State = state as Record<string, unknown>;
    if (Array.isArray(v6State.relationships)) {
      v6State.relationships = (v6State.relationships as LegacyRelationshipV3[]).map((r) => ({
        ...r,
        layer: (r.layer ?? 'general') as LegacyRelationshipV3['layer'],
      }));
      state = v6State;
    }
  }

  // v7からv8への変換（レイヤーリネーム + weightフィールド追加）
  if (version <= 7) {
    const v7State = state as Record<string, unknown>;
    if (Array.isArray(v7State.relationships)) {
      v7State.relationships = (v7State.relationships as LegacyRelationshipV3[]).map((r) => {
        const oldLayer = r.layer as string | undefined;
        const newLayer =
          oldLayer === 'public' || oldLayer === 'hidden' || !oldLayer
            ? 'general'
            : (oldLayer as LegacyRelationshipV8['layer']);
        return { ...r, layer: newLayer, weight: r.weight ?? null };
      });
      state = v7State;
    }
  }

  // v8 形式を v9 形式に変換する（レイヤーベース → プロパティグラフ）
  {
    const v8State = state as Record<string, unknown>;
    if (Array.isArray(v8State.relationships)) {
      const relationships = v8State.relationships as Record<string, unknown>[];
      const hasLegacyFields = relationships.some(
        (r) =>
          r != null &&
          typeof r === 'object' &&
          ('layer' in r || 'sourceToTargetLabel' in r || 'targetToSourceLabel' in r || 'weight' in r)
      );
      if (hasLegacyFields) {
        state = {
          ...v8State,
          relationships: migrateV8ToV9(v8State.relationships as LegacyRelationshipV8[]),
        };
      }
    }
  }

  // v9 形式（persons）を v10 形式に変換する（kind → labels）
  {
    const stateRecord = state as Record<string, unknown>;
    if (Array.isArray(stateRecord.persons)) {
      const persons = stateRecord.persons as LegacyPersonV10[];
      const hasKindField = persons.some(
        (p) => p != null && typeof p === 'object' && 'kind' in p
      );
      if (hasKindField || persons.some((p) => p.labels === undefined)) {
        state = {
          ...stateRecord,
          persons: migrateV9ToV10(persons),
        };
      }
    }
  }

  // v10 形式（RelationshipV9 + Person without properties）を v11 形式に変換する
  {
    const stateRecord = state as Record<string, unknown>;

    // relationships: v9 形式 → v11 形式
    if (Array.isArray(stateRecord.relationships)) {
      const relationships = stateRecord.relationships as Record<string, unknown>[];
      const hasV9Fields = relationships.some(
        (r) =>
          r != null &&
          typeof r === 'object' &&
          ('sourcePersonId' in r || 'isDirected' in r || 'forward' in r)
      );
      if (hasV9Fields) {
        state = {
          ...stateRecord,
          relationships: migrateV10ToV11(
            stateRecord.relationships as LegacyRelationshipV9[]
          ),
        };
      }
    }

    // persons: properties フィールドを追加
    const updatedState = state as Record<string, unknown>;
    if (Array.isArray(updatedState.persons)) {
      const persons = updatedState.persons as LegacyPersonV10[];
      const hasNoProperties = persons.some(
        (p) => p != null && typeof p === 'object' && !('properties' in p)
      );
      if (hasNoProperties) {
        state = {
          ...updatedState,
          persons: migratePersonsV10ToV11(persons),
        };
      }
    }
  }

  return state;
}

// ─── IndexedDB Chart の正規化（v13 形式への変換） ──────────────────────────────

/**
 * IndexedDB からロードした Chart を最新形式（CURRENT_SCHEMA_VERSION）に正規化する
 *
 * スキーマ変換の段階:
 *   v8以前  → v9:  レイヤーベース → プロパティグラフ（forward/reverse構造）
 *   v9/v10  → v11: Person.kind → labels、RelationshipV9 → Relationship
 *   v11     → v12: snapshots フィールドの追加（タイムライン機能対応）
 *   v12     → v13: episodes/episodeParticipations フィールドの追加（エピソードノード対応）
 *   v13     → v14: Relationship.narrative.turningPoints → Episode への変換
 *
 * @param chart - ロードした Chart オブジェクト（古い schemaVersion の可能性あり）
 * @returns 最新形式に正規化された Chart
 */
export function normalizeChart(chart: Chart): Chart {
  const schemaVersion = chart.schemaVersion ?? 0;

  // 最新バージョン以降はすでに最新形式
  if (schemaVersion >= CURRENT_SCHEMA_VERSION) return chart;

  let persons = chart.persons as unknown as LegacyPersonV10[];
  let relationships = chart.relationships as unknown[];

  // v8 以前: relationships を v9 形式に変換
  const hasLegacyFields = (relationships as Record<string, unknown>[]).some(
    (r) =>
      r != null &&
      typeof r === 'object' &&
      ('layer' in r || 'sourceToTargetLabel' in r || 'weight' in r)
  );
  if (hasLegacyFields) {
    relationships = migrateV8ToV9(relationships as LegacyRelationshipV8[]);
  }

  // v9 形式: persons の kind → labels
  persons = migrateV9ToV10(persons);

  // v10 形式: RelationshipV9 → Relationship（v11）
  const hasV9Fields = (relationships as Record<string, unknown>[]).some(
    (r) =>
      r != null &&
      typeof r === 'object' &&
      ('sourcePersonId' in r || 'isDirected' in r || 'forward' in r)
  );
  const v11Relationships = hasV9Fields
    ? migrateV10ToV11(relationships as LegacyRelationshipV9[])
    : (relationships as Relationship[]);

  // persons に properties フィールドを追加（v10→v11）してから v15 フィールドも補完
  const v11Persons = migratePersonsV10ToV11(persons);
  const normalizedPersons = migratePersonsV14ToV15(v11Persons);

  // 既存スナップショットに episodes/episodeParticipations フィールドを補完（v13対応）
  const v13Snapshots = (chart.snapshots ?? []).map((snapshot) => ({
    ...snapshot,
    episodes: snapshot.episodes ?? [],
    episodeParticipations: snapshot.episodeParticipations ?? [],
  }));

  // v13 → v14: ライブ Relationship.narrative.turningPoints → Episode に変換
  const { relationships: v14Relationships, episodes: newEpisodes, episodeParticipations: newParticipations } =
    migrateTurningPointsToEpisodes(v11Relationships as LegacyRelationshipV13[], normalizedPersons);

  // 既存の episodes/episodeParticipations に新規生成分をマージ
  const mergedEpisodes = [...(chart.episodes ?? []), ...newEpisodes];
  const mergedParticipations = [...(chart.episodeParticipations ?? []), ...newParticipations];

  // v14 のスナップショット: SnapshotRelationship.narrative から turningPoints フィールドを削除
  // v15 のスナップショット: SnapshotPerson に tags / narrative / colorOverride を補完
  const v15Snapshots = v13Snapshots.map((snapshot) => ({
    ...snapshot,
    // SnapshotPerson に v15 フィールドを補完
    persons: snapshot.persons.map((sp) => ({
      ...sp,
      tags: (sp as Partial<typeof sp> & { tags?: string[] }).tags ?? [],
      narrative: (sp as Partial<typeof sp> & { narrative?: { summary: string | null; notes: string | null } }).narrative ?? { summary: null, notes: null },
      colorOverride: (sp as Partial<typeof sp> & { colorOverride?: string | null }).colorOverride ?? null,
    })),
    relationships: snapshot.relationships.map((sr) => {
      // sr.narrative が null/undefined の場合はデフォルト値を補完してから turningPoints を除去
      const narrative = (sr.narrative ?? { summary: null, notes: null }) as (NonNullable<typeof sr.narrative> & { turningPoints?: unknown });
      const { turningPoints: _tp, ...narrativeWithoutTurningPoints } = narrative;
      void _tp;
      return { ...sr, narrative: narrativeWithoutTurningPoints };
    }),
  }));

  return {
    ...chart,
    persons: normalizedPersons,
    relationships: v14Relationships,
    snapshots: v15Snapshots,
    episodes: mergedEpisodes,
    episodeParticipations: mergedParticipations,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}
