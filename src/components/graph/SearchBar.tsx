/**
 * 検索バーコンポーネント
 *
 * キャンバス上部中央に配置される検索UI。
 * 人物名と関係ラベルをインクリメンタル検索し、選択した要素にフォーカスします。
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { Search } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { searchGraph, type SearchResult } from '@/lib/search-utils';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';

/**
 * 検索バーコンポーネント
 *
 * Cmd+K / Ctrl+K で開閉できる検索ウィンドウを提供します。
 * 人物名と関係ラベルを部分一致検索し、選択した要素にキャンバスをフォーカスします。
 */
export default function SearchBar() {
  // 開閉状態
  const [isOpen, setIsOpen] = useState(false);
  // 検索クエリ
  const [query, setQuery] = useState('');
  // キーボードナビゲーション用のハイライト位置
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  // ストアから必要なデータを取得
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);
  const selectPerson = useGraphStore((state) => state.selectPerson);
  const setSelectedPersonIds = useGraphStore((state) => state.setSelectedPersonIds);

  // React Flowのフック
  const { getNode, setCenter } = useReactFlow();

  // 検索結果
  const results = searchGraph(query, persons, relationships);

  /**
   * 検索ウィンドウを開く
   */
  const openSearch = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(-1);
  }, []);

  /**
   * 検索ウィンドウを閉じる
   */
  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);
  }, []);

  /**
   * 検索ウィンドウの開閉をトグル
   */
  const toggleSearch = useCallback(() => {
    if (isOpen) {
      closeSearch();
    } else {
      openSearch();
    }
  }, [isOpen, openSearch, closeSearch]);

  /**
   * キーボードショートカット（Cmd+K / Ctrl+K）のハンドラ
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd+K (Mac) または Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        toggleSearch();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleSearch]);

  /**
   * 検索ウィンドウが開いたら入力フィールドにフォーカス
   */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  /**
   * 人物を選択してフォーカス
   */
  const focusPerson = useCallback(
    (personId: string) => {
      selectPerson(personId);
      const node = getNode(personId);
      if (node) {
        const center = getNodeCenter(node);
        setCenter(center.x, center.y, { duration: VIEWPORT_ANIMATION_DURATION });
      }
      closeSearch();
    },
    [selectPerson, getNode, setCenter, closeSearch]
  );

  /**
   * 関係を選択して両端の人物にフォーカス
   */
  const focusRelationship = useCallback(
    (sourcePersonId: string, targetPersonId: string) => {
      setSelectedPersonIds([sourcePersonId, targetPersonId]);

      // 2つのノードの中点を計算
      const sourceNode = getNode(sourcePersonId);
      const targetNode = getNode(targetPersonId);

      if (sourceNode && targetNode) {
        const sourceCenter = getNodeCenter(sourceNode);
        const targetCenter = getNodeCenter(targetNode);

        const midX = (sourceCenter.x + targetCenter.x) / 2;
        const midY = (sourceCenter.y + targetCenter.y) / 2;

        setCenter(midX, midY, { duration: VIEWPORT_ANIMATION_DURATION });
      }

      closeSearch();
    },
    [setSelectedPersonIds, getNode, setCenter, closeSearch]
  );

  /**
   * 検索結果を選択
   */
  const selectResult = useCallback(
    (result: SearchResult) => {
      if (result.kind === 'person') {
        focusPerson(result.id);
      } else if (result.kind === 'relationship' && result.sourcePersonId && result.targetPersonId) {
        focusRelationship(result.sourcePersonId, result.targetPersonId);
      }
    },
    [focusPerson, focusRelationship]
  );

  /**
   * 検索入力フィールドのキーダウンハンドラ
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => {
          const nextIndex = prev + 1;
          return nextIndex < results.length ? nextIndex : prev;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => {
          const nextIndex = prev - 1;
          return nextIndex >= 0 ? nextIndex : -1;
        });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          selectResult(results[selectedIndex]);
        }
      }
    },
    [closeSearch, results, selectedIndex, selectResult]
  );

  /**
   * 検索クエリが変更されたらハイライト位置をリセット
   */
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  // 閉じている状態では検索ボタンのみ表示
  if (!isOpen) {
    return (
      <Panel position="top-center">
        <button
          onClick={openSearch}
          className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium shadow-md hover:bg-gray-50"
          title="検索 (⌘K)"
          aria-label="検索"
        >
          <Search size={16} />
          <span className="hidden sm:inline">検索</span>
          <kbd className="hidden sm:inline rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
            ⌘K
          </kbd>
        </button>
      </Panel>
    );
  }

  // 開いている状態では検索入力フィールドと結果リストを表示
  return (
    <Panel position="top-center">
      <div className="w-96 rounded-lg bg-white shadow-xl">
        {/* 検索入力 */}
        <div className="border-b border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="人物名または関係を検索..."
              className="flex-1 outline-none text-sm"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={
                selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined
              }
            />
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">ESC</kbd>
          </div>
        </div>

        {/* 検索結果 */}
        <div
          id="search-results"
          role="listbox"
          className="max-h-96 overflow-y-auto"
        >
          {results.length === 0 && query.trim() !== '' ? (
            <div className="p-4 text-center text-sm text-gray-500">
              一致する結果がありません
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.kind}-${result.id}`}
                id={`search-result-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => selectResult(result)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                  index === selectedIndex ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      result.kind === 'person'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {result.kind === 'person' ? '人物' : '関係'}
                  </span>
                  <span>{result.label}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
