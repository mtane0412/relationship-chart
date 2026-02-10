/**
 * 共有ボタン
 *
 * React Flow Panel内に配置される共有ボタンコンポーネント。
 * クリック時にキャンバスをキャプチャし、ShareModalを表示します。
 */

'use client';

import { useState } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { Share2 } from 'lucide-react';
import { captureCanvasAsPng } from '@/lib/capture-utils';
import ShareModal from './ShareModal';

/**
 * 共有ボタンコンポーネント
 *
 * React Flow Panel (top-left) に配置される共有ボタン。
 * クリック時にキャンバスをキャプチャし、ShareModalを開きます。
 */
export default function ShareButton() {
  const { getNodes } = useReactFlow();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageData, setImageData] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);

  // 共有ボタンのクリックハンドラ
  async function handleShare() {
    setIsCapturing(true);
    try {
      const nodes = getNodes();
      const dataUrl = await captureCanvasAsPng(nodes);
      setImageData(dataUrl);
      setIsModalOpen(true);
    } catch (error) {
      console.error('キャンバスのキャプチャに失敗しました:', error);
    } finally {
      setIsCapturing(false);
    }
  }

  // モーダルを閉じるハンドラ
  function handleCloseModal() {
    setIsModalOpen(false);
  }

  return (
    <>
      <Panel position="top-left">
        <button
          onClick={handleShare}
          disabled={isCapturing}
          className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium shadow-md hover:bg-gray-50 disabled:opacity-50"
          title="共有"
        >
          <Share2 size={16} />
          <span>共有</span>
        </button>
      </Panel>

      <ShareModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        imageData={imageData}
      />
    </>
  );
}
