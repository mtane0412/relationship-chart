/**
 * useMention カスタムフック
 *
 * チャット入力バーの @メンション機能のステートマシンを管理する。
 * テキストの変化を監視し、@ トリガーを検出してドロップダウンの開閉と
 * キーボードナビゲーションを制御する。
 */

'use client';

import { useState, useCallback } from 'react';
import type { Person } from '@/types/person';
import {
  extractMentionQuery,
  filterPersonsByQuery,
} from '@/lib/mention-utils';

/**
 * selectMention の戻り値型
 */
export type MentionInsertResult = {
  /** メンション挿入後の新しいテキスト */
  newText: string;
  /** 挿入後の新しいカーソル位置 */
  newCursorPos: number;
};

/**
 * useMention フックの戻り値型
 */
export type UseMentionReturn = {
  /** アクティブなメンションのクエリ（null の場合はドロップダウン非表示） */
  mentionQuery: string | null;
  /** テキスト内の @ の開始インデックス */
  mentionStartIndex: number;
  /** キーボードナビゲーション用の選択インデックス（-1 = 未選択） */
  selectedIndex: number;
  /** クエリでフィルタリングされた人物リスト */
  filteredPersons: Person[];
  /**
   * テキストとカーソル位置が変化したときに呼び出す
   * @メンションの検出とドロップダウンの更新を行う
   */
  handleTextChange: (text: string, cursorPosition: number) => void;
  /**
   * ドロップダウン表示中のキーダウンイベントを処理する
   * ArrowUp/Down でナビゲーション、Escape でドロップダウンを閉じる
   */
  handleMentionKeyDown: (e: React.KeyboardEvent) => void;
  /**
   * 人物を選択してテキストにメンションを挿入する
   * @returns 新しいテキストと新しいカーソル位置
   */
  selectMention: (person: Person, currentText: string, cursorPosition: number) => MentionInsertResult;
  /** ドロップダウンを閉じる */
  closeMention: () => void;
};

/**
 * @メンション機能のステートマシンを管理するカスタムフック
 *
 * @param persons - メンション候補の人物リスト（ストアから取得する）
 * @returns メンション機能の状態と操作関数
 */
export function useMention(persons: Person[]): UseMentionReturn {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // クエリでフィルタリングした候補リスト
  const filteredPersons =
    mentionQuery !== null ? filterPersonsByQuery(mentionQuery, persons) : [];

  /**
   * テキストとカーソル位置が変化したときに @メンション を検出する
   */
  const handleTextChange = useCallback((text: string, cursorPosition: number) => {
    const result = extractMentionQuery(text, cursorPosition);

    if (result !== null) {
      setMentionQuery(result.query);
      setMentionStartIndex(result.startIndex);
      setSelectedIndex(-1);
    } else {
      setMentionQuery(null);
      setSelectedIndex(-1);
    }
  }, []);

  /**
   * ドロップダウン表示中のキーダウンイベントを処理する
   */
  const handleMentionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (mentionQuery === null) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      setMentionQuery(null);
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev + 1;
        // フィルタリングされた候補数は呼び出し時点では不明なので、
        // 上限チェックは MentionDropdown 側で実施する
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    }
  }, [mentionQuery]);

  /**
   * 人物を選択してテキストにメンションを挿入する
   *
   * カーソル位置の @ からクエリ末尾までを「@人物名 」に置換する。
   */
  const selectMention = useCallback(
    (person: Person, currentText: string, cursorPosition: number): MentionInsertResult => {
      // @startIndex から cursorPosition までを「@人物名 」に置換
      const before = currentText.slice(0, mentionStartIndex);
      const after = currentText.slice(cursorPosition);
      const insertedMention = `@${person.name} `;
      const newText = before + insertedMention + after;
      const newCursorPos = mentionStartIndex + insertedMention.length;

      setMentionQuery(null);
      setSelectedIndex(-1);

      return { newText, newCursorPos };
    },
    [mentionStartIndex]
  );

  /**
   * ドロップダウンを閉じる
   */
  const closeMention = useCallback(() => {
    setMentionQuery(null);
    setSelectedIndex(-1);
  }, []);

  return {
    mentionQuery,
    mentionStartIndex,
    selectedIndex,
    filteredPersons,
    handleTextChange,
    handleMentionKeyDown,
    selectMention,
    closeMention,
  };
}
