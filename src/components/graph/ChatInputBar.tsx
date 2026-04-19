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

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Sparkles, Loader2, X, MessageSquare } from 'lucide-react';
import { useInterviewStore } from '@/stores/useInterviewStore';
import { useExtractRelationships } from '@/hooks/useExtractRelationships';
import { useMention } from '@/hooks/useMention';
import { useGraphStore } from '@/stores/useGraphStore';
import { resolveExtractionResult } from '@/lib/person-matching';
import { findCommonPrefix, findMentionRanges } from '@/lib/mention-utils';
import { MentionDropdown } from './MentionDropdown';
import { ExtractionPreviewPanel } from './ExtractionPreviewPanel';
import type { Person } from '@/types/person';

/** テキスト入力の最大文字数 */
const MAX_TEXT_LENGTH = 10000;
/** textarea の最大高さ（px） */
const MAX_TEXTAREA_HEIGHT = 180;

/**
 * テキストを解析して @メンション部分をハイライトした React ノードを返す
 *
 * 有効なメンション（既存人物に一致する @名前）は青色バッジとして表示し、
 * それ以外は通常テキストとしてそのまま表示する。
 *
 * @param text - 入力テキスト
 * @param persons - 照合に使用する人物リスト
 * @returns ハイライト済みの React ノード
 */
function renderHighlightedText(text: string, persons: Person[], presorted = false): React.ReactNode {
  if (!text) return null;

  const ranges = findMentionRanges(text, persons, presorted);
  if (ranges.length === 0) {
    return <span className="text-gray-900">{text}</span>;
  }

  const nodes: React.ReactNode[] = [];
  let pos = 0;

  for (const range of ranges) {
    // メンション前の通常テキスト
    if (pos < range.start) {
      nodes.push(
        <span key={`t-${pos}`} className="text-gray-900">
          {text.slice(pos, range.start)}
        </span>
      );
    }
    // ハイライトされた @メンション
    nodes.push(
      <mark
        key={`m-${range.start}`}
        className="bg-blue-100 text-blue-700 rounded-sm not-italic"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(59, 130, 246, 0.18)' }}
      >
        {text.slice(range.start, range.end)}
      </mark>
    );
    pos = range.end;
  }

  // 残りの通常テキスト
  if (pos < text.length) {
    nodes.push(
      <span key={`t-${pos}`} className="text-gray-900">
        {text.slice(pos)}
      </span>
    );
  }

  return <>{nodes}</>;
}

/**
 * ChatInputBar コンポーネント
 *
 * RelationshipGraph のキャンバス内、画面下部に absolute 配置される。
 */
