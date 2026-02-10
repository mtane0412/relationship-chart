/**
 * SidePanelコンポーネント
 * 選択状態に応じて異なるパネルを表示する
 */

'use client';

import { useReactFlow } from '@xyflow/react';
import { DefaultPanel } from './DefaultPanel';
import { SingleSelectionPanel } from './SingleSelectionPanel';
import { PairSelectionPanel } from './PairSelectionPanel';
import { MultipleSelectionInfo } from './MultipleSelectionInfo';
import { useGraphStore } from '@/stores/useGraphStore';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';

/**
 * サイドパネルコンポーネント
 */
export function SidePanel() {
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const persons = useGraphStore((state) => state.persons);

  const { setCenter, getNode } = useReactFlow();

  // 選択された人物を取得
  const selectedPersons = selectedPersonIds
    .map((id) => persons.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // 選択中の要素を中心に表示
  const handleCenterView = () => {
    if (selectedPersonIds.length === 0) return;

    if (selectedPersonIds.length === 1) {
      // 1人選択時: そのノードの中心に移動
      const node = getNode(selectedPersonIds[0]);
      if (node) {
        const center = getNodeCenter(node);
        setCenter(center.x, center.y, { zoom: 1, duration: VIEWPORT_ANIMATION_DURATION });
      }
    } else {
      // 2人以上選択時: 全選択ノードの中間点に移動
      const nodes = selectedPersonIds
        .map((id) => getNode(id))
        .filter((node): node is NonNullable<typeof node> => node !== undefined);

      if (nodes.length === 0) return;

      // 全ノードの中心点を計算
      const centers = nodes.map((node) => getNodeCenter(node));
      const avgX = centers.reduce((sum, c) => sum + c.x, 0) / centers.length;
      const avgY = centers.reduce((sum, c) => sum + c.y, 0) / centers.length;

      setCenter(avgX, avgY, { zoom: 1, duration: VIEWPORT_ANIMATION_DURATION });
    }
  };

  // 選択数によってコンテンツを切り替え（selectedPersons.lengthを使用）
  let content;
  if (selectedPersons.length === 0) {
    // 未選択時: デフォルトパネル
    content = <DefaultPanel />;
  } else if (selectedPersons.length === 1) {
    // 単一選択時: 人物編集パネル
    content = <SingleSelectionPanel person={selectedPersons[0]} />;
  } else if (selectedPersons.length === 2) {
    // 2人選択時: 関係登録パネル
    content = (
      <PairSelectionPanel
        persons={[selectedPersons[0], selectedPersons[1]]}
      />
    );
  } else {
    // 3人以上選択時: 案内メッセージ
    content = <MultipleSelectionInfo count={selectedPersons.length} />;
  }

  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">人物相関図</h1>

        {/* 選択中の要素を中心に表示ボタン */}
        {selectedPersonIds.length > 0 && (
          <button
            onClick={handleCenterView}
            className="mt-3 w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            選択中の要素を中心に表示
          </button>
        )}
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto flex flex-col">{content}</div>
    </div>
  );
}
