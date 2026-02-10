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

  describe('共有手順ガイド', () => {
    it('共有手順のタイトルが表示されること', () => {
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      expect(screen.getByText('Xでシェアする方法')).toBeInTheDocument();
    });

    it('3つのステップが表示されること', () => {
      render(
        <ShareModal
          isOpen={true}
          onClose={mockOnClose}
          imageData={mockImageData}
        />
      );

      expect(screen.getByText('画像をダウンロード')).toBeInTheDocument();
      expect(screen.getByText('Xのポスト画面を開く')).toBeInTheDocument();
      expect(screen.getByText('画像をアップロードして投稿')).toBeInTheDocument();
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

      const downloadButton = screen.getAllByRole('button', {
        name: /ダウンロード/i,
      })[0];
      expect(downloadButton).toBeInTheDocument();

      // ボタンをクリックしてもエラーが発生しないこと
      await user.click(downloadButton);
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

      // window.openが呼ばれていること（ハッシュタグ付きの投稿画面）
      expect(windowOpenSpy).toHaveBeenCalled();
      const url = windowOpenSpy.mock.calls[0][0] as string;
      expect(url).toContain('twitter.com/intent/tweet');

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
      expect(backdrop).not.toBeNull();

      await user.click(backdrop!);
      expect(mockOnClose).toHaveBeenCalled();
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
});
