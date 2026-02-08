/**
 * SingleSelectionPanelコンポーネント
 * 1人の人物が選択されている場合に表示されるパネル
 */

'use client';

import { PersonEditForm } from './PersonEditForm';
import { useGraphStore } from '@/stores/useGraphStore';
import { useReactFlow } from '@xyflow/react';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';
import { getRelationshipFromPerspective } from '@/lib/relationship-utils';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';

/**
 * SingleSelectionPanelのプロパティ
 */
type SingleSelectionPanelProps = {
  /** 選択されている人物 */
  person: Person;
};

/**
 * 単一選択パネルコンポーネント
 */
export function SingleSelectionPanel({ person }: SingleSelectionPanelProps) {
  const relationships = useGraphStore((state) => state.relationships);
  const persons = useGraphStore((state) => state.persons);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const removePerson = useGraphStore((state) => state.removePerson);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const setSelectedPersonIds = useGraphStore((state) => state.setSelectedPersonIds);
  const { getNode, setCenter } = useReactFlow();

  // 種別を取得
  const kind = person.kind ?? 'person';
  const isItem = kind === 'item';
  const kindLabel = isItem ? '物' : '人物';

  // 削除ハンドラ
  const handleDeletePerson = () => {
    if (confirm(`「${person.name}」を削除してもよろしいですか？`)) {
      removePerson(person.id);
      clearSelection();
    }
  };

  // この人物に関連する関係を取得し、dual-directedの場合は2つの関係として展開
  type RelationshipItem = {
    relationship: Relationship;
    otherPersonId: string;
    label: string;
    direction: '→' | '←' | '↔' | '—';
    key: string;
  };

  const relatedRelationships: RelationshipItem[] = relationships
    .filter((r) => r.sourcePersonId === person.id || r.targetPersonId === person.id)
    .flatMap((relationship): RelationshipItem[] => {
      // getRelationshipFromPerspectiveを使用して視点ベースの関係情報を取得
      const perspectiveItems = getRelationshipFromPerspective(relationship, person.id);

      // RelationshipItemの配列に変換
      return perspectiveItems.map((item, index) => ({
        relationship,
        otherPersonId: item.otherPersonId,
        label: item.label,
        direction: item.direction === '↔' ? '↔' : item.direction === '→' ? '→' : item.direction === '←' ? '←' : '—',
        key: perspectiveItems.length > 1 ? `${relationship.id}-${index}` : relationship.id,
      }));
    });

  return (
    <>
      {/* 人物編集フォーム */}
      <PersonEditForm
        key={person.id}
        person={person}
        onClose={() => clearSelection()}
      />

      {/* 関係一覧セクション */}
      {relatedRelationships.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            この人物の関係
          </h3>
          <div className="space-y-2">
            {relatedRelationships.map((relItem: RelationshipItem) => {
              // 相手の人物を特定
              const otherPerson = persons.find((p) => p.id === relItem.otherPersonId);

              if (!otherPerson) return null;

              // 関係クリックハンドラ: 2人選択状態に遷移 + ビューポート移動
              const handleRelationshipClick = () => {
                setSelectedPersonIds([person.id, otherPerson.id]);

                // ビューポートを2つのノードの中間点に移動
                const node1 = getNode(person.id);
                const node2 = getNode(otherPerson.id);

                if (node1 && node2) {
                  // 各ノードの中心座標を計算
                  const node1Center = getNodeCenter(node1);
                  const node2Center = getNodeCenter(node2);

                  // 2つのノードの中間点を計算
                  const midX = (node1Center.x + node2Center.x) / 2;
                  const midY = (node1Center.y + node2Center.y) / 2;

                  // ビューポートを中間点に移動（アニメーション付き）
                  setCenter(midX, midY, { duration: VIEWPORT_ANIMATION_DURATION });
                }
              };

              // キーボードハンドラ: Enter/Spaceで遷移
              const handleKeyDown = (e: React.KeyboardEvent) => {
                // インタラクティブ要素からのイベントは無視
                if (e.target instanceof HTMLElement && e.target.closest('button')) {
                  return;
                }

                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRelationshipClick();
                }
              };

              // 相手のイニシャルと種別
              const otherInitial = otherPerson.name.charAt(0).toUpperCase() || '?';
              const otherKind = otherPerson.kind ?? 'person';
              const otherIsItem = otherKind === 'item';

              return (
                <div
                  key={relItem.key}
                  role="button"
                  tabIndex={0}
                  onClick={handleRelationshipClick}
                  onKeyDown={handleKeyDown}
                  aria-label={`${otherPerson.name}との関係を開く`}
                  className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  {/* 関係の表示: 関係内容 エッジアイコン 相手アイコン 相手名前 */}
                  <div className="flex-1 min-w-0 text-sm flex items-center gap-1">
                    <span className="font-medium text-gray-700 truncate">{relItem.label}</span>
                    {relItem.direction && (
                      <span className="text-gray-400 shrink-0">{relItem.direction}</span>
                    )}
                    {/* 相手人物/物のアバター */}
                    {otherPerson.imageDataUrl ? (
                      <img
                        src={otherPerson.imageDataUrl}
                        alt={otherPerson.name}
                        className={`shrink-0 w-7 h-7 object-cover ${otherIsItem ? 'rounded-md' : 'rounded-full'}`}
                      />
                    ) : (
                      <div className={`shrink-0 w-7 h-7 bg-gray-300 flex items-center justify-center ${otherIsItem ? 'rounded-md' : 'rounded-full'}`}>
                        <span className="text-white text-xs font-bold">{otherInitial}</span>
                      </div>
                    )}
                    <span className="text-gray-600 truncate">{otherPerson.name}</span>
                  </div>

                  {/* 削除ボタン */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRelationship(relItem.relationship.id);
                    }}
                    className="shrink-0 p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                    aria-label={`${otherPerson.name}との関係を削除`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 削除ボタン（パネル最下部） */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <button
          onClick={handleDeletePerson}
          className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          この{kindLabel}を削除
        </button>
      </div>
    </>
  );
}
