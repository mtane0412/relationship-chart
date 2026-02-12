/**
 * NameLabelコンポーネントのテスト
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NameLabel } from './NameLabel';

describe('NameLabel', () => {
  const mockHandlers = {
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
  };

  it('名前が表示されること', () => {
    render(<NameLabel name="田中太郎" selected={false} {...mockHandlers} />);
    expect(screen.getByText('田中太郎')).toBeInTheDocument();
  });

  it('data-testid="name-label"が設定されていること', () => {
    render(<NameLabel name="田中太郎" selected={false} {...mockHandlers} />);
    expect(screen.getByTestId('name-label')).toBeInTheDocument();
  });

  it('absolute配置であること', () => {
    render(<NameLabel name="田中太郎" selected={false} {...mockHandlers} />);
    const label = screen.getByTestId('name-label');
    expect(label.className).toContain('absolute');
  });

  it('画像の下に水平中央配置されていること', () => {
    render(<NameLabel name="田中太郎" selected={false} {...mockHandlers} />);
    const label = screen.getByTestId('name-label') as HTMLElement;

    const style = label.style;
    expect(style.top).toBe('88px'); // IMAGE_SIZE(80) + NAME_LABEL_GAP(8) = 88px
    expect(style.left).toBe('50%');
    expect(style.transform).toBe('translateX(-50%)');
  });

  it('border幅が常にborder-2であること', () => {
    const { rerender } = render(<NameLabel name="田中太郎" selected={false} {...mockHandlers} />);
    const unselectedLabel = screen.getByTestId('name-label');
    expect(unselectedLabel.className).toContain('border-2');

    rerender(<NameLabel name="田中太郎" selected={true} {...mockHandlers} />);
    const selectedLabel = screen.getByTestId('name-label');
    expect(selectedLabel.className).toContain('border-2');
  });

  it('選択状態でborder色がborder-blue-500であること', () => {
    render(<NameLabel name="田中太郎" selected={true} {...mockHandlers} />);
    const label = screen.getByTestId('name-label');
    expect(label.className).toContain('border-blue-500');
  });

  it('非選択状態でborder色がborder-gray-200であること', () => {
    render(<NameLabel name="田中太郎" selected={false} {...mockHandlers} />);
    const label = screen.getByTestId('name-label');
    expect(label.className).toContain('border-gray-200');
  });
});
