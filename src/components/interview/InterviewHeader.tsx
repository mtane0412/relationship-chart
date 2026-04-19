/**
 * InterviewHeader コンポーネント
 *
 * インタビューチャットモーダルのヘッダー部分。
 * タイトル、インタビュー終了ボタン、閉じるボタンを表示する。
 */

'use client';

import { X, Loader2, StopCircle } from 'lucide-react';
import type { InterviewSessionStatus } from '@/types/interview';

/**
 * InterviewHeader の Props
 */
type InterviewHeaderProps = {
  /** 現在のセッション状態 */
  sessionStatus: InterviewSessionStatus | null;
  /** ストリーミング中フラグ */
  isLoading: boolean;
  /** 「インタビューを終了」ボタンを押したときのコールバック */
  onEndSession: () => void;
  /** 「×」閉じるボタンを押したときのコールバック */
  onClose: () => void;
};

/**
 * インタビューチャットモーダルのヘッダー
 *
 * extracting 状態では終了ボタンとローディングアイコンを表示し、
 * その他の状態では通常の終了ボタンを表示する。
 */
export function InterviewHeader({
  sessionStatus,
  isLoading,
  onEndSession,
  onClose,
}: InterviewHeaderProps) {
  /** extracting 状態: ローディング表示 */
  const isExtracting = sessionStatus === 'extracting';
  /** preview 状態: 終了ボタンを非表示 */
  const isPreview = sessionStatus === 'preview';
  /** 終了ボタンを無効化する条件 */
  const isEndDisabled = isExtracting || isLoading;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
      {/* タイトル */}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900" id="interview-modal-title">
          AIインタビュー
        </h2>
        {isExtracting && (
          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <Loader2 size={12} className="animate-spin" />
            抽出中...
          </span>
        )}
        {isLoading && !isExtracting && (
          <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            <Loader2 size={12} className="animate-spin" />
            応答中...
          </span>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-2">
        {/* インタビュー終了ボタン（preview と completed 状態では非表示） */}
        {!isPreview && sessionStatus !== 'completed' && (
          <button
            type="button"
            onClick={onEndSession}
            disabled={isEndDisabled}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <StopCircle size={13} />
            インタビューを終了
          </button>
        )}

        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
