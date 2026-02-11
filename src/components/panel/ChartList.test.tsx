/**
 * ChartListコンポーネントのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ChartList } from './ChartList';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';
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

describe('ChartList', () => {
  beforeEach(async () => {
    await initDB();
    useGraphStore.getState().resetAll();
  });

  afterEach(async () => {
    closeDB();
    await clearIndexedDB();
  });

  it('ドロップダウンにチャート一覧を表示する', async () => {
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

    render(<ChartList />);

    // selectタグが存在することを確認
    const select = screen.getByRole('combobox', { name: /相関図を選択/i });
    expect(select).toBeInTheDocument();

    // 2つのoptionが存在することを確認
    expect(screen.getByRole('option', { name: '相関図 1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '相関図 2' })).toBeInTheDocument();
  });

  it('アクティブなチャートが選択されている', () => {
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

    render(<ChartList />);

    // selectタグのvalueがchart1Idであることを確認
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe(chart1Id);
  });

  it('チャートがない場合はメッセージを表示する', () => {
    useGraphStore.setState({
      activeChartId: null,
      chartMetas: [],
    });

    render(<ChartList />);

    expect(screen.getByText(/チャートがありません/i)).toBeInTheDocument();
  });

  it('ドロップダウンでチャートを選択するとswitchChartが呼ばれる', async () => {
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

    render(<ChartList />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, chart2Id);

    expect(switchChartSpy).toHaveBeenCalledWith(chart2Id);
  });

  it('歯車アイコンをクリックするとメニューが表示される', async () => {
    const user = userEvent.setup();
    const chartId = nanoid();
    const now = new Date().toISOString();

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

    render(<ChartList />);

    const settingsButton = screen.getByLabelText(/設定/i);
    await user.click(settingsButton);

    // メニューが表示されることを確認
    expect(screen.getByText('名前を変更')).toBeInTheDocument();
    expect(screen.getByText('削除')).toBeInTheDocument();
  });

  it('メニューから名前変更を選択すると編集モードになる', async () => {
    const user = userEvent.setup();
    const chartId = nanoid();
    const now = new Date().toISOString();

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

    render(<ChartList />);

    // 歯車アイコンをクリック
    const settingsButton = screen.getByLabelText(/設定/i);
    await user.click(settingsButton);

    // 「名前を変更」をクリック
    const renameButton = screen.getByText('名前を変更');
    await user.click(renameButton);

    // 入力フィールドが表示されることを確認
    const input = screen.getByDisplayValue('相関図 1');
    expect(input).toBeInTheDocument();
  });

  it('メニューから削除を選択すると確認ダイアログが表示される', async () => {
    const user = userEvent.setup();
    const chartId = nanoid();
    const now = new Date().toISOString();

    const openConfirmSpy = vi.spyOn(useDialogStore.getState(), 'openConfirm');
    openConfirmSpy.mockResolvedValue(false);

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

    render(<ChartList />);

    // 歯車アイコンをクリック
    const settingsButton = screen.getByLabelText(/設定/i);
    await user.click(settingsButton);

    // 「削除」をクリック
    const deleteButton = screen.getByText('削除');
    await user.click(deleteButton);

    // 確認ダイアログが呼ばれたことを確認
    expect(openConfirmSpy).toHaveBeenCalledWith({
      title: 'チャートを削除',
      message: expect.stringContaining('相関図 1'),
      confirmLabel: '削除',
      isDanger: true,
    });
  });

  it('ドロップダウンに「+ 新規作成」オプションが表示される', () => {
    const chartId = nanoid();
    const now = new Date().toISOString();

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

    render(<ChartList />);

    // 「+ 新規作成」オプションが存在することを確認
    expect(screen.getByRole('option', { name: '+ 新規作成' })).toBeInTheDocument();
  });

  it('「+ 新規作成」を選択するとcreateChartが呼ばれる', async () => {
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

    render(<ChartList />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '__create_new__');

    expect(createChartSpy).toHaveBeenCalled();
  });
});
