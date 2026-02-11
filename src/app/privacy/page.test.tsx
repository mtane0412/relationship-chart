/**
 * プライバシーポリシーページのテスト
 *
 * プライバシーポリシーページの表示内容を検証します。
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('h1に「プライバシーポリシー」が表示される', () => {
    render(<PrivacyPage />);

    // h1要素に「プライバシーポリシー」というテキストが表示されることを確認
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'プライバシーポリシー',
    });
    expect(heading).toBeInTheDocument();
  });

  it('LocalStorageに関する説明が含まれる', () => {
    render(<PrivacyPage />);

    // LocalStorageに関する説明が含まれることを確認（複数箇所に出現するためgetAllByTextを使用）
    const elements = screen.getAllByText(/LocalStorage/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('画像の取り扱いに関する説明が含まれる', () => {
    render(<PrivacyPage />);

    // 画像の取り扱いに関する説明が含まれることを確認（セクション見出しで確認）
    expect(
      screen.getByRole('heading', { name: '2. 画像の取り扱い' })
    ).toBeInTheDocument();
  });

  it('「ホームに戻る」リンクがhref="/"を持つ', () => {
    render(<PrivacyPage />);

    // 「ホームに戻る」リンクが存在し、href="/"を持つことを確認
    const homeLink = screen.getByRole('link', { name: 'ホームに戻る' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
