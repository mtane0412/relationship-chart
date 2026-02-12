/**
 * ActiveChartHeaderコンポーネントのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ActiveChartHeader } from './ActiveChartHeader';
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

describe('ActiveChartHeader', () => {
  beforeEach(async () => {
    await initDB();
    useGraphStore.getState().resetAll();
  });

  afterEach(async () => {
    closeDB();
    await clearIndexedDB();
    vi.restoreAllMocks();
  });

  it('チャート名とメタデータ（N人・N件の関係）を表示する', () => {
    const chartId = nanoid();
    const now = new Date().toISOString();

    useGraphStore.setState({
      activeChartId: chartId,
      chartMetas: [
        {
          id: chartId,
          name: '相関図 1',
          personCount: 3,
          relationshipCount: 5,
          createdAt: now,
          updatedAt: now,
        },
      ],
      persons: [],
      relationships: [],
    });

    render(<ActiveChartHeader />);

    // チャート名が表示されることを確認
    expect(screen.getByText('相関図 1')).toBeInTheDocument();

    // メタデータが表示されることを確認（英語表記）
    expect(screen.getByText('3 nodes, 5 edges')).toBeInTheDocument();
  });

  it('名前クリックで編集モードに切り替わる', async () => {
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

    render(<ActiveChartHeader />);

    // チャート名をクリック
    const chartName = screen.getByText('相関図 1');
    await user.click(chartName);

    // 入力フィールドが表示されることを確認
    const input = screen.getByDisplayValue('相関図 1');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('編集モードでEnterキーを押すと名前が保存される', async () => {
    const user = userEvent.setup();
    const chartId = nanoid();
    const now = new Date().toISOString();

    const renameChartSpy = vi.spyOn(useGraphStore.getState(), 'renameChart');

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

    render(<ActiveChartHeader />);

    // チャート名をクリックして編集モードへ
    const chartName = screen.getByText('相関図 1');
    await user.click(chartName);

    // 入力フィールドで名前を変更
    const input = screen.getByDisplayValue('相関図 1') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '変更後の名前');

    // Enterキーを押す
    await user.keyboard('{Enter}');

    // renameChartが呼ばれたことを確認
    expect(renameChartSpy).toHaveBeenCalledWith(chartId, '変更後の名前');
  });

  it('編集モードでEscapeキーを押すと編集がキャンセルされる', async () => {
    const user = userEvent.setup();
    const chartId = nanoid();
    const now = new Date().toISOString();

    const renameChartSpy = vi.spyOn(useGraphStore.getState(), 'renameChart');

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

    render(<ActiveChartHeader />);

    // チャート名をクリックして編集モードへ
    const chartName = screen.getByText('相関図 1');
    await user.click(chartName);

    // 入力フィールドで名前を変更
    const input = screen.getByDisplayValue('相関図 1') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '変更後の名前');

    // spyをリセット
    renameChartSpy.mockClear();

    // Escapeキーを押す
    await user.keyboard('{Escape}');

    // renameChartが呼ばれていないことを確認
    expect(renameChartSpy).not.toHaveBeenCalled();

    // 編集モードが終了したことを確認
    await waitFor(() => {
      expect(screen.queryByDisplayValue('変更後の名前')).not.toBeInTheDocument();
    });

    // 元の名前が表示されることを確認
    expect(screen.getByText('相関図 1')).toBeInTheDocument();
  });

  it('編集モードでblurすると名前が保存される', async () => {
    const user = userEvent.setup();
    const chartId = nanoid();
    const now = new Date().toISOString();

    const renameChartSpy = vi.spyOn(useGraphStore.getState(), 'renameChart');

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

    render(<ActiveChartHeader />);

    // チャート名をクリックして編集モードへ
    const chartName = screen.getByText('相関図 1');
    await user.click(chartName);

    // 入力フィールドで名前を変更
    const input = screen.getByDisplayValue('相関図 1') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '変更後の名前');

    // フォーカスを外す
    await user.tab();

    // renameChartが呼ばれたことを確認
    expect(renameChartSpy).toHaveBeenCalledWith(chartId, '変更後の名前');
  });

  it('isSavingRefによる二重実行を防止する', async () => {
    const user = userEvent.setup();
    const chartId = nanoid();
    const now = new Date().toISOString();

    const renameChartSpy = vi.spyOn(useGraphStore.getState(), 'renameChart');

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

    render(<ActiveChartHeader />);

    // チャート名をクリックして編集モードへ
    const chartName = screen.getByText('相関図 1');
    await user.click(chartName);

    // 入力フィールドで名前を変更
    const input = screen.getByDisplayValue('相関図 1') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '変更後の名前');

    // spyをリセット
    renameChartSpy.mockClear();

    // Escapeキーを押す
    await user.keyboard('{Escape}');

    // 入力フィールドがDOMから削除されることを待つ
    await waitFor(() => {
      expect(screen.queryByDisplayValue('変更後の名前')).not.toBeInTheDocument();
    });

    // renameChartが呼ばれていないことを確認（blur実行防止）
    expect(renameChartSpy).not.toHaveBeenCalled();
  });

  it('チャート名クリックでChartBrowserModalが表示される', async () => {
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

    render(<ActiveChartHeader />);

    // チャート名の隣のFolderOpenアイコンをクリック
    const openButton = screen.getByLabelText(/相関図を開く/i);
    await user.click(openButton);

    // モーダルが表示されることを確認
    expect(screen.getByText('相関図を開く')).toBeInTheDocument();
  });

  it('チャートがない場合はメッセージを表示する', () => {
    useGraphStore.setState({
      activeChartId: null,
      chartMetas: [],
    });

    render(<ActiveChartHeader />);

    expect(screen.getByText(/チャートがありません/i)).toBeInTheDocument();
  });
});
