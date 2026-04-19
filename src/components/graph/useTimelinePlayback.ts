/**
 * useTimelinePlayback フック
 *
 * タイムラインの自動再生タイマーを管理するフック。
 * setInterval でスナップショットを順次切り替え、最後のスナップショットで自動停止する。
 *
 * 設計方針:
 * - isPlaying が true のときのみ setInterval を起動する
 * - アニメーション遷移中（isTransitioning=true）のtickはスキップして前のアニメーションが
 *   完了するまで待機する
 * - クリーンアップで clearInterval を確実に呼ぶ
 */

'use client';

import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * タイムライン自動再生タイマーを管理するフック
 *
 * @param transitionToSnapshot - アニメーション付きでスナップショットに遷移する関数
 * @param isTransitioning - アニメーション遷移中かどうか
 */
export function useTimelinePlayback(
  transitionToSnapshot: (index: number) => void,
  isTransitioning: boolean
): void {
  const { snapshots, isPlaying, playbackSpeed, activeSnapshotIndex, setPlaying } = useGraphStore(
    useShallow((state) => ({
      snapshots: state.snapshots,
      isPlaying: state.isPlaying,
      playbackSpeed: state.playbackSpeed,
      activeSnapshotIndex: state.activeSnapshotIndex,
      setPlaying: state.setPlaying,
    }))
  );

  // 最新の値をrefで保持してsetInterval内でも参照できるようにする
  const isTransitioningRef = useRef(isTransitioning);
  const activeSnapshotIndexRef = useRef(activeSnapshotIndex);
  const snapshotsLengthRef = useRef(snapshots.length);
  const transitionToSnapshotRef = useRef(transitionToSnapshot);
  const setPlayingRef = useRef(setPlaying);

  // refを最新値で更新する
  isTransitioningRef.current = isTransitioning;
  activeSnapshotIndexRef.current = activeSnapshotIndex;
  snapshotsLengthRef.current = snapshots.length;
  transitionToSnapshotRef.current = transitionToSnapshot;
  setPlayingRef.current = setPlaying;

  useEffect(() => {
    // isPlaying=false のときはタイマーを起動しない
    if (!isPlaying) return;

    const intervalId = setInterval(() => {
      // アニメーション遷移中はスキップ（前のアニメーションが完了するまで待機）
      if (isTransitioningRef.current) return;

      const currentIndex = activeSnapshotIndexRef.current;
      const totalSnapshots = snapshotsLengthRef.current;

      if (totalSnapshots === 0) {
        // スナップショットがない場合は停止
        setPlayingRef.current(false);
        return;
      }

      if (currentIndex === null) {
        // ライブ状態からは最初のスナップショットへ遷移
        transitionToSnapshotRef.current(0);
      } else if (currentIndex < totalSnapshots - 1) {
        // 次のスナップショットへ遷移
        transitionToSnapshotRef.current(currentIndex + 1);
      } else {
        // 最後のスナップショットに達したら自動停止
        setPlayingRef.current(false);
      }
    }, playbackSpeed);

    // クリーンアップ: isPlaying が false になったとき、または playbackSpeed が変わったときにタイマーを停止
    return () => {
      clearInterval(intervalId);
    };
  }, [isPlaying, playbackSpeed]);
}
