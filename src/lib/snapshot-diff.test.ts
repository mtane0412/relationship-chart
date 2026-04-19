/**
 * snapshot-diff.ts のユニットテスト
 *
 * スナップショット間のdiff計算ロジックを検証する。
 */

import { describe, it, expect } from 'vitest';
import { computeSnapshotDiff } from './snapshot-diff';
import type { Snapshot, SnapshotPerson, SnapshotRelationship } from '@/types/snapshot';

// テスト用のデフォルトRelationshipNarrative
const defaultNarrative = {
  summary: '',
  notes: '',
  turningPoints: [],
};

// テスト用のデフォルトRelationshipProperties
const defaultProperties = {
  startDate: null,
  endDate: null,
  strength: null,
  customProperties: {},
};

/**
 * テスト用スナップショット人物を生成するヘルパー
 */
function makePerson(
  personId: string,
  position?: { x: number; y: number }
): SnapshotPerson {
  return {
    personId,
    name: `人物${personId}`,
    labels: [],
    position,
    properties: {},
  };
}

/**
 * テスト用スナップショット関係を生成するヘルパー
 */
function makeRelationship(
  relationshipId: string,
  sourceId: string,
  targetId: string,
  overrides?: Partial<SnapshotRelationship>
): SnapshotRelationship {
  return {
    relationshipId,
    type: '友人',
    sourceId,
    targetId,
    label: null,
    symmetric: false,
    tags: [],
    colorOverride: null,
    properties: defaultProperties,
    narrative: defaultNarrative,
    ...overrides,
  };
}

/**
 * テスト用スナップショットを生成するヘルパー
 */
