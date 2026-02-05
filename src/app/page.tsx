/**
 * ホームページコンポーネント
 * 人物相関図を表示するメインページ
 */

import { RelationshipGraph } from '@/components/graph/RelationshipGraph';
import { SidePanel } from '@/components/panel/SidePanel';

export default function Home() {
  return (
    <main className="flex flex-col md:flex-row w-full h-screen overflow-hidden">
      {/* サイドパネル（タブレット以上で表示） */}
      <div className="hidden md:block md:w-80 shrink-0">
        <SidePanel />
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
  );
}
