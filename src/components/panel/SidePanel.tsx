/**
 * SidePanelコンポーネント
 * 選択状態に応じて異なるパネルを表示する
 */

'use client';

import { useState, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { DefaultPanel } from './DefaultPanel';
import { SingleSelectionPanel } from './SingleSelectionPanel';
import { PairSelectionPanel } from './PairSelectionPanel';
import { MultipleSelectionInfo } from './MultipleSelectionInfo';
import { AuthorAttribution } from '@/components/graph/AuthorAttribution';
import Footer from '@/components/layout/Footer';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * サイドパネルコンポーネント
 */
export function SidePanel() {
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);
  const editingRelationshipId = useGraphStore((state) => state.editingRelationshipId);
  const [showSettings, setShowSettings] = useState(false);

  // 選択された人物を取得
  const selectedPersons = selectedPersonIds
    .map((id) => persons.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // 編集対象の関係IDからレイヤーを取得（エッジクリック・関係一覧クリック時）
  // 現在の2人選択に対応する関係のみ使用する（stale IDを無視するため）
  const initialPairLayer = useMemo(() => {
    if (!editingRelationshipId || selectedPersons.length !== 2) return null;
    const rel = relationships.find((r) => r.id === editingRelationshipId);
    if (!rel) return null;
    const [id1, id2] = [selectedPersons[0].id, selectedPersons[1].id];
    const belongsToCurrentPair =
      (rel.sourcePersonId === id1 && rel.targetPersonId === id2) ||
      (rel.sourcePersonId === id2 && rel.targetPersonId === id1);
    return belongsToCurrentPair ? rel.layer : null;
  }, [editingRelationshipId, relationships, selectedPersons]);

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
    // editingRelationshipIdが指定されている場合はそのレイヤーを初期表示する
    // keyにinitialLayerを含めることでレイヤーが変わった時も確実にremountする
    content = (
      <PairSelectionPanel
        key={`${selectedPersons[0].id}-${selectedPersons[1].id}-${initialPairLayer ?? ''}`}
        persons={[selectedPersons[0], selectedPersons[1]]}
        initialLayer={initialPairLayer ?? undefined}
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
          {/* 設定ボタン */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            aria-label="設定"
            title="設定"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto flex flex-col">{content}</div>

      {/* フッター */}
      <Footer />

      {/* 設定モーダル */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
