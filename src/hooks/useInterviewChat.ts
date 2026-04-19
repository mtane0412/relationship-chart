/**
 * AIインタビュアー チャットフック
 *
 * ストリーミングチャット機能を提供するフック。
 * AI SDK の useChat ではなく、fetch + ReadableStream でストリーミングを手動処理する。
 * これは AI SDK v6 の useChat API が大幅に変更されたため、
 * 既存プロジェクトのパターン（手動 fetch）と一致させるためである。
 *
 * 主な機能:
 *   - テキストストリーミングチャット（ReadableStream でリアルタイム表示）
 *   - メッセージ履歴の管理
 *   - セッション終了時のインタビュー内容一括抽出
 */

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useInterviewStore } from '@/stores/useInterviewStore';
import { useAiSettingsStore } from '@/stores/useAiSettingsStore';
import { useGraphStore } from '@/stores/useGraphStore';
import { LlmExtractionResultSchema } from '@/lib/llm-extraction-schema';
import type { Relationship } from '@/types/relationship';
import { nanoid } from 'nanoid';

/**
 * チャットメッセージの型（表示用）
 */
export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

/**
 * 関係を人間が読みやすいサマリ文字列に変換する
 */
function buildRelationshipSummary(
  rel: Relationship,
  personNames: Map<string, string>,
): string {
  const sourceName = personNames.get(rel.sourceId) ?? '不明';
  const targetName = personNames.get(rel.targetId) ?? '不明';
  const type = rel.type || rel.label || '関係あり';
  return `${sourceName}と${targetName}は${type}`;
}

/**
 * AIインタビュアーとのチャットを管理するフック
 */
