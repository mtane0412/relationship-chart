/**
 * ImageDropZoneコンポーネント
 * 画像ファイルをドラッグ&ドロップで受け付けるコンポーネント
 */

'use client';

import { useState, useCallback, type DragEvent } from 'react';

/**
 * ImageDropZoneのプロパティ
 */
type ImageDropZoneProps = {
  /** 画像ファイルがドロップされたときのコールバック */
  onDrop: (file: File) => void;
};

/**
 * 画像ドロップゾーンコンポーネント
 * @param props - コンポーネントのプロパティ
 */
export function ImageDropZone({ onDrop }: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  /**
   * ドラッグオーバー時の処理
   * デフォルト動作を防止し、ドラッグ中の状態を設定する
   */
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * ドラッグリーブ時の処理
   * ドラッグ中の状態を解除する
   */
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * ドロップ時の処理
   * ドロップされたファイルが画像の場合、コールバックを実行する
   */
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // ドロップされたファイルを取得
      const files = Array.from(e.dataTransfer.files);

      // 最初の画像ファイルのみ処理
      const imageFile = files.find((file) => file.type.startsWith('image/'));

      if (imageFile) {
        onDrop(imageFile);
      }
    },
    [onDrop]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex flex-col items-center justify-center
        w-full h-40
        border-2 border-dashed rounded-lg
        transition-colors duration-200
        cursor-pointer
        ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }
      `}
    >
      <svg
        className={`w-12 h-12 mb-3 ${
          isDragging ? 'text-blue-500' : 'text-gray-400'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p className={`text-sm ${isDragging ? 'text-blue-600' : 'text-gray-600'}`}>
        {isDragging ? '画像をドロップしてください' : '画像をドラッグ&ドロップ'}
      </p>
      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF</p>
    </div>
  );
}