function makeSnapshot(
  persons: SnapshotPerson[],
  relationships: SnapshotRelationship[]
): Snapshot {
  return {
    id: 'snap-test',
    label: 'テスト',
    persons,
    relationships,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('computeSnapshotDiff', () => {
  describe('人物のdiff計算', () => {
    it('同一スナップショット間では全てunchangedになる', () => {
      // GIVEN: 同一人物・同一位置のスナップショット
      const personA = makePerson('person-1', { x: 100, y: 200 });
      const snapshotA = makeSnapshot([personA], []);
      const snapshotB = makeSnapshot([personA], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.persons.unchanged).toHaveLength(1);
      expect(diff.persons.added).toHaveLength(0);
      expect(diff.persons.removed).toHaveLength(0);
      expect(diff.persons.moved).toHaveLength(0);
    });

    it('Bにのみ存在する人物はaddedに分類される', () => {
      // GIVEN: AにはpersonAのみ、BにはpersonAとpersonBが存在
      const personA = makePerson('person-1', { x: 100, y: 200 });
      const personB = makePerson('person-2', { x: 300, y: 400 });
      const snapshotA = makeSnapshot([personA], []);
      const snapshotB = makeSnapshot([personA, personB], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.persons.added).toHaveLength(1);
      expect(diff.persons.added[0].personId).toBe('person-2');
      expect(diff.persons.unchanged).toHaveLength(1);
    });

    it('Aにのみ存在する人物はremovedに分類される', () => {
      // GIVEN: AにはpersonAとpersonBが存在、BにはpersonAのみ
      const personA = makePerson('person-1', { x: 100, y: 200 });
      const personB = makePerson('person-2', { x: 300, y: 400 });
      const snapshotA = makeSnapshot([personA, personB], []);
      const snapshotB = makeSnapshot([personA], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.persons.removed).toHaveLength(1);
      expect(diff.persons.removed[0].personId).toBe('person-2');
      expect(diff.persons.unchanged).toHaveLength(1);
    });

    it('位置が変化した人物はmovedに分類される', () => {
      // GIVEN: 同一人物だが位置が異なるスナップショット
      const personA = makePerson('person-1', { x: 100, y: 200 });
      const personB = makePerson('person-1', { x: 500, y: 600 });
      const snapshotA = makeSnapshot([personA], []);
      const snapshotB = makeSnapshot([personB], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.persons.moved).toHaveLength(1);
      expect(diff.persons.moved[0].personId).toBe('person-1');
      expect(diff.persons.moved[0].from).toEqual({ x: 100, y: 200 });
      expect(diff.persons.moved[0].to).toEqual({ x: 500, y: 600 });
      expect(diff.persons.unchanged).toHaveLength(0);
    });

    it('positionがundefinedの人物はデフォルト位置(0,0)として扱われる', () => {
      // GIVEN: positionなしの同一人物
      const personNoPos = makePerson('person-1'); // positionなし
      const snapshotA = makeSnapshot([personNoPos], []);
      const snapshotB = makeSnapshot([personNoPos], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN: 両方undefined → 位置変化なし → unchanged
      expect(diff.persons.unchanged).toHaveLength(1);
      expect(diff.persons.moved).toHaveLength(0);
    });

    it('fromがundefined, toが(100,200)の場合はmovedに分類される', () => {
      // GIVEN: Aはpositionなし、Bは位置あり
      const personA = makePerson('person-1'); // positionなし → デフォルト(0,0)
      const personB = makePerson('person-1', { x: 100, y: 200 });
      const snapshotA = makeSnapshot([personA], []);
      const snapshotB = makeSnapshot([personB], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN: from=(0,0), to=(100,200) → moved
      expect(diff.persons.moved).toHaveLength(1);
      expect(diff.persons.moved[0].from).toEqual({ x: 0, y: 0 });
      expect(diff.persons.moved[0].to).toEqual({ x: 100, y: 200 });
    });

    it('追加・削除・移動・変化なしが同時に発生する複合ケース', () => {
      // GIVEN:
      // - person-1: A/B両方で同じ位置 → unchanged
      // - person-2: Aのみ存在 → removed
      // - person-3: Bのみ存在 → added
      // - person-4: A/B両方だが位置が違う → moved
      const personA1 = makePerson('person-1', { x: 0, y: 0 });
      const personA2 = makePerson('person-2', { x: 100, y: 0 });
      const personA4 = makePerson('person-4', { x: 200, y: 0 });
      const personB1 = makePerson('person-1', { x: 0, y: 0 });
      const personB3 = makePerson('person-3', { x: 0, y: 100 });
      const personB4 = makePerson('person-4', { x: 999, y: 999 });

      const snapshotA = makeSnapshot([personA1, personA2, personA4], []);
      const snapshotB = makeSnapshot([personB1, personB3, personB4], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.persons.unchanged.map((p) => p.personId)).toEqual(['person-1']);
      expect(diff.persons.removed.map((p) => p.personId)).toEqual(['person-2']);
      expect(diff.persons.added.map((p) => p.personId)).toEqual(['person-3']);
      expect(diff.persons.moved.map((p) => p.personId)).toEqual(['person-4']);
    });

    it('空スナップショット同士ではすべて空になる', () => {
      // GIVEN
      const snapshotA = makeSnapshot([], []);
      const snapshotB = makeSnapshot([], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.persons.added).toHaveLength(0);
      expect(diff.persons.removed).toHaveLength(0);
      expect(diff.persons.moved).toHaveLength(0);
      expect(diff.persons.unchanged).toHaveLength(0);
    });

    it('同じ位置でも名前が変化した人物はchangedに分類される', () => {
      // GIVEN: personIdと位置は同じだが名前が異なる
      const personA: SnapshotPerson = {
        personId: 'person-1',
        name: '旧名前',
        labels: [],
        position: { x: 100, y: 200 },
        properties: {},
      };
      const personB: SnapshotPerson = {
        personId: 'person-1',
        name: '新名前',
        labels: [],
        position: { x: 100, y: 200 },
        properties: {},
      };
      const snapshotA = makeSnapshot([personA], []);
      const snapshotB = makeSnapshot([personB], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN: 位置は同じだが名前が変化 → changed に分類
      expect(diff.persons.changed).toHaveLength(1);
      expect(diff.persons.changed[0].personId).toBe('person-1');
      expect(diff.persons.changed[0].name).toBe('新名前');
      expect(diff.persons.unchanged).toHaveLength(0);
      expect(diff.persons.moved).toHaveLength(0);
    });

    it('同じ位置でもラベルが変化した人物はchangedに分類される', () => {
      // GIVEN
      const personA: SnapshotPerson = {
        personId: 'person-1',
        name: '織田信長',
        labels: ['武将'],
        position: { x: 100, y: 200 },
        properties: {},
      };
      const personB: SnapshotPerson = {
        personId: 'person-1',
        name: '織田信長',
        labels: ['武将', '天下人'],
        position: { x: 100, y: 200 },
        properties: {},
      };
      const snapshotA = makeSnapshot([personA], []);
      const snapshotB = makeSnapshot([personB], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.persons.changed).toHaveLength(1);
      expect(diff.persons.unchanged).toHaveLength(0);
    });

    it('位置と属性の両方が変化した人物はmovedに分類される（位置変化を優先）', () => {
      // GIVEN: 位置も名前も変化
      const personA: SnapshotPerson = {
        personId: 'person-1',
        name: '旧名前',
        labels: [],
        position: { x: 100, y: 200 },
        properties: {},
      };
      const personB: SnapshotPerson = {
        personId: 'person-1',
        name: '新名前',
        labels: [],
        position: { x: 500, y: 600 },
        properties: {},
      };
      const snapshotA = makeSnapshot([personA], []);
      const snapshotB = makeSnapshot([personB], []);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN: 位置変化を優先してmovedに分類
      expect(diff.persons.moved).toHaveLength(1);
      expect(diff.persons.changed).toHaveLength(0);
      expect(diff.persons.unchanged).toHaveLength(0);
    });
  });

  describe('関係のdiff計算', () => {
    it('同一スナップショット間では全てunchangedになる', () => {
      // GIVEN
      const relA = makeRelationship('rel-1', 'person-1', 'person-2');
      const snapshotA = makeSnapshot([], [relA]);
      const snapshotB = makeSnapshot([], [relA]);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.relationships.unchanged).toHaveLength(1);
      expect(diff.relationships.added).toHaveLength(0);
      expect(diff.relationships.removed).toHaveLength(0);
      expect(diff.relationships.changed).toHaveLength(0);
    });

    it('Bにのみ存在する関係はaddedに分類される', () => {
      // GIVEN
      const relA = makeRelationship('rel-1', 'person-1', 'person-2');
      const relB = makeRelationship('rel-2', 'person-1', 'person-3');
      const snapshotA = makeSnapshot([], [relA]);
      const snapshotB = makeSnapshot([], [relA, relB]);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.relationships.added).toHaveLength(1);
      expect(diff.relationships.added[0].relationshipId).toBe('rel-2');
    });

    it('Aにのみ存在する関係はremovedに分類される', () => {
      // GIVEN
      const relA = makeRelationship('rel-1', 'person-1', 'person-2');
      const relB = makeRelationship('rel-2', 'person-1', 'person-3');
      const snapshotA = makeSnapshot([], [relA, relB]);
      const snapshotB = makeSnapshot([], [relA]);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.relationships.removed).toHaveLength(1);
      expect(diff.relationships.removed[0].relationshipId).toBe('rel-2');
    });

    it('接続先（sourceId/targetId）が変化した関係はchangedに分類される', () => {
      // GIVEN: 同一IDだがtargetIdが異なる（エッジの張り替え）
      const relA = makeRelationship('rel-1', 'person-1', 'person-2');
      const relB = makeRelationship('rel-1', 'person-1', 'person-3');
      const snapshotA = makeSnapshot([], [relA]);
      const snapshotB = makeSnapshot([], [relB]);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN: 接続先が変化したのでchangedに分類
      expect(diff.relationships.changed).toHaveLength(1);
      expect(diff.relationships.changed[0].relationshipId).toBe('rel-1');
      expect(diff.relationships.changed[0].from.targetId).toBe('person-2');
      expect(diff.relationships.changed[0].to.targetId).toBe('person-3');
    });

    it('属性（label）が変化した関係はchangedに分類される', () => {
      // GIVEN: 同一IDだがlabelが異なる
      const relA = makeRelationship('rel-1', 'person-1', 'person-2', { label: '旧ラベル' });
      const relB = makeRelationship('rel-1', 'person-1', 'person-2', { label: '新ラベル' });
      const snapshotA = makeSnapshot([], [relA]);
      const snapshotB = makeSnapshot([], [relB]);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.relationships.changed).toHaveLength(1);
      expect(diff.relationships.changed[0].relationshipId).toBe('rel-1');
      expect(diff.relationships.changed[0].from.label).toBe('旧ラベル');
      expect(diff.relationships.changed[0].to.label).toBe('新ラベル');
    });

    it('属性（colorOverride）が変化した関係はchangedに分類される', () => {
      // GIVEN
      const relA = makeRelationship('rel-1', 'person-1', 'person-2', { colorOverride: null });
      const relB = makeRelationship('rel-1', 'person-1', 'person-2', { colorOverride: '#ff0000' });
      const snapshotA = makeSnapshot([], [relA]);
      const snapshotB = makeSnapshot([], [relB]);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.relationships.changed).toHaveLength(1);
    });

    it('関係の追加・削除・変化・変化なしが同時に発生する複合ケース', () => {
      // GIVEN:
      // - rel-1: A/B両方で同じ属性 → unchanged
      // - rel-2: Aのみ → removed
      // - rel-3: Bのみ → added
      // - rel-4: A/B両方だがlabelが違う → changed
      const rel1A = makeRelationship('rel-1', 'p1', 'p2');
      const rel2A = makeRelationship('rel-2', 'p1', 'p3');
      const rel4A = makeRelationship('rel-4', 'p1', 'p4', { label: '旧' });
      const rel1B = makeRelationship('rel-1', 'p1', 'p2');
      const rel3B = makeRelationship('rel-3', 'p2', 'p3');
      const rel4B = makeRelationship('rel-4', 'p1', 'p4', { label: '新' });

      const snapshotA = makeSnapshot([], [rel1A, rel2A, rel4A]);
      const snapshotB = makeSnapshot([], [rel1B, rel3B, rel4B]);

      // WHEN
      const diff = computeSnapshotDiff(snapshotA, snapshotB);

      // THEN
      expect(diff.relationships.unchanged.map((r) => r.relationshipId)).toEqual(['rel-1']);
      expect(diff.relationships.removed.map((r) => r.relationshipId)).toEqual(['rel-2']);
      expect(diff.relationships.added.map((r) => r.relationshipId)).toEqual(['rel-3']);
      expect(diff.relationships.changed.map((r) => r.relationshipId)).toEqual(['rel-4']);
    });
  });
});
