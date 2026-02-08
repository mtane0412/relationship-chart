/**
 * 画像クロップUIコンポーネント
 * react-easy-cropを使用して、ユーザーが画像のクロップ位置とズームを調整できるUIを提供
 */

'use client';

import { useCallback, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { cropImage } from '@/lib/image-utils';

interface ImageCropperProps {
  /** クロップ対象の画像（Data URL形式） */
  imageSrc: string;
  /** クロップ完了時のコールバック（200x200pxのData URLを渡す） */
  onComplete: (croppedImage: string) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
}

/**
 * ImageCropperコンポーネント
 * 円形プレビュー、ドラッグ＆ズーム機能を提供
 */
export default function ImageCropper({
  imageSrc,
  onComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // クロップ完了時にクロップ領域を保存
  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  // 確定ボタンをクリックした際の処理
  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) {
      return;
    }

    try {
      // クロップ処理を実行
      const croppedImage = await cropImage(imageSrc, croppedAreaPixels);
      onComplete(croppedImage);
    } catch (error) {
      // エラーハンドリング（エラーメッセージを表示するなど）
      if (process.env.NODE_ENV === 'development') {
        console.error('クロップ処理に失敗しました:', error);
      }
    }
  }, [croppedAreaPixels, imageSrc, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* クロッパー領域 */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* コントロール領域 */}
      <div className="flex flex-col gap-4 bg-white p-4">
        {/* ズームスライダー */}
        <div className="flex items-center gap-4">
          <label htmlFor="zoom-slider" className="text-sm font-medium">
            ズーム
          </label>
          <input
            id="zoom-slider"
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
            aria-label="ズーム調整"
          />
        </div>

        {/* 確定/キャンセルボタン */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
}
