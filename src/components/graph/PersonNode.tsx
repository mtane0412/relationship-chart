/**
 * PersonNodeコンポーネント
 * 人物を表すカスタムノード（丸い画像+名前表示）
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PersonNodeData } from '@/types/graph';
import { useHandleHover } from './useHandleHover';
import { HANDLE_SIZE, HANDLE_BORDER_WIDTH, HOVER_ZONE_SIZE, HANDLE_CENTER_Y, CENTER_TARGET_SIZE } from './node-constants';
import { NameLabel } from './NameLabel';

/**
 * 人物ノードコンポーネント
 * @param props - React Flowから渡されるノードプロパティ
 */
export const PersonNode = memo(({ data, selected, id }: NodeProps) => {
  // PersonNodeDataとして型アサーションを使用
  const personData = data as PersonNodeData;

  // 名前の最初の1文字をイニシャルとして取得
  const initial = personData.name.charAt(0).toUpperCase();

  // ホバー状態管理（200ms遅延で接続操作の安定性を向上）
  const { handleMouseEnter, handleMouseLeave, showSourceHandle, showTargetHandle, isConnectingToThisNode } =
    useHandleHover(id, selected);

  return (
    <div
      className="flex flex-col items-center group cursor-grab active:cursor-grabbing"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 透明なホバーゾーン（ハンドル外周までカバー） */}
      {/* ハンドルは160x160px、ゾーンは168x168pxでハンドルの外側も含める */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: `${HANDLE_CENTER_Y}px`,
          transform: 'translate(-50%, -50%)',
          width: `${HOVER_ZONE_SIZE}px`,
          height: `${HOVER_ZONE_SIZE}px`,
          pointerEvents: 'auto',
          zIndex: 1,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* 円形ハンドル（リング状） - source用 */}
      {/* 画像部分を囲む正円のハンドルで、外周から接続開始可能 */}
      {/* hover時かつ接続操作中でない時のみ有効化 */}
      {/* 中心部（画像）はそのままドラッグ移動用 */}
      {/* ハンドル自体は透明（border-transparent）で、画像のring装飾が視覚的フィードバックを担当 */}
      <Handle
        type="source"
        id="ring-source"
        position={Position.Top}
        className={`!absolute !rounded-full !border-transparent !bg-transparent transition-opacity duration-200 ${
          showSourceHandle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          left: '50%',
          top: `${HANDLE_CENTER_Y}px`,
          transform: 'translate(-50%, -50%)',
          width: `${HANDLE_SIZE}px`,
          height: `${HANDLE_SIZE}px`,
          borderWidth: `${HANDLE_BORDER_WIDTH}px`,
          pointerEvents: showSourceHandle ? 'auto' : 'none',
          zIndex: 2,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* 円形ハンドル（リング状） - target用 */}
      {/* source用と同じ位置・サイズで配置し、接続の受け入れ領域を拡大 */}
      {/* 接続操作中のみ有効化して、接続の受け入れを明確化 */}
      {/* 他のノードから接続中の時のみz-indexを上げてノード全体を接続可能にする */}
      {/* ハンドル自体は透明（border-transparent）で、画像のring装飾が視覚的フィードバックを担当 */}
      <Handle
        type="target"
        id="ring-target"
        position={Position.Top}
        className={`!absolute !rounded-full !border-transparent !bg-transparent transition-opacity duration-200 ${
          showTargetHandle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          left: '50%',
          top: `${HANDLE_CENTER_Y}px`,
          transform: 'translate(-50%, -50%)',
          width: `${HANDLE_SIZE}px`,
          height: `${HANDLE_SIZE}px`,
          borderWidth: `${HANDLE_BORDER_WIDTH}px`,
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
        className="!absolute !rounded-full !bg-transparent !border-0"
        style={{
          left: '50%',
          top: `${HANDLE_CENTER_Y}px`,
          transform: 'translate(-50%, -50%)',
          width: `${CENTER_TARGET_SIZE}px`,
          height: `${CENTER_TARGET_SIZE}px`,
          opacity: 0,
          pointerEvents: isConnectingToThisNode ? 'auto' : 'none',
          zIndex: isConnectingToThisNode ? 15 : 2,
        }}
      />

      {/* 丸い画像またはデフォルトアバター */}
      {/* z-indexを上げて中央部分をドラッグ可能にする */}
      <div
        className="relative transition-transform duration-200"
        style={{ zIndex: 10 }}
      >
        {personData.imageDataUrl ? (
          <img
            src={personData.imageDataUrl}
            alt={personData.name}
            className={`w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl transition-shadow duration-200 ${
              selected || showSourceHandle || showTargetHandle ? 'ring-4 ring-blue-500' : 'ring-2 ring-gray-200'
            }`}
          />
        ) : (
          <div
            className={`w-20 h-20 rounded-full bg-gray-400 border-4 border-white shadow-xl transition-shadow duration-200 flex items-center justify-center ${
              selected || showSourceHandle || showTargetHandle ? 'ring-4 ring-blue-500' : 'ring-2 ring-gray-200'
            }`}
          >
            <span className="text-white text-2xl font-bold">{initial}</span>
          </div>
        )}
      </div>

      {/* 名前テキスト表示 */}
      <NameLabel
        name={personData.name}
        selected={selected}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
});

PersonNode.displayName = 'PersonNode';
