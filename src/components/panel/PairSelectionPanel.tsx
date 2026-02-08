/**
 * PairSelectionPanelコンポーネント
 * 2人の人物が選択されている場合に表示されるパネル
 */

'use client';

import { useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { ArrowRight, ArrowLeft, ArrowLeftRight, Minus } from 'lucide-react';
import { BidirectionalArrow } from '@/components/icons/BidirectionalArrow';
import { useGraphStore } from '@/stores/useGraphStore';
import { getRelationshipDisplayType } from '@/lib/relationship-utils';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';
import type { Person } from '@/types/person';
import type { RelationshipType } from '@/types/relationship';

/**
 * PairSelectionPanelのプロパティ
 */
type PairSelectionPanelProps = {
  /** 選択されている2人の人物 */
  persons: [Person, Person];
};

/**
 * 表示用の方向インジケーターを返す
 * @param type - 関係タイプ
 * @param isReversed - 関係が逆向きかどうか
 * @returns 方向インジケーター文字列
 */
function getDirectionIndicator(type: RelationshipType, isReversed: boolean): string {
  if (type === 'bidirectional') {
    return '↔';
  }
  if (type === 'one-way') {
    // isReversedがtrueの場合は左向き矢印、falseの場合は右向き矢印
    return isReversed ? '←' : '→';
  }
  // undirectedの場合は方向インジケーターなし
  return '';
}

/**
 * 関係タイプに応じたプレースホルダーを返す
 */
function getPlaceholder(type: RelationshipType, isReverse = false): string {
  if (type === 'one-way') {
    return '例: 片想い、憧れ';
  }
  if (type === 'bidirectional') {
    return '例: 友人、親子、同僚';
  }
  if (type === 'dual-directed') {
    return isReverse ? '例: 無関心、嫌い' : '例: 好き、憧れ';
  }
  if (type === 'undirected') {
    return '例: 同一人物、別名';
  }
  return '例: 関係を入力';
}

/**
 * 人物のミニアイコンを表示するヘルパーコンポーネント
 */
function PersonMiniIcon({ person }: { person: Person }) {
  if (person.imageDataUrl) {
    return (
      <img
        src={person.imageDataUrl}
        alt={person.name}
        className="w-6 h-6 rounded-full object-cover border border-gray-300"
      />
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold border border-gray-300">
      {person.name.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

/**
 * 2人選択パネルコンポーネント
 */
export function PairSelectionPanel({ persons }: PairSelectionPanelProps) {
  const relationships = useGraphStore((state) => state.relationships);
  const addRelationship = useGraphStore((state) => state.addRelationship);
  const updateRelationship = useGraphStore((state) => state.updateRelationship);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const selectPerson = useGraphStore((state) => state.selectPerson);

  const { getNode, setCenter } = useReactFlow();

  const [person1, person2] = persons;

  // 2人の間の既存関係を取得（方向問わず）
  const existingRelationship = relationships.find(
    (r) =>
      (r.sourcePersonId === person1.id && r.targetPersonId === person2.id) ||
      (r.sourcePersonId === person2.id && r.targetPersonId === person1.id)
  );

  // 既存関係の向きを判定（person1がsourceかどうか）
  const isReversed = existingRelationship
    ? existingRelationship.sourcePersonId === person2.id
    : false;

  // フォーム状態
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('bidirectional');
  const [sourceToTargetLabel, setSourceToTargetLabel] = useState('');
  const [targetToSourceLabel, setTargetToSourceLabel] = useState('');
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);

  // 初期値設定
  useEffect(() => {
    if (existingRelationship) {
      const displayType = getRelationshipDisplayType(existingRelationship);
      setRelationshipType(displayType);
      setSourceToTargetLabel(
        isReversed
          ? existingRelationship.targetToSourceLabel || existingRelationship.sourceToTargetLabel || ''
          : existingRelationship.sourceToTargetLabel || ''
      );
      setTargetToSourceLabel(
        isReversed
          ? (displayType === 'dual-directed' ? existingRelationship.sourceToTargetLabel || '' : '')
          : (existingRelationship.targetToSourceLabel || '')
      );
    } else {
      setRelationshipType('bidirectional');
      setSourceToTargetLabel('');
      setTargetToSourceLabel('');
    }
  }, [existingRelationship, isReversed]);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    if (!isTypePickerOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // ドロップダウンまたはトグルボタンの外側をクリックした場合のみ閉じる
      const dropdown = document.querySelector('[data-dropdown="relationship-type"]');
      const toggleButton = document.querySelector('[data-toggle="relationship-type"]');

      if (
        dropdown &&
        toggleButton &&
        !dropdown.contains(target) &&
        !toggleButton.contains(target)
      ) {
        setIsTypePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTypePickerOpen]);

  /**
   * ノードを画面中央に移動する
   * @param personId - 人物ID
   */
  const focusNode = (personId: string) => {
    const node = getNode(personId);
    if (node) {
      const center = getNodeCenter(node);
      setCenter(center.x, center.y, { duration: VIEWPORT_ANIMATION_DURATION });
    }
  };

  /**
   * 人物を単一選択する
   * @param personId - 人物ID
   */
  const handleSelectPerson = (personId: string) => {
    selectPerson(personId);
    focusNode(personId);
  };

  /**
   * フォーム送信ハンドラ
   */
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sourceToTargetLabel.trim()) return;
    if (relationshipType === 'dual-directed' && !targetToSourceLabel.trim()) return;

    // UIのRelationshipTypeを新しいデータモデルに変換
    let isDirected = true;
    const finalSourceToTargetLabel = sourceToTargetLabel.trim();
    let finalTargetToSourceLabel: string | null = null;

    if (relationshipType === 'bidirectional') {
      // 双方向: isDirected=true, 両方に同じラベル
      finalTargetToSourceLabel = finalSourceToTargetLabel;
    } else if (relationshipType === 'one-way') {
      // 片方向: isDirected=true, sourceToTargetLabelのみ
      finalTargetToSourceLabel = null;
    } else if (relationshipType === 'dual-directed') {
      // 片方向×2: isDirected=true, 異なるラベル
      finalTargetToSourceLabel = targetToSourceLabel.trim();
    } else if (relationshipType === 'undirected') {
      // 無方向: isDirected=false, 両方に同じラベル
      isDirected = false;
      finalTargetToSourceLabel = finalSourceToTargetLabel;
    }

    if (existingRelationship) {
      // 既存の関係を更新
      const updates = isReversed
        ? {
            isDirected,
            sourceToTargetLabel: finalTargetToSourceLabel || finalSourceToTargetLabel,
            targetToSourceLabel: relationshipType === 'dual-directed' ? finalSourceToTargetLabel : finalTargetToSourceLabel,
          }
        : {
            isDirected,
            sourceToTargetLabel: finalSourceToTargetLabel,
            targetToSourceLabel: finalTargetToSourceLabel,
          };

      updateRelationship(existingRelationship.id, updates);
    } else {
      // 新規の関係を追加
      addRelationship({
        sourcePersonId: person1.id,
        targetPersonId: person2.id,
        isDirected,
        sourceToTargetLabel: finalSourceToTargetLabel,
        targetToSourceLabel: finalTargetToSourceLabel,
      });
    }
  };

  // 相手のイニシャル（画像がない場合）
  const person1Initial = person1.name.charAt(0).toUpperCase() || '?';
  const person2Initial = person2.name.charAt(0).toUpperCase() || '?';

  // 登録ボタンの有効/無効を判定
  const isSubmitDisabled =
    !sourceToTargetLabel.trim() ||
    (relationshipType === 'dual-directed' && !targetToSourceLabel.trim());

  return (
    <div className="flex flex-col h-full">
      {/* 関係追加/編集フォーム */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col">
        {/* フォーム上部: タイトルと選択解除ボタン */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">2人を選択中</h2>
          <button
            type="button"
            onClick={() => clearSelection()}
            className="text-xs text-gray-500 hover:text-gray-700"
            aria-label="選択を解除"
          >
            ✕ 選択解除
          </button>
        </div>
        {/* 2人の人物情報表示 + 関係タイプ選択 */}
        <div className="mb-4 flex items-center justify-center gap-3 text-gray-700">
          {/* 人物1のアイコン */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectPerson(person1.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectPerson(person1.id);
              }
            }}
            aria-label={`${person1.name}を選択`}
            className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity"
          >
            {person1.imageDataUrl ? (
              <img
                src={person1.imageDataUrl}
                alt={person1.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold border border-gray-300">
                {person1Initial}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 truncate max-w-[80px]">
              {person1.name}
            </span>
          </div>

          {/* 現在選択中の関係アイコン（クリックで展開） */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTypePickerOpen(!isTypePickerOpen)}
              aria-label="関係タイプを選択"
              className="w-10 h-10 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition-colors"
              data-toggle="relationship-type"
            >
              {relationshipType === 'one-way' && (
                isReversed ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />
              )}
              {relationshipType === 'bidirectional' && <BidirectionalArrow className="w-5 h-5" />}
              {relationshipType === 'dual-directed' && <ArrowLeftRight className="w-5 h-5" />}
              {relationshipType === 'undirected' && <Minus className="w-5 h-5" />}
            </button>

            {/* 関係タイプ選択ドロップダウン */}
            {isTypePickerOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-300 rounded-md shadow-lg p-1 flex gap-1 z-10"
                data-dropdown="relationship-type"
              >
                {/* 片方向 (one-way) */}
                <button
                  type="button"
                  onClick={() => {
                    setRelationshipType('one-way');
                    setIsTypePickerOpen(false);
                  }}
                  aria-pressed={relationshipType === 'one-way'}
                  aria-label="片方向"
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    relationshipType === 'one-way'
                      ? 'bg-blue-100 ring-2 ring-blue-500'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* 双方向 (bidirectional) */}
                <button
                  type="button"
                  onClick={() => {
                    setRelationshipType('bidirectional');
                    setIsTypePickerOpen(false);
                  }}
                  aria-pressed={relationshipType === 'bidirectional'}
                  aria-label="双方向"
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    relationshipType === 'bidirectional'
                      ? 'bg-blue-100 ring-2 ring-blue-500'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <BidirectionalArrow className="w-5 h-5" />
                </button>

                {/* 片方向×2 (dual-directed) */}
                <button
                  type="button"
                  onClick={() => {
                    setRelationshipType('dual-directed');
                    setIsTypePickerOpen(false);
                  }}
                  aria-pressed={relationshipType === 'dual-directed'}
                  aria-label="片方向×2"
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    relationshipType === 'dual-directed'
                      ? 'bg-blue-100 ring-2 ring-blue-500'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </button>

                {/* 無方向 (undirected) */}
                <button
                  type="button"
                  onClick={() => {
                    setRelationshipType('undirected');
                    setIsTypePickerOpen(false);
                  }}
                  aria-pressed={relationshipType === 'undirected'}
                  aria-label="無方向"
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    relationshipType === 'undirected'
                      ? 'bg-blue-100 ring-2 ring-blue-500'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Minus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* 人物2のアイコン */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectPerson(person2.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectPerson(person2.id);
              }
            }}
            aria-label={`${person2.name}を選択`}
            className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity"
          >
            {person2.imageDataUrl ? (
              <img
                src={person2.imageDataUrl}
                alt={person2.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold border border-gray-300">
                {person2Initial}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700 truncate max-w-[80px]">
              {person2.name}
            </span>
          </div>
        </div>

        {/* ラベル入力 */}
        {relationshipType === 'dual-directed' ? (
          // dual-directed: 2つのラベル入力セット
          <>
            <div className="mb-4">
              <label
                htmlFor="relationship-label"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                関係のラベル
              </label>
              {/* 方向インジケーター */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <PersonMiniIcon person={person1} />
                <span>→</span>
                <PersonMiniIcon person={person2} />
              </div>
              <input
                id="relationship-label"
                type="text"
                value={sourceToTargetLabel}
                onChange={(e) => setSourceToTargetLabel(e.target.value)}
                placeholder={getPlaceholder('dual-directed', false)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="reverse-relationship-label"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                逆方向のラベル
              </label>
              {/* 方向インジケーター */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <PersonMiniIcon person={person1} />
                <span>←</span>
                <PersonMiniIcon person={person2} />
              </div>
              <input
                id="reverse-relationship-label"
                type="text"
                value={targetToSourceLabel}
                onChange={(e) => setTargetToSourceLabel(e.target.value)}
                placeholder={getPlaceholder('dual-directed', true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        ) : (
          // one-way / bidirectional / undirected: 単一ラベル入力
          <div className="mb-4">
            <label
              htmlFor="relationship-label"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              関係のラベル
            </label>
            {/* 関係タイプに応じたインジケーター */}
            {relationshipType !== 'undirected' && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <PersonMiniIcon person={person1} />
                <span>{getDirectionIndicator(relationshipType, isReversed)}</span>
                <PersonMiniIcon person={person2} />
              </div>
            )}
            <input
              id="relationship-label"
              type="text"
              value={sourceToTargetLabel}
              onChange={(e) => setSourceToTargetLabel(e.target.value)}
              placeholder={getPlaceholder(relationshipType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* 登録/更新ボタン */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-auto"
        >
          {existingRelationship ? '更新' : '登録'}
        </button>
      </form>

      {/* 削除ボタン（既存関係がある場合のみ、パネル最下部） */}
      {existingRelationship && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => removeRelationship(existingRelationship.id)}
            className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            この関係を削除
          </button>
        </div>
      )}
    </div>
  );
}
