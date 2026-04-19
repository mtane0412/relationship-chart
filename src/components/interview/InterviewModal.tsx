/**
 * InterviewModal コンポーネント
 *
 * AIインタビュアーチャットモーダルの本体。
 * セッション状態（active/extracting/preview/completed）に応じて表示を切り替える。
 *
 * - active: チャットメッセージ一覧 + 入力エリア
 * - extracting: ローディング表示（抽出処理中）
 * - preview: 抽出結果プレビュー（ExtractionPreviewPanelのロジック流用）
 * - completed: モーダルを閉じる
 *
 * セッション開始時にAIへの初回メッセージ（空のユーザーターン）を送信して
 * AIが最初の質問を自動生成するよう促す。
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { Loader2, Users, Link } from 'lucide-react';
import { EpisodePreviewSection } from '@/components/graph/EpisodePreviewSection';
import { useShallow } from 'zustand/react/shallow';
import { useInterviewStore } from '@/stores/useInterviewStore';
import { useInterviewChat } from '@/hooks/useInterviewChat';
import { useGraphStore } from '@/stores/useGraphStore';
import { useAiSettingsStore } from '@/stores/useAiSettingsStore';
import { resolveExtractionResult } from '@/lib/person-matching';
import { InterviewHeader } from './InterviewHeader';
import { InterviewMessageList } from './InterviewMessageList';
import { InterviewInputArea } from './InterviewInputArea';
import type { LlmExtractionResult } from '@/lib/llm-extraction-schema';

/**
 * インタビュー内用の抽出結果プレビュー（インライン表示）
 *
 * ExtractionPreviewPanel は ChatInputBar 上に absolute 配置されるため、
 * モーダル内では使用できない。このコンポーネントは同等のUIをインラインで提供する。
 */
