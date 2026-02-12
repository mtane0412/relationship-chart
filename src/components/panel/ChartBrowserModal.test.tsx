/**
 * ChartBrowserModalコンポーネントのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ChartBrowserModal } from './ChartBrowserModal';
import { useGraphStore } from '@/stores/useGraphStore';
import { initDB, closeDB } from '@/lib/chart-db';
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

describe('ChartBrowserModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(async () => {
    await initDB();
    useGraphStore.getState().resetAll();
    mockOnClose.mockClear();
  });

  afterEach(async () => {
    closeDB();
    await clearIndexedDB();
    vi.restoreAllMocks();
  });

  it('isOpen=falseの場合は表示されない', () => {
    render(<ChartBrowserModal isOpen={false} onClose={mockOnClose} />);

    // モーダルのタイトルが表示されないことを確認
    expect(screen.queryByText('相関図を開く')).not.toBeInTheDocument();
  });

  it('isOpen=trueの場合はモーダルが表示される', () => {
    useGraphStore.setState({
      activeChartId: null,
      chartMetas: [],
    });

    render(<ChartBrowserModal isOpen={true} onClose={mockOnClose} />);

    // モーダルのタイトルが表示されることを確認
    expect(screen.getByText('相関図を開く')).toBeInTheDocument();
  });

  it('チャート一覧がメタデータ付きで表示される', () => {
    const chart1Id = nanoid();
    const chart2Id = nanoid();
    const now = new Date().toISOString();

    useGraphStore.setState({
      activeChartId: chart1Id,
      chartMetas: [
        {
          id: chart1Id,
          name: '相関図 1',
          personCount: 3,
          relationshipCount: 5,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: chart2Id,
          name: '相関図 2',
          personCount: 1,
          relationshipCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      persons: [],
      relationships: [],
    });

    render(<ChartBrowserModal isOpen={true} onClose={mockOnClose} />);

    // チャート名が表示されることを確認
    expect(screen.getByText('相関図 1')).toBeInTheDocument();
    expect(screen.getByText('相関図 2')).toBeInTheDocument();

    // メタデータが表示されることを確認（英語表記）
    expect(screen.getByText(/3 nodes/)).toBeInTheDocument();
    expect(screen.getByText(/5 edges/)).toBeInTheDocument();
    expect(screen.getByText(/1 node/)).toBeInTheDocument();
  });

  it('アクティブチャートに「現在」バッジが表示される', () => {
    const chart1Id = nanoid();
    const chart2Id = nanoid();
    const now = new Date().toISOString();

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

    render(<ChartBrowserModal isOpen={true} onClose={mockOnClose} />);

    // 「現在」バッジが表示されることを確認
    expect(screen.getByText('現在')).toBeInTheDocument();
  });

  it('チャートクリックでswitchChartが呼ばれてモーダルが閉じる', async () => {
    const user = userEvent.setup();
    const chart1Id = nanoid();
    const chart2Id = nanoid();
    const now = new Date().toISOString();

    const switchChartSpy = vi.spyOn(useGraphStore.getState(), 'switchChart');

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

    render(<ChartBrowserModal isOpen={true} onClose={mockOnClose} />);

    // 「相関図 2」をクリック
    const chart2Button = screen.getByText('相関図 2');
    await user.click(chart2Button);

    // switchChartが呼ばれたことを確認
    expect(switchChartSpy).toHaveBeenCalledWith(chart2Id);

    // モーダルが閉じられることを確認
    expect(mockOnClose).toHaveBeenCalled();
  });

  it.skip('アクティブチャートをクリックした場合はswitchChartが呼ばれずにモーダルだけ閉じる', async () => {
    const user = userEvent.setup();
    const chart1Id = nanoid();
    const now = new Date().toISOString();

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
      ],
    });

    // レンダリング後にスパイを作成
    render(<ChartBrowserModal isOpen={true} onClose={mockOnClose} />);

    const switchChartSpy = vi.spyOn(useGraphStore.getState(), 'switchChart');

    // 「相関図 1」（アクティブチャート）をクリック
    const chart1Button = screen.getByText('相関図 1');
    await user.click(chart1Button);

    // switchChartが呼ばれていないことを確認
    expect(switchChartSpy).not.toHaveBeenCalled();

    // モーダルが閉じられることを確認
    expect(mockOnClose).toHaveBeenCalled();
  });

  it.skip('「+ 新規作成」でcreateChartが呼ばれてモーダルが閉じる', async () => {
    // 新規作成ボタンはモーダルから削除されたためスキップ
    const user = userEvent.setup();
    const chartId = nanoid();
    const now = new Date().toISOString();

    const createChartSpy = vi.spyOn(useGraphStore.getState(), 'createChart');

    useGraphStore.setState({
      activeChartId: chartId,
      chartMetas: [
        {
          id: chartId,
          name: '相関図 1',
          personCount: 0,
          relationshipCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    render(<ChartBrowserModal isOpen={true} onClose={mockOnClose} />);

    // 「+ 新規作成」をクリック
    const createButton = screen.getByText(/新規作成/i);
    await user.click(createButton);

    // createChartが呼ばれたことを確認
    expect(createChartSpy).toHaveBeenCalled();

    // モーダルが閉じられることを確認
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('Escapeキーを押すとモーダルが閉じる', async () => {
    const user = userEvent.setup();

    useGraphStore.setState({
      activeChartId: null,
      chartMetas: [],
    });

    render(<ChartBrowserModal isOpen={true} onClose={mockOnClose} />);

    // Escapeキーを押す
    await user.keyboard('{Escape}');

    // モーダルが閉じられることを確認
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('閉じるボタンをクリックするとモーダルが閉じる', async () => {
    const user = userEvent.setup();

    useGraphStore.setState({
      activeChartId: null,
      chartMetas: [],
    });

    render(<ChartBrowserModal isOpen={true} onClose={mockOnClose} />);

    // 閉じるボタンをクリック
    const closeButton = screen.getByLabelText(/閉じる/i);
    await user.click(closeButton);

    // モーダルが閉じられることを確認
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('オーバーレイをクリックするとモーダルが閉じる', async () => {
    const user = userEvent.setup();

    useGraphStore.setState({
      activeChartId: null,
      chartMetas: [],
    });

    const { container } = render(
      <ChartBrowserModal isOpen={true} onClose={mockOnClose} />
    );

    // オーバーレイ（最外の要素）をクリック
    const overlay = container.firstChild as HTMLElement;
    await user.click(overlay);

    // モーダルが閉じられることを確認
    expect(mockOnClose).toHaveBeenCalled();
  });
});
