/**
 * InterviewMessageList コンポーネント
 *
 * AIインタビュアーとユーザーのチャットメッセージ一覧を表示する。
 * assistant（AI）は左寄せ・灰色背景、user は右寄せ・青色背景で表示する。
 * 新しいメッセージが追加されると自動スクロールする。
 */

'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/hooks/useInterviewChat';

/**
 * バウンスアニメーションするドットインジケーター
 *
 * @param size - ドットのサイズ（'sm': 4px / 'md': 6px）
 * @param className - 追加のクラス名（位置調整等に使用）
 */
function BouncingDots({ size = 'md', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const dotClass = size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5';
  return (
    <span className={`inline-flex gap-0.5 ${className}`} aria-label="応答中">
      <span className={`${dotClass} bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]`} />
      <span className={`${dotClass} bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]`} />
      <span className={`${dotClass} bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]`} />
    </span>
  );
}

/**
 * InterviewMessageList の Props
 */
type InterviewMessageListProps = {
  /** チャットメッセージ一覧 */
  messages: ChatMessage[];
  /** ストリーミング中フラグ（最後のメッセージに打ち込みアニメーションを表示） */
  isLoading: boolean;
};

/**
 * AIインタビュアーとユーザーのチャットメッセージ一覧
 *
 * メッセージがない場合はウェルカムメッセージを表示する。
 */
export function InterviewMessageList({ messages, isLoading }: InterviewMessageListProps) {
  /** 自動スクロール用のDOM参照 */
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら最下部にスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="text-gray-400 text-sm">
          <p className="font-medium text-gray-500 mb-1">インタビューを開始します</p>
          <p>AIがあなたの相関図に必要な情報を聞き取ります。</p>
          <p>会話が始まるまでお待ちください...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => {
        const isAssistant = message.role === 'assistant';
        // ストリーミング中の最後のAIメッセージ判定
        const isStreamingLast =
          isLoading && isAssistant && index === messages.length - 1;

        return (
          <div
            key={message.id}
            className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                isAssistant
                  ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  : 'bg-blue-600 text-white rounded-tr-sm'
              }`}
            >
              {/* メッセージ本文（改行対応） */}
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* ストリーミング中のアニメーション */}
              {isStreamingLast && <BouncingDots size="sm" className="ml-1 align-middle" />}
            </div>
          </div>
        );
      })}

      {/* AI が思考中でまだメッセージがない場合のアニメーション */}
      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
            <BouncingDots size="md" />
          </div>
        </div>
      )}

      {/* 自動スクロール用のアンカー要素 */}
      <div ref={bottomRef} />
    </div>
  );
}
