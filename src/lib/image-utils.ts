/**
 * 画像処理ユーティリティ
 * 画像のリサイズとData URL変換を行う
 */

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
