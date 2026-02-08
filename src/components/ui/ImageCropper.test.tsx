/**
 * ImageCropperコンポーネントのテスト
 * 画像クロップUIの表示・操作を検証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageCropper from './ImageCropper';
import * as imageUtils from '@/lib/image-utils';

// react-easy-cropをモック
vi.mock('react-easy-crop', () => ({
  default: ({ onCropComplete, cropShape }: { onCropComplete: (croppedArea: imageUtils.Area, croppedAreaPixels: imageUtils.Area) => void; cropShape?: string }) => {
    // レンダリング時に即座にonCropCompleteを呼び出す
    setTimeout(() => {
      const mockArea = { x: 0, y: 0, width: 100, height: 100 };
      onCropComplete(mockArea, mockArea);
    }, 0);
    return (
      <div data-testid="cropper-mock" data-crop-shape={cropShape}>
        Cropper Mock
      </div>
    );
  },
}));

describe('ImageCropper', () => {
  const mockImageSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('画像とコントロールを表示する', () => {
    render(
      <ImageCropper
        imageSrc={mockImageSrc}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // ズームスライダーが表示されることを確認
    expect(screen.getByRole('slider')).toBeInTheDocument();

    // 確定ボタンとキャンセルボタンが表示されることを確認
    expect(screen.getByRole('button', { name: /確定/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument();
  });

  it('キャンセルボタンをクリックするとonCancelが呼ばれる', async () => {
    const user = userEvent.setup();
    render(
      <ImageCropper
        imageSrc={mockImageSrc}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('cropImage失敗時にエラーメッセージを表示する', async () => {
    // cropImageをモックしてエラーを投げる
    const cropImageSpy = vi.spyOn(imageUtils, 'cropImage');
    cropImageSpy.mockRejectedValue(new Error('クロップ処理に失敗しました'));

    const user = userEvent.setup();
    render(
      <ImageCropper
        imageSrc={mockImageSrc}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // 確定ボタンをクリック
    const confirmButton = screen.getByRole('button', { name: /確定/i });
    await user.click(confirmButton);

    // エラーメッセージが表示されることを確認（次のアクションを促すメッセージ含む）
    await waitFor(() => {
      expect(
        screen.getByText(/クロップ処理に失敗しました。キャンセルしてやり直してください。/i)
      ).toBeInTheDocument();
    });

    // onCompleteが呼ばれないことを確認
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('cropShape propが未指定の場合、デフォルトで"round"が使用される', () => {
    render(
      <ImageCropper
        imageSrc={mockImageSrc}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const cropper = screen.getByTestId('cropper-mock');
    expect(cropper).toHaveAttribute('data-crop-shape', 'round');
  });

  it('cropShape="rect"を指定すると四角形クロップが使用される', () => {
    render(
      <ImageCropper
        imageSrc={mockImageSrc}
        cropShape="rect"
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const cropper = screen.getByTestId('cropper-mock');
    expect(cropper).toHaveAttribute('data-crop-shape', 'rect');
  });

  it('cropShape="round"を明示的に指定すると円形クロップが使用される', () => {
    render(
      <ImageCropper
        imageSrc={mockImageSrc}
        cropShape="round"
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const cropper = screen.getByTestId('cropper-mock');
    expect(cropper).toHaveAttribute('data-crop-shape', 'round');
  });
});
