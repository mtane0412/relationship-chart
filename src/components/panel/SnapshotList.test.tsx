/**
 * SnapshotListコンポーネントのテスト
 * スナップショット一覧・削除・タイムラインモード開始のUIを検証する
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnapshotList, computeReorderedSnapshotIds } from './SnapshotList';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Snapshot } from '@/types/snapshot';

// Zustandストアをモック
vi.mock('@/stores/useGraphStore');
const mockUseGraphStore = vi.mocked(useGraphStore);

/** テスト用スナップショットを生成するヘルパー */
function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    id: overrides.id ?? 'snap-001',
    label: overrides.label ?? '第1話',
    description: overrides.description,
    persons: overrides.persons ?? [],
    relationships: overrides.relationships ?? [],
    createdAt: overrides.createdAt ?? '2024-06-01T00:00:00.000Z',
  };
}

/** ストアの基本モック値を生成するヘルパー */
function makeStoreMock(overrides: Partial<{
  snapshots: Snapshot[];
  timelineMode: boolean;
  activeSnapshotIndex: number | null;
  setTimelineMode: ReturnType<typeof vi.fn>;
  goToSnapshot: ReturnType<typeof vi.fn>;
  goToLive: ReturnType<typeof vi.fn>;
  deleteSnapshot: ReturnType<typeof vi.fn>;
  reorderSnapshots: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    snapshots: overrides.snapshots ?? [],
    timelineMode: overrides.timelineMode ?? false,
    activeSnapshotIndex: overrides.activeSnapshotIndex ?? null,
    setTimelineMode: overrides.setTimelineMode ?? vi.fn(),
    goToSnapshot: overrides.goToSnapshot ?? vi.fn(),
    goToLive: overrides.goToLive ?? vi.fn(),
    deleteSnapshot: overrides.deleteSnapshot ?? vi.fn(),
    reorderSnapshots: overrides.reorderSnapshots ?? vi.fn(),
  };
}

describe('computeReorderedSnapshotIds', () => {
  const makeSnapshotForUtil = (id: string): Snapshot => ({
    id,
    label: id,
    persons: [],
    relationships: [],
    createdAt: new Date().toISOString(),
  });

  it('先頭要素を末尾に移動する', () => {
    const snapshots = ['a', 'b', 'c'].map(makeSnapshotForUtil);

    // 'a'を'c'の位置に移動 → ['b', 'c', 'a']
    const result = computeReorderedSnapshotIds(snapshots, 'a', 'c');

    expect(result).toEqual(['b', 'c', 'a']);
  });

  it('末尾要素を先頭に移動する', () => {
    const snapshots = ['a', 'b', 'c'].map(makeSnapshotForUtil);

    // 'c'を'a'の位置に移動 → ['c', 'a', 'b']
    const result = computeReorderedSnapshotIds(snapshots, 'c', 'a');

    expect(result).toEqual(['c', 'a', 'b']);
  });

  it('activeIdが存在しない場合はnullを返す', () => {
    const snapshots = ['a', 'b'].map(makeSnapshotForUtil);

    const result = computeReorderedSnapshotIds(snapshots, '存在しないID', 'b');

    expect(result).toBeNull();
  });

  it('overIdが存在しない場合はnullを返す', () => {
    const snapshots = ['a', 'b'].map(makeSnapshotForUtil);

    const result = computeReorderedSnapshotIds(snapshots, 'a', '存在しないID');

    expect(result).toBeNull();
  });
});

describe('SnapshotList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('スナップショットが0件の場合は空状態のメッセージを表示する', () => {
    mockUseGraphStore.mockReturnValue(makeStoreMock({ snapshots: [] }));

    render(<SnapshotList />);

    expect(screen.getByText(/スナップショットはまだありません/i)).toBeInTheDocument();
  });

  it('スナップショットが1件以上の場合はリストを表示する', () => {
    const snapshots = [
      makeSnapshot({ id: 'snap-001', label: '第1話' }),
      makeSnapshot({ id: 'snap-002', label: '第2話' }),
    ];
    mockUseGraphStore.mockReturnValue(makeStoreMock({ snapshots }));

    render(<SnapshotList />);

    expect(screen.getByText('第1話')).toBeInTheDocument();
    expect(screen.getByText('第2話')).toBeInTheDocument();
  });

  it('スナップショット件数が1件以上の場合は「再生を開始」ボタンが表示される', () => {
    const snapshots = [makeSnapshot()];
    mockUseGraphStore.mockReturnValue(makeStoreMock({ snapshots }));

    render(<SnapshotList />);

    expect(screen.getByRole('button', { name: /再生を開始/i })).toBeInTheDocument();
  });

  it('「再生を開始」ボタンをクリックすると setTimelineMode(true) が呼ばれる', async () => {
    const user = userEvent.setup();
    const mockSetTimelineMode = vi.fn();
    const snapshots = [makeSnapshot(), makeSnapshot({ id: 'snap-002', label: '第2話' })];
    mockUseGraphStore.mockReturnValue(
      makeStoreMock({ snapshots, setTimelineMode: mockSetTimelineMode })
    );

    render(<SnapshotList />);

    await user.click(screen.getByRole('button', { name: /再生を開始/i }));

    expect(mockSetTimelineMode).toHaveBeenCalledWith(true);
  });

  it('タイムラインモード中は「再生を終了」ボタンが表示される', () => {
    const snapshots = [makeSnapshot()];
    mockUseGraphStore.mockReturnValue(
      makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0 })
    );

    render(<SnapshotList />);

    expect(screen.getByRole('button', { name: /再生を終了/i })).toBeInTheDocument();
  });

  it('スナップショット削除ボタンをクリックすると deleteSnapshot が呼ばれる', async () => {
    const user = userEvent.setup();
    const mockDeleteSnapshot = vi.fn();
    const snapshots = [makeSnapshot({ id: 'snap-001', label: '第1話' })];
    mockUseGraphStore.mockReturnValue(
      makeStoreMock({ snapshots, deleteSnapshot: mockDeleteSnapshot })
    );

    render(<SnapshotList />);

    await user.click(screen.getByRole('button', { name: /第1話を削除/i }));

    expect(mockDeleteSnapshot).toHaveBeenCalledWith('snap-001');
  });

  it('タイムラインモード外でドラッグハンドルが表示される', () => {
    const snapshots = [makeSnapshot({ id: 'snap-001', label: '第1話' })];
    mockUseGraphStore.mockReturnValue(makeStoreMock({ snapshots, timelineMode: false }));

    render(<SnapshotList />);

    // ドラッグハンドルボタンが存在すること
    expect(screen.getByRole('button', { name: '並び替え' })).toBeInTheDocument();
  });

  it('タイムラインモード中はドラッグハンドルが表示されない', () => {
    const snapshots = [makeSnapshot({ id: 'snap-001', label: '第1話' })];
    mockUseGraphStore.mockReturnValue(
      makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0 })
    );

    render(<SnapshotList />);

    // タイムラインモード中はドラッグハンドルが非表示であること
    expect(screen.queryByRole('button', { name: '並び替え' })).not.toBeInTheDocument();
  });
});
