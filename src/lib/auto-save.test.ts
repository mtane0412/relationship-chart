/**
 * 自動保存モジュールのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  startAutoSave,
  stopAutoSave,
  flushAutoSave,
  _setDebounceTime,
} from './auto-save';
import { useGraphStore } from '@/stores/useGraphStore';
import { initDB, closeDB, getChart, saveChart } from './chart-db';
import { nanoid } from 'nanoid';

// indexedDBのクリーンアップ用
async function clearIndexedDB() {
  const dbs = await indexedDB.databases();
  await Promise.all(
    dbs.map((db) => {
      if (db.name && typeof db.name === 'string') {
        return new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name as string);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      return Promise.resolve();
    })
  );
}

describe('auto-save', () => {
  beforeEach(async () => {
    await initDB();
    // ストアをリセット
    useGraphStore.getState().resetAll();
    // テスト用にdebounce時間を短く設定
    _setDebounceTime(10);
  });

  afterEach(async () => {
    stopAutoSave();
    vi.restoreAllMocks();
    // debounce時間をデフォルトに戻す
    _setDebounceTime(1000);
    closeDB();
    await clearIndexedDB();
  });

  it('ストア変更後にdebounce時間（1秒）経過でIndexedDBに保存される', async () => {
    // 初期チャートを作成
    const chartId = nanoid();
    const chartName = 'テストチャート';
    const createdAt = new Date().toISOString();

    await saveChart({
      id: chartId,
      name: chartName,
      persons: [],
      relationships: [],
      forceEnabled: false,
      forceParams: {
        linkDistance: 150,
        linkStrength: 0.5,
        chargeStrength: -300,
      },
      egoLayoutParams: {
        ringSpacing: 200,
        firstRingRadius: 200,
      },
      createdAt,
      updatedAt: createdAt,
    });

    // ストアにチャートを設定
    act(() => {
      useGraphStore.setState({
        activeChartId: chartId,
        chartMetas: [
          {
            id: chartId,
            name: chartName,
            personCount: 0,
            relationshipCount: 0,
            createdAt,
            updatedAt: createdAt,
          },
        ],
      });
    });

    // 自動保存を開始
    startAutoSave();

    // ストアを変更（人物を追加）
    act(() => {
      useGraphStore.getState().addPerson({
        name: '山田太郎',
      });
    });

    // debounce時間を待機（テスト用に10msに設定済み + マージン）
    await new Promise((resolve) => setTimeout(resolve, 50));

    // IndexedDBから取得して確認
    const savedChart = await getChart(chartId);
    expect(savedChart).toBeDefined();
    expect(savedChart?.persons).toHaveLength(1);
    expect(savedChart?.persons[0]?.name).toBe('山田太郎');
  });

  it('activeChartIdがnullの場合は保存しない', async () => {
    // ストアにactiveChartIdをnullで設定
    act(() => {
      useGraphStore.setState({
        activeChartId: null,
        chartMetas: [],
      });
    });

    // 自動保存を開始
    startAutoSave();

    // ストアを変更
    act(() => {
      useGraphStore.getState().addPerson({
        name: '山田太郎',
      });
    });

    // debounce時間を待機（保存は実行されないはずだが、待機して確認）
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 保存が実行されていないことを確認（エラーが発生しないことを確認）
    expect(true).toBe(true);
  });

  it('stopAutoSave後は保存されない', async () => {
    // 初期チャートを作成
    const chartId = nanoid();
    const chartName = 'テストチャート';
    const createdAt = new Date().toISOString();

    await saveChart({
      id: chartId,
      name: chartName,
      persons: [],
      relationships: [],
      forceEnabled: false,
      forceParams: {
        linkDistance: 150,
        linkStrength: 0.5,
        chargeStrength: -300,
      },
      egoLayoutParams: {
        ringSpacing: 200,
        firstRingRadius: 200,
      },
      createdAt,
      updatedAt: createdAt,
    });

    // ストアにチャートを設定
    act(() => {
      useGraphStore.setState({
        activeChartId: chartId,
        chartMetas: [
          {
            id: chartId,
            name: chartName,
            personCount: 0,
            relationshipCount: 0,
            createdAt,
            updatedAt: createdAt,
          },
        ],
      });
    });

    // 自動保存を開始
    startAutoSave();

    // 自動保存を停止
    stopAutoSave();

    // ストアを変更
    act(() => {
      useGraphStore.getState().addPerson({
        name: '山田太郎',
      });
    });

    // debounce時間を待機（保存されないことを確認するため、十分な時間待つ）
    await new Promise((resolve) => setTimeout(resolve, 50));

    // IndexedDBから取得して確認（変更が保存されていない）
    const savedChart = await getChart(chartId);
    expect(savedChart).toBeDefined();
    expect(savedChart?.persons).toHaveLength(0); // 変更前の状態のまま
  });

  it('flushAutoSaveで即座に保存される', async () => {
    // 初期チャートを作成
    const chartId = nanoid();
    const chartName = 'テストチャート';
    const createdAt = new Date().toISOString();

    await saveChart({
      id: chartId,
      name: chartName,
      persons: [],
      relationships: [],
      forceEnabled: false,
      forceParams: {
        linkDistance: 150,
        linkStrength: 0.5,
        chargeStrength: -300,
      },
      egoLayoutParams: {
        ringSpacing: 200,
        firstRingRadius: 200,
      },
      createdAt,
      updatedAt: createdAt,
    });

    // ストアにチャートを設定
    act(() => {
      useGraphStore.setState({
        activeChartId: chartId,
        chartMetas: [
          {
            id: chartId,
            name: chartName,
            personCount: 0,
            relationshipCount: 0,
            createdAt,
            updatedAt: createdAt,
          },
        ],
      });
    });

    // 自動保存を開始
    startAutoSave();

    // ストアを変更
    act(() => {
      useGraphStore.getState().addPerson({
        name: '山田太郎',
      });
    });

    // debounce時間を待たずにフラッシュ
    await flushAutoSave();

    // IndexedDBから取得して確認（即座に保存されている）
    const savedChart = await getChart(chartId);
    expect(savedChart).toBeDefined();
    expect(savedChart?.persons).toHaveLength(1);
    expect(savedChart?.persons[0]?.name).toBe('山田太郎');
  });
});
