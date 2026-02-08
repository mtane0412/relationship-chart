/**
 * ImageCropperコンポーネントのテスト
 * 画像クロップUIの表示・操作を検証
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageCropper from './ImageCropper';

describe('ImageCropper', () => {
  const mockImageSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

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
});
