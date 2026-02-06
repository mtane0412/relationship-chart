/**
 * PersonNodeコンポーネント
 * 人物を表すカスタムノード（丸い画像+名前表示）
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PersonNodeData } from '@/types/graph';

/**
 * 人物ノードコンポーネント
 * @param props - React Flowから渡されるノードプロパティ
 */
export const PersonNode = memo(({ data, selected }: NodeProps) => {
  // PersonNodeDataとして型アサーションを使用
  const personData = data as PersonNodeData;

  // 名前の最初の1文字をイニシャルとして取得
  const initial = personData.name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center group cursor-grab active:cursor-grabbing">
      {/* 接続ポイント（上下左右） */}
      <Handle
        type="target"
        position={Position.Top}
        className="bg-blue-500! w-3! h-3! border-2! border-white!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-blue-500! w-3! h-3! border-2! border-white!"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="bg-blue-500! w-3! h-3! border-2! border-white!"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="bg-blue-500! w-3! h-3! border-2! border-white!"
      />

      {/* 丸い画像またはデフォルトアバター */}
      <div className="relative transition-transform duration-200 group-hover:scale-110">
        {personData.imageDataUrl ? (
          <img
            src={personData.imageDataUrl}
            alt={personData.name}
            className={`w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl transition-all duration-200 ${
              selected
                ? 'ring-4 ring-blue-500'
                : 'ring-2 ring-gray-200 group-hover:ring-4 group-hover:ring-blue-300'
            }`}
          />
        ) : (
          <div
            className={`w-20 h-20 rounded-full bg-gray-400 border-4 border-white shadow-xl transition-all duration-200 flex items-center justify-center ${
              selected
                ? 'ring-4 ring-blue-500'
                : 'ring-2 ring-gray-200 group-hover:ring-4 group-hover:ring-blue-300'
            }`}
          >
            <span className="text-white text-2xl font-bold">{initial}</span>
          </div>
        )}
      </div>

      {/* 名前テキスト表示 */}
      <div
        className={`mt-2 px-3 py-1 bg-white rounded-full shadow-lg transition-all duration-200 ${
          selected
            ? 'border-2 border-blue-500'
            : 'border border-gray-200 group-hover:shadow-xl group-hover:border-blue-300'
        }`}
      >
        <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
          {personData.name}
        </div>
      </div>
    </div>
  );
});

PersonNode.displayName = 'PersonNode';
