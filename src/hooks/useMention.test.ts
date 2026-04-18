/**
 * useMention フックのテスト
 *
 * @メンション機能のステートマシンを管理するカスタムフックのテスト。
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMention } from './useMention';
import type { Person } from '@/types/person';

const テスト人物リスト: Person[] = [
  { id: 'id-alice', name: '田中花子', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 'id-bob', name: '山田太郎', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 'id-carol', name: '鈴木一郎', createdAt: '2024-01-01T00:00:00.000Z' },
];

describe('useMention', () => {
  it('初期状態ではメンションドロップダウンが非表示', () => {
    const { result } = renderHook(() => useMention(テスト人物リスト));

    expect(result.current.mentionQuery).toBeNull();
    expect(result.current.filteredPersons).toEqual([]);
  });

  it('@入力でドロップダウンが開く', () => {
    const { result } = renderHook(() => useMention(テスト人物リスト));

    act(() => {
      result.current.handleTextChange('こんにちは @', 9);
    });

    expect(result.current.mentionQuery).toBe('');
    expect(result.current.filteredPersons).toHaveLength(テスト人物リスト.length);
  });

  it('@の後にクエリを入力するとフィルタリングされる', () => {
    const { result } = renderHook(() => useMention(テスト人物リスト));

    act(() => {
      result.current.handleTextChange('@田中', 3);
    });

    expect(result.current.mentionQuery).toBe('田中');
    expect(result.current.filteredPersons).toHaveLength(1);
    expect(result.current.filteredPersons[0].name).toBe('田中花子');
  });

  it('スペースを入力するとドロップダウンが閉じる', () => {
    const { result } = renderHook(() => useMention(テスト人物リスト));

    act(() => {
      result.current.handleTextChange('@田中', 3);
    });
    expect(result.current.mentionQuery).toBe('田中');

    act(() => {
      result.current.handleTextChange('@田中 ', 5);
    });
    expect(result.current.mentionQuery).toBeNull();
  });

  it('selectMention でテキストにメンションが挿入される', () => {
    const { result } = renderHook(() => useMention(テスト人物リスト));
    const callback = { text: '', cursorPos: 0 };

    act(() => {
      result.current.handleTextChange('@田中', 3);
    });

    act(() => {
      const inserted = result.current.selectMention(テスト人物リスト[0], '@田中', 3);
      callback.text = inserted.newText;
      callback.cursorPos = inserted.newCursorPos;
    });

    // @田中 → @田中花子 に置換され、末尾にスペースが追加される
    expect(callback.text).toBe('@田中花子 ');
    // ドロップダウンが閉じる
    expect(result.current.mentionQuery).toBeNull();
  });

  it('selectMention でテキストの途中のメンションが置換される', () => {
    const { result } = renderHook(() => useMention(テスト人物リスト));

    act(() => {
      result.current.handleTextChange('前置き @田 後続', 6);
    });

    let insertedText = '';
    act(() => {
      const inserted = result.current.selectMention(テスト人物リスト[0], '前置き @田 後続', 6);
      insertedText = inserted.newText;
    });

    // '@田' が '@田中花子 ' に置換される
    expect(insertedText).toBe('前置き @田中花子  後続');
  });

  it('closeMention でドロップダウンが閉じる', () => {
    const { result } = renderHook(() => useMention(テスト人物リスト));

    act(() => {
      result.current.handleTextChange('@田中', 3);
    });
    expect(result.current.mentionQuery).toBe('田中');

    act(() => {
      result.current.closeMention();
    });
    expect(result.current.mentionQuery).toBeNull();
  });

  describe('selectedIndex のキーボードナビゲーション', () => {
    it('ドロップダウン表示時に selectedIndex は -1 で始まる', () => {
      const { result } = renderHook(() => useMention(テスト人物リスト));

      act(() => {
        result.current.handleTextChange('@', 1);
      });

      expect(result.current.selectedIndex).toBe(-1);
    });

    it('ArrowDown で selectedIndex が増加する', () => {
      const { result } = renderHook(() => useMention(テスト人物リスト));

      act(() => {
        result.current.handleTextChange('@', 1);
      });

      act(() => {
        result.current.handleMentionKeyDown({
          key: 'ArrowDown',
          preventDefault: () => {},
          nativeEvent: { isComposing: false },
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('ArrowUp で selectedIndex が減少する（下限は -1）', () => {
      const { result } = renderHook(() => useMention(テスト人物リスト));

      act(() => {
        result.current.handleTextChange('@', 1);
      });

      // まず下に2つ移動
      act(() => {
        result.current.handleMentionKeyDown({
          key: 'ArrowDown',
          preventDefault: () => {},
          nativeEvent: { isComposing: false },
        } as unknown as React.KeyboardEvent);
      });
      act(() => {
        result.current.handleMentionKeyDown({
          key: 'ArrowDown',
          preventDefault: () => {},
          nativeEvent: { isComposing: false },
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.selectedIndex).toBe(1);

      // 上に戻る
      act(() => {
        result.current.handleMentionKeyDown({
          key: 'ArrowUp',
          preventDefault: () => {},
          nativeEvent: { isComposing: false },
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.selectedIndex).toBe(0);

      // -1 以下にならない
      act(() => {
        result.current.handleMentionKeyDown({
          key: 'ArrowUp',
          preventDefault: () => {},
          nativeEvent: { isComposing: false },
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.selectedIndex).toBe(-1);
    });

    it('Escape でドロップダウンが閉じる', () => {
      const { result } = renderHook(() => useMention(テスト人物リスト));

      act(() => {
        result.current.handleTextChange('@', 1);
      });
      expect(result.current.mentionQuery).toBe('');

      act(() => {
        result.current.handleMentionKeyDown({
          key: 'Escape',
          preventDefault: () => {},
          nativeEvent: { isComposing: false },
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.mentionQuery).toBeNull();
    });
  });
});