function InterviewExtractionPreview({
  result,
  onConfirm,
  onCancel,
}: {
  result: LlmExtractionResult;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* プレビュータイトル */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-700">抽出結果を確認</h3>
        <p className="text-xs text-gray-500 mt-0.5">以下の内容を相関図に追加しますか？</p>
      </div>

      {/* 抽出内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 人物セクション */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              人物 ({result.persons.length} 件)
            </span>
          </div>
          {result.persons.length === 0 ? (
            <p className="text-sm text-gray-400 ml-5">なし</p>
          ) : (
            <ul className="space-y-1">
              {result.persons.map((person, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  {person.name}
                  {person.labels?.includes('物') && (
                    <span className="text-xs text-gray-400">（アイテム）</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 関係セクション */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              関係 ({result.relationships.length} 件)
            </span>
          </div>
          {result.relationships.length === 0 ? (
            <p className="text-sm text-gray-400 ml-5">なし</p>
          ) : (
            <ul className="space-y-1">
              {result.relationships.map((rel, i) => {
                const displayLabel = rel.label ?? rel.type;
                return (
                  <li
                    key={i}
                    className="text-sm text-gray-700 flex items-center gap-1 flex-wrap ml-1"
                  >
                    <span className="font-medium">{rel.sourcePersonName}</span>
                    <span className="text-gray-400 text-xs">{rel.symmetric ? '—' : '→'}</span>
                    <span className="font-medium">{rel.targetPersonName}</span>
                    {displayLabel && (
                      <span className="text-xs text-gray-500">（{displayLabel}）</span>
                    )}
                    {(rel.tags?.length ?? 0) > 0 && (
                      <span className="text-xs text-blue-500">[{rel.tags?.join(', ')}]</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* エピソードセクション */}
        <EpisodePreviewSection episodes={result.episodes} />
      </div>

      {/* アクションボタン */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
        >
          インタビューに戻る
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          相関図に追加
        </button>
      </div>
    </div>
  );
}

/**
 * AIインタビュアーチャットモーダル
 *
 * useInterviewStore の isModalOpen に応じて表示/非表示を制御する。
 */
export function InterviewModal() {
  const {
    isModalOpen,
    session,
    extractionResult,
    error,
    closeModal,
    setSessionStatus,
    clearSession,
    startSession,
  } = useInterviewStore(
    useShallow((s) => ({
      isModalOpen: s.isModalOpen,
      session: s.session,
      extractionResult: s.extractionResult,
      error: s.error,
      closeModal: s.closeModal,
      setSessionStatus: s.setSessionStatus,
      clearSession: s.clearSession,
      startSession: s.startSession,
    }))
  );

  const { messages, append, setMessages, isLoading, endSession, abort } = useInterviewChat();
  const { addPerson, addRelationship, createEpisode, addParticipation, persons, activeChartId } = useGraphStore(
    useShallow((s) => ({
      addPerson: s.addPerson,
      addRelationship: s.addRelationship,
      createEpisode: s.createEpisode,
      addParticipation: s.addParticipation,
      persons: s.persons,
      activeChartId: s.activeChartId,
    }))
  );
  const isConfigured = useAiSettingsStore((s) => s.isConfigured);

  /** 初回AI質問を送信済みかを追跡（モーダルオープン時に一度だけ実行） */
  const hasInitiatedRef = useRef(false);

  /**
   * モーダルが開いたときにセッションを開始する
   * セッション開始と AI への初回送信を分離し、session が確立されてから append を呼ぶ。
   */
  useEffect(() => {
    if (!isModalOpen) {
      hasInitiatedRef.current = false;
      return;
    }
    // セッションがない場合は新規作成
    if (!session) {
      startSession(activeChartId ?? 'default');
    }
  }, [isModalOpen, session, startSession, activeChartId]);

  /**
   * セッションが確立されたあとに AI への初回質問を1回だけ送信する
   */
  useEffect(() => {
    if (!isModalOpen || !session || hasInitiatedRef.current) return;
    if (!isConfigured()) return;
    hasInitiatedRef.current = true;
    // ダミーのシステムメッセージを送り、AIに最初の質問を生成させる
    void append({
      role: 'user',
      content: 'インタビューを開始してください。',
    });
  }, [isModalOpen, session, isConfigured, append]);

  /**
   * セッションが completed になったらモーダルを閉じる
   * ストリーミング中の場合は abort() で確実に中断してからクリアする
   */
  useEffect(() => {
    if (session?.status === 'completed') {
      abort();
      closeModal();
      clearSession();
      setMessages([]);
    }
  }, [session?.status, abort, closeModal, clearSession, setMessages]);

  /**
   * モーダルを閉じてセッションをクリアする
   * ストリーミング中の場合は abort() で確実に中断してからクリアする
   */
  const handleClose = useCallback(() => {
    abort();
    closeModal();
    clearSession();
    setMessages([]);
    hasInitiatedRef.current = false;
  }, [abort, closeModal, clearSession, setMessages]);

  /**
   * handleClose の最新参照を保持する ref（Escape キーの stale closure を防ぐ）
   */
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  /**
   * Escape キーでモーダルを閉じる
   */
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  /**
   * ユーザーメッセージを送信する
   */
  const handleSubmit = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      void append({ role: 'user', content: text });
    },
    [append, isLoading]
  );

  /**
   * 抽出結果を相関図に反映する
   *
   * 3 パスで人物・関係・エピソードをストアに追加する:
   *   1. resolveExtractionResult で新規人物を特定し addPerson で追加
   *   2. 追加後のストア状態で関係とエピソードを解決
   *   3. エピソードを createEpisode で追加し、参加エッジを addParticipation で追加
   */
  const handleConfirm = useCallback(() => {
    if (!extractionResult) return;

    // 1パス目: 新規人物を追加（ユーザーオーバーライドなし）
    const { newPersons } = resolveExtractionResult(extractionResult, persons, new Map());
    newPersons.forEach((person) => addPerson({ name: person.name, labels: person.labels, properties: {} }));

    // 2パス目: 人物追加後のストア状態で関係とエピソードを解決
    const updatedPersons = useGraphStore.getState().persons;
    const { relationships: resolvedRelationships, episodes } = resolveExtractionResult(
      extractionResult,
      updatedPersons,
      new Map(),
    );
    resolvedRelationships.forEach((rel) => addRelationship(rel));

    // 3パス目: エピソード作成＋参加エッジ追加
    for (const ep of episodes) {
      const episodeId = createEpisode({
        title: ep.title,
        description: ep.description,
        occurredAt: ep.occurredAt,
      });
      for (const personId of ep.participantPersonIds) {
        addParticipation({ episodeId, personId });
      }
    }

    setSessionStatus('completed');
  }, [extractionResult, persons, addPerson, addRelationship, createEpisode, addParticipation, setSessionStatus]);

  /**
   * 抽出結果をキャンセルしてインタビューに戻る
   */
  const handleCancelPreview = useCallback(() => {
    setSessionStatus('active');
  }, [setSessionStatus]);

  // モーダルが閉じている場合は何も描画しない
  if (!isModalOpen) return null;

  const sessionStatus = session?.status ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        // オーバーレイクリックで閉じる
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-modal-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden mx-4"
      >
        {/* ヘッダー */}
        <InterviewHeader
          sessionStatus={sessionStatus}
          isLoading={isLoading}
          onEndSession={endSession}
          onClose={handleClose}
        />

        {/* メインコンテンツ */}
        {sessionStatus === 'extracting' ? (
          /* 抽出中: ローディング表示 */
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-gray-600 text-sm">インタビュー内容を分析中です...</p>
            <p className="text-gray-400 text-xs">しばらくお待ちください</p>
          </div>
        ) : sessionStatus === 'preview' && extractionResult ? (
          /* プレビュー: 抽出結果確認（モーダル内インライン表示） */
          <InterviewExtractionPreview
            result={extractionResult}
            onConfirm={handleConfirm}
            onCancel={handleCancelPreview}
          />
        ) : (
          /* アクティブ: チャット */
          <>
            {/* エラー表示 */}
            {error && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* メッセージ一覧 */}
            <InterviewMessageList messages={messages} isLoading={isLoading} />

            {/* 入力エリア */}
            <InterviewInputArea isLoading={isLoading} onSubmit={handleSubmit} />
          </>
        )}
      </div>
    </div>
  );
}
