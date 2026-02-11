/**
 * 画像処理ユーティリティ
 * 画像のリサイズとData URL変換を行う
 */

import { MAX_IMAGE_FILE_SIZE_BYTES } from './validation-constants';

/**
 * ファイルサイズ制限のエラーメッセージ用のMB表記
 */
const MAX_SIZE_MB = MAX_IMAGE_FILE_SIZE_BYTES / (1024 * 1024);

/**
 * クロップ領域を表す型
 * react-easy-cropのonCropCompleteコールバックから受け取るcroppedAreaPixelsと同じ形状
 */
export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 画像ファイルをリサイズせずにData URLに変換する
 * クロップUIで元画像を表示する際に使用
 * @param file - 変換する画像ファイル
 * @returns Data URL形式の画像文字列
 * @throws {Error} 画像ファイル以外が渡された場合、または処理に失敗した場合
 */
export async function readFileAsDataUrl(file: File): Promise<string> {
  // 画像ファイルかチェック
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください');
  }

  // ファイルサイズチェック（10MB以下）
  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    throw new Error(`画像ファイルのサイズは${MAX_SIZE_MB}MB以下にしてください`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 画像ファイルを200x200pxにリサイズし、Data URLに変換する
 * @param file - 変換する画像ファイル
 * @returns Data URL形式の画像文字列（JPEG形式、品質0.8）
 * @throws {Error} 画像ファイル以外が渡された場合、または処理に失敗した場合
 */
export async function processImage(file: File): Promise<string> {
  // 画像ファイルかチェック
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください');
  }

  // ファイルサイズチェック（10MB以下）
  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    throw new Error(`画像ファイルのサイズは${MAX_SIZE_MB}MB以下にしてください`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Canvasを作成して200x200pxにリサイズ
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas 2Dコンテキストの取得に失敗しました'));
          return;
        }

        const targetSize = 200;
        canvas.width = targetSize;
        canvas.height = targetSize;

        // 画像の中央部分を切り取って正方形にする（Center Crop）
        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          targetSize,
          targetSize
        );

        // Data URLに変換（JPEG形式、品質0.8）
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('画像の読み込みに失敗しました'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 画像をクロップして200x200pxにリサイズし、Data URLに変換する
 * @param imageSrc - 元画像のData URL
 * @param cropArea - クロップ領域（ピクセル単位）
 * @returns Data URL形式の画像文字列（JPEG形式、品質0.8）
 * @throws {Error} 画像の読み込みまたは処理に失敗した場合
 */
export async function cropImage(
  imageSrc: string,
  cropArea: Area
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Canvasを作成して200x200pxにリサイズ
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas 2Dコンテキストの取得に失敗しました'));
        return;
      }

      const targetSize = 200;
      canvas.width = targetSize;
      canvas.height = targetSize;

      // 透過背景を白で塗りつぶす（透過PNGをアップロードした際の黒背景を防ぐ）
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, targetSize, targetSize);

      // クロップ領域を切り取って正方形にリサイズ
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        targetSize,
        targetSize
      );

      // Data URLに変換（JPEG形式、品質0.8）
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    };

    img.onerror = () => {
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = imageSrc;
  });
}
