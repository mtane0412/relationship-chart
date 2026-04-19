/**
 * スナップショット一覧コンポーネント
 *
 * サイドパネル（DefaultPanel）内に配置され、以下の機能を提供する:
 * - スナップショット一覧の表示（ラベル・作成日時）
 * - タイムライン再生モードの開始/終了
 * - 各スナップショットへのジャンプ
 * - スナップショットの削除
 *
 * スナップショットが0件の場合は空状態メッセージを表示する。
 */

'use client';

import { Trash2, Play, StopCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * スナップショット一覧コンポーネント
 */
export function SnapshotList() {
  const {
    snapshots,
    timelineMode,
    activeSnapshotIndex,
    setTimelineMode,
    goToSnapshot,
    goToLive,
    deleteSnapshot,
  } = useGraphStore(
    useShallow((state) => ({
      snapshots: state.snapshots,
      timelineMode: state.timelineMode,
      activeSnapshotIndex: state.activeSnapshotIndex,
      setTimelineMode: state.setTimelineMode,
      goToSnapshot: state.goToSnapshot,
      goToLive: state.goToLive,
      deleteSnapshot: state.deleteSnapshot,
    }))
  );

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          タイムライン
          {snapshots.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              ({snapshots.length}件)
            </span>
          )}
        </h2>

        {/* 再生開始/終了ボタン（スナップショットが1件以上の場合） */}
        {snapshots.length > 0 && (
          timelineMode ? (
            <button
              onClick={() => setTimelineMode(false)}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              aria-label="再生を終了"
            >
              <StopCircle size={14} />
              再生を終了
            </button>
          ) : (
            <button
              onClick={() => setTimelineMode(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
              aria-label="再生を開始"
            >
              <Play size={14} />
              再生を開始
            </button>
          )
        )}
      </div>

      {/* スナップショットが0件の場合 */}
      {snapshots.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">
          スナップショットはまだありません
        </p>
      )}

      {/* スナップショット一覧 */}
      {snapshots.length > 0 && (
        <ul className="space-y-1">
          {snapshots.map((snapshot, index) => {
            const isActive = timelineMode && activeSnapshotIndex === index;
            return (
              <li
                key={snapshot.id}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 group ${
                  isActive
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* スナップショット番号 */}
                <span className="text-xs text-gray-400 min-w-[1.5rem] text-right">
                  {index + 1}.
                </span>

                {/* ラベル（クリックでジャンプ） */}
                <button
                  onClick={() => {
                    if (!timelineMode) {
                      setTimelineMode(true);
                    }
                    goToSnapshot(index);
                  }}
                  className={`flex-1 text-left text-sm truncate ${
                    isActive ? 'text-blue-700 font-medium' : 'text-gray-700 hover:text-gray-900'
                  }`}
                  title={snapshot.description ?? snapshot.label}
                >
                  {snapshot.label}
                </button>

                {/* ライブに戻るボタン（タイムラインモード中のアクティブ項目） */}
                {isActive && (
                  <button
                    onClick={goToLive}
                    className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap transition-colors"
                  >
                    ライブへ
                  </button>
                )}

                {/* 削除ボタン（タイムラインモード外のみ表示） */}
                {!timelineMode && (
                  <button
                    onClick={() => deleteSnapshot(snapshot.id)}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-gray-400 hover:text-red-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded"
                    aria-label={`${snapshot.label}を削除`}
                    title={`${snapshot.label}を削除`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
