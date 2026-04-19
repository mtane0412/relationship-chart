/**
 * インタビューセッション ストア
 *
 * AIインタビュアーのセッションライフサイクルを管理する。
 * メッセージのストリーミング管理は useInterviewChat フックの fetch + ReadableStream に委譲し、
 * このストアはセッションの状態遷移（開始/終了）と抽出結果・エラーの管理に専念する。
 *
 * セッションのライフサイクル:
 *   active → extracting → preview → completed
 *
 * 永続化は行わない（セッション履歴の IndexedDB 保存は将来の課題）。
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { InterviewSession, InterviewSessionStatus } from '@/types/interview';
import type { LlmExtractionResult } from '@/lib/llm-extraction-schema';

/**
 * インタビューストアの状態型
 */
type InterviewState = {
  /** チャットモーダルの表示/非表示 */
  isModalOpen: boolean;
  /** 現在のアクティブセッション（null = セッション未開始） */
  session: InterviewSession | null;
  /** セッション終了後の抽出結果（null = 未抽出） */
  extractionResult: LlmExtractionResult | null;
  /** エラーメッセージ（null = エラーなし） */
  error: string | null;
  /** チャットモーダルを開く */
  openModal: () => void;
  /** チャットモーダルを閉じる */
  closeModal: () => void;
  /**
   * 新しいインタビューセッションを開始する
   * 既存セッションがある場合は上書きされる
   * @param chartId - 対象チャートID
   */
  startSession: (chartId: string) => void;
  /**
   * セッションの状態を変更する
   * セッションが存在しない場合は何もしない
   * @param status - 新しいセッション状態
   */
  setSessionStatus: (status: InterviewSessionStatus) => void;
  /**
   * 抽出結果をセットする
   * @param result - LLM抽出結果
   */
  setExtractionResult: (result: LlmExtractionResult) => void;
  /** セッション・抽出結果・エラーをすべてクリアする */
  clearSession: () => void;
  /**
   * エラーメッセージをセットする
   * @param error - エラーメッセージ（null でクリア）
   */
  setError: (error: string | null) => void;
};

/**
 * インタビューセッション ストア
 */
export const useInterviewStore = create<InterviewState>()((set, get) => ({
  isModalOpen: false,
  session: null,
  extractionResult: null,
  error: null,

  openModal: () => set({ isModalOpen: true }),

  closeModal: () => set({ isModalOpen: false }),

  startSession: (chartId: string) => {
    const now = new Date().toISOString();
    const session: InterviewSession = {
      id: nanoid(),
      chartId,
      messages: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    set({ session, extractionResult: null, error: null });
  },

  setSessionStatus: (status: InterviewSessionStatus) => {
    const { session } = get();
    if (!session) return;
    set({
      session: {
        ...session,
        status,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setExtractionResult: (result: LlmExtractionResult) => {
    // セッションが存在しない場合は何もしない（setSessionStatus と同じ防御的パターン）
    const { session } = get();
    if (!session) return;
    set({ extractionResult: result });
  },

  clearSession: () => {
    set({ session: null, extractionResult: null, error: null });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
