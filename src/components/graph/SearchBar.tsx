/**
 * 検索バーコンポーネント
 *
 * キャンバス上部中央に配置される検索UI。
 * 人物名と関係ラベルをインクリメンタル検索し、選択した要素にフォーカスします。
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { Search, User, Package, ArrowRight, ArrowLeftRight, Minus } from 'lucide-react';
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
  // ユーザーが手動で候補を選択したかどうか
  const [isManualSelection, setIsManualSelection] = useState(false);

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
        setIsManualSelection(false);
        // 入力フィールドからフォーカスを外す
        if (inputRef.current) {
          inputRef.current.blur();
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setIsManualSelection(true);
        setSelectedIndex((prev) => {
          const nextIndex = prev + 1;
          return nextIndex < results.length ? nextIndex : prev;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setIsManualSelection(true);
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
   * 検索クエリが変更されたら手動選択フラグをリセット
   */
  useEffect(() => {
    setIsManualSelection(false);
  }, [query]);

  /**
   * 検索結果が変更されたら、手動選択中でなければ最初の候補を自動的に選択
   */
  useEffect(() => {
    // 手動選択中は自動リセットしない
    if (isManualSelection) return;

    if (results.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [results, isManualSelection]);

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
                  {result.kind === 'person' ? (
                    // 人物/物の場合: ノード画像またはアイコン
                    <div className="flex-shrink-0">
                      {result.imageDataUrl ? (
                        <img
                          src={result.imageDataUrl}
                          alt={result.label}
                          className={`w-8 h-8 object-cover ${
                            result.nodeKind === 'item' ? 'rounded' : 'rounded-full'
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 bg-gray-200 flex items-center justify-center ${
                            result.nodeKind === 'item' ? 'rounded' : 'rounded-full'
                          }`}
                        >
                          {result.nodeKind === 'item' ? (
                            <Package size={16} className="text-gray-600" />
                          ) : (
                            <User size={16} className="text-gray-600" />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // 関係の場合: 2つのノード画像 + 関係アイコン
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* 起点人物 */}
                      {result.sourceImageDataUrl ? (
                        <img
                          src={result.sourceImageDataUrl}
                          alt="起点"
                          className={`w-6 h-6 object-cover ${
                            result.sourceNodeKind === 'item' ? 'rounded' : 'rounded-full'
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-6 h-6 bg-gray-200 flex items-center justify-center ${
                            result.sourceNodeKind === 'item' ? 'rounded' : 'rounded-full'
                          }`}
                        >
                          {result.sourceNodeKind === 'item' ? (
                            <Package size={12} className="text-gray-600" />
                          ) : (
                            <User size={12} className="text-gray-600" />
                          )}
                        </div>
                      )}

                      {/* 関係アイコン */}
                      {result.relationshipType === 'bidirectional' ? (
                        <ArrowLeftRight size={12} className="text-gray-400" />
                      ) : result.relationshipType === 'undirected' ? (
                        <Minus size={12} className="text-gray-400" />
                      ) : (
                        <ArrowRight size={12} className="text-gray-400" />
                      )}

                      {/* 終点人物 */}
                      {result.targetImageDataUrl ? (
                        <img
                          src={result.targetImageDataUrl}
                          alt="終点"
                          className={`w-6 h-6 object-cover ${
                            result.targetNodeKind === 'item' ? 'rounded' : 'rounded-full'
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-6 h-6 bg-gray-200 flex items-center justify-center ${
                            result.targetNodeKind === 'item' ? 'rounded' : 'rounded-full'
                          }`}
                        >
                          {result.targetNodeKind === 'item' ? (
                            <Package size={12} className="text-gray-600" />
                          ) : (
                            <User size={12} className="text-gray-600" />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <span className="truncate">{result.label}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
