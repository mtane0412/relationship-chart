/**
 * useTimelinePlayback フックのユニットテスト
 *
 * 自動再生タイマーの動作を検証する。
 * fake timers（vi.useFakeTimers）でsetIntervalを模擬する。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimelinePlayback } from './useTimelinePlayback';
import { useGraphStore } from '@/stores/useGraphStore';

// useGraphStoreをモック化して制御しやすくする
vi.mock('@/stores/useGraphStore');

const mockUseGraphStore = vi.mocked(useGraphStore);

/**
 * デフォルトのストア状態を返すモックを設定するヘルパー
 */
function setupStoreMock(overrides: {
  snapshots?: unknown[];
  isPlaying?: boolean;
  playbackSpeed?: number;
  activeSnapshotIndex?: number | null;
  setPlaying?: ReturnType<typeof vi.fn>;
}) {
  const setPlaying = overrides.setPlaying ?? vi.fn();
  mockUseGraphStore.mockReturnValue({
    snapshots: overrides.snapshots ?? [{ id: 'snap-1', label: '第1話' }, { id: 'snap-2', label: '第2話' }],
    isPlaying: overrides.isPlaying ?? false,
    playbackSpeed: overrides.playbackSpeed ?? 2000,
    activeSnapshotIndex: overrides.activeSnapshotIndex ?? null,
    setPlaying,
  } as ReturnType<typeof useGraphStore>);
  return { setPlaying };
}

describe('useTimelinePlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('isPlaying=false のときタイマーは動作しない', () => {
    // GIVEN: 再生停止状態
    const transitionToSnapshot = vi.fn();
    setupStoreMock({ isPlaying: false });

    // WHEN: フックをマウント
    renderHook(() => useTimelinePlayback(transitionToSnapshot, false));

    // THEN: インターバルが経過しても遷移は呼ばれない
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(transitionToSnapshot).not.toHaveBeenCalled();
  });

  it('isPlaying=true でタイマー起動し playbackSpeed 間隔で transitionToSnapshot が呼ばれる', () => {
    // GIVEN: ライブ状態（activeSnapshotIndex=null）から再生開始
    const transitionToSnapshot = vi.fn();
    setupStoreMock({
      isPlaying: true,
      playbackSpeed: 1000,
      activeSnapshotIndex: null,
      snapshots: [{ id: 'snap-1' }, { id: 'snap-2' }],
    });

    // WHEN
    renderHook(() => useTimelinePlayback(transitionToSnapshot, false));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // THEN: ライブ状態からは最初のスナップショット(index=0)へ遷移
    expect(transitionToSnapshot).toHaveBeenCalledTimes(1);
    expect(transitionToSnapshot).toHaveBeenCalledWith(0);
  });

  it('activeSnapshotIndex=0 のとき次のスナップショット(index=1)へ遷移する', () => {
    // GIVEN: 最初のスナップショットを表示中
    const transitionToSnapshot = vi.fn();
    setupStoreMock({
      isPlaying: true,
      playbackSpeed: 1000,
      activeSnapshotIndex: 0,
      snapshots: [{ id: 'snap-1' }, { id: 'snap-2' }, { id: 'snap-3' }],
    });

    // WHEN
    renderHook(() => useTimelinePlayback(transitionToSnapshot, false));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // THEN
    expect(transitionToSnapshot).toHaveBeenCalledWith(1);
  });

  it('最後のスナップショットのとき setPlaying(false) が呼ばれ自動停止する', () => {
    // GIVEN: 最後のスナップショット（index=1、スナップショット数=2）を表示中
    const transitionToSnapshot = vi.fn();
    const { setPlaying } = setupStoreMock({
      isPlaying: true,
      playbackSpeed: 1000,
      activeSnapshotIndex: 1,
      snapshots: [{ id: 'snap-1' }, { id: 'snap-2' }],
    });

    // WHEN
    renderHook(() => useTimelinePlayback(transitionToSnapshot, false));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // THEN: 遷移は呼ばれず、再生停止のみ
    expect(transitionToSnapshot).not.toHaveBeenCalled();
    expect(setPlaying).toHaveBeenCalledWith(false);
  });

  it('isTransitioning=true のときはticksをスキップする', () => {
    // GIVEN: アニメーション遷移中
    const transitionToSnapshot = vi.fn();
    setupStoreMock({
      isPlaying: true,
      playbackSpeed: 1000,
      activeSnapshotIndex: 0,
      snapshots: [{ id: 'snap-1' }, { id: 'snap-2' }],
    });

    // WHEN
    renderHook(() => useTimelinePlayback(transitionToSnapshot, true));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // THEN: スキップされるため遷移は呼ばれない
    expect(transitionToSnapshot).not.toHaveBeenCalled();
  });

  it('isPlaying が false になるとタイマーがクリアされる', () => {
    // GIVEN: 再生中
    const transitionToSnapshot = vi.fn();
    setupStoreMock({
      isPlaying: true,
      playbackSpeed: 1000,
      activeSnapshotIndex: null,
      snapshots: [{ id: 'snap-1' }, { id: 'snap-2' }],
    });

    const { rerender } = renderHook(
      ({ isTransitioning }: { isTransitioning: boolean }) =>
        useTimelinePlayback(transitionToSnapshot, isTransitioning),
      { initialProps: { isTransitioning: false } }
    );

    // WHEN: isPlaying を false に変更（ストアを更新）
    setupStoreMock({
      isPlaying: false,
      playbackSpeed: 1000,
      activeSnapshotIndex: null,
      snapshots: [{ id: 'snap-1' }, { id: 'snap-2' }],
    });
    rerender({ isTransitioning: false });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // THEN: タイマーが停止したため遷移は呼ばれない
    expect(transitionToSnapshot).not.toHaveBeenCalled();
  });
});
