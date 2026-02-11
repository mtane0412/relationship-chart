/**
 * ChartListコンポーネントのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ChartList } from './ChartList';
import { useGraphStore } from '@/stores/useGraphStore';
import { initDB, closeDB, saveChart } from '@/lib/chart-db';
import { nanoid } from 'nanoid';

// IndexedDBのクリーンアップ用
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

describe('ChartList', () => {
  beforeEach(async () => {
    await initDB();
    useGraphStore.getState().resetAll();
  });

  afterEach(async () => {
    closeDB();
    await clearIndexedDB();
  });

  it('チャート一覧を表示する', async () => {
    // テスト用のチャートを作成
    const chart1Id = nanoid();
    const chart2Id = nanoid();
    const now = new Date().toISOString();

    await saveChart({
      id: chart1Id,
      name: '相関図 1',
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
      createdAt: now,
      updatedAt: now,
    });

    await saveChart({
      id: chart2Id,
      name: '相関図 2',
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
      createdAt: now,
      updatedAt: now,
    });

    // ストアにチャート一覧を設定
    useGraphStore.setState({
      activeChartId: chart1Id,
      chartMetas: [
        {
          id: chart1Id,
          name: '相関図 1',
          personCount: 0,
          relationshipCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: chart2Id,
          name: '相関図 2',
          personCount: 0,
          relationshipCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    render(<ChartList />);

    // 2つのチャートが表示されることを確認
    expect(screen.getByText('相関図 1')).toBeInTheDocument();
    expect(screen.getByText('相関図 2')).toBeInTheDocument();
  });

  it('アクティブなチャートがハイライトされる', async () => {
    const chart1Id = nanoid();
    const chart2Id = nanoid();
    const now = new Date().toISOString();

    // ストアにチャート一覧を設定（chart1がアクティブ）
    useGraphStore.setState({
      activeChartId: chart1Id,
      chartMetas: [
        {
          id: chart1Id,
          name: '相関図 1',
          personCount: 0,
          relationshipCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: chart2Id,
          name: '相関図 2',
          personCount: 0,
          relationshipCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    render(<ChartList />);

    // アクティブなチャートの要素を取得（最も近い親のp-3要素を取得）
    const chart1Element = screen.getByText('相関図 1').closest('.p-3');
    const chart2Element = screen.getByText('相関図 2').closest('.p-3');

    // chart1がハイライトされていることを確認（bg-blue-50などのクラスを持つ）
    expect(chart1Element).toHaveClass('bg-blue-50');
    // chart2はハイライトされていないことを確認
    expect(chart2Element).not.toHaveClass('bg-blue-50');
  });

  it('チャートがない場合はメッセージを表示する', () => {
    // ストアをリセット（チャートなし）
    useGraphStore.setState({
      activeChartId: null,
      chartMetas: [],
    });

    render(<ChartList />);

    // メッセージが表示されることを確認
    expect(screen.getByText(/チャートがありません/i)).toBeInTheDocument();
  });

  it('チャートをクリックするとswitchChartが呼ばれる', async () => {
    const user = userEvent.setup();
    const chart1Id = nanoid();
    const chart2Id = nanoid();
    const now = new Date().toISOString();

    // switchChartをスパイ
    const switchChartSpy = vi.spyOn(useGraphStore.getState(), 'switchChart');

    // ストアにチャート一覧を設定（chart1がアクティブ）
    useGraphStore.setState({
      activeChartId: chart1Id,
      chartMetas: [
        {
          id: chart1Id,
          name: '相関図 1',
          personCount: 0,
          relationshipCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: chart2Id,
          name: '相関図 2',
          personCount: 0,
          relationshipCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    render(<ChartList />);

    // chart2をクリック
    const chart2Element = screen.getByText('相関図 2');
    await user.click(chart2Element);

    // switchChartが呼ばれたことを確認
    expect(switchChartSpy).toHaveBeenCalledWith(chart2Id);
  });
});
