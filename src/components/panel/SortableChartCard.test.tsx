/**
 * SortableChartCardコンポーネントのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SortableChartCard } from './SortableChartCard';
import { DndContext } from '@dnd-kit/core';
import { nanoid } from 'nanoid';
import type { ChartMeta } from '@/types/chart';

describe('SortableChartCard', () => {
  const mockOnSwitch = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnRename = vi.fn();

  const createMockChart = (overrides: Partial<ChartMeta> = {}): ChartMeta => ({
    id: nanoid(),
    name: '相関図 1',
    personCount: 3,
    relationshipCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    mockOnSwitch.mockClear();
    mockOnDelete.mockClear();
    mockOnRename.mockClear();
  });

  it('チャート名とメタデータが表示される', () => {
    const chart = createMockChart({
      name: 'テスト相関図',
      personCount: 10,
      relationshipCount: 15,
    });

    render(
      <DndContext>
        <SortableChartCard
          chart={chart}
          isActive={false}
          onSwitch={mockOnSwitch}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      </DndContext>
    );

    // チャート名が表示されることを確認
    expect(screen.getByText('テスト相関図')).toBeInTheDocument();

    // メタデータが表示されることを確認
    expect(screen.getByText(/10 nodes/)).toBeInTheDocument();
    expect(screen.getByText(/15 edges/)).toBeInTheDocument();
  });

  it('isActive=trueの場合は「Active」バッジが表示される', () => {
    const chart = createMockChart();

    render(
      <DndContext>
        <SortableChartCard
          chart={chart}
          isActive={true}
          onSwitch={mockOnSwitch}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      </DndContext>
    );

    // 「Active」バッジが表示されることを確認
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('カードクリックでonSwitchが呼ばれる', async () => {
    const user = userEvent.setup();
    const chart = createMockChart({ id: 'test-chart-id' });

    render(
      <DndContext>
        <SortableChartCard
          chart={chart}
          isActive={false}
          onSwitch={mockOnSwitch}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      </DndContext>
    );

    // カード本体をクリック（名前以外の部分）
    const card = screen.getByText(/nodes/).closest('div');
    if (card) {
      await user.click(card);
    }

    // onSwitchが呼ばれたことを確認
    expect(mockOnSwitch).toHaveBeenCalledWith('test-chart-id');
  });

  it('削除ボタンクリックでonDeleteが呼ばれる', async () => {
    const user = userEvent.setup();
    const chart = createMockChart({ id: 'test-chart-id' });

    render(
      <DndContext>
        <SortableChartCard
          chart={chart}
          isActive={false}
          onSwitch={mockOnSwitch}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      </DndContext>
    );

    // 削除ボタンをクリック
    const deleteButton = screen.getByLabelText(/削除/i);
    await user.click(deleteButton);

    // onDeleteが呼ばれたことを確認
    expect(mockOnDelete).toHaveBeenCalledWith('test-chart-id');
  });

  it('削除ボタンクリック時にonSwitchは呼ばれない', async () => {
    const user = userEvent.setup();
    const chart = createMockChart({ id: 'test-chart-id' });

    render(
      <DndContext>
        <SortableChartCard
          chart={chart}
          isActive={false}
          onSwitch={mockOnSwitch}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      </DndContext>
    );

    // 削除ボタンをクリック
    const deleteButton = screen.getByLabelText(/削除/i);
    await user.click(deleteButton);

    // onSwitchは呼ばれていないことを確認（削除ボタンのクリックはカードのクリックイベントを伝播させない）
    expect(mockOnSwitch).not.toHaveBeenCalled();
  });

  it('GripVerticalハンドルが表示される', () => {
    const chart = createMockChart();

    render(
      <DndContext>
        <SortableChartCard
          chart={chart}
          isActive={false}
          onSwitch={mockOnSwitch}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      </DndContext>
    );

    // ドラッグハンドルのaria-labelを確認
    const dragHandle = screen.getByLabelText(/並び替え/i);
    expect(dragHandle).toBeInTheDocument();
  });

  it('名前をクリックすると編集モードになる', async () => {
    const user = userEvent.setup();
    const chart = createMockChart({ name: '編集テスト' });

    render(
      <DndContext>
        <SortableChartCard
          chart={chart}
          isActive={false}
          onSwitch={mockOnSwitch}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      </DndContext>
    );

    // 名前をクリック
    const nameButton = screen.getByText('編集テスト');
    await user.click(nameButton);

    // 入力フィールドが表示されることを確認
    const input = screen.getByDisplayValue('編集テスト');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('名前を編集してEnterキーで保存される', async () => {
    const user = userEvent.setup();
    const chart = createMockChart({ id: 'test-id', name: '元の名前' });

    render(
      <DndContext>
        <SortableChartCard
          chart={chart}
          isActive={false}
          onSwitch={mockOnSwitch}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      </DndContext>
    );

    // 名前をクリックして編集モードへ
    const nameButton = screen.getByText('元の名前');
    await user.click(nameButton);

    // 入力フィールドで名前を変更
    const input = screen.getByDisplayValue('元の名前') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '新しい名前');

    // Enterキーを押す
    await user.keyboard('{Enter}');

    // onRenameが呼ばれたことを確認
    expect(mockOnRename).toHaveBeenCalledWith('test-id', '新しい名前');
  });

  it('名前編集中にEscapeキーでキャンセルされる', async () => {
    const user = userEvent.setup();
    const chart = createMockChart({ name: '元の名前' });

    render(
      <DndContext>
        <SortableChartCard
          chart={chart}
          isActive={false}
          onSwitch={mockOnSwitch}
          onDelete={mockOnDelete}
          onRename={mockOnRename}
        />
      </DndContext>
    );

    // 名前をクリックして編集モードへ
    const nameButton = screen.getByText('元の名前');
    await user.click(nameButton);

    // 入力フィールドで名前を変更
    const input = screen.getByDisplayValue('元の名前') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '変更後の名前');

    // Escapeキーを押す
    await user.keyboard('{Escape}');

    // onRenameは呼ばれていないことを確認
    expect(mockOnRename).not.toHaveBeenCalled();

    // 元の名前が表示されることを確認
    expect(screen.getByText('元の名前')).toBeInTheDocument();
  });
});
