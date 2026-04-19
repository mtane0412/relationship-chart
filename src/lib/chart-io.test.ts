/**
 * chart-io.ts のユニットテスト
 *
 * Chart のエクスポート/インポートに関するコアロジックを検証する。
 * - ファイル名サニタイズ
 * - JSONシリアライズ
 * - インポートデータのバリデーション
 * - インポート時のID振り直し（Chart/Person/Relationship/Snapshot全階層）
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeFilename,
  serializeChartForExport,
  validateChartData,
  prepareChartForImport,
} from './chart-io';
import type { Chart } from '@/types/chart';
import type { Snapshot } from '@/types/snapshot';

// ─── テスト用ヘルパー ──────────────────────────────────────────────────────────

/**
 * テスト用の最小限のChartオブジェクトを生成する
 */
function makeTestChart(overrides?: Partial<Chart>): Chart {
  return {
    id: 'chart-id-001',
    name: '源氏物語 人物相関図',
    persons: [
      {
        id: 'person-id-001',
        name: '光源氏',
        labels: ['主人公'],
        properties: {},
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'person-id-002',
        name: '紫の上',
        labels: [],
        properties: {},
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    relationships: [
      {
        id: 'rel-id-001',
        type: '恋愛',
        sourceId: 'person-id-001',
        targetId: 'person-id-002',
        label: '想い人',
        symmetric: false,
        tags: [],
        colorOverride: null,
        properties: {
          closeness: null,
          trust: null,
          tension: null,
          secrecy: null,
          affection: null,
          awareness: 'known' as const,
        },
        narrative: {
          summary: '',
          notes: '',
          turningPoints: [],
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    snapshots: [],
    forceEnabled: false,
    forceParams: {
      linkDistance: 200,
      linkStrength: 0.3,
      chargeStrength: -300,
    },
    egoLayoutParams: {
      ringSpacing: 150,
      firstRingRadius: 150,
    },
    schemaVersion: 12,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * テスト用のSnapshotを含むChartを生成する
 */
function makeTestChartWithSnapshot(): Chart {
  const snapshot: Snapshot = {
    id: 'snapshot-id-001',
    label: '第1話',
    description: '物語の始まり',
    persons: [
      {
        personId: 'person-id-001',
        name: '光源氏',
        labels: ['主人公'],
        position: { x: 100, y: 200 },
        properties: {},
      },
    ],
    relationships: [
      {
        relationshipId: 'rel-id-001',
        type: '恋愛',
        sourceId: 'person-id-001',
        targetId: 'person-id-002',
        label: '想い人',
        symmetric: false,
        tags: [],
        colorOverride: null,
        properties: {
          closeness: null,
          trust: null,
          tension: null,
          secrecy: null,
          affection: null,
          awareness: 'known' as const,
        },
        narrative: {
          summary: '',
          notes: '',
          turningPoints: [],
        },
      },
    ],
    createdAt: '2024-01-01T12:00:00.000Z',
  };

  return makeTestChart({ snapshots: [snapshot] });
}

// ─── sanitizeFilename ─────────────────────────────────────────────────────────

describe('sanitizeFilename', () => {
  it('通常のチャート名はそのまま返す', () => {
    expect(sanitizeFilename('源氏物語')).toBe('源氏物語');
  });

  it('英数字のチャート名はそのまま返す', () => {
    expect(sanitizeFilename('MyChart2024')).toBe('MyChart2024');
  });

  it('スラッシュをアンダースコアに置換する', () => {
    expect(sanitizeFilename('A/B/C')).toBe('A_B_C');
  });

  it('バックスラッシュをアンダースコアに置換する', () => {
    expect(sanitizeFilename('A\\B')).toBe('A_B');
  });

  it('コロンをアンダースコアに置換する', () => {
    expect(sanitizeFilename('チャート: 第1話')).toBe('チャート_ 第1話');
  });

  it('アスタリスクをアンダースコアに置換する', () => {
    expect(sanitizeFilename('chart*name')).toBe('chart_name');
  });

  it('クエスチョンマークをアンダースコアに置換する', () => {
    expect(sanitizeFilename('chart?name')).toBe('chart_name');
  });

  it('ダブルクォートをアンダースコアに置換する', () => {
    expect(sanitizeFilename('chart"name')).toBe('chart_name');
  });

  it('山括弧をアンダースコアに置換する', () => {
    expect(sanitizeFilename('chart<name>')).toBe('chart_name_');
  });

  it('パイプをアンダースコアに置換する', () => {
    expect(sanitizeFilename('A|B')).toBe('A_B');
  });

  it('複数の禁止文字を含む場合すべてアンダースコアに置換する', () => {
    expect(sanitizeFilename('A/B:C*D')).toBe('A_B_C_D');
  });

  it('空文字列の場合はフォールバック値を返す', () => {
    expect(sanitizeFilename('')).toBe('chart-export');
  });

  it("'/' のみの場合はアンダースコア '_' を返す（アンダースコアは有効なファイル名）", () => {
    expect(sanitizeFilename('/')).toBe('_');
  });
});

// ─── serializeChartForExport ──────────────────────────────────────────────────

describe('serializeChartForExport', () => {
  it('ChartをJSON文字列に変換できる', () => {
    const chart = makeTestChart();
    const json = serializeChartForExport(chart);

    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('schemaVersionがJSON文字列に含まれる', () => {
    const chart = makeTestChart();
    const json = serializeChartForExport(chart);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed.schemaVersion).toBe(12);
  });

  it('全フィールドがJSON文字列に含まれる', () => {
    const chart = makeTestChart();
    const json = serializeChartForExport(chart);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed.id).toBe('chart-id-001');
    expect(parsed.name).toBe('源氏物語 人物相関図');
    expect(Array.isArray(parsed.persons)).toBe(true);
    expect(Array.isArray(parsed.relationships)).toBe(true);
    expect(Array.isArray(parsed.snapshots)).toBe(true);
  });

  it('インデント付きのフォーマットされたJSONを出力する', () => {
    const chart = makeTestChart();
    const json = serializeChartForExport(chart);

    // インデントが含まれていることを確認（可読性のため）
    expect(json).toContain('\n');
  });
});

// ─── validateChartData ───────────────────────────────────────────────────────

describe('validateChartData', () => {
  it('正常なChartデータはok: trueを返す', () => {
    const chart = makeTestChart();
    const result = validateChartData(chart);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.chart.name).toBe('源氏物語 人物相関図');
    }
  });

  it('nullはok: falseを返す', () => {
    const result = validateChartData(null);

    expect(result.ok).toBe(false);
  });

  it('undefinedはok: falseを返す', () => {
    const result = validateChartData(undefined);

    expect(result.ok).toBe(false);
  });

  it('文字列はok: falseを返す', () => {
    const result = validateChartData('invalid');

    expect(result.ok).toBe(false);
  });

  it('personsが配列でないデータはok: falseを返す', () => {
    const data = { ...makeTestChart(), persons: '無効' };
    const result = validateChartData(data);

    expect(result.ok).toBe(false);
  });

  it('relationshipsが配列でないデータはok: falseを返す', () => {
    const data = { ...makeTestChart(), relationships: 123 };
    const result = validateChartData(data);

    expect(result.ok).toBe(false);
  });

  it('nameが欠落しているデータはok: falseを返す', () => {
    const { name: _name, ...data } = makeTestChart();
    const result = validateChartData(data);

    expect(result.ok).toBe(false);
  });

  it('nameが空文字列のデータはok: falseを返す', () => {
    const data = { ...makeTestChart(), name: '' };
    const result = validateChartData(data);

    expect(result.ok).toBe(false);
  });

  it('createdAtが欠落しているデータはok: falseを返す', () => {
    const { createdAt: _createdAt, ...data } = makeTestChart();
    const result = validateChartData(data);

    expect(result.ok).toBe(false);
  });

  it('updatedAtが欠落しているデータはok: falseを返す', () => {
    const { updatedAt: _updatedAt, ...data } = makeTestChart();
    const result = validateChartData(data);

    expect(result.ok).toBe(false);
  });

  it('スナップショット付きのデータもok: trueを返す', () => {
    const chart = makeTestChartWithSnapshot();
    const result = validateChartData(chart);

    expect(result.ok).toBe(true);
  });
});

// ─── prepareChartForImport ───────────────────────────────────────────────────

describe('prepareChartForImport', () => {
  it('chart.idが元のIDと異なる新しいIDに振り直される', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    // 元のIDと異なること、かつ文字列として有効であることを同時に検証
    expect(prepared.id).not.toBe(chart.id);
    expect(prepared.id).not.toBe('chart-id-001');
    expect(typeof prepared.id).toBe('string');
    expect(prepared.id.length).toBeGreaterThan(0);
  });

  it('各PersonのIDが振り直される', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    // 元のIDが含まれていないことを確認
    const newPersonIds = prepared.persons.map((p) => p.id);
    expect(newPersonIds).not.toContain('person-id-001');
    expect(newPersonIds).not.toContain('person-id-002');
  });

  it('Person数は変わらない', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    expect(prepared.persons.length).toBe(chart.persons.length);
  });

  it('Personのname/labelsはそのまま維持される', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    const kogenji = prepared.persons.find((p) => p.name === '光源氏');
    expect(kogenji).toBeDefined();
    expect(kogenji?.labels).toEqual(['主人公']);

    const murasakinoue = prepared.persons.find((p) => p.name === '紫の上');
    expect(murasakinoue).toBeDefined();
  });

  it('RelationshipのsourceId/targetIdがPersonのID変更に追従する', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    const newPersonIds = prepared.persons.map((p) => p.id);
    const rel = prepared.relationships[0];

    // 新しいPersonのIDがRelationshipに反映されていることを確認
    expect(newPersonIds).toContain(rel.sourceId);
    expect(newPersonIds).toContain(rel.targetId);
  });

  it('RelationshipのIDが振り直される', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    const newRelIds = prepared.relationships.map((r) => r.id);
    expect(newRelIds).not.toContain('rel-id-001');
  });

  it('Relationship数は変わらない', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    expect(prepared.relationships.length).toBe(chart.relationships.length);
  });

  it('Snapshot内のpersonIdがPersonのID変更に追従する', () => {
    const chart = makeTestChartWithSnapshot();
    const prepared = prepareChartForImport(chart);

    const newPersonIds = prepared.persons.map((p) => p.id);
    const snapshot = prepared.snapshots?.[0];

    expect(snapshot).toBeDefined();
    if (snapshot) {
      for (const sp of snapshot.persons) {
        expect(newPersonIds).toContain(sp.personId);
      }
    }
  });

  it('Snapshot内のrelationshipIdがRelationshipのID変更に追従する', () => {
    const chart = makeTestChartWithSnapshot();
    const prepared = prepareChartForImport(chart);

    const newRelIds = prepared.relationships.map((r) => r.id);
    const snapshot = prepared.snapshots?.[0];

    expect(snapshot).toBeDefined();
    if (snapshot) {
      for (const sr of snapshot.relationships) {
        expect(newRelIds).toContain(sr.relationshipId);
      }
    }
  });

  it('Snapshot内のsourceId/targetIdがPersonのID変更に追従する', () => {
    const chart = makeTestChartWithSnapshot();
    const prepared = prepareChartForImport(chart);

    const newPersonIds = prepared.persons.map((p) => p.id);
    const snapshot = prepared.snapshots?.[0];

    expect(snapshot).toBeDefined();
    if (snapshot) {
      for (const sr of snapshot.relationships) {
        expect(newPersonIds).toContain(sr.sourceId);
        expect(newPersonIds).toContain(sr.targetId);
      }
    }
  });

  it('createdAtは元データの値を維持する', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    expect(prepared.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('updatedAtは元データの値を維持する', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    expect(prepared.updatedAt).toBe('2024-01-02T00:00:00.000Z');
  });

  it('nameは元データの値を維持する', () => {
    const chart = makeTestChart();
    const prepared = prepareChartForImport(chart);

    expect(prepared.name).toBe('源氏物語 人物相関図');
  });

  it('normalizeChart経由でschemaVersion 12に正規化される', () => {
    // schemaVersionが古い（または欠落した）データでもインポートできることを確認
    const chart = makeTestChart({ schemaVersion: undefined });
    const prepared = prepareChartForImport(chart);

    expect(prepared.schemaVersion).toBe(12);
  });

  it('スナップショットなしのChartも正常にインポートできる', () => {
    const chart = makeTestChart({ snapshots: [] });
    const prepared = prepareChartForImport(chart);

    expect(prepared.snapshots).toEqual([]);
  });
});
