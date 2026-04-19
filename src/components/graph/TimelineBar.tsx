/**
 * タイムラインバーコンポーネント
 *
 * タイムラインモード中にグラフキャンバス下部に表示されるコントロールバー。
 * スライダーでスナップショット間を移動できる。
 *
 * 表示条件: timelineMode === true のとき（スナップショット0件でも表示）
 *
 * 機能:
 * - スライダーによるスナップショット移動
 * - 現在のスナップショットラベル表示（null = ライブ状態）
 * - 終了ボタンでタイムラインモードを解除
 */

'use client';

import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * タイムラインバーコンポーネント
 */
export function TimelineBar() {
  const {
    snapshots,
    timelineMode,
    activeSnapshotIndex,
    setTimelineMode,
    goToSnapshot,
    goToLive,
  } = useGraphStore(
    useShallow((state) => ({
      snapshots: state.snapshots,
      timelineMode: state.timelineMode,
      activeSnapshotIndex: state.activeSnapshotIndex,
      setTimelineMode: state.setTimelineMode,
      goToSnapshot: state.goToSnapshot,
      goToLive: state.goToLive,
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
      goToSnapshot(value - 1);
    }
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

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3 flex items-center gap-4">
      {/* 現在のラベル */}
      <span className="text-sm font-medium text-gray-700 min-w-[6rem] truncate">
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
          disabled={snapshots.length === 0}
          className="flex-1 h-2 accent-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="タイムラインスライダー"
          aria-valuemin={0}
          aria-valuemax={sliderMax}
          aria-valuenow={sliderValue}
          aria-valuetext={currentLabel}
        />
        {/* 最終スナップショット */}
        {snapshots.length > 0 && (
          <span className="text-xs text-gray-400 whitespace-nowrap max-w-[6rem] truncate">
            {snapshots[snapshots.length - 1]?.label}
          </span>
        )}
      </div>

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
