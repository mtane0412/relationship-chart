/**
 * PersonFormコンポーネント
 * 人物を登録するフォーム
 */

'use client';

import { useState } from 'react';
import { ImageDropZone } from '@/components/dnd/ImageDropZone';
import { processImage } from '@/lib/image-utils';
import { useGraphStore } from '@/stores/useGraphStore';

/**
 * 人物登録フォームコンポーネント
 */
export function PersonForm() {
  const [name, setName] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const addPerson = useGraphStore((state) => state.addPerson);

  /**
   * 画像ドロップ時の処理
   * 画像をリサイズしてData URLに変換する
   */
  const handleImageDrop = async (file: File) => {
    setIsProcessing(true);
    setError('');

    try {
      const dataUrl = await processImage(file);
      setImageDataUrl(dataUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '画像の処理に失敗しました'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * フォーム送信時の処理
   * 人物をストアに追加する
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }

    if (!imageDataUrl) {
      setError('画像をドロップしてください');
      return;
    }

    // 人物を追加
    addPerson({
      name: name.trim(),
      imageDataUrl,
    });

    // フォームをリセット
    setName('');
    setImageDataUrl('');
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="person-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          名前
        </label>
        <input
          id="person-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="山田太郎"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          画像
        </label>
        {imageDataUrl ? (
          <div className="relative">
            <img
              src={imageDataUrl}
              alt="プレビュー"
              className="w-full h-40 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => setImageDataUrl('')}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <ImageDropZone onDrop={handleImageDrop} />
        )}
        {isProcessing && (
          <p className="text-sm text-blue-600 mt-1">画像を処理中...</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isProcessing}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        人物を追加
      </button>
    </form>
  );
}
