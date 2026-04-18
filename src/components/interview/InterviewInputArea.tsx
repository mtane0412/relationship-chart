/**
 * InterviewInputArea コンポーネント
 *
 * インタビューチャットモーダルのテキスト入力エリア。
 * IME（日本語入力）対応: 変換確定 Enter での誤送信を防ぐ。
 * Enter で送信、Shift+Enter で改行。
 * ストリーミング中は入力を無効化する。
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { SendHorizonal } from 'lucide-react';

/** textarea の最大高さ（px） */
const MAX_TEXTAREA_HEIGHT = 120;

/** テキスト入力の最大文字数 */
const MAX_TEXT_LENGTH = 2000;

/**
 * InterviewInputArea の Props
 */
type InterviewInputAreaProps = {
  /** ストリーミング中フラグ（送信を無効化する） */
  isLoading: boolean;
  /** テキスト送信コールバック */
  onSubmit: (text: string) => void;
};

/**
 * インタビューチャットの入力エリア
 *
 * ChatInputBar の実装パターンを踏襲し、IME 対応と自動リサイズを実装する。
 */
export function InterviewInputArea({ isLoading, onSubmit }: InterviewInputAreaProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * textarea の高さを内容に合わせて自動調整する
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  /**
   * テキスト変更ハンドラ
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      if (newText.length > MAX_TEXT_LENGTH) return;
      setText(newText);
      // 高さ調整は次のフレームで実行（DOM更新後）
      requestAnimationFrame(adjustTextareaHeight);
    },
    [adjustTextareaHeight]
  );

  /**
   * テキストを送信してフォームをリセットする
   */
  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setText('');
    // 高さをリセット後、フォーカスを戻してユーザーが続けて入力できるようにする
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  }, [text, isLoading, onSubmit]);

  /**
   * キーダウンハンドラ
   * - Enter（Shift なし）: 送信（IME変換中は無視）
   * - Shift+Enter: 改行
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // IME変換中のEnterは無視（日本語入力の変換確定時の誤動作を防ぐ）
        if (e.nativeEvent.isComposing) return;
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const isSubmitDisabled = isLoading || text.trim().length === 0;
  /** 文字数カウンターを表示する閾値（MAX_TEXT_LENGTH の 80%） */
  const COUNTER_THRESHOLD = Math.floor(MAX_TEXT_LENGTH * 0.8);
  const showCounter = text.length >= COUNTER_THRESHOLD;
  const isOverLimit = text.length >= MAX_TEXT_LENGTH;

  return (
    <div className="border-t border-gray-200 p-3 flex-shrink-0">
      <div className="flex items-end gap-2">
        {/* テキスト入力エリア */}
        <div className="flex-1 flex flex-col gap-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'AIが応答中...' : 'メッセージを入力（Enter で送信、Shift+Enter で改行）'}
            disabled={isLoading}
            rows={1}
            aria-label="メッセージ入力"
            className={`resize-none overflow-hidden text-sm text-gray-900 bg-gray-50 border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${
              isOverLimit
                ? 'border-red-400 focus:ring-red-400'
                : 'border-gray-200 focus:ring-blue-400'
            }`}
            style={{ minHeight: '40px', maxHeight: `${MAX_TEXTAREA_HEIGHT}px` }}
          />
          {/* 文字数カウンター（閾値を超えた場合に表示） */}
          {showCounter && (
            <p className={`text-xs text-right ${isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
            </p>
          )}
        </div>

        {/* 送信ボタン */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          aria-label="送信"
          className="flex-shrink-0 p-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <SendHorizonal size={16} />
        </button>
      </div>
    </div>
  );
}
