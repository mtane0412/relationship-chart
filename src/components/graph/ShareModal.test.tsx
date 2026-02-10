/**
 * ShareModal.tsx のテスト
 *
 * 共有モーダルのUI動作（表示/非表示、ボタンクリック、Escキー処理）をテストします
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareModal from './ShareModal';

describe('ShareModal', () => {
  const mockImageData = 'data:image/png;base64,test-image-data';
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // ClipboardItemのモックをグローバルに設定
    global.ClipboardItem = vi.fn() as unknown as typeof ClipboardItem;

    // fetchのモック（クリップボードコピー時に使用）
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['test'], { type: 'image/png' })),
    });
  });

  describe('表示/非表示', () => {
    it('isOpen=true の場合、モーダルが表示されること', () => {
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('共有')).toBeInTheDocument();
    });

    it('isOpen=false の場合、モーダルが表示されないこと', () => {
      render(
        <ShareModal
          isOpen={false}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('画像プレビュー', () => {
    it('渡された画像データがプレビュー表示されること', () => {
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      const previewImage = screen.getByAltText('キャンバスのプレビュー');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', mockImageData);
    });
  });

  describe('ボタン操作', () => {
    it('ダウンロードボタンがクリック可能であること', async () => {
      const user = userEvent.setup();
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      const downloadButton = screen.getByRole('button', {
        name: /ダウンロード/i,
      });
      expect(downloadButton).toBeInTheDocument();

      // ボタンをクリックしてもエラーが発生しないこと
      await user.click(downloadButton);
    });

    it('クリップボードにコピーボタンがクリック可能であること', async () => {
      const user = userEvent.setup();
      // navigator.clipboardのモック
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          write: vi.fn().mockResolvedValue(undefined),
        },
        writable: true,
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      const copyButton = screen.getByRole('button', {
        name: /クリップボードにコピー/i,
      });
      expect(copyButton).toBeInTheDocument();

      // ボタンをクリックしてもエラーが発生しないこと
      await user.click(copyButton);
    });

    it('Xにポストボタンがクリック可能であること', async () => {
      const user = userEvent.setup();
      const windowOpenSpy = vi
        .spyOn(window, 'open')
        .mockReturnValue(null);

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      const postButton = screen.getByRole('button', {
        name: /Xにポスト/i,
      });
      expect(postButton).toBeInTheDocument();

      await user.click(postButton);

      // window.openが呼ばれていること
      expect(windowOpenSpy).toHaveBeenCalled();

      windowOpenSpy.mockRestore();
    });
  });

  describe('モーダルを閉じる操作', () => {
    it('閉じるボタンをクリックするとonCloseが呼ばれること', async () => {
      const user = userEvent.setup();
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      const closeButton = screen.getByRole('button', { name: /閉じる/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });

    it('背景をクリックするとonCloseが呼ばれること', async () => {
      const user = userEvent.setup();
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      // 背景要素をクリック
      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('Escキーを押すとonCloseが呼ばれること', async () => {
      const user = userEvent.setup();
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  describe('クリップボードコピー成功フィードバック', () => {
    it('クリップボードにコピー成功時、フィードバックメッセージが表示されること', async () => {
      const user = userEvent.setup();
      // navigator.clipboardのモック
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          write: vi.fn().mockResolvedValue(undefined),
        },
        writable: true,
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      const copyButton = screen.getByRole('button', {
        name: /クリップボードにコピー/i,
      });
      await user.click(copyButton);

      // 成功メッセージが表示されること（非同期）
      const feedbackMessage = await screen.findByText(
        /クリップボードにコピーしました/i
      );
      expect(feedbackMessage).toBeInTheDocument();
    });
  });
});
