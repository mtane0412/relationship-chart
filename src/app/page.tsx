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
        <div className="hidden md:flex shrink-0">
          {sidePanelOpen ? (
            // パネル開いた状態: フルパネル + 閉じるボタン
            <div className="relative">
              <div className="w-80 h-screen overflow-hidden transition-all duration-300 ease-in-out">
                <SidePanel />
              </div>

              {/* 閉じるボタン */}
              <button
                onClick={toggleSidePanel}
                aria-label="サイドパネルを閉じる"
                className="absolute top-4 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          ) : (
            // パネル閉じた状態: ミニサイドバー
            <MiniSidebar />
          )}
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