export function useInterviewChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  /** ストリーミング中断用の AbortController */
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 同期的な多重送信を防ぐための ref フラグ
   * isLoading は React state のため非同期更新で短時間の連続操作だと false のまま複数 fetch が走る危険がある
   */
  const isStreamingRef = useRef(false);

  /**
   * メッセージの最新値を参照するための ref（append の依存配列から messages を外すため）
   * React の state は async コールバックから直接参照すると古い値になる可能性があるため ref で管理する
   */
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const { session, setSessionStatus, setExtractionResult, setError } = useInterviewStore(
    useShallow((s) => ({
      session: s.session,
      setSessionStatus: s.setSessionStatus,
      setExtractionResult: s.setExtractionResult,
      setError: s.setError,
    }))
  );
  const { openRouterApiKey, openRouterModel, isConfigured } = useAiSettingsStore(
    useShallow((s) => ({
      openRouterApiKey: s.openRouterApiKey,
      openRouterModel: s.openRouterModel,
      isConfigured: s.isConfigured,
    }))
  );

  // persons・relationships・episodes を一つのセレクタで取得してサブスクリプションを減らす
  const { persons, relationships, episodes } = useGraphStore(
    useShallow((s) => ({ persons: s.persons, relationships: s.relationships, episodes: s.episodes }))
  );

  // 既存人物名・関係サマリ・エピソードタイトルを persons/relationships/episodes が変化したときのみ再計算する
  const { existingPersonNames, existingRelationshipSummaries, existingEpisodeTitles } = useMemo(() => {
    const personNames = new Map(persons.map((p) => [p.id, p.name]));
    return {
      existingPersonNames: persons.map((p) => p.name),
      existingRelationshipSummaries: relationships.map((rel) =>
        buildRelationshipSummary(rel, personNames)
      ),
      existingEpisodeTitles: episodes.map((e) => e.title),
    };
  }, [persons, relationships, episodes]);

  /**
   * 進行中のストリーミング fetch を中断する
   * モーダルクローズ時やセッション完了時に呼び出す
   */
  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  /**
   * ユーザーメッセージを送信してストリーミングで AI 応答を受信する
   *
   * @param message - 送信するユーザーメッセージ（role は常に 'user'）
   */
  const append = useCallback(
    async (message: { role: 'user'; content: string }) => {
      // 同期的な多重送信を防ぐ（isLoading は非同期更新のため ref で確実にガード）
      if (isLoading || isStreamingRef.current) return;

      // APIキー未設定の場合はユーザーに通知して中断する
      if (!isConfigured()) {
        setError('OpenRouter APIキーが設定されていません。設定画面からAPIキーを入力してください。');
        return;
      }

      isStreamingRef.current = true;

      // ユーザーメッセージを履歴に追加
      const userMessage: ChatMessage = {
        id: nanoid(),
        role: 'user',
        content: message.content,
      };

      // AI応答のプレースホルダーを作成
      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: '',
      };

      // messagesRef から現在のメッセージ一覧を取得（依存配列に messages を含めないため）
      const currentMessages = messagesRef.current;
      const updatedMessages = [...currentMessages, userMessage];
      setMessages([...updatedMessages, assistantMessage]);
      setIsLoading(true);
      setChatError(null);

      // AbortController を作成してストリーミング中断を可能にする
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch('/api/interview-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
            existingPersonNames,
            existingRelationshipSummaries,
            existingEpisodeTitles,
            apiKey: openRouterApiKey,
            model: openRouterModel,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`チャットAPIエラー: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('レスポンスボディが空です。');
        }

        // ストリーミング応答を読み取る
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          // AI応答メッセージを更新（ストリーミング中）
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg?.role === 'assistant') {
              return [
                ...newMessages.slice(0, -1),
                { ...lastMsg, content: assistantContent },
              ];
            }
            return newMessages;
          });
        }

        // 最終フラッシュ: マルチバイト文字が chunk 境界で分断された場合に残りバッファを取り出す
        const remaining = decoder.decode();
        if (remaining) {
          assistantContent += remaining;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg?.role === 'assistant') {
              return [...newMessages.slice(0, -1), { ...lastMsg, content: assistantContent }];
            }
            return newMessages;
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // 中断は正常
          return;
        }
        const errMessage = err instanceof Error ? err.message : 'チャットに失敗しました。';
        // chatError（ローカル）と store.error の両方にセットしてUIに確実に表示する
        setChatError(errMessage);
        setError(errMessage);
        // エラー時はプレースホルダーを削除
        setMessages(updatedMessages);
      } finally {
        isStreamingRef.current = false;
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      isLoading,
      isConfigured,
      existingPersonNames,
      existingRelationshipSummaries,
      existingEpisodeTitles,
      openRouterApiKey,
      openRouterModel,
      setError,
    ]
  );

  /**
   * インタビューセッションを終了して、チャット履歴からデータを抽出する
   */
  const endSession = useCallback(async () => {
    if (!session) return;

    if (!isConfigured()) {
      setError('OpenRouter APIキーが設定されていません。設定画面からAPIキーを入力してください。');
      return;
    }

    // ストリーミング中断
    abortControllerRef.current?.abort();

    setSessionStatus('extracting');
    setError(null);

    // タイムアウト用の AbortController を設定する
    const extractAbortController = new AbortController();
    const timeoutId = setTimeout(() => extractAbortController.abort(), 60000);

    try {
      // messagesRef から現在のメッセージ一覧を取得
      const chatHistory = messagesRef.current.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/interview-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory,
          existingPersonNames,
          existingEpisodeTitles,
          apiKey: openRouterApiKey,
          model: openRouterModel,
        }),
        signal: extractAbortController.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`抽出APIエラー: ${response.status}`);
      }

      const data: unknown = await response.json();
      const parsed = LlmExtractionResultSchema.safeParse(data);

      if (!parsed.success) {
        throw new Error('抽出結果の形式が正しくありません。');
      }

      setExtractionResult(parsed.data);
      setSessionStatus('preview');
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('タイムアウトが発生しました。再試行してください。');
        setSessionStatus('active');
        return;
      }
      const errMessage = err instanceof Error ? err.message : '抽出に失敗しました。';
      setError(errMessage);
      setSessionStatus('active');
    }
  }, [
    session,
    isConfigured,
    openRouterApiKey,
    openRouterModel,
    existingPersonNames,
    existingEpisodeTitles,
    setSessionStatus,
    setExtractionResult,
    setError,
  ]);

  return {
    messages,
    setMessages,
    append,
    isLoading,
    chatError,
    endSession,
    abort,
  };
}