export function ChatInputBar() {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /** ハイライトオーバーレイの DOM 参照（スクロール同期に使用） */
  const overlayRef = useRef<HTMLDivElement>(null);

  const { extract, isLoading, error, extractionResult, reset } = useExtractRelationships();

  const persons = useGraphStore((s) => s.persons);
  const addPerson = useGraphStore((s) => s.addPerson);
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const createEpisode = useGraphStore((s) => s.createEpisode);
  const addParticipation = useGraphStore((s) => s.addParticipation);

  /**
   * ハイライト計算用: 人物を名前の長さ降順にソートしてキャッシュする
   * findMentionRanges は入力中に高頻度で呼ばれるため、ソートコストをレンダーループから外す
   */
  const sortedPersonsForHighlight = useMemo(
    () => [...persons].sort((a, b) => b.name.length - a.name.length),
    [persons]
  );

  const {
    mentionQuery,
    mentionStartIndex,
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
    const newHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${newHeight}px`;
    // オーバーレイの高さも同期
    if (overlayRef.current) {
      overlayRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  /**
   * textarea のスクロール位置をオーバーレイに同期する
   * （textarea がスクロールした時にオーバーレイも追従させる）
   */
  const syncScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
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
   * 「新規作成」を選択したとき: 人物をストアに追加してメンションを挿入する
   */
  const handleCreateNew = useCallback(
    (name: string) => {
      // ストアに人物を追加（即座にキャンバスにノードが表示される）
      addPerson({ name, labels: ['人物'], properties: {} });

      // 最新のストア状態から作成した人物を取得（同名が複数いる場合は最新を使用）
      const updatedPersons = useGraphStore.getState().persons;
      const newPerson = [...updatedPersons]
        .filter((p: Person) => p.name === name)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (!newPerson) return;

      const cursorPos = textareaRef.current?.selectionStart ?? text.length;
      const { newText, newCursorPos } = selectMention(newPerson, text, cursorPos);
      setText(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          adjustHeight();
        }
      }, 0);
    },
    [addPerson, text, selectMention, adjustHeight]
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

          if (selectedIndex >= 0 && selectedIndex < filteredPersons.length) {
            e.preventDefault();
            const person = filteredPersons[selectedIndex];
            const cursorPos = textareaRef.current?.selectionStart ?? text.length;
            const { newText, newCursorPos } = selectMention(person, text, cursorPos);
            setText(newText);
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

        // Tab: ターミナル補完（共通プレフィックスを補完 or 唯一の候補を選択）
        if (e.key === 'Tab') {
          if (e.nativeEvent.isComposing) return;
          e.preventDefault();

          if (filteredPersons.length === 1) {
            // 候補が 1 件のみ: そのまま選択（Enterと同じ動作）
            const cursorPos = textareaRef.current?.selectionStart ?? text.length;
            const { newText, newCursorPos } = selectMention(filteredPersons[0], text, cursorPos);
            setText(newText);
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = newCursorPos;
                textareaRef.current.selectionEnd = newCursorPos;
                adjustHeight();
              }
            }, 0);
          } else if (filteredPersons.length > 1) {
            // 複数候補: 共通プレフィックスまで補完（ターミナル補完）
            const commonPrefix = findCommonPrefix(filteredPersons.map((p) => p.name));
            if (commonPrefix.length > mentionQuery.length) {
              // @ の次の文字からカーソルまでを共通プレフィックスで置換
              const cursorPos = textareaRef.current?.selectionStart ?? text.length;
              const before = text.slice(0, mentionStartIndex + 1); // @ を含む
              const after = text.slice(cursorPos);
              const newText = before + commonPrefix + after;
              const newCursorPos = mentionStartIndex + 1 + commonPrefix.length;
              setText(newText);
              // メンション状態を更新
              handleTextChange(newText, newCursorPos);
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.selectionStart = newCursorPos;
                  textareaRef.current.selectionEnd = newCursorPos;
                  adjustHeight();
                }
              }, 0);
            }
          }
          return;
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
      mentionStartIndex,
      selectedIndex,
      filteredPersons,
      text,
      extractionResult,
      handleMentionKeyDown,
      handleTextChange,
      handleCreateNew,
      selectMention,
      reset,
      adjustHeight,
    ]
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
   * 3 パスで人物・関係・エピソードをストアに追加する:
   *   1. resolveExtractionResult で新規人物を特定し addPerson で追加
   *   2. 追加後のストア状態で関係とエピソードを解決
   *   3. エピソードを createEpisode で追加し、参加エッジを addParticipation で追加
   */
  const handleConfirm = useCallback(() => {
    if (!extractionResult) return;

    // 1 パス目: 新規人物を追加
    const { newPersons } = resolveExtractionResult(extractionResult, persons, new Map());
    for (const person of newPersons) {
      addPerson({ name: person.name, labels: person.labels, properties: {} });
    }

    // 2 パス目: 追加後のストア状態で関係とエピソードを解決
    const currentPersons = useGraphStore.getState().persons;
    const { relationships, episodes } = resolveExtractionResult(extractionResult, currentPersons, new Map());
    for (const rel of relationships) {
      addRelationship(rel);
    }

    // 3 パス目: エピソード作成＋参加エッジ追加
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

    // 入力とプレビューをリセット
    setText('');
    reset();
    setTimeout(() => adjustHeight(), 0);
  }, [extractionResult, persons, addPerson, addRelationship, createEpisode, addParticipation, reset, adjustHeight]);

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

          {/* テキスト入力エリア（ハイライトオーバーレイ + textarea の重ね合わせ） */}
          <div className="flex items-end gap-2 px-4 py-3">
            {/* textarea とオーバーレイを relative コンテナで包む */}
            <div className="relative flex-1" style={{ minHeight: '24px' }}>
              {/*
               * ハイライトオーバーレイ
               * - textarea と同じフォント・行間を持つ div
               * - pointer-events: none で textarea のインタラクションを妨げない
               * - 有効な @メンション を青色ハイライトで表示
               */}
              <div
                ref={overlayRef}
                aria-hidden="true"
                className="absolute inset-0 text-sm leading-relaxed pointer-events-none overflow-hidden select-none"
                style={{
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  // textarea のデフォルトパディングと揃えるため同じ値を指定
                  padding: 0,
                }}
              >
                {renderHighlightedText(text, sortedPersonsForHighlight, true)}
                {/* 末尾スペース: 最終行が空行の場合に高さが崩れないようにする */}
                {'\u00a0'}
              </div>

              {/* 実際の入力 textarea（テキストは透明、カーソルのみ表示） */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
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
                  // ドロップダウンが表示されており、selectedIndex が表示範囲内の場合のみ設定する
                  mentionQuery !== null &&
                  selectedIndex >= 0 &&
                  (filteredPersons.length > 0 || mentionQuery.trim() !== '')
                    ? `mention-option-${selectedIndex}`
                    : undefined
                }
                className="relative w-full resize-none outline-none text-sm leading-relaxed bg-transparent placeholder-gray-400 disabled:opacity-60"
                style={{
                  // テキストを透明化してオーバーレイの色を見せる
                  color: 'transparent',
                  caretColor: '#111827', // gray-900: カーソルは通常通り表示
                  maxHeight: `${MAX_TEXTAREA_HEIGHT}px`,
                  overflowY: 'auto',
                  minHeight: '24px',
                  padding: 0,
                }}
              />
            </div>

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
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400">
                <kbd className="text-xs bg-gray-100 px-1 rounded">Shift+Enter</kbd> で改行
              </p>
              {/* AIインタビューモードを開くボタン */}
              <button
                type="button"
                onClick={() => useInterviewStore.getState().openModal()}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                aria-label="AIインタビューを開始"
              >
                <MessageSquare size={12} />
                チャットを開始
              </button>
            </div>
            <p className="text-xs text-gray-400">
              {text.length > 0 && `${text.length.toLocaleString()} / ${MAX_TEXT_LENGTH.toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
