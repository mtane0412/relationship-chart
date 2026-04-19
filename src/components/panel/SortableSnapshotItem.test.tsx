/**
 * SortableSnapshotItemコンポーネントのテスト
 *
 * ドラッグ可能なスナップショット項目の表示・操作を検証する。
 * DndContextでラップしてuseSortableフックを動作させる。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { SortableSnapshotItem } from './SortableSnapshotItem';
import type { Snapshot } from '@/types/snapshot';

/** テスト用スナップショットを生成する */
const createMockSnapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
  id: 'snapshot-id-1',
  label: '第1話',
  persons: [],
  relationships: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('SortableSnapshotItem', () => {
  const mockOnGoToSnapshot = vi.fn();
  const mockOnSetTimelineMode = vi.fn();
  const mockOnGoToLive = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnGoToSnapshot.mockClear();
    mockOnSetTimelineMode.mockClear();
    mockOnGoToLive.mockClear();
    mockOnDelete.mockClear();
  });

  /** デフォルトのpropsでコンポーネントを描画するヘルパー */
  const renderComponent = (overrides: {
    snapshot?: Partial<Snapshot>;
    index?: number;
    isActive?: boolean;
    timelineMode?: boolean;
  } = {}) => {
    const snapshot = createMockSnapshot(overrides.snapshot);
    return render(
      <DndContext>
        <SortableSnapshotItem
          snapshot={snapshot}
          index={overrides.index ?? 0}
          isActive={overrides.isActive ?? false}
          timelineMode={overrides.timelineMode ?? false}
          onGoToSnapshot={mockOnGoToSnapshot}
          onSetTimelineMode={mockOnSetTimelineMode}
          onGoToLive={mockOnGoToLive}
          onDelete={mockOnDelete}
        />
      </DndContext>
    );
  };

  it('スナップショットのラベルが表示される', () => {
    renderComponent({ snapshot: { label: '第1話' } });

    expect(screen.getByText('第1話')).toBeInTheDocument();
  });

  it('スナップショット番号が表示される', () => {
    // index=2（3番目）の場合は「3.」と表示される
    renderComponent({ index: 2 });

    expect(screen.getByText('3.')).toBeInTheDocument();
  });

  it('タイムラインモード外でドラッグハンドルが表示される', () => {
    renderComponent({ timelineMode: false });

    expect(screen.getByRole('button', { name: '並び替え' })).toBeInTheDocument();
  });

  it('タイムラインモード中はドラッグハンドルが非表示になる', () => {
    renderComponent({ timelineMode: true });

    expect(screen.queryByRole('button', { name: '並び替え' })).not.toBeInTheDocument();
  });

  it('タイムラインモード外で削除ボタンが表示される', () => {
    renderComponent({ snapshot: { label: '第1話' }, timelineMode: false });

    expect(screen.getByRole('button', { name: '第1話を削除' })).toBeInTheDocument();
  });

  it('タイムラインモード中は削除ボタンが非表示になる', () => {
    renderComponent({ snapshot: { label: '第1話' }, timelineMode: true });

    expect(screen.queryByRole('button', { name: '第1話を削除' })).not.toBeInTheDocument();
  });

  it('ラベルをクリックするとタイムラインモードが開始されてスナップショットにジャンプする', async () => {
    const user = userEvent.setup();
    renderComponent({ index: 1, timelineMode: false });

    await user.click(screen.getByText('第1話'));

    // タイムラインモードを開始してからスナップショットにジャンプすること
    expect(mockOnSetTimelineMode).toHaveBeenCalledWith(true);
    expect(mockOnGoToSnapshot).toHaveBeenCalledWith(1);
  });

  it('タイムラインモード中にラベルをクリックするとスナップショットにジャンプする（モード変更なし）', async () => {
    const user = userEvent.setup();
    renderComponent({ index: 0, timelineMode: true });

    await user.click(screen.getByText('第1話'));

    // 既にタイムラインモード中なのでsetTimelineModeは呼ばれない
    expect(mockOnSetTimelineMode).not.toHaveBeenCalled();
    expect(mockOnGoToSnapshot).toHaveBeenCalledWith(0);
  });

  it('アクティブなスナップショットに「ライブへ」ボタンが表示される', () => {
    renderComponent({ isActive: true, timelineMode: true });

    expect(screen.getByText('ライブへ')).toBeInTheDocument();
  });

  it('「ライブへ」ボタンをクリックするとgoToLiveが呼ばれる', async () => {
    const user = userEvent.setup();
    renderComponent({ isActive: true, timelineMode: true });

    await user.click(screen.getByText('ライブへ'));

    expect(mockOnGoToLive).toHaveBeenCalledOnce();
  });

  it('削除ボタンをクリックするとonDeleteがスナップショットIDで呼ばれる', async () => {
    const user = userEvent.setup();
    renderComponent({
      snapshot: { id: 'test-snapshot-id', label: '第1話' },
      timelineMode: false,
    });

    await user.click(screen.getByRole('button', { name: '第1話を削除' }));

    expect(mockOnDelete).toHaveBeenCalledWith('test-snapshot-id');
  });
});
