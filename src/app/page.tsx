/**
 * ホームページコンポーネント
 * 人物相関図を表示するメインページ
 */

import { RelationshipGraph } from '@/components/graph/RelationshipGraph';

export default function Home() {
  return (
    <main className="w-full h-screen">
      <RelationshipGraph />
    </main>
  );
}
