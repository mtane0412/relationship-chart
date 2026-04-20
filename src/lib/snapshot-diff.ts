/**
 * スナップショット間のdiff計算モジュール
 *
 * スナップショットAからBへの遷移で発生する変化を計算する純粋関数を提供する。
 * アニメーション遷移の制御（出現・消滅・移動）に使用する。
 *
 * 設計方針:
 * - personId / relationshipId ベースでA/Bを照合する
 * - positionがundefinedの場合はデフォルト位置(0,0)として扱う
 * - 関係の属性変化はJSON文字列比較で検出する（シンプルさ優先）
 */

import type { Snapshot, SnapshotPerson, SnapshotRelationship } from '@/types/snapshot';

/**
 * 人物の移動情報
 */
type MovedPerson = {
  /** 対象人物のID */
  personId: string;
  /** 移動前の位置 */
  from: { x: number; y: number };
  /** 移動後の位置 */
  to: { x: number; y: number };
};

/**
 * 関係の属性変化情報
 */
type ChangedRelationship = {
  /** 対象関係のID */
  relationshipId: string;
  /** 変化前の状態 */
  from: SnapshotRelationship;
  /** 変化後の状態 */
  to: SnapshotRelationship;
};

/**
 * スナップショット間のdiff結果
 */
export type SnapshotDiff = {
  /** 人物のdiff */
  persons: {
    /** Bにのみ存在する人物（出現） */
    added: SnapshotPerson[];
    /** Aにのみ存在する人物（消滅） */
    removed: SnapshotPerson[];
    /** A/B両方に存在し位置が変化した人物（属性変化も同時に起きている場合を含む） */
    moved: MovedPerson[];
    /** A/B両方に存在し位置は同じだが属性（name/labels/properties）が変化した人物 */
    changed: SnapshotPerson[];
    /** A/B両方に存在し変化がない人物 */
    unchanged: SnapshotPerson[];
  };
  /** 関係のdiff */
  relationships: {
    /** Bにのみ存在する関係（出現） */
    added: SnapshotRelationship[];
    /** Aにのみ存在する関係（消滅） */
    removed: SnapshotRelationship[];
    /** 同一IDで属性が変化した関係 */
    changed: ChangedRelationship[];
    /** A/B両方に存在し変化がない関係 */
    unchanged: SnapshotRelationship[];
  };
};

/**
 * positionがundefinedの場合にデフォルト位置を返す
 */
function resolvePosition(position?: { x: number; y: number }): { x: number; y: number } {
  return position ?? { x: 0, y: 0 };
}

/**
 * 2つの位置が同一かどうかを判定する
 */
function isSamePosition(
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined
): boolean {
  const posA = resolvePosition(a);
  const posB = resolvePosition(b);
  return posA.x === posB.x && posA.y === posB.y;
}

/**
 * 人物の属性が変化しているかどうかをJSON文字列比較で判定する
 * - 比較対象: name / labels / tags / narrative / colorOverride / properties
 * - position は別途 isSamePosition で比較するため、ここでは比較しない
 */
function isPersonAttributeChanged(a: SnapshotPerson, b: SnapshotPerson): boolean {
  const pickComparableFields = (p: SnapshotPerson) => ({
    name: p.name,
    labels: p.labels,
    tags: p.tags,
    narrative: p.narrative,
    colorOverride: p.colorOverride,
    properties: p.properties,
  });
  return JSON.stringify(pickComparableFields(a)) !== JSON.stringify(pickComparableFields(b));
}

/**
 * 関係の属性が変化しているかどうかをJSON文字列比較で判定する
 * - sourceId/targetId の接続先変更も変化として検出する
 * - label, symmetric, colorOverride, tags, type, properties を対象とする
 * - narrative は変化検出対象に含めない（narrative変化はアニメーション対象外）
 */
