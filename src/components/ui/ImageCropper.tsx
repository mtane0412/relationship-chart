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
  const [error, setError] = useState<string>('');

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

    // エラー状態をリセット
    setError('');

    try {
      // クロップ処理を実行
      const croppedImage = await cropImage(imageSrc, croppedAreaPixels);
      onComplete(croppedImage);
    } catch (error) {
      // エラーメッセージをUIに表示（ユーザーに次のアクションを促す）
      const baseMessage =
        error instanceof Error ? error.message : 'クロップ処理に失敗しました';
      setError(`${baseMessage}。キャンセルしてやり直してください。`);

      // 開発環境ではコンソールにもログ出力
      if (process.env.NODE_ENV === 'development') {
        console.error('クロップ処理に失敗しました:', error);
      }
    }
  }, [croppedAreaPixels, imageSrc, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">画像を調整</h2>

        {/* クロッパー領域 */}
        <div className="relative h-96 bg-gray-100 rounded-lg mb-4">
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
        <div className="flex flex-col gap-4">
          {/* ズームスライダー */}
          <div className="flex items-center gap-4">
            <label htmlFor="zoom-slider" className="text-sm font-medium text-gray-700">
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

          {/* エラーメッセージ */}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {/* 確定/キャンセルボタン */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              確定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
