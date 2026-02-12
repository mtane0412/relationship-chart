/**
 * IndexedDB CRUD層
 * 相関図データの永続化処理を提供する
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Chart, ChartMeta } from '@/types/chart';

/**
 * IndexedDBのスキーマ定義
 */
interface RelationshipChartDB extends DBSchema {
  /**
   * 相関図データを保存するオブジェクトストア
   */
  charts: {
    key: string;
    value: Chart;
    indexes: { 'by-updatedAt': string };
  };
  /**
   * アプリケーション設定を保存するオブジェクトストア（キーバリュー形式）
   */
  appSettings: {
    key: string;
    value: string | null;
  };
}

/**
 * データベース名とバージョン
 */
const DB_NAME = 'relationship-chart-db';
const DB_VERSION = 1;

/**
 * データベースのインスタンスをキャッシュ
 */
let dbInstance: IDBPDatabase<RelationshipChartDB> | null = null;

/**
 * IndexedDBを初期化する
 * @returns データベースのインスタンス
 */
export async function initDB(): Promise<IDBPDatabase<RelationshipChartDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<RelationshipChartDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // chartsオブジェクトストアを作成
      if (!db.objectStoreNames.contains('charts')) {
        const chartStore = db.createObjectStore('charts', { keyPath: 'id' });
        // updatedAtでソートできるようにインデックスを作成
        chartStore.createIndex('by-updatedAt', 'updatedAt');
      }

      // appSettingsオブジェクトストアを作成
      if (!db.objectStoreNames.contains('appSettings')) {
        db.createObjectStore('appSettings');
      }
    },
  });

  return dbInstance;
}

/**
 * 相関図を保存する
 * @param chart - 保存する相関図データ
 */
export async function saveChart(chart: Chart): Promise<void> {
  const db = await initDB();
  await db.put('charts', chart);
}

/**
 * 相関図を取得する
 * @param chartId - 取得する相関図のID
 * @returns 相関図データ（存在しない場合はundefined）
 */
export async function getChart(chartId: string): Promise<Chart | undefined> {
  const db = await initDB();
  return db.get('charts', chartId);
}

/**
 * すべての相関図のメタデータを取得する（updatedAtの降順）
 * @returns 相関図のメタデータのリスト
 */
export async function getAllChartMetas(): Promise<ChartMeta[]> {
  const db = await initDB();
  const charts = await db.getAllFromIndex('charts', 'by-updatedAt');

  // updatedAtの降順にソート（最新のものが先頭）
  charts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // ChartからChartMetaに変換
  return charts.map((chart) => ({
    id: chart.id,
    name: chart.name,
    personCount: chart.persons.length,
    relationshipCount: chart.relationships.length,
    createdAt: chart.createdAt,
    updatedAt: chart.updatedAt,
  }));
}

/**
 * 相関図を削除する
 * @param chartId - 削除する相関図のID
 */
export async function deleteChart(chartId: string): Promise<void> {
  const db = await initDB();
  await db.delete('charts', chartId);
}

/**
 * 最後にアクティブだった相関図IDを取得する
 * @returns 相関図ID（保存されていない場合はnull）
 */
export async function getLastActiveChartId(): Promise<string | null> {
  const db = await initDB();
  const value = await db.get('appSettings', 'lastActiveChartId');
  return value ?? null;
}

/**
 * 最後にアクティブだった相関図IDを保存する
 * @param chartId - 相関図ID（nullで未選択状態を保存）
 */
export async function setLastActiveChartId(chartId: string | null): Promise<void> {
  const db = await initDB();
  await db.put('appSettings', chartId, 'lastActiveChartId');
}

/**
 * すべての相関図を削除する
 */
export async function deleteAllCharts(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('charts', 'readwrite');
  await tx.objectStore('charts').clear();
  await tx.done;
}

/**
 * データベースインスタンスをクローズする（主にテスト用）
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
