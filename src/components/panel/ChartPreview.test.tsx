/**
 * ChartPreviewコンポーネントのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChartPreview } from './ChartPreview';
import { useGraphStore } from '@/stores/useGraphStore';
import * as chartDB from '@/lib/chart-db';
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

describe('ChartPreview', () => {
  beforeEach(async () => {
    await chartDB.initDB();
    useGraphStore.getState().resetAll();
  });

  afterEach(async () => {
    chartDB.closeDB();
    await clearIndexedDB();
    vi.restoreAllMocks();
  });

  it('isActive=trueの場合はストアから人物データを取得してアバターを表示する', () => {
    const chartId = nanoid();
    const now = new Date().toISOString();

    // ストアに人物データを設定
    useGraphStore.setState({
      activeChartId: chartId,
      persons: [
        {
          id: nanoid(),
          name: '山田太郎',
          imageDataUrl: 'data:image/webp;base64,TEST_IMAGE_1',
          createdAt: now,
        },
        {
          id: nanoid(),
          name: '佐藤花子',
          imageDataUrl: 'data:image/webp;base64,TEST_IMAGE_2',
          createdAt: now,
        },
      ],
    });

    render(<ChartPreview chartId={chartId} isActive={true} />);

    // 画像が2つ表示されることを確認
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('alt', '山田太郎');
    expect(images[1]).toHaveAttribute('alt', '佐藤花子');
  });

  it('画像なしの人物にイニシャルが表示される', () => {
    const chartId = nanoid();
    const now = new Date().toISOString();

    // ストアに画像なしの人物データを設定
    useGraphStore.setState({
      activeChartId: chartId,
      persons: [
        {
          id: nanoid(),
          name: '山田太郎',
          createdAt: now,
        },
        {
          id: nanoid(),
          name: '佐藤花子',
          createdAt: now,
        },
      ],
    });

    render(<ChartPreview chartId={chartId} isActive={true} />);

    // イニシャルが表示されることを確認
    expect(screen.getByText('山')).toBeInTheDocument();
    expect(screen.getByText('佐')).toBeInTheDocument();
  });

  it('0人の場合は何も表示しない', () => {
    const chartId = nanoid();

    // ストアに空の人物データを設定
    useGraphStore.setState({
      activeChartId: chartId,
      persons: [],
    });

    const { container } = render(
      <ChartPreview chartId={chartId} isActive={true} />
    );

    // 何もレンダリングされないことを確認
    expect(container.firstChild).toBeNull();
  });

  it('表示上限を超える場合は「+N」で超過分を表示する', () => {
    const chartId = nanoid();
    const now = new Date().toISOString();

    // 6人の人物データを設定（表示上限を5人と仮定）
    useGraphStore.setState({
      activeChartId: chartId,
      persons: Array.from({ length: 6 }, (_, i) => ({
        id: nanoid(),
        name: `人物${i + 1}`,
        createdAt: now,
      })),
    });

    render(<ChartPreview chartId={chartId} isActive={true} />);

    // 「+1」が表示されることを確認（5人表示 + 1人超過）
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('isActive=falseの場合はIndexedDBから人物データを取得する', async () => {
    const chartId = nanoid();
    const now = new Date().toISOString();

    // getChartをモック
    const getChartMock = vi.spyOn(chartDB, 'getChart');
    getChartMock.mockResolvedValue({
      id: chartId,
      name: 'テストチャート',
      persons: [
        {
          id: nanoid(),
          name: '田中一郎',
          imageDataUrl: 'data:image/webp;base64,TEST_IMAGE',
          createdAt: now,
        },
      ],
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

    render(<ChartPreview chartId={chartId} isActive={false} />);

    // IndexedDBからデータ取得を待つ
    await waitFor(() => {
      expect(getChartMock).toHaveBeenCalledWith(chartId);
    });

    // 画像が表示されることを確認
    await waitFor(() => {
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', '田中一郎');
    });
  });

  it('ローディング中の表示を確認する', () => {
    const chartId = nanoid();

    // getChartを遅延させる
    const getChartMock = vi.spyOn(chartDB, 'getChart');
    getChartMock.mockImplementation(
      () =>
        new Promise(() => {
          // 永遠に解決しない（ローディング状態を保つ）
        })
    );

    render(<ChartPreview chartId={chartId} isActive={false} />);

    // ローディングスピナーまたはスケルトンが表示されることを確認
    // （実装後に具体的なテキストやaria-labelを追加）
    expect(screen.getByTestId('chart-preview-loading')).toBeInTheDocument();
  });

  it('IndexedDBからデータ取得に失敗した場合はエラーメッセージを表示する', async () => {
    const chartId = nanoid();

    // getChartがエラーを返すようモック
    const getChartMock = vi.spyOn(chartDB, 'getChart');
    getChartMock.mockRejectedValue(new Error('Database error'));

    render(<ChartPreview chartId={chartId} isActive={false} />);

    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('読み込みに失敗しました')).toBeInTheDocument();
    });
  });

  it('IndexedDBから取得したデータがundefinedの場合は何も表示しない', async () => {
    const chartId = nanoid();

    // getChartがundefinedを返すようモック
    const getChartMock = vi.spyOn(chartDB, 'getChart');
    getChartMock.mockResolvedValue(undefined);

    const { container } = render(
      <ChartPreview chartId={chartId} isActive={false} />
    );

    // 何もレンダリングされないことを確認
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
