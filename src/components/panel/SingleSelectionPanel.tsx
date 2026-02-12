/**
 * SingleSelectionPanelコンポーネント
 * 1人の人物が選択されている場合に表示されるパネル
 */

'use client';

import { useMemo } from 'react';
import { PersonEditForm } from './PersonEditForm';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';
import { useReactFlow } from '@xyflow/react';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';
import { getRelationshipFromPerspective } from '@/lib/relationship-utils';
import {
  VIEWPORT_ANIMATION_DURATION,
  VIEWPORT_FIT_PADDING,
  VIEWPORT_MAX_ZOOM,
} from '@/lib/viewport-utils';

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
  const removePerson = useGraphStore((state) => state.removePerson);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const setSelectedPersonIds = useGraphStore((state) => state.setSelectedPersonIds);
  const openConfirm = useDialogStore((state) => state.openConfirm);
  const { fitView } = useReactFlow();

  // 種別を取得
  const kind = person.kind ?? 'person';
  const isItem = kind === 'item';
  const kindLabel = isItem ? '物' : '人物';

  // 削除ハンドラ
  const handleDeletePerson = async () => {
    const confirmed = await openConfirm({
      message: `「${person.name}」を削除してもよろしいですか？`,
      confirmLabel: '削除',
      isDanger: true,
    });
    if (confirmed) {
      removePerson(person.id);
      clearSelection();
    }
  };

  // この人物に関連する関係を取得し、方向別にグループ化
  type RelationshipItem = {
    relationship: Relationship;
    otherPersonId: string;
    label: string;
    direction: '→' | '←' | '↔' | '—';
    key: string;
  };

  // 関係を方向別にグループ化（useMemoで最適化）
  const groups = useMemo(() => {
    // 関連する関係を取得
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

    // 双方向（↔）を2つのエントリに分割
    const expandedItems: RelationshipItem[] = [];
    for (const item of relatedRelationships) {
      if (item.direction === '↔') {
        // 双方向を2つのエントリに分割（outgoingとincoming）
        expandedItems.push({
          ...item,
          direction: '→',
          key: `${item.key}-outgoing`,
        });
        expandedItems.push({
          ...item,
          direction: '←',
          key: `${item.key}-incoming`,
        });
      } else {
        expandedItems.push(item);
      }
    }

    const mutual = expandedItems.filter((item) => item.direction === '—');
    const outgoing = expandedItems.filter((item) => item.direction === '→');
    const incoming = expandedItems.filter((item) => item.direction === '←');

    // 空グループを除外してセクション定義を返す
    return [
      { key: 'mutual', label: `${person.name} — ...`, items: mutual },
      { key: 'outgoing', label: `${person.name} → ...`, items: outgoing },
      { key: 'incoming', label: `... → ${person.name}`, items: incoming },
    ].filter((g) => g.items.length > 0);
  }, [relationships, persons, person.id, person.name]);

  return (
    <>
      {/* 人物編集フォーム */}
      <PersonEditForm
        key={person.id}
        person={person}
        onClose={() => clearSelection()}
      />

      {/* 関係一覧セクション */}
      {groups.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            この人物の関係
          </h3>
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key}>
                {/* グループヘッダー */}
                <h4 className="text-xs font-medium text-gray-500 mb-2">
                  {group.label}
                </h4>
                {/* グループ内のアイテム */}
                <div className="space-y-2">
                  {group.items.map((relItem: RelationshipItem) => {
                    // 相手の人物を特定
                    const otherPerson = persons.find((p) => p.id === relItem.otherPersonId);

                    if (!otherPerson) return null;

                    // 関係クリックハンドラ: 2人選択状態に遷移 + ビューポート移動
                    const handleRelationshipClick = () => {
                      setSelectedPersonIds([person.id, otherPerson.id]);

                      // ビューポートを2つのノードにフィット（両ノードが画面内に収まるようズーム調整）
                      fitView({
                        nodes: [{ id: person.id }, { id: otherPerson.id }],
                        padding: VIEWPORT_FIT_PADDING,
                        maxZoom: VIEWPORT_MAX_ZOOM,
                        duration: VIEWPORT_ANIMATION_DURATION,
                      });
                    };

                    // キーボードハンドラ: Enter/Spaceで遷移
                    const handleKeyDown = (e: React.KeyboardEvent) => {
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
                        {/* 関係の表示: 相手アイコン 相手名前 関係ラベル */}
                        <div className="flex-1 min-w-0 text-sm flex items-center gap-2">
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
                          <span className="font-medium text-gray-700 truncate">{relItem.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
