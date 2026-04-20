/**
 * useInterviewStore のユニットテスト
 *
 * インタビューセッションのライフサイクル管理（開始/終了/抽出結果設定/クリア）を検証する。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInterviewStore } from './useInterviewStore';
import type { LlmExtractionResult } from '@/lib/llm-extraction-schema';

/** テスト間でストア状態をリセットするヘルパー */
function resetStore() {
  useInterviewStore.setState({
    isModalOpen: false,
    session: null,
    extractionResult: null,
    error: null,
  });
}

/** テスト用の最小限の抽出結果 */
const mockExtractionResult: LlmExtractionResult = {
  persons: [{ name: '山田太郎', labels: ['人物'], tags: null, narrative: null, properties: {} }],
  relationships: [],
  episodes: [],
};

describe('useInterviewStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('openModal / closeModal', () => {
    it('openModal でモーダルが開くこと', () => {
      useInterviewStore.getState().openModal();
      expect(useInterviewStore.getState().isModalOpen).toBe(true);
    });

    it('closeModal でモーダルが閉じること', () => {
      useInterviewStore.setState({ isModalOpen: true });
      useInterviewStore.getState().closeModal();
      expect(useInterviewStore.getState().isModalOpen).toBe(false);
    });
  });

  describe('startSession', () => {
    it('startSession でセッションが作成されること', () => {
      useInterviewStore.getState().startSession('chart-001');
      const { session } = useInterviewStore.getState();
      expect(session).not.toBeNull();
      expect(session?.chartId).toBe('chart-001');
      expect(session?.status).toBe('active');
      expect(session?.messages).toHaveLength(0);
    });

    it('startSession で既存セッションが上書きされること', () => {
      useInterviewStore.getState().startSession('chart-001');
      const firstSessionId = useInterviewStore.getState().session?.id;

      useInterviewStore.getState().startSession('chart-002');
      const { session } = useInterviewStore.getState();
      expect(session?.id).not.toBe(firstSessionId);
      expect(session?.chartId).toBe('chart-002');
    });
  });

  describe('setSessionStatus', () => {
    it('setSessionStatus でセッション状態が変更されること', () => {
      useInterviewStore.getState().startSession('chart-001');
      useInterviewStore.getState().setSessionStatus('extracting');
      expect(useInterviewStore.getState().session?.status).toBe('extracting');
    });

    it('セッションがない場合は状態変更されないこと', () => {
      // session が null の状態で setSessionStatus を呼んでも例外が出ないこと
      expect(() => {
        useInterviewStore.getState().setSessionStatus('extracting');
      }).not.toThrow();
      // session が null のままであること（何も変更されていない）
      expect(useInterviewStore.getState().session).toBeNull();
    });
  });

  describe('setExtractionResult', () => {
    it('セッションが存在するとき setExtractionResult で抽出結果がセットされること', () => {
      // セッションを開始してから抽出結果をセットする
      useInterviewStore.getState().startSession('chart-001');
      useInterviewStore.getState().setExtractionResult(mockExtractionResult);
      expect(useInterviewStore.getState().extractionResult).toEqual(mockExtractionResult);
    });

    it('セッションがない場合 setExtractionResult は何もしないこと', () => {
      // session が null の状態では抽出結果がセットされないこと
      useInterviewStore.getState().setExtractionResult(mockExtractionResult);
      expect(useInterviewStore.getState().extractionResult).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('clearSession でセッションと抽出結果がクリアされること', () => {
      useInterviewStore.getState().startSession('chart-001');
      useInterviewStore.getState().setExtractionResult(mockExtractionResult);
      useInterviewStore.getState().setError('テストエラー');

      useInterviewStore.getState().clearSession();

      const { session, extractionResult, error } = useInterviewStore.getState();
      expect(session).toBeNull();
      expect(extractionResult).toBeNull();
      expect(error).toBeNull();
    });
  });

  describe('setError', () => {
    it('setError でエラーがセットされること', () => {
      useInterviewStore.getState().setError('接続エラーが発生しました');
      expect(useInterviewStore.getState().error).toBe('接続エラーが発生しました');
    });

    it('setError(null) でエラーがクリアされること', () => {
      useInterviewStore.setState({ error: 'テストエラー' });
      useInterviewStore.getState().setError(null);
      expect(useInterviewStore.getState().error).toBeNull();
    });
  });
});
