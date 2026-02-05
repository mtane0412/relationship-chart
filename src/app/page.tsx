/**
 * ホームページコンポーネント
 * 人物相関図を表示するメインページ
 */

import { RelationshipGraph } from '@/components/graph/RelationshipGraph';
import { SidePanel } from '@/components/panel/SidePanel';

export default function Home() {
  return (
    <main className="flex w-full h-screen">
      {/* サイドパネル */}
      <SidePanel />

      {/* グラフ表示エリア */}
      <div className="flex-1">
        <RelationshipGraph />
      </div>
    </main>
  );
}
