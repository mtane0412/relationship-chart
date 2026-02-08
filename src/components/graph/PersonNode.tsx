/**
 * PersonNodeコンポーネント
 * 人物を表すカスタムノード（丸い画像+名前表示）
 */

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, useConnection } from '@xyflow/react';
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

  // ホバー状態管理
  const [isHovered, setIsHovered] = useState(false);

  // 接続操作中かどうかを取得
  const connection = useConnection();
  const isConnecting = connection.inProgress;

  // ハンドルを表示する条件：自身にホバー中 または 誰かが接続操作中
  const showHandles = isHovered || isConnecting;

  return (
    <div
      className="flex flex-col items-center group cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 単一の円形ハンドル（リング状） */}
      {/* ノード全体を覆う大きな円形ハンドルで、外周から接続可能 */}
      {/* 中心部（画像・ラベル）はそのままドラッグ移動用 */}
      <Handle
        type="source"
        id="ring"
        position={Position.Top}
        className={`!absolute !inset-0 !w-full !h-full !rounded-full !border-4 !border-blue-500 !bg-transparent !transform-none transition-opacity duration-200 ${
          showHandles ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100px',
          height: '100px',
        }}
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
