/**
 * ChatInputBar コンポーネント
 *
 * 画面下部に固定表示されるフローティングチャット入力バー。
 * テキストを入力し LLM に送信することで、人物・関係を自動抽出して相関図に追加できる。
 *
 * 主な機能:
 *   - テキスト入力エリア（自動拡張）
 *   - @メンション機能（@を入力すると人物候補ドロップダウンを表示）
 *   - LLM 抽出ステップ管理: input → loading → preview
 *   - IME（日本語入力）対応: 変換確定 Enter での誤送信を防ぐ
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { useExtractRelationships } from '@/hooks/useExtractRelationships';
import { useMention } from '@/hooks/useMention';
import { useGraphStore } from '@/stores/useGraphStore';
import { resolveExtractionResult } from '@/lib/person-matching';
import { MentionDropdown } from './MentionDropdown';
import { ExtractionPreviewPanel } from './ExtractionPreviewPanel';
import type { Person } from '@/types/person';

/** テキスト入力の最大文字数 */
const MAX_TEXT_LENGTH = 10000;
/** textarea の最大高さ（px） */
const MAX_TEXTAREA_HEIGHT = 180;

/**
 * ChatInputBar コンポーネント
 *
 * RelationshipGraph のキャンバス内、画面下部に absolute 配置される。
 */
