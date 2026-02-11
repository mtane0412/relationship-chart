/**
 * 免責事項ページのテスト
 *
 * 免責事項ページの表示内容を検証します。
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TermsPage from './page';

describe('TermsPage', () => {
  it('h1に「免責事項」が表示される', () => {
    render(<TermsPage />);

    // h1要素に「免責事項」というテキストが表示されることを確認
    const heading = screen.getByRole('heading', {
      level: 1,
      name: '免責事項',
    });
    expect(heading).toBeInTheDocument();
  });

  it('肖像権に関する説明が含まれる', () => {
    render(<TermsPage />);

    // 肖像権に関する説明が含まれることを確認（セクション見出しで確認）
    expect(
      screen.getByRole('heading', { name: '2. 第三者の権利' })
    ).toBeInTheDocument();
  });

  it('データ消失に関する説明が含まれる', () => {
    render(<TermsPage />);

    // データ消失に関する説明が含まれることを確認（セクション見出しで確認）
    expect(
      screen.getByRole('heading', { name: '3. データ消失のリスク' })
    ).toBeInTheDocument();
  });

  it('「ホームに戻る」リンクがhref="/"を持つ', () => {
    render(<TermsPage />);

    // 「ホームに戻る」リンクが存在し、href="/"を持つことを確認
    const homeLink = screen.getByRole('link', { name: 'ホームに戻る' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
