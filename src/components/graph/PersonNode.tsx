/**
 * PersonNodeコンポーネント
 * 人物を表すカスタムノード（現在は名前テキストのみの仮実装）
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PersonNodeData } from '@/types/graph';

/**
 * 人物ノードコンポーネント
 * @param props - React Flowから渡されるノードプロパティ
 */
export const PersonNode = memo(({ data }: NodeProps) => {
  // PersonNodeDataとして型アサーションを使用
  const personData = data as PersonNodeData;

  return (
    <div className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg shadow-md">
      {/* 接続ポイント（上下左右） */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      {/* 名前テキスト表示 */}
      <div className="text-sm font-medium text-gray-900">{personData.name}</div>
    </div>
  );
});

PersonNode.displayName = 'PersonNode';