export function ChatInputBar() {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { extract, isLoading, error, extractionResult, reset } = useExtractRelationships();

  const persons = useGraphStore((s) => s.persons);
  const addPerson = useGraphStore((s) => s.addPerson);
  const addRelationship = useGraphStore((s) => s.addRelationship);

  const {
    mentionQuery,
    selectedIndex,
    filteredPersons,
    handleTextChange,
    handleMentionKeyDown,
    selectMention,
    closeMention,
  } = useMention(persons);

  /**
   * textarea の高さを内容に合わせて自動調整する
   */
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  /**
   * テキスト変更ハンドラ
   * - textarea の高さを調整
   * - @メンション検出を更新
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      const cursorPos = e.target.selectionStart ?? newText.length;
      setText(newText);
      adjustHeight();
      handleTextChange(newText, cursorPos);
    },
    [adjustHeight, handleTextChange]
  );

  /**
   * キーダウンハンドラ
   * - @メンションドロップダウン表示中: ナビゲーションキーを処理
   * - Enter: 送信（IME 変換中は無視）
   * - Escape: プレビューやメンションを閉じる
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // メンションドロップダウン表示中は先に処理
      if (mentionQuery !== null) {
        if (
          e.key === 'ArrowDown' ||
          e.key === 'ArrowUp' ||
          e.key === 'Escape'
        ) {
          handleMentionKeyDown(e);
          return;
        }

        // Enter でハイライト中の候補を選択
        if (e.key === 'Enter') {
          if (e.nativeEvent.isComposing) return;

          const allOptions = [...filteredPersons];
          if (selectedIndex >= 0 && selectedIndex < allOptions.length) {
            e.preventDefault();
            const person = allOptions[selectedIndex];
            const cursorPos = textareaRef.current?.selectionStart ?? text.length;
            const { newText, newCursorPos } = selectMention(person, text, cursorPos);
            setText(newText);
            // カーソルを挿入後の位置に移動（次のレンダリング後）
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = newCursorPos;
                textareaRef.current.selectionEnd = newCursorPos;
                adjustHeight();
              }
            }, 0);
            return;
          }

          // 「新規作成」オプションが selectedIndex に当たる場合
          const createIndex = filteredPersons.length;
          if (selectedIndex === createIndex && mentionQuery.trim() !== '') {
            e.preventDefault();
            handleCreateNew(mentionQuery.trim());
            return;
          }
        }
      }

      // Escape でプレビューを閉じる
      if (e.key === 'Escape') {
        if (extractionResult) {
          reset();
        }
        return;
      }

      // Enter（Shift なし）で送信（IME 変換中は無視）
      if (e.key === 'Enter' && !e.shiftKey) {
        if (e.nativeEvent.isComposing) return;
        e.preventDefault();
        handleSubmit();
      }
    },
    [
      mentionQuery,
      selectedIndex,
      filteredPersons,
      text,
      extractionResult,
      handleMentionKeyDown,
      selectMention,
      reset,
      adjustHeight,
    ]
  );

  /**
   * 「新規作成」を選択したとき: 人物をストアに追加してメンションを挿入する
   */
  const handleCreateNew = useCallback(
    (name: string) => {
      // ストアに人物を追加（即座にキャンバスにノードが表示される）
      addPerson({ name, labels: undefined });

      // 最新のストア状態から作成した人物を取得
      const updatedPersons = useGraphStore.getState().persons;
      const newPerson = updatedPersons.find((p: Person) => p.name === name);
      if (!newPerson) return;

      const cursorPos = textareaRef.current?.selectionStart ?? text.length;
      const { newText, newCursorPos } = selectMention(newPerson, text, cursorPos);
      setText(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          adjustHeight();
        }
      }, 0);
    },
    [addPerson, text, selectMention, adjustHeight]
  );

  /**
   * 既存人物を選択したとき
   */
  const handleSelectPerson = useCallback(
    (person: Person) => {
      const cursorPos = textareaRef.current?.selectionStart ?? text.length;
      const { newText, newCursorPos } = selectMention(person, text, cursorPos);
      setText(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
          adjustHeight();
        }
      }, 0);
    },
    [text, selectMention, adjustHeight]
  );

  /**
   * 送信ハンドラ: テキストを LLM に送信して関係を抽出する
   */
  const handleSubmit = useCallback(() => {
    if (!text.trim() || isLoading) return;
    void extract(text.trim());
  }, [text, isLoading, extract]);

  /**
   * 「相関図に追加」ボタンを押したときの処理
   *
   * 2 パスで人物と関係をストアに追加する（ExtractionModal と同じロジック）:
   *   1. resolveExtractionResult で新規人物を特定し addPerson で追加
   *   2. 追加後のストア状態で再度 resolveExtractionResult を呼び出し関係を解決
   */
  const handleConfirm = useCallback(() => {
    if (!extractionResult) return;

    // 1 パス目: 新規人物を追加
    const { newPersons } = resolveExtractionResult(extractionResult, persons, new Map());
    for (const person of newPersons) {
      addPerson({ name: person.name, labels: person.labels });
    }

    // 2 パス目: 追加後のストア状態で関係を解決
    const currentPersons = useGraphStore.getState().persons;
    const { relationships } = resolveExtractionResult(extractionResult, currentPersons, new Map());
    for (const rel of relationships) {
      addRelationship(rel);
    }

    // 入力とプレビューをリセット
    setText('');
    reset();
    setTimeout(() => adjustHeight(), 0);
  }, [extractionResult, persons, addPerson, addRelationship, reset, adjustHeight]);

  /**
   * キャンセルボタンを押したときの処理
   */
  const handleCancel = useCallback(() => {
    reset();
  }, [reset]);

  /**
   * textarea 外クリックでメンションドロップダウンを閉じる
   */
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (
        mentionQuery !== null &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeMention();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [mentionQuery, closeMention]);

  /** 現在のステップを判定 */
  const step: 'input' | 'loading' | 'preview' =
    isLoading ? 'loading' : extractionResult ? 'preview' : 'input';

  const canSubmit = text.trim().length > 0 && !isLoading;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-10 pointer-events-none"
    >
      <div className="relative pointer-events-auto">
        {/* 抽出プレビューパネル（preview ステップ時のみ表示） */}
        {step === 'preview' && extractionResult && (
          <ExtractionPreviewPanel
            result={extractionResult}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}

        {/* @メンション ドロップダウン */}
        {mentionQuery !== null && (
          <MentionDropdown
            query={mentionQuery}
            persons={filteredPersons}
            selectedIndex={selectedIndex}
            onSelect={handleSelectPerson}
            onCreateNew={handleCreateNew}
          />
        )}

        {/* 入力バー本体 */}
        <div
          className={`bg-white rounded-xl border shadow-lg transition-shadow ${
            isLoading
              ? 'border-blue-300 shadow-blue-100 animate-pulse'
              : 'border-gray-200 hover:shadow-xl'
          }`}
        >
          {/* エラー表示 */}
          {error && (
            <div className="px-4 pt-3 pb-0">
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={reset}
                  className="flex-shrink-0 text-red-400 hover:text-red-600"
                  aria-label="エラーを閉じる"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* テキスト入力エリア */}
          <div className="flex items-end gap-2 px-4 py-3">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onSelect={(e) => {
                // カーソル移動時にメンション検出を更新
                const cursorPos = (e.target as HTMLTextAreaElement).selectionStart ?? 0;
                handleTextChange(text, cursorPos);
              }}
              disabled={isLoading}
              maxLength={MAX_TEXT_LENGTH}
              rows={1}
              placeholder={
                isLoading
                  ? 'テキストを解析中...'
                  : '人物関係のテキストを入力（@で人物を指定）'
              }
              aria-label="AI テキスト入力"
              aria-controls={mentionQuery !== null ? 'mention-listbox' : undefined}
              aria-activedescendant={
                mentionQuery !== null && selectedIndex >= 0
                  ? `mention-option-${selectedIndex}`
                  : undefined
              }
              className="flex-1 resize-none outline-none text-sm text-gray-900 placeholder-gray-400 bg-transparent min-h-[24px] leading-relaxed disabled:opacity-60"
              style={{ maxHeight: `${MAX_TEXTAREA_HEIGHT}px`, overflowY: 'auto' }}
            />

            {/* 送信ボタン / ローディングスピナー */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-label="送信"
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
            </button>
          </div>

          {/* フッター: 文字数カウントとヒント */}
          <div className="px-4 pb-2 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              <kbd className="text-xs bg-gray-100 px-1 rounded">Shift+Enter</kbd> で改行
            </p>
            <p className="text-xs text-gray-400">
              {text.length > 0 && `${text.length.toLocaleString()} / ${MAX_TEXT_LENGTH.toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
