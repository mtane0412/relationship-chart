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

    beforeEach(() => {
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
});
