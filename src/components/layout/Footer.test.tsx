/**
 * Footerコンポーネントのテスト
 *
 * フッターリンクとデータ保存に関する案内メッセージの表示を検証します。
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Footer from './Footer';

describe('Footer', () => {
  it('データ保存に関する案内メッセージが表示される', () => {
    render(<Footer />);

    // 「データはお使いのブラウザにのみ保存されます」というテキストが表示されることを確認
    expect(
      screen.getByText('データはお使いのブラウザにのみ保存されます')
    ).toBeInTheDocument();
  });

  it('/privacyへのリンクが存在する', () => {
    render(<Footer />);

    // プライバシーポリシーへのリンクが存在することを確認
    const privacyLink = screen.getByRole('link', {
      name: 'プライバシーポリシー',
    });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('/termsへのリンクが存在する', () => {
    render(<Footer />);

    // 免責事項へのリンクが存在することを確認
    const termsLink = screen.getByRole('link', { name: '免責事項' });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms');
  });
});
