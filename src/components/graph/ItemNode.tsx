/**
 * ItemNodeコンポーネント
 * 物を表すカスタムノード（角丸四角形の画像+名前表示）
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Package } from 'lucide-react';
import type { PersonNodeData } from '@/types/graph';
import { useHandleHover } from './useHandleHover';

/**
 * 物ノードコンポーネント
 * @param props - React Flowから渡されるノードプロパティ
 */
export const ItemNode = memo(({ data, selected, id }: NodeProps) => {
  // PersonNodeDataとして型アサーションを使用（物ノードも同じデータ構造）
  const itemData = data as PersonNodeData;

  // ホバー状態管理（200ms遅延で接続操作の安定性を向上）
  const { handleMouseEnter, handleMouseLeave, showSourceHandle, showTargetHandle, isConnectingToThisNode } =
    useHandleHover(id);

  return (
    <div
      className="flex flex-col items-center group cursor-grab active:cursor-grabbing"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 透明なホバーゾーン（ハンドル外周までカバー） */}
      {/* ハンドルは98x98px、ゾーンは106x106pxでハンドルの外側も含める */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '40px',
          transform: 'translate(-50%, -50%)',
          width: '106px',
          height: '106px',
          pointerEvents: 'auto',
          zIndex: 1,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* 角丸四角形ハンドル - source用 */}
      {/* 画像部分を囲む角丸四角形のハンドルで、外周から接続開始可能 */}
      {/* hover時かつ接続操作中でない時のみ有効化 */}
      {/* 中心部（画像）はそのままドラッグ移動用 */}
      <Handle
        type="source"
        id="ring-source"
        position={Position.Top}
        className={`!absolute !rounded-xl !border-blue-500 !bg-transparent transition-opacity duration-200 ${
          showSourceHandle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          left: '50%',
          top: '40px',
          transform: 'translate(-50%, -50%)',
          width: '98px',
          height: '98px',
          borderWidth: '9px',
          pointerEvents: showSourceHandle ? 'auto' : 'none',
          zIndex: 2,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* 角丸四角形ハンドル - target用 */}
      {/* source用と同じ位置・サイズで配置し、接続の受け入れ領域を拡大 */}
      {/* 接続操作中のみ有効化して、接続の受け入れを明確化 */}
      {/* 他のノードから接続中の時のみz-indexを上げてノード全体を接続可能にする */}
      <Handle
        type="target"
        id="ring-target"
        position={Position.Top}
        className={`!absolute !rounded-xl !border-blue-500 !bg-transparent transition-opacity duration-200 ${
          showTargetHandle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          left: '50%',
          top: '40px',
          transform: 'translate(-50%, -50%)',
          width: '98px',
          height: '98px',
          borderWidth: '9px',
          pointerEvents: showTargetHandle ? 'auto' : 'none',
          zIndex: isConnectingToThisNode ? 15 : 2,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* 中央部分専用の透明なtarget handle */}
      {/* 接続中のみ有効化して、画像中央部分もクリック可能にする */}
      <Handle
        type="target"
        id="center-target"
        position={Position.Top}
        className="!absolute !rounded-xl !bg-transparent !border-0"
        style={{
          left: '50%',
          top: '40px',
          transform: 'translate(-50%, -50%)',
          width: '88px',
          height: '88px',
          opacity: 0,
          pointerEvents: isConnectingToThisNode ? 'auto' : 'none',
          zIndex: isConnectingToThisNode ? 15 : 2,
        }}
      />

      {/* 角丸四角形の画像またはデフォルトアイコン */}
      {/* z-indexを上げて中央部分をドラッグ可能にする */}
      <div className="relative transition-transform duration-200" style={{ zIndex: 10 }}>
        {itemData.imageDataUrl ? (
          <img
            src={itemData.imageDataUrl}
            alt={itemData.name}
            className={`w-20 h-20 rounded-xl object-cover border-4 border-white shadow-xl transition-all duration-200 ${
              selected ? 'ring-4 ring-blue-500' : 'ring-2 ring-gray-200'
            }`}
          />
        ) : (
          <div
            className={`w-20 h-20 rounded-xl bg-gray-400 border-4 border-white shadow-xl transition-all duration-200 flex items-center justify-center ${
              selected ? 'ring-4 ring-blue-500' : 'ring-2 ring-gray-200'
            }`}
          >
            <Package className="w-10 h-10 text-white" />
          </div>
        )}
      </div>

      {/* 名前テキスト表示 */}
      {/* z-indexを上げてドラッグ可能にする */}
      <div
        className={`mt-2 px-3 py-1 bg-white rounded-full shadow-lg transition-all duration-200 ${
          selected ? 'border-2 border-blue-500' : 'border border-gray-200'
        }`}
        style={{ zIndex: 10 }}
      >
        <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
          {itemData.name}
        </div>
      </div>
    </div>
  );
});

ItemNode.displayName = 'ItemNode';
