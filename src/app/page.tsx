/**
 * ホームページコンポーネント
 * 人物相関図を表示するメインページ
 */

'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { ChevronLeft } from 'lucide-react';
import { RelationshipGraph } from '@/components/graph/RelationshipGraph';
import { SidePanel } from '@/components/panel/SidePanel';
import { MiniSidebar } from '@/components/panel/MiniSidebar';
import { useGraphStore } from '@/stores/useGraphStore';

export default function Home() {
  const sidePanelOpen = useGraphStore((state) => state.sidePanelOpen);
  const toggleSidePanel = useGraphStore((state) => state.toggleSidePanel);

  return (
    <ReactFlowProvider>
      <main className="flex flex-col md:flex-row w-full h-screen overflow-hidden">
        {/* サイドパネル（タブレット以上で表示） */}
        <div className="hidden md:flex shrink-0 relative h-screen">
          {/* フルパネル: sidePanelOpenに応じてwidth/opacityをトランジション */}
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-in-out h-full
              ${sidePanelOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none'}
            `}
          >
            <SidePanel />
          </div>

          {/* 閉じるボタン（パネル開いた状態でのみ表示） */}
          {sidePanelOpen && (
            <button
              onClick={toggleSidePanel}
              aria-label="サイドパネルを閉じる"
              className="absolute top-4 left-[calc(320px-12px)] z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
          )}

          {/* ミニサイドバー: sidePanelOpenに応じてwidth/opacityをトランジション */}
          <div
            className={`
              transition-all duration-300 ease-in-out h-full
              ${!sidePanelOpen ? 'w-16 opacity-100' : 'w-0 opacity-0 pointer-events-none'}
            `}
          >
            <MiniSidebar />
          </div>
        </div>

        {/* グラフ表示エリア */}
        <div className="flex-1 min-h-0">
          <RelationshipGraph />
        </div>

        {/* モバイル用の案内（タブレット未満で表示） */}
        <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg px-4 py-2 text-sm text-gray-700 border border-gray-200">
          💡 タブレット以上の画面でご利用ください
        </div>
      </main>
    </ReactFlowProvider>
  );
}
