/**
 * image-utils.tsのテスト
 * 画像リサイズ処理の振る舞いを検証
 */

import { describe, it, expect } from 'vitest';
import { processImage, readFileAsDataUrl, cropImage } from './image-utils';

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

  describe('readFileAsDataUrl', () => {
    it('画像ファイルを受け取り、リサイズせずにData URLを返す', async () => {
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

      const result = await readFileAsDataUrl(file);

      // Data URL形式であることを確認
      expect(result).toMatch(/^data:image\/png;base64,/);
      // 元の画像データと一致することを確認
      expect(result).toContain(base64Data);
    });

    it('画像以外のファイルを渡すとエラーを投げる', async () => {
      const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

      await expect(readFileAsDataUrl(textFile)).rejects.toThrow(
        '画像ファイルを選択してください'
      );
    });
  });

  describe('cropImage', () => {
    // jsdomではCanvas APIが完全にサポートされていないため、
    // 実際の画像クロップテストは統合テストまたは手動テストで確認する
    it.skip('画像とクロップ領域を受け取り、200x200pxのData URLを返す', async () => {
      // テスト用の小さな画像Data URL
      const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const cropArea = { x: 0, y: 0, width: 100, height: 100 };

      const result = await cropImage(imageDataUrl, cropArea);

      // Data URL形式であることを確認（JPEG形式）
      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    // jsdomの環境ではImage.onerrorが正しく動作しないため、skipにする
    it.skip('不正な画像URLを渡すとエラーを投げる', async () => {
      const invalidUrl = 'not-a-data-url';
      const cropArea = { x: 0, y: 0, width: 100, height: 100 };

      await expect(cropImage(invalidUrl, cropArea)).rejects.toThrow(
        '画像の読み込みに失敗しました'
      );
    });
  });
});
