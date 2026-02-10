/**
 * 検索バーコンポーネント
 *
 * キャンバス上部中央に配置される検索UI。
 * 人物名と関係ラベルをインクリメンタル検索し、選択した要素にフォーカスします。
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { Search, User, Package, Link } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { searchGraph, type SearchResult } from '@/lib/search-utils';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';

/**
 * 検索バーコンポーネント
 *
 * Cmd+K / Ctrl+K で検索入力にフォーカスします。
 * 人物名と関係ラベルを部分一致検索し、選択した要素にキャンバスをフォーカスします。
 */
export default function SearchBar() {
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
   * キーボードショートカット（Cmd+K / Ctrl+K）で入力フィールドにフォーカス
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd+K (Mac) または Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      // 検索クエリをクリア
      setQuery('');
      setSelectedIndex(-1);
    },
    [selectPerson, getNode, setCenter]
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

      // 検索クエリをクリア
      setQuery('');
      setSelectedIndex(-1);
    },
    [setSelectedPersonIds, getNode, setCenter]
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
        // 検索クエリをクリア
        setQuery('');
        setSelectedIndex(-1);
        // 入力フィールドからフォーカスを外す
        if (inputRef.current) {
          inputRef.current.blur();
        }
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
    [results, selectedIndex, selectResult]
  );

  /**
   * 検索クエリが変更されたらハイライト位置をリセット
   */
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  // 常時展開済みの見た目で表示
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
              placeholder="⌘K"
              className="flex-1 outline-none text-sm"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={
                selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined
              }
            />
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
                    className={`flex items-center justify-center p-1 rounded ${
                      result.kind === 'person'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                    title={
                      result.kind === 'person'
                        ? result.nodeKind === 'item'
                          ? '物'
                          : '人物'
                        : '関係'
                    }
                  >
                    {result.kind === 'person' ? (
                      result.nodeKind === 'item' ? (
                        <Package size={14} />
                      ) : (
                        <User size={14} />
                      )
                    ) : (
                      <Link size={14} />
                    )}
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