function isRelationshipChanged(a: SnapshotRelationship, b: SnapshotRelationship): boolean {
  const pickComparableFields = (r: SnapshotRelationship) => ({
    sourceId: r.sourceId,
    targetId: r.targetId,
    type: r.type,
    label: r.label,
    symmetric: r.symmetric,
    tags: r.tags,
    colorOverride: r.colorOverride,
    properties: r.properties,
  });
  return JSON.stringify(pickComparableFields(a)) !== JSON.stringify(pickComparableFields(b));
}

/**
 * スナップショットAからBへのdiffを計算する
 *
 * @param from - 遷移元のスナップショット
 * @param to - 遷移先のスナップショット
 * @returns diff結果（追加・削除・移動・変化なし）
 */
export function computeSnapshotDiff(from: Snapshot, to: Snapshot): SnapshotDiff {
  // === 人物のdiff計算 ===
  const fromPersonMap = new Map<string, SnapshotPerson>(
    from.persons.map((p) => [p.personId, p])
  );
  const toPersonMap = new Map<string, SnapshotPerson>(
    to.persons.map((p) => [p.personId, p])
  );

  const addedPersons: SnapshotPerson[] = [];
  const removedPersons: SnapshotPerson[] = [];
  const movedPersons: MovedPerson[] = [];
  const changedPersons: SnapshotPerson[] = [];
  const unchangedPersons: SnapshotPerson[] = [];

  // toを走査: added or moved or changed or unchanged
  for (const [personId, toPerson] of toPersonMap) {
    const fromPerson = fromPersonMap.get(personId);
    if (fromPerson === undefined) {
      // Bにのみ存在 → added
      addedPersons.push(toPerson);
    } else if (!isSamePosition(fromPerson.position, toPerson.position)) {
      // 位置が変化 → moved（属性変化も同時に起きていても位置変化を優先）
      movedPersons.push({
        personId,
        from: resolvePosition(fromPerson.position),
        to: resolvePosition(toPerson.position),
      });
    } else if (isPersonAttributeChanged(fromPerson, toPerson)) {
      // 位置は同じだが属性が変化 → changed
      changedPersons.push(toPerson);
    } else {
      // 変化なし → unchanged
      unchangedPersons.push(toPerson);
    }
  }

  // fromを走査: removed（toに存在しないもの）
  for (const [personId, fromPerson] of fromPersonMap) {
    if (!toPersonMap.has(personId)) {
      removedPersons.push(fromPerson);
    }
  }

  // === 関係のdiff計算 ===
  const fromRelMap = new Map<string, SnapshotRelationship>(
    from.relationships.map((r) => [r.relationshipId, r])
  );
  const toRelMap = new Map<string, SnapshotRelationship>(
    to.relationships.map((r) => [r.relationshipId, r])
  );

  const addedRels: SnapshotRelationship[] = [];
  const removedRels: SnapshotRelationship[] = [];
  const changedRels: ChangedRelationship[] = [];
  const unchangedRels: SnapshotRelationship[] = [];

  // toを走査: added or changed or unchanged
  for (const [relationshipId, toRel] of toRelMap) {
    const fromRel = fromRelMap.get(relationshipId);
    if (fromRel === undefined) {
      // Bにのみ存在 → added
      addedRels.push(toRel);
    } else if (isRelationshipChanged(fromRel, toRel)) {
      // 属性が変化 → changed
      changedRels.push({ relationshipId, from: fromRel, to: toRel });
    } else {
      // 変化なし → unchanged
      unchangedRels.push(toRel);
    }
  }

  // fromを走査: removed（toに存在しないもの）
  for (const [relationshipId, fromRel] of fromRelMap) {
    if (!toRelMap.has(relationshipId)) {
      removedRels.push(fromRel);
    }
  }

  return {
    persons: {
      added: addedPersons,
      removed: removedPersons,
      moved: movedPersons,
      changed: changedPersons,
      unchanged: unchangedPersons,
    },
    relationships: {
      added: addedRels,
      removed: removedRels,
      changed: changedRels,
      unchanged: unchangedRels,
    },
  };
}
