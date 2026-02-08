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

  // sourceハンドルを表示する条件：自身にホバー中 かつ 接続操作中でない
  const showSourceHandle = isHovered && !isConnecting;

  // targetハンドルを表示する条件：誰かが接続操作中
  const showTargetHandle = isConnecting;

  return (
    <div
      className="flex flex-col items-center group cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 円形ハンドル（リング状） - source用 */}
      {/* 画像部分を囲む正円のハンドルで、外周から接続開始可能 */}
      {/* hover時かつ接続操作中でない時のみ有効化 */}
      {/* 中心部（画像）はそのままドラッグ移動用 */}
      <Handle
        type="source"
        id="ring-source"
        position={Position.Top}
        className={`!absolute !rounded-full !border-8 !border-blue-500 !bg-transparent transition-opacity duration-200 ${
          showSourceHandle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          left: '50%',
          top: '40px',
          transform: 'translate(-50%, -50%)',
          width: '100px',
          height: '100px',
          pointerEvents: showSourceHandle ? 'auto' : 'none',
        }}
      />

      {/* 円形ハンドル（リング状） - target用 */}
      {/* source用と同じ位置・サイズで配置し、接続の受け入れ領域を拡大 */}
      {/* 接続操作中のみ有効化して、接続の受け入れを明確化 */}
      <Handle
        type="target"
        id="ring-target"
        position={Position.Top}
        className={`!absolute !rounded-full !border-8 !border-blue-500 !bg-transparent transition-opacity duration-200 ${
          showTargetHandle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          left: '50%',
          top: '40px',
          transform: 'translate(-50%, -50%)',
          width: '100px',
          height: '100px',
          pointerEvents: showTargetHandle ? 'auto' : 'none',
        }}
      />

      {/* 丸い画像またはデフォルトアバター */}
      {/* scale-110を削除してハンドルのクリック領域を確保 */}
      <div className="relative transition-transform duration-200">
        {personData.imageDataUrl ? (
          <img
            src={personData.imageDataUrl}
            alt={personData.name}
            className={`w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl transition-all duration-200 ${
              selected ? 'ring-4 ring-blue-500' : 'ring-2 ring-gray-200'
            }`}
          />
        ) : (
          <div
            className={`w-20 h-20 rounded-full bg-gray-400 border-4 border-white shadow-xl transition-all duration-200 flex items-center justify-center ${
              selected ? 'ring-4 ring-blue-500' : 'ring-2 ring-gray-200'
            }`}
          >
            <span className="text-white text-2xl font-bold">{initial}</span>
          </div>
        )}
      </div>

      {/* 名前テキスト表示 */}
      <div
        className={`mt-2 px-3 py-1 bg-white rounded-full shadow-lg transition-all duration-200 ${
          selected ? 'border-2 border-blue-500' : 'border border-gray-200'
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
