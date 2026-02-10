/**
 * PersonListコンポーネント
 * 登録された人物の一覧を表示する
 */

'use client';

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';

/**
 * 人物一覧コンポーネント
 */
export function PersonList() {
  const persons = useGraphStore((state) => state.persons);
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const selectPerson = useGraphStore((state) => state.selectPerson);
  const togglePersonSelection = useGraphStore((state) => state.togglePersonSelection);

  const { getNode, setCenter } = useReactFlow();

  /**
   * ノードを画面中央に移動する
   * @param personId - 人物ID
   */
  const focusNode = useCallback(
    (personId: string) => {
      const node = getNode(personId);
      if (node) {
        const center = getNodeCenter(node);
        setCenter(center.x, center.y, { duration: VIEWPORT_ANIMATION_DURATION });
      }
    },
    [getNode, setCenter]
  );

  // 人物と物に分類
  const personNodes = persons.filter((p) => (p.kind ?? 'person') === 'person');
  const itemNodes = persons.filter((p) => p.kind === 'item');

  if (persons.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">人物・物が登録されていません</p>
      </div>
    );
  }

  // 人物/物アイテムを描画する共通関数
  const renderItem = (person: typeof persons[number]) => {
    const kind = person.kind ?? 'person';
    const isItem = kind === 'item';
    const initial = person.name.charAt(0).toUpperCase();
    const isSelected = selectedPersonIds.includes(person.id);

    return (
      <div
        key={person.id}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (e.shiftKey) {
            togglePersonSelection(person.id);
          } else {
            selectPerson(person.id);
            focusNode(person.id);
          }
        }}
        onKeyDown={(e) => {
          if (e.target instanceof HTMLElement && e.target.closest('button')) {
            return;
          }

          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (e.shiftKey) {
              togglePersonSelection(person.id);
            } else {
              selectPerson(person.id);
              focusNode(person.id);
            }
          }
        }}
        aria-label={`${person.name}を選択`}
        className={`flex items-center gap-3 p-2 border rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:bg-gray-50'
        }`}
      >
        {/* 画像またはデフォルトアバター */}
        {person.imageDataUrl ? (
          <img
            src={person.imageDataUrl}
            alt={person.name}
            className={`w-12 h-12 object-cover ${isItem ? 'rounded-lg' : 'rounded-full'}`}
          />
        ) : (
          <div className={`w-12 h-12 bg-gray-400 flex items-center justify-center ${isItem ? 'rounded-lg' : 'rounded-full'}`}>
            <span className="text-white text-lg font-bold">{initial}</span>
          </div>
        )}

        {/* 名前 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {person.name}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 人物セクション */}
      {personNodes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            人物
          </h3>
          <div className="space-y-2">
            {personNodes.map(renderItem)}
          </div>
        </div>
      )}

      {/* 物セクション */}
      {itemNodes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            物
          </h3>
          <div className="space-y-2">
            {itemNodes.map(renderItem)}
          </div>
        </div>
      )}
    </div>
  );
}
