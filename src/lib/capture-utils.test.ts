/**
 * capture-utils.ts のテスト
 *
 * キャンバスキャプチャ、ダウンロード、クリップボードコピー、X投稿の各ユーティリティ関数をテストします
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  downloadImage,
  copyImageToClipboard,
  openXPost,
  calculateImageDimensions,
} from './capture-utils';

describe('capture-utils', () => {
  describe('downloadImage', () => {
    let createElementSpy: ReturnType<typeof vi.spyOn>;
    let anchorElement: HTMLAnchorElement;

    beforeEach(() => {
      // anchor要素のモックを作成
      anchorElement = document.createElement('a');
      anchorElement.click = vi.fn();
      createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(anchorElement);
    });

    afterEach(() => {
      createElementSpy.mockRestore();
    });

    it('指定されたData URLとファイル名で画像をダウンロードすること', () => {
      const dataUrl = 'data:image/png;base64,test';
      const filename = 'test-image.png';

      downloadImage(dataUrl, filename);

      // anchor要素が正しく設定されていること
      expect(anchorElement.href).toBe(dataUrl);
      expect(anchorElement.download).toBe(filename);
      expect(anchorElement.click).toHaveBeenCalledOnce();
    });

    it('ファイル名が指定されない場合、デフォルト名を使用すること', () => {
      const dataUrl = 'data:image/png;base64,test';

      downloadImage(dataUrl);

      // デフォルトのファイル名が設定されていること
      expect(anchorElement.download).toBe('relationship-chart.png');
      expect(anchorElement.click).toHaveBeenCalledOnce();
    });
  });

  describe('copyImageToClipboard', () => {
    let writeToClipboardSpy: ReturnType<typeof vi.fn>;
    let ClipboardItemMock: ReturnType<typeof vi.fn>;
    let originalClipboard: PropertyDescriptor | undefined;
    let originalClipboardItem: typeof ClipboardItem | undefined;

    beforeEach(() => {
      // オリジナルを保存
      originalClipboard = Object.getOwnPropertyDescriptor(
        navigator,
        'clipboard'
      );
      originalClipboardItem = global.ClipboardItem;

      // ClipboardItemのモックを作成
      ClipboardItemMock = vi.fn();
      global.ClipboardItem = ClipboardItemMock as unknown as typeof ClipboardItem;

      // navigator.clipboardのモックを作成
      writeToClipboardSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          write: writeToClipboardSpy,
        },
        writable: true,
      });
    });

    afterEach(() => {
      // オリジナルを復元
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', originalClipboard);
      }
      if (originalClipboardItem) {
        global.ClipboardItem = originalClipboardItem;
      }
    });

    it('画像をクリップボードにコピーすること', async () => {
      const blob = new Blob(['test'], { type: 'image/png' });

      await copyImageToClipboard(blob);

      // ClipboardItemが正しく作成され、writeが呼ばれていること
      expect(writeToClipboardSpy).toHaveBeenCalledOnce();
      const clipboardItems = writeToClipboardSpy.mock.calls[0][0];
      expect(clipboardItems).toHaveLength(1);
      expect(clipboardItems[0]).toBeInstanceOf(ClipboardItem);
    });

    it('クリップボードAPIが失敗した場合、エラーをスローすること', async () => {
      const error = new Error('Clipboard write failed');
      writeToClipboardSpy.mockRejectedValue(error);

      const blob = new Blob(['test'], { type: 'image/png' });

      await expect(copyImageToClipboard(blob)).rejects.toThrow(
        'Clipboard write failed'
      );
    });
  });

  describe('openXPost', () => {
    let windowOpenSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
    });

    it('指定されたテキストとハッシュタグでX投稿画面を開くこと', () => {
      const text = '人物相関図を作成しました';
      const hashtags = ['人物相関図作る君'];

      openXPost(text, hashtags);

      // window.openが正しいURLで呼ばれていること
      expect(windowOpenSpy).toHaveBeenCalledOnce();
      const url = windowOpenSpy.mock.calls[0][0] as string;
      expect(url).toContain('twitter.com/intent/tweet');
      expect(url).toContain('text=' + encodeURIComponent(text));
      // URLSearchParamsは日本語をエンコードするため、エンコード後の文字列を確認
      expect(url).toContain('hashtags=' + encodeURIComponent('人物相関図作る君'));
    });

    it('ハッシュタグが空の場合、ハッシュタグなしで投稿画面を開くこと', () => {
      const text = 'テスト投稿';
      const hashtags: string[] = [];

      openXPost(text, hashtags);

      // ハッシュタグパラメータが含まれていないこと
      const url = windowOpenSpy.mock.calls[0][0] as string;
      expect(url).not.toContain('hashtags=');
    });

    it('別タブ（_blank）で開くこと', () => {
      const text = 'テスト';
      const hashtags = ['test'];

      openXPost(text, hashtags);

      // 第2引数が'_blank'であること
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.any(String),
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('calculateImageDimensions', () => {
    it('ノードが狭い範囲にある場合、最小サイズ (1024x768) を返すこと', () => {
      // ノード境界が 500x400（パディング込みで 700x560）の場合
      const nodesBounds = { width: 500, height: 400 };

      const result = calculateImageDimensions(nodesBounds);

      // 最小サイズが適用されること
      expect(result.width).toBe(1024);
      expect(result.height).toBe(768);
    });

    it('ノードが広範囲にある場合、パディング付きサイズを返すこと', () => {
      // ノード境界が 1500x1000（パディング込みで 2100x1400）の場合
      const nodesBounds = { width: 1500, height: 1000 };

      const result = calculateImageDimensions(nodesBounds);

      // パディング20%を含むサイズが返されること
      // width: 1500 * (1 + 0.2 * 2) = 1500 * 1.4 = 2100
      // height: 1000 * (1 + 0.2 * 2) = 1000 * 1.4 = 1400
      expect(result.width).toBe(2100);
      expect(result.height).toBe(1400);
    });

    it('ノードが非常に広範囲にある場合、最大サイズ (4096x3072) を超えないこと', () => {
      // ノード境界が 5000x4000（パディング込みで 7000x5600）の場合
      const nodesBounds = { width: 5000, height: 4000 };

      const result = calculateImageDimensions(nodesBounds);

      // 最大サイズが適用されること
      expect(result.width).toBe(4096);
      expect(result.height).toBe(3072);
    });

    it('パディング付きサイズが切り上げられること', () => {
      // ノード境界が 1001x801（パディング込みで 1401.4x1121.4）の場合
      const nodesBounds = { width: 1001, height: 801 };

      const result = calculateImageDimensions(nodesBounds);

      // Math.ceilで切り上げられること
      expect(result.width).toBe(1402); // 1001 * 1.4 = 1401.4 → 1402
      expect(result.height).toBe(1122); // 801 * 1.4 = 1121.4 → 1122
    });
  });
});
