/**
 * SidePanelコンポーネント
 * 選択状態に応じて異なるパネルを表示する
 */

'use client';

import { Trash2 } from 'lucide-react';
import { DefaultPanel } from './DefaultPanel';
import { SingleSelectionPanel } from './SingleSelectionPanel';
import { PairSelectionPanel } from './PairSelectionPanel';
import { MultipleSelectionInfo } from './MultipleSelectionInfo';
import { AuthorAttribution } from '@/components/graph/AuthorAttribution';
import Footer from '@/components/layout/Footer';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';

/**
 * サイドパネルコンポーネント
 */
export function SidePanel() {
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const persons = useGraphStore((state) => state.persons);
  const resetAll = useGraphStore((state) => state.resetAll);
  const openConfirm = useDialogStore((state) => state.openConfirm);

  // 選択された人物を取得
  const selectedPersons = selectedPersonIds
    .map((id) => persons.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // リセット処理
  const handleReset = async () => {
    const confirmed = await openConfirm({
      title: 'データをリセット',
      message: 'すべてのデータを削除してリセットしてもよろしいですか？\nこの操作は元に戻せません。',
      confirmLabel: 'リセット',
      isDanger: true,
    });
    if (confirmed) {
      resetAll();
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
    // keyを設定してペアが変わった時にコンポーネントをリセット
    content = (
      <PairSelectionPanel
        key={`${selectedPersons[0].id}-${selectedPersons[1].id}`}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">人物相関図作る君</h1>
            {/* 作者リンク */}
            <AuthorAttribution />
          </div>
          {/* リセットボタン */}
          <button
            type="button"
            onClick={handleReset}
            className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label="すべてのデータをリセット"
            title="すべてのデータをリセット"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto flex flex-col">{content}</div>

      {/* フッター */}
      <Footer />
    </div>
  );
}
