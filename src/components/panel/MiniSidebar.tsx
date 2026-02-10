/**
 * MiniSidebarコンポーネント
 * パネル閉じた状態で表示されるミニマムなアイコンバー
 */

'use client';

import { useMemo } from 'react';
import { ChevronRight, User, Package } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Person } from '@/types/person';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';

/**
 * MiniSidebarコンポーネント
 *
 * @description
 * パネルを閉じた状態で表示される縦長のアイコンバーです。
 * - 開閉ボタン（上部）
 * - 人物/物のアイコンリスト（スクロール可能）
 * - 無選択時: すべてのノードを表示
 * - 選択時: 選択ノード + 関係ノードのみ表示
 */
export function MiniSidebar() {
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const selectPerson = useGraphStore((state) => state.selectPerson);
  const setSidePanelOpen = useGraphStore((state) => state.setSidePanelOpen);

  const { setCenter, getNode } = useReactFlow();

  /**
   * 選択されたノードのIDセット（パフォーマンス最適化用）
   */
  const selectedSet = useMemo(() => new Set(selectedPersonIds), [selectedPersonIds]);

  /**
   * 表示するノードのリストを計算
   * - 無選択時: すべてのノード
   * - 選択時: 選択ノード + 関係ノード
   */
  const displayPersons = useMemo(() => {
    if (selectedPersonIds.length === 0) {
      // 無選択時: すべてのノードを表示
      return persons;
    }

    // 関係ノードのIDを収集
    const relatedIds = new Set<string>();
    relationships.forEach((rel) => {
      if (selectedSet.has(rel.sourcePersonId)) {
        relatedIds.add(rel.targetPersonId);
      }
      if (selectedSet.has(rel.targetPersonId)) {
        relatedIds.add(rel.sourcePersonId);
      }
    });

    // 選択ノード + 関係ノードを返す
    return persons.filter(
      (p) => selectedSet.has(p.id) || relatedIds.has(p.id)
    );
  }, [persons, relationships, selectedPersonIds, selectedSet]);

  /**
   * ノードアイコンをクリックしたときの処理
   * - そのノードを選択
   * - ビューポートをそのノードに移動
   */
  const handlePersonClick = (person: Person) => {
    // ノードを選択
    selectPerson(person.id);

    // ビューポートを移動
    const node = getNode(person.id);
    if (node) {
      const center = getNodeCenter(node);
      setCenter(center.x, center.y, { zoom: 1, duration: VIEWPORT_ANIMATION_DURATION });
    }
  };

  /**
   * 開閉ボタンをクリックしたときの処理
   */
  const handleToggle = () => {
    setSidePanelOpen(true);
  };

  return (
    <div className="w-16 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* 開閉ボタン */}
      <button
        onClick={handleToggle}
        aria-label="サイドパネルを開く"
        className="flex h-16 w-full items-center justify-center border-b border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <ChevronRight className="h-5 w-5 text-gray-600" />
      </button>

      {/* アイコンリスト */}
      <div className="flex-1 overflow-y-auto py-2">
        {displayPersons.map((person) => (
          <button
            key={person.id}
            onClick={() => handlePersonClick(person)}
            aria-label={person.name}
            title={person.name}
            className={`
              flex h-14 w-full items-center justify-center hover:bg-gray-100 transition-colors
              ${selectedSet.has(person.id) ? 'bg-blue-50' : ''}
            `}
          >
            {person.imageDataUrl ? (
              <img
                src={person.imageDataUrl}
                alt={person.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              // 画像がない場合はアイコンを表示
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                {person.kind === 'item' ? (
                  <Package className="h-5 w-5 text-gray-600" />
                ) : (
                  <User className="h-5 w-5 text-gray-600" />
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
