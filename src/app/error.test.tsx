/**
 * error.tsxのテスト
 * ランタイムエラーページの振る舞いを検証
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorPage from './error';

describe('ErrorPage', () => {
  it('エラーメッセージが表示される', () => {
    const mockReset = vi.fn();
    const mockError = new Error('テストエラー');

    render(<ErrorPage error={mockError} reset={mockReset} />);

    // エラーページのタイトルが表示されること
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

    // エラーメッセージが表示されること
    expect(screen.getByText('申し訳ございません。予期しないエラーが発生しました。')).toBeInTheDocument();
  });

  it('リセットボタンが表示され、クリックでresetが呼ばれる', async () => {
    const user = userEvent.setup();
    const mockReset = vi.fn();
    const mockError = new Error('テストエラー');

    render(<ErrorPage error={mockError} reset={mockReset} />);

    // リセットボタンが表示されること
    const resetButton = screen.getByRole('button', { name: '再試行' });
    expect(resetButton).toBeInTheDocument();

    // リセットボタンをクリックするとresetが呼ばれること
    await user.click(resetButton);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('ホームリンクが表示され、正しいURLを持つ', () => {
    const mockReset = vi.fn();
    const mockError = new Error('テストエラー');

    render(<ErrorPage error={mockError} reset={mockReset} />);

    // ホームリンクが表示されること
    const homeLink = screen.getByRole('link', { name: 'ホームに戻る' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
