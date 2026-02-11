/**
 * not-found.tsxのテスト
 * 404ページの振る舞いを検証
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFoundPage from './not-found';

describe('NotFoundPage', () => {
  it('404メッセージが表示される', () => {
    render(<NotFoundPage />);

    // 404ページのタイトルが表示されること
    expect(screen.getByText('404')).toBeInTheDocument();

    // エラーメッセージが表示されること
    expect(screen.getByText('ページが見つかりませんでした')).toBeInTheDocument();

    // 説明文が表示されること
    expect(screen.getByText('お探しのページは存在しないか、移動した可能性があります。')).toBeInTheDocument();
  });

  it('ホームリンクが表示され、正しいURLを持つ', () => {
    render(<NotFoundPage />);

    // ホームリンクが表示されること
    const homeLink = screen.getByRole('link', { name: 'ホームに戻る' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
