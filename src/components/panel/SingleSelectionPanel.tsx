/**
 * SingleSelectionPanelコンポーネント
 * 1人の人物が選択されている場合に表示されるパネル
 */

'use client';

import { PersonEditForm } from './PersonEditForm';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Person } from '@/types/person';

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

  // 人物削除ハンドラ
  const handleDeletePerson = () => {
    if (confirm(`「${person.name}」を削除してもよろしいですか？`)) {
      removePerson(person.id);
      clearSelection();
    }
  };

  // この人物に関連する関係を取得
  const relatedRelationships = relationships.filter(
    (r) => r.sourcePersonId === person.id || r.targetPersonId === person.id
  );

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
            {relatedRelationships.map((relationship) => {
              // 相手の人物を特定
              const isSource = relationship.sourcePersonId === person.id;
              const otherPersonId = isSource
                ? relationship.targetPersonId
                : relationship.sourcePersonId;
              const otherPerson = persons.find((p) => p.id === otherPersonId);

              if (!otherPerson) return null;

              return (
                <div
                  key={relationship.id}
                  className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50"
                >
                  {/* 関係の表示 */}
                  <div className="flex-1 min-w-0 text-sm">
                    {relationship.type === 'dual-directed' ? (
                      // dual-directed: 選択された人物の視点で表示
                      <div className="flex flex-col gap-1">
                        {isSource ? (
                          // 選択された人物がsourceの場合
                          <>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-blue-700">
                                {relationship.sourceToTargetLabel}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-gray-600 truncate">
                                {otherPerson.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600 truncate">
                                {otherPerson.name}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium text-green-700">
                                {relationship.targetToSourceLabel}
                              </span>
                            </div>
                          </>
                        ) : (
                          // 選択された人物がtargetの場合（ラベルと矢印を入れ替え）
                          <>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-blue-700">
                                {relationship.targetToSourceLabel}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-gray-600 truncate">
                                {otherPerson.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600 truncate">
                                {otherPerson.name}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium text-green-700">
                                {relationship.sourceToTargetLabel}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ) : isSource ? (
                      // この人物が起点の場合
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-700">
                          {relationship.sourceToTargetLabel}
                        </span>
                        {relationship.type === 'bidirectional' && (
                          <span className="text-gray-400">↔</span>
                        )}
                        {relationship.type === 'one-way' && (
                          <span className="text-gray-400">→</span>
                        )}
                        <span className="text-gray-600 truncate">
                          {otherPerson.name}
                        </span>
                      </div>
                    ) : (
                      // この人物が終点の場合
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 truncate">
                          {otherPerson.name}
                        </span>
                        {relationship.type === 'bidirectional' && (
                          <span className="text-gray-400">↔</span>
                        )}
                        {relationship.type === 'one-way' && (
                          <span className="text-gray-400">→</span>
                        )}
                        <span className="font-medium text-gray-700">
                          {relationship.sourceToTargetLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 削除ボタン */}
                  <button
                    onClick={() => removeRelationship(relationship.id)}
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
          この人物を削除
        </button>
      </div>
    </>
  );
}
