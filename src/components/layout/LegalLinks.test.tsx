/**
 * LegalLinksコンポーネントのテスト
 *
 * プライバシーポリシーと免責事項へのリンクの表示を検証します。
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LegalLinks from './LegalLinks';

describe('LegalLinks', () => {
  it('プライバシーポリシーリンクが表示される', () => {
    render(<LegalLinks />);

    const privacyLink = screen.getByRole('link', {
      name: 'プライバシーポリシー',
    });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('免責事項リンクが表示される', () => {
    render(<LegalLinks />);

    const termsLink = screen.getByRole('link', { name: '免責事項' });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms');
  });

  it('区切り文字が表示される', () => {
    render(<LegalLinks />);

    // 区切り文字「|」が表示されることを確認
    expect(screen.getByText('|')).toBeInTheDocument();
  });
});
