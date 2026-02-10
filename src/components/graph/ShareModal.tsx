/**
 * 共有モーダル
 *
 * キャプチャされたキャンバス画像のプレビューを表示し、ダウンロード、クリップボードコピー、X投稿を提供します。
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Download, Copy, Share2 } from 'lucide-react';
import {
  downloadImage,
  copyImageToClipboard,
  openXPost,
} from '@/lib/capture-utils';

interface ShareModalProps {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
  /** キャプチャされた画像のData URL */
  imageData: string;
}

/**
 * 共有モーダルコンポーネント
 *
 * キャンバスのスクリーンショットをプレビュー表示し、以下のアクションを提供します:
 * - ダウンロード: PNG画像としてローカルに保存
 * - クリップボードにコピー: 画像をクリップボードにコピー
 * - Xにポスト: ハッシュタグ付きでX投稿画面を開く
 */
export default function ShareModal({
  isOpen,
  onClose,
  imageData,
}: ShareModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  // Escキーでモーダルを閉じる
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // ダウンロードボタンのハンドラ
  function handleDownload() {
    downloadImage(imageData);
  }

  // クリップボードにコピーボタンのハンドラ
  async function handleCopyToClipboard() {
    try {
      // Data URLをBlobに変換
      const response = await fetch(imageData);
      const blob = await response.blob();

      await copyImageToClipboard(blob);

      // 成功フィードバックを表示
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (error) {
      console.error('クリップボードへのコピーに失敗しました:', error);
    }
  }

  // Xにポストボタンのハンドラ
  function handlePostToX() {
    openXPost('人物相関図を作成しました', ['人物相関図']);
  }

  // 背景クリックでモーダルを閉じる
  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <h2 id="share-modal-title" className="text-xl font-bold">
            共有
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* 画像プレビュー */}
        <div className="mb-4">
          <img
            src={imageData}
            alt="キャンバスのプレビュー"
            className="h-auto w-full rounded border border-gray-200"
          />
        </div>

        {/* アクションボタン */}
        <div className="space-y-2">
          {/* ダウンロード */}
          <button
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <Download size={20} />
            ダウンロード
          </button>

          {/* クリップボードにコピー */}
          <button
            onClick={handleCopyToClipboard}
            className="flex w-full items-center justify-center gap-2 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            <Copy size={20} />
            クリップボードにコピー
          </button>

          {/* Xにポスト */}
          <button
            onClick={handlePostToX}
            className="flex w-full items-center justify-center gap-2 rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-900"
          >
            <Share2 size={20} />
            Xにポスト
          </button>
        </div>

        {/* コピー成功フィードバック */}
        {copySuccess && (
          <div className="mt-4 rounded bg-green-100 p-2 text-center text-green-800">
            クリップボードにコピーしました
          </div>
        )}
      </div>
    </div>
  );
}
