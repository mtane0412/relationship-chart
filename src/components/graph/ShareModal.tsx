/**
 * 共有モーダル
 *
 * キャプチャされたキャンバス画像のプレビューを表示し、ダウンロード、クリップボードコピー、X投稿を提供します。
 */

'use client';

import { useEffect } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import {
  downloadImage,
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

  // Xにポストボタンのハンドラ
  function handlePostToX() {
    openXPost('人物相関図を作成しました', ['人物相関図作る君']);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* ヘッダー（固定） */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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

        {/* スクロール可能なコンテンツ */}
        <div className="px-6 py-4">
          {/* 画像プレビュー */}
          <div className="mb-4">
            <img
              src={imageData}
              alt="キャンバスのプレビュー"
              className="h-auto w-full max-w-md mx-auto rounded border border-gray-200"
            />
          </div>

        {/* 共有手順ガイド */}
        <div className="mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Xでシェアする方法
          </h3>

          {/* ステップ1: ダウンロード */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                1
              </div>
              <h4 className="font-semibold text-gray-800">画像をダウンロード</h4>
            </div>
            <p className="mb-3 text-sm text-gray-600">
              まだダウンロードしていない場合は、画像をダウンロードしてください。
            </p>
            <button
              onClick={handleDownload}
              className="flex w-full items-center justify-center gap-2 rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              <Download size={16} />
              ダウンロード
            </button>
          </div>

          {/* ステップ2: Xのポスト画面を開く */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                2
              </div>
              <h4 className="font-semibold text-gray-800">
                Xのポスト画面を開く
              </h4>
            </div>
            <p className="mb-3 text-sm text-gray-600">
              X投稿画面を開きます。
            </p>
            <button
              onClick={handlePostToX}
              className="flex w-full items-center justify-center gap-2 rounded border-2 border-gray-800 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              <Share2 size={16} />
              Xにポスト
            </button>
          </div>

          {/* ステップ3: 画像をアップロードして投稿 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                3
              </div>
              <h4 className="font-semibold text-gray-800">画像をアップロードして投稿</h4>
            </div>
            <p className="text-sm text-gray-600">
              ダウンロードフォルダから画像を選択するか、画像をドラッグ&ドロップしてアップロードし、投稿してください。
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
