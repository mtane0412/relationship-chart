/**
 * AuthorAttribution コンポーネントのテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuthorAttribution } from './AuthorAttribution';

describe('AuthorAttribution', () => {
  it('Xへのリンクが正しいURLで表示されること', () => {
    render(<AuthorAttribution />);
    const xLink = screen.getByRole('link', { name: /@mtane0412/i });
    expect(xLink).toHaveAttribute('href', 'https://x.com/mtane0412');
  });

  it('GitHubへのリンクが正しいURLで表示されること', () => {
    render(<AuthorAttribution />);
    const githubLink = screen.getByRole('link', { name: /github/i });
    expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/mtane0412/relationship-chart'
    );
  });

  it('すべてのリンクがtarget="_blank"で新しいタブで開くこと', () => {
    render(<AuthorAttribution />);
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('XとGitHubの2つのリンクが表示されること', () => {
    render(<AuthorAttribution />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
  });
});
