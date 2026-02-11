/**
 * IndexedDB CRUD層のテスト
 * 相関図データの永続化処理をテストする
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  initDB,
  getAllChartMetas,
  getChart,
  saveChart,
  deleteChart,
  getLastActiveChartId,
  setLastActiveChartId,
  closeDB,
} from './chart-db';
import type { Chart } from '@/types/chart';
import { DEFAULT_FORCE_PARAMS } from '@/stores/useGraphStore';
import { DEFAULT_EGO_LAYOUT_PARAMS } from './ego-layout';

/**
 * テスト用のChartオブジェクトを生成するヘルパー関数
 * @param overrides - 上書きするプロパティ
 * @returns テスト用のChartオブジェクト
 */
function createTestChart(overrides: Partial<Chart> = {}): Chart {
  return {
    id: 'chart-1',
    name: '相関図 1',
    persons: [],
    relationships: [],
    forceEnabled: false,
    forceParams: DEFAULT_FORCE_PARAMS,
    egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('chart-db', () => {
  // 各テストの前にDBを初期化
  beforeEach(async () => {
    await initDB();
  });

  // 各テストの後にIndexedDBをクリア
  afterEach(async () => {
    // DBインスタンスをクローズ
    closeDB();

    // fake-indexeddbをリセット
    const databases = await indexedDB.databases();
    await Promise.all(
      databases
        .filter((db) => db.name)
        .map(
          (db) =>
            new Promise<void>((resolve, reject) => {
              const req = indexedDB.deleteDatabase(db.name!);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            })
        )
    );
  });

  describe('initDB', () => {
    it('DBを初期化できる', async () => {
      // beforeEach で既に initDB() が呼ばれているが、
      // ここでは冪等性（重複呼び出しが安全であること）を確認する
      const db = await initDB();
      expect(db).toBeDefined();
      expect(db.name).toBe('relationship-chart-db');
    });
  });

  describe('saveChart / getChart', () => {
    it('相関図を保存して取得できる', async () => {
      const chart = createTestChart();

      await saveChart(chart);
      const retrieved = await getChart('chart-1');

      expect(retrieved).toEqual(chart);
    });

    it('存在しない相関図を取得するとundefinedを返す', async () => {
      const retrieved = await getChart('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('既存の相関図を上書き保存できる', async () => {
      const chart = createTestChart();

      await saveChart(chart);

      const updatedChart = createTestChart({
        name: '更新された相関図',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });

      await saveChart(updatedChart);
      const retrieved = await getChart('chart-1');

      expect(retrieved?.name).toBe('更新された相関図');
      expect(retrieved?.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });
  });

  describe('getAllChartMetas', () => {
    it('空の場合は空配列を返す', async () => {
      const metas = await getAllChartMetas();
      expect(metas).toEqual([]);
    });

    it('すべての相関図のメタデータを取得できる', async () => {
      const chart1 = createTestChart({
        persons: [
          {
            id: 'person-1',
            name: '田中太郎',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      const chart2 = createTestChart({
        id: 'chart-2',
        name: '相関図 2',
        persons: [
          {
            id: 'person-2',
            name: '鈴木花子',
            createdAt: '2024-01-02T00:00:00.000Z',
          },
          {
            id: 'person-3',
            name: '佐藤次郎',
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: 'person-2',
            targetPersonId: 'person-3',
            isDirected: true,
            sourceToTargetLabel: '友達',
            targetToSourceLabel: null,
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ],
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });

      await saveChart(chart1);
      await saveChart(chart2);

      const metas = await getAllChartMetas();

      expect(metas).toHaveLength(2);
      expect(metas).toContainEqual({
        id: 'chart-1',
        name: '相関図 1',
        personCount: 1,
        relationshipCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(metas).toContainEqual({
        id: 'chart-2',
        name: '相関図 2',
        personCount: 2,
        relationshipCount: 1,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('updatedAtの降順でソートされる', async () => {
      const chart1 = createTestChart();

      const chart2 = createTestChart({
        id: 'chart-2',
        name: '相関図 2',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z', // より新しい
      });

      await saveChart(chart1);
      await saveChart(chart2);

      const metas = await getAllChartMetas();

      // 最新のものが先頭
      expect(metas[0].id).toBe('chart-2');
      expect(metas[1].id).toBe('chart-1');
    });
  });

  describe('deleteChart', () => {
    it('相関図を削除できる', async () => {
      const chart = createTestChart();

      await saveChart(chart);
      await deleteChart('chart-1');

      const retrieved = await getChart('chart-1');
      expect(retrieved).toBeUndefined();
    });

    it('存在しない相関図を削除してもエラーにならない', async () => {
      await expect(deleteChart('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('getLastActiveChartId / setLastActiveChartId', () => {
    it('初期状態ではnullを返す', async () => {
      const lastActiveChartId = await getLastActiveChartId();
      expect(lastActiveChartId).toBeNull();
    });

    it('最後にアクティブだった相関図IDを保存・取得できる', async () => {
      await setLastActiveChartId('chart-1');
      const retrieved = await getLastActiveChartId();
      expect(retrieved).toBe('chart-1');
    });

    it('nullを保存できる', async () => {
      await setLastActiveChartId('chart-1');
      await setLastActiveChartId(null);
      const retrieved = await getLastActiveChartId();
      expect(retrieved).toBeNull();
    });

    it('上書き保存できる', async () => {
      await setLastActiveChartId('chart-1');
      await setLastActiveChartId('chart-2');
      const retrieved = await getLastActiveChartId();
      expect(retrieved).toBe('chart-2');
    });
  });
});
