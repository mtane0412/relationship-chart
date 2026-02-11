/**
 * ChartListItemコンポーネントのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ChartListItem } from './ChartListItem';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';
import type { ChartMeta } from '@/types/chart';

describe('ChartListItem', () => {
  const mockChartMeta: ChartMeta = {
    id: 'chart-1',
    name: '相関図 1',
    personCount: 5,
    relationshipCount: 3,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    useGraphStore.setState({
      activeChartId: 'chart-1',
      chartMetas: [mockChartMeta],
    });
  });

  it('チャート名と統計情報を表示する', () => {
    render(<ChartListItem meta={mockChartMeta} isActive={true} />);

    expect(screen.getByText('相関図 1')).toBeInTheDocument();
    expect(screen.getByText('5人 • 3件の関係')).toBeInTheDocument();
  });

  it('アクティブなチャートはハイライトされる', () => {
    const { container } = render(<ChartListItem meta={mockChartMeta} isActive={true} />);
    const item = container.firstChild as HTMLElement;

    expect(item).toHaveClass('bg-blue-50');
  });

  it('非アクティブなチャートはハイライトされない', () => {
    const { container } = render(<ChartListItem meta={mockChartMeta} isActive={false} />);
    const item = container.firstChild as HTMLElement;

    expect(item).not.toHaveClass('bg-blue-50');
    expect(item).toHaveClass('bg-white');
  });

  it('チャートをクリックするとonClickが呼ばれる', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<ChartListItem meta={mockChartMeta} isActive={false} onClick={handleClick} />);

    const chartName = screen.getByText('相関図 1');
    await user.click(chartName);

    expect(handleClick).toHaveBeenCalledWith('chart-1');
  });

  it('削除ボタンをクリックすると確認ダイアログが表示される', async () => {
    const user = userEvent.setup();
    const openConfirmSpy = vi.spyOn(useDialogStore.getState(), 'openConfirm');
    openConfirmSpy.mockResolvedValue(false); // キャンセル

    render(<ChartListItem meta={mockChartMeta} isActive={true} />);

    // 削除ボタンを探す（aria-labelで）
    const deleteButton = screen.getByLabelText('相関図を削除');
    await user.click(deleteButton);

    // 確認ダイアログが呼ばれたことを確認
    expect(openConfirmSpy).toHaveBeenCalledWith({
      title: 'チャートを削除',
      message: expect.stringContaining('相関図 1'),
      confirmLabel: '削除',
      isDanger: true,
    });
  });

  it('削除確認後にdeleteChartが呼ばれる', async () => {
    const user = userEvent.setup();
    const openConfirmSpy = vi.spyOn(useDialogStore.getState(), 'openConfirm');
    openConfirmSpy.mockResolvedValue(true); // 確認

    const deleteChartSpy = vi.spyOn(useGraphStore.getState(), 'deleteChart');

    render(<ChartListItem meta={mockChartMeta} isActive={true} />);

    const deleteButton = screen.getByLabelText('相関図を削除');
    await user.click(deleteButton);

    // deleteChartが呼ばれたことを確認
    expect(deleteChartSpy).toHaveBeenCalledWith('chart-1');
  });

  it('削除ボタンのクリックはチャート切り替えをトリガーしない', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const openConfirmSpy = vi.spyOn(useDialogStore.getState(), 'openConfirm');
    openConfirmSpy.mockResolvedValue(false);

    render(<ChartListItem meta={mockChartMeta} isActive={false} onClick={handleClick} />);

    const deleteButton = screen.getByLabelText('相関図を削除');
    await user.click(deleteButton);

    // onClickが呼ばれないことを確認
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('チャート名をダブルクリックすると編集モードになる', async () => {
    const user = userEvent.setup();

    render(<ChartListItem meta={mockChartMeta} isActive={true} />);

    const chartName = screen.getByText('相関図 1');
    await user.dblClick(chartName);

    // 入力フィールドが表示されることを確認
    const input = screen.getByDisplayValue('相関図 1');
    expect(input).toBeInTheDocument();
  });

  it('編集モードで名前を変更してEnterキーを押すとrenameChartが呼ばれる', async () => {
    const user = userEvent.setup();
    const renameChartSpy = vi.spyOn(useGraphStore.getState(), 'renameChart');

    render(<ChartListItem meta={mockChartMeta} isActive={true} />);

    // 編集モードに切り替え
    const chartName = screen.getByText('相関図 1');
    await user.dblClick(chartName);

    // 名前を変更
    const input = screen.getByDisplayValue('相関図 1');
    await user.clear(input);
    await user.type(input, '新しい名前');
    await user.keyboard('{Enter}');

    // renameChartが呼ばれたことを確認
    expect(renameChartSpy).toHaveBeenCalledWith('chart-1', '新しい名前');
  });

  it('編集モードでBlurすると編集が確定される', async () => {
    const user = userEvent.setup();
    const renameChartSpy = vi.spyOn(useGraphStore.getState(), 'renameChart');

    render(<ChartListItem meta={mockChartMeta} isActive={true} />);

    // 編集モードに切り替え
    const chartName = screen.getByText('相関図 1');
    await user.dblClick(chartName);

    // 名前を変更
    const input = screen.getByDisplayValue('相関図 1');
    await user.clear(input);
    await user.type(input, '変更後');

    // フォーカスを外す
    await user.tab();

    // renameChartが呼ばれたことを確認
    expect(renameChartSpy).toHaveBeenCalledWith('chart-1', '変更後');
  });

  it('編集モードで空の名前は保存されない', async () => {
    const user = userEvent.setup();
    const renameChartSpy = vi.spyOn(useGraphStore.getState(), 'renameChart');
    renameChartSpy.mockClear(); // 前のテストのスパイをクリア

    render(<ChartListItem meta={mockChartMeta} isActive={true} />);

    // 編集モードに切り替え
    const chartName = screen.getByText('相関図 1');
    await user.dblClick(chartName);

    // 名前を空にしてEnterキーを押す
    const input = screen.getByDisplayValue('相関図 1');
    await user.clear(input);
    await user.keyboard('{Enter}');

    // renameChartが呼ばれないことを確認
    expect(renameChartSpy).not.toHaveBeenCalled();
  });

  it('編集モードでEscキーを押すと編集がキャンセルされる', async () => {
    const user = userEvent.setup();
    const renameChartSpy = vi.spyOn(useGraphStore.getState(), 'renameChart');
    renameChartSpy.mockClear(); // 前のテストのスパイをクリア

    render(<ChartListItem meta={mockChartMeta} isActive={true} />);

    // 編集モードに切り替え
    const chartName = screen.getByText('相関図 1');
    await user.dblClick(chartName);

    // 名前を変更してEscキーを押す
    const input = screen.getByDisplayValue('相関図 1');
    await user.clear(input);
    await user.type(input, '変更後');
    await user.keyboard('{Escape}');

    // renameChartが呼ばれないことを確認
    expect(renameChartSpy).not.toHaveBeenCalled();

    // 元の名前が表示されることを確認
    expect(screen.getByText('相関図 1')).toBeInTheDocument();
  });
});
