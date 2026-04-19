/**
 * タイムラインバーコンポーネント
 *
 * タイムラインモード中にグラフキャンバス下部に表示されるコントロールバー。
 * スライダーでスナップショット間を移動し、再生/停止/前後ボタンで操作できる。
 *
 * 表示条件: timelineMode === true のとき（スナップショット0件でも表示）
 *
 * 機能:
 * - 再生/停止ボタン: isPlaying を切り替える
 * - 前へ/次へボタン: onTransition を呼んでスナップショットを移動
 * - スライダー: スナップショット間を直接移動（isTransitioning 中はdisabled）
 * - 速度ボタン: 再生速度を 1x / 1.5x / 2x でサイクル切り替え
 * - 終了ボタン: タイムラインモードを解除
 */

'use client';

import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '@/stores/useGraphStore';

/** 再生速度の設定（ミリ秒）。循環する順番で定義 */
const PLAYBACK_SPEEDS = [3000, 2000, 1000] as const;

/** 再生速度ラベルのマッピング */
const SPEED_LABELS: Record<number, string> = {
  3000: '1x',
  2000: '1.5x',
  1000: '2x',
};

/**
 * TimelineBar コンポーネントのProps
 */
type TimelineBarProps = {
  /**
   * アニメーション付きスナップショット遷移関数
   * 省略時は useGraphStore の goToSnapshot を直接呼ぶ
   */
  onTransition?: (index: number) => void;
  /** アニメーション遷移中かどうか（true のときスライダーをdisabled化） */
  isTransitioning?: boolean;
};

/**
 * タイムラインバーコンポーネント
 */
export function TimelineBar({ onTransition, isTransitioning = false }: TimelineBarProps) {
  const {
    snapshots,
    timelineMode,
    activeSnapshotIndex,
    setTimelineMode,
    goToSnapshot,
    goToLive,
    isPlaying,
    playbackSpeed,
    setPlaying,
    setPlaybackSpeed,
  } = useGraphStore(
    useShallow((state) => ({
      snapshots: state.snapshots,
      timelineMode: state.timelineMode,
      activeSnapshotIndex: state.activeSnapshotIndex,
      setTimelineMode: state.setTimelineMode,
      goToSnapshot: state.goToSnapshot,
      goToLive: state.goToLive,
      isPlaying: state.isPlaying,
      playbackSpeed: state.playbackSpeed,
      setPlaying: state.setPlaying,
      setPlaybackSpeed: state.setPlaybackSpeed,
    }))
  );

  // タイムラインモード以外は非表示
  if (!timelineMode) return null;

  /**
   * スライダー値の変更ハンドラ
   * 0はライブ状態、1〜n はスナップショットのインデックス（0始まり）を指す
   */
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value === 0) {
      goToLive();
    } else {
      const targetIndex = value - 1;
      if (onTransition) {
        onTransition(targetIndex);
      } else {
        goToSnapshot(targetIndex);
      }
    }
  };

  /** 前へボタンのハンドラ */
  const handlePrev = () => {
    if (activeSnapshotIndex === null || activeSnapshotIndex === 0) return;
    const targetIndex = activeSnapshotIndex - 1;
    if (onTransition) {
      onTransition(targetIndex);
    } else {
      goToSnapshot(targetIndex);
    }
  };

  /** 次へボタンのハンドラ */
  const handleNext = () => {
    if (activeSnapshotIndex === snapshots.length - 1) return;
    const targetIndex = activeSnapshotIndex === null ? 0 : activeSnapshotIndex + 1;
    if (onTransition) {
      onTransition(targetIndex);
    } else {
      goToSnapshot(targetIndex);
    }
  };

  /**
   * 速度ボタンのハンドラ
   * 現在の速度から次の速度へ循環する: 3000ms → 2000ms → 1000ms → 3000ms
   */
  const handleSpeedCycle = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed as typeof PLAYBACK_SPEEDS[number]);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIndex]);
  };

  // スライダーの現在値（0=ライブ、1〜n=スナップショット）
  const sliderValue = activeSnapshotIndex !== null ? activeSnapshotIndex + 1 : 0;
  // スライダーの最大値（スナップショット数）
  const sliderMax = snapshots.length;

  // 現在表示中のラベル
  const currentLabel =
    activeSnapshotIndex !== null
      ? (snapshots[activeSnapshotIndex]?.label ?? '不明')
      : 'ライブ';

  // 前へボタンのdisabled条件
  const isPrevDisabled = activeSnapshotIndex === null || activeSnapshotIndex === 0;
  // 次へボタンのdisabled条件
  const isNextDisabled = activeSnapshotIndex === snapshots.length - 1;
  // 再生/停止ボタンのdisabled条件
  const isPlayDisabled = snapshots.length === 0;

  // 現在の速度ラベル
  const currentSpeedLabel = SPEED_LABELS[playbackSpeed] ?? '1.5x';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3 flex items-center gap-3">
      {/* 前へボタン */}
      <button
        onClick={handlePrev}
        disabled={isPrevDisabled || isTransitioning}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="前へ"
        title="前のスナップショット"
      >
        <SkipBack size={16} />
      </button>

      {/* 再生/停止ボタン */}
      {isPlaying ? (
        <button
          onClick={() => setPlaying(false)}
          disabled={isPlayDisabled}
          className="p-1.5 rounded hover:bg-gray-100 text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="停止"
          title="停止"
        >
          <Pause size={16} />
        </button>
      ) : (
        <button
          onClick={() => setPlaying(true)}
          disabled={isPlayDisabled || isTransitioning}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="再生"
          title="再生"
        >
          <Play size={16} />
        </button>
      )}

      {/* 次へボタン */}
      <button
        onClick={handleNext}
        disabled={isNextDisabled || isTransitioning}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="次へ"
        title="次のスナップショット"
      >
        <SkipForward size={16} />
      </button>

      {/* 現在のラベル */}
      <span className="text-sm font-medium text-gray-700 min-w-[5rem] truncate">
        {currentLabel}
      </span>

      {/* スライダー */}
      <div className="flex-1 flex items-center gap-2">
        {/* ライブ */}
        <span className="text-xs text-gray-400 whitespace-nowrap">ライブ</span>
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={sliderValue}
          onChange={handleSliderChange}
          disabled={snapshots.length === 0 || isTransitioning}
          className="flex-1 h-2 accent-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="タイムラインスライダー"
          aria-valuemin={0}
          aria-valuemax={sliderMax}
          aria-valuenow={sliderValue}
          aria-valuetext={currentLabel}
        />
        {/* 最終スナップショット */}
        {snapshots.length > 0 && (
          <span className="text-xs text-gray-400 whitespace-nowrap max-w-[5rem] truncate">
            {snapshots[snapshots.length - 1]?.label}
          </span>
        )}
      </div>

      {/* 速度ボタン */}
      <button
        onClick={handleSpeedCycle}
        className="text-xs font-medium text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors min-w-[2.5rem] text-center"
        aria-label="速度"
        title={`再生速度: ${currentSpeedLabel}`}
      >
        {currentSpeedLabel}
      </button>

      {/* 終了ボタン */}
      <button
        onClick={() => setTimelineMode(false)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        aria-label="タイムラインモードを終了"
        title="終了"
      >
        <X size={16} />
        終了
      </button>
    </div>
  );
}
