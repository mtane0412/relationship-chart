/**
 * SidePanelコンポーネント
 * 選択状態に応じて異なるパネルを表示する
 */

'use client';

import { DefaultPanel } from './DefaultPanel';
import { SingleSelectionPanel } from './SingleSelectionPanel';
import { PairSelectionPanel } from './PairSelectionPanel';
import { MultipleSelectionInfo } from './MultipleSelectionInfo';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * サイドパネルコンポーネント
 */
export function SidePanel() {
  const forceEnabled = useGraphStore((state) => state.forceEnabled);
  const setForceEnabled = useGraphStore((state) => state.setForceEnabled);
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const persons = useGraphStore((state) => state.persons);

  // 選択された人物を取得
  const selectedPersons = selectedPersonIds
    .map((id) => persons.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // 選択数によってコンテンツを切り替え
  let content;
  if (selectedPersonIds.length === 0) {
    // 未選択時: デフォルトパネル
    content = <DefaultPanel />;
  } else if (selectedPersonIds.length === 1) {
    // 単一選択時: 人物編集パネル
    content = <SingleSelectionPanel person={selectedPersons[0]} />;
  } else if (selectedPersonIds.length === 2) {
    // 2人選択時: 関係登録パネル
    content = (
      <PairSelectionPanel
        persons={[selectedPersons[0], selectedPersons[1]]}
      />
    );
  } else {
    // 3人以上選択時: 案内メッセージ
    content = <MultipleSelectionInfo count={selectedPersonIds.length} />;
  }

  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">人物相関図</h1>

        {/* Force-directedレイアウトトグル */}
        <div className="mt-3 flex items-center justify-between">
          <label
            htmlFor="forceToggle"
            className="text-sm font-medium text-gray-700"
          >
            自動配置
          </label>
          <button
            id="forceToggle"
            type="button"
            role="switch"
            aria-checked={forceEnabled}
            onClick={() => setForceEnabled(!forceEnabled)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${forceEnabled ? 'bg-blue-600' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${forceEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto">{content}</div>
    </div>
  );
}
