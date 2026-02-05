/**
 * image-utils.tsのテスト
 * 画像リサイズ処理の振る舞いを検証
 */

import { describe, it, expect } from 'vitest';
import { processImage } from './image-utils';

describe('image-utils', () => {
  describe('processImage', () => {
    // jsdomではCanvas APIが完全にサポートされていないため、
    // 実際の画像処理テストは統合テストまたは手動テストで確認する
    it.skip('画像ファイルを受け取り、Data URLを返すPromiseを返す', async () => {
      // 1x1ピクセルの透明なPNG画像（Base64エンコード済み）
      const base64Data =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      const file = new File([blob], 'test.png', { type: 'image/png' });

      const result = await processImage(file);

      // Data URL形式であることを確認
      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('画像以外のファイルを渡すとエラーを投げる', async () => {
      const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

      await expect(processImage(textFile)).rejects.toThrow(
        '画像ファイルを選択してください'
      );
    });
  });
});
