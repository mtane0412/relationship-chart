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
  isPlaying: boolean;
  playbackSpeed: number;
  setPlaying: ReturnType<typeof vi.fn>;
  setPlaybackSpeed: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    snapshots: overrides.snapshots ?? [],
    timelineMode: overrides.timelineMode ?? false,
    activeSnapshotIndex: overrides.activeSnapshotIndex ?? null,
    setTimelineMode: overrides.setTimelineMode ?? vi.fn(),
    goToSnapshot: overrides.goToSnapshot ?? vi.fn(),
    goToLive: overrides.goToLive ?? vi.fn(),
    isPlaying: overrides.isPlaying ?? false,
    playbackSpeed: overrides.playbackSpeed ?? 2000,
    setPlaying: overrides.setPlaying ?? vi.fn(),
    setPlaybackSpeed: overrides.setPlaybackSpeed ?? vi.fn(),
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

  describe('再生コントロール', () => {
    it('isPlaying=false のとき再生ボタン(▶)が表示される', () => {
      // GIVEN: スナップショットあり、停止中
      const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0, isPlaying: false })
      );

      render(<TimelineBar />);

      // THEN: 再生ボタンが存在する
      expect(screen.getByRole('button', { name: /再生/i })).toBeInTheDocument();
    });

    it('再生ボタンをクリックすると setPlaying(true) が呼ばれる', async () => {
      // GIVEN
      const user = userEvent.setup();
      const mockSetPlaying = vi.fn();
      const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0, isPlaying: false, setPlaying: mockSetPlaying })
      );

      render(<TimelineBar />);

      // WHEN
      await user.click(screen.getByRole('button', { name: /再生/i }));

      // THEN
      expect(mockSetPlaying).toHaveBeenCalledWith(true);
    });

    it('isPlaying=true のとき停止ボタン(⏸)が表示される', () => {
      // GIVEN: 再生中
      const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0, isPlaying: true })
      );

      render(<TimelineBar />);

      // THEN: 停止ボタンが存在する
      expect(screen.getByRole('button', { name: /停止/i })).toBeInTheDocument();
    });

    it('停止ボタンをクリックすると setPlaying(false) が呼ばれる', async () => {
      // GIVEN: 再生中
      const user = userEvent.setup();
      const mockSetPlaying = vi.fn();
      const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0, isPlaying: true, setPlaying: mockSetPlaying })
      );

      render(<TimelineBar />);

      // WHEN
      await user.click(screen.getByRole('button', { name: /停止/i }));

      // THEN
      expect(mockSetPlaying).toHaveBeenCalledWith(false);
    });

    it('スナップショット0件のとき再生ボタンがdisabledになる', () => {
      // GIVEN: スナップショットなし
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots: [], timelineMode: true, isPlaying: false })
      );

      render(<TimelineBar />);

      // THEN: 再生ボタンはdisabled
      expect(screen.getByRole('button', { name: /再生/i })).toBeDisabled();
    });

    it('前へボタンをクリックすると onTransition が activeSnapshotIndex-1 で呼ばれる', async () => {
      // GIVEN: 第2話（index=1）を表示中
      const user = userEvent.setup();
      const mockOnTransition = vi.fn();
      const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話'), makeSnapshot('第3話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 1 })
      );

      render(<TimelineBar onTransition={mockOnTransition} />);

      // WHEN: 前へボタンをクリック
      await user.click(screen.getByRole('button', { name: /前へ/i }));

      // THEN: index=0 へ遷移
      expect(mockOnTransition).toHaveBeenCalledWith(0);
    });

    it('次へボタンをクリックすると onTransition が activeSnapshotIndex+1 で呼ばれる', async () => {
      // GIVEN: 第1話（index=0）を表示中
      const user = userEvent.setup();
      const mockOnTransition = vi.fn();
      const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0 })
      );

      render(<TimelineBar onTransition={mockOnTransition} />);

      // WHEN: 次へボタンをクリック
      await user.click(screen.getByRole('button', { name: /次へ/i }));

      // THEN: index=1 へ遷移
      expect(mockOnTransition).toHaveBeenCalledWith(1);
    });

    it('前へボタンはライブ状態（activeSnapshotIndex=null）のときdisabledになる', () => {
      // GIVEN: ライブ状態
      const snapshots = [makeSnapshot('第1話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: null })
      );

      render(<TimelineBar />);

      // THEN: 前へボタンはdisabled
      expect(screen.getByRole('button', { name: /前へ/i })).toBeDisabled();
    });

    it('次へボタンは最後のスナップショットのときdisabledになる', () => {
      // GIVEN: 最後のスナップショット（index=1、全2件）
      const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 1 })
      );

      render(<TimelineBar />);

      // THEN: 次へボタンはdisabled
      expect(screen.getByRole('button', { name: /次へ/i })).toBeDisabled();
    });

    it('isTransitioning=true のときスライダーがdisabledになる', () => {
      // GIVEN: アニメーション遷移中
      const snapshots = [makeSnapshot('第1話'), makeSnapshot('第2話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, activeSnapshotIndex: 0 })
      );

      render(<TimelineBar isTransitioning={true} />);

      // THEN: スライダーがdisabled
      expect(screen.getByRole('slider')).toBeDisabled();
    });

    it('速度ボタンをクリックすると setPlaybackSpeed が次の速度で呼ばれる', async () => {
      // GIVEN: 現在の速度は 2000ms（1.5x）
      const user = userEvent.setup();
      const mockSetPlaybackSpeed = vi.fn();
      const snapshots = [makeSnapshot('第1話')];
      mockUseGraphStore.mockReturnValue(
        makeStoreMock({ snapshots, timelineMode: true, playbackSpeed: 2000, setPlaybackSpeed: mockSetPlaybackSpeed })
      );

      render(<TimelineBar />);

      // WHEN: 速度ボタンをクリック（2000ms → 1000ms へ循環）
      await user.click(screen.getByRole('button', { name: /速度/i }));

      // THEN: 次の速度に変更される
      expect(mockSetPlaybackSpeed).toHaveBeenCalled();
    });
  });
});
