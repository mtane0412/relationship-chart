/**
 * TimelineBarコンポーネントのテスト
 * タイムライン再生バーのUIを検証する
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineBar } from './TimelineBar';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Snapshot } from '@/types/snapshot';

// Zustandストアをモック
vi.mock('@/stores/useGraphStore');
const mockUseGraphStore = vi.mocked(useGraphStore);

/** テスト用スナップショットを生成するヘルパー */
function makeSnapshot(label: string, id: string = label): Snapshot {
  return {
    id,
    label,
    persons: [],
    relationships: [],
    createdAt: '2024-06-01T00:00:00.000Z',
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
}> = {}) {
  return {
    snapshots: overrides.snapshots ?? [],
    timelineMode: overrides.timelineMode ?? false,
    activeSnapshotIndex: overrides.activeSnapshotIndex ?? null,
    setTimelineMode: overrides.setTimelineMode ?? vi.fn(),
    goToSnapshot: overrides.goToSnapshot ?? vi.fn(),
    goToLive: overrides.goToLive ?? vi.fn(),
  };
}

describe('TimelineBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('タイムラインモード=false のとき何も表示しない', () => {
    mockUseGraphStore.mockReturnValue(makeStoreMock({ timelineMode: false }));

    const { container } = render(<TimelineBar />);

    expect(container).toBeEmptyDOMElement();
  });

  it('タイムラインモード=true のときバーが表示される', () => {
    const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話')];
    mockUseGraphStore.mockReturnValue(
      makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0 })
    );

    render(<TimelineBar />);

    // スライダーが表示されること
    expect(screen.getByRole('slider')).toBeInTheDocument();
    // 終了ボタンが表示されること
    expect(screen.getByRole('button', { name: /終了/i })).toBeInTheDocument();
  });

  it('現在のスナップショットラベルが表示される', () => {
    const snapshots = [makeSnapshot('序章'), makeSnapshot('第1話')];
    mockUseGraphStore.mockReturnValue(
      makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0 })
    );

    render(<TimelineBar />);

    expect(screen.getByText('序章')).toBeInTheDocument();
  });

  it('activeSnapshotIndex=null のとき現在ラベルが「ライブ」と表示される', () => {
    const snapshots = [makeSnapshot('第1話')];
    mockUseGraphStore.mockReturnValue(
      makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: null })
    );

    render(<TimelineBar />);

    // 現在ラベルエリア（スライダーのaria-valuetextでも確認）
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuetext', 'ライブ');
  });

  it('スライダーを動かすと goToSnapshot が呼ばれる', () => {
    const mockGoToSnapshot = vi.fn();
    const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話'), makeSnapshot('第3話')];
    mockUseGraphStore.mockReturnValue(
      makeStoreMock({
        snapshots,
        timelineMode: true,
        activeSnapshotIndex: 0,
        goToSnapshot: mockGoToSnapshot,
      })
    );

    render(<TimelineBar />);

    const slider = screen.getByRole('slider');
    // スライダーの値を変更（fireEventはonChangeを直接トリガー）
    fireEvent.change(slider, { target: { value: '2' } });

    // 値2はスナップショットインデックス1（2-1=1）
    expect(mockGoToSnapshot).toHaveBeenCalledWith(1);
  });

  it('「終了」ボタンをクリックすると setTimelineMode(false) が呼ばれる', async () => {
    const user = userEvent.setup();
    const mockSetTimelineMode = vi.fn();
    const snapshots = [makeSnapshot('第1話')];
    mockUseGraphStore.mockReturnValue(
      makeStoreMock({
        snapshots,
        timelineMode: true,
        activeSnapshotIndex: 0,
        setTimelineMode: mockSetTimelineMode,
      })
    );

    render(<TimelineBar />);

    await user.click(screen.getByRole('button', { name: /終了/i }));

    expect(mockSetTimelineMode).toHaveBeenCalledWith(false);
  });
});
