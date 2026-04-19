/**
 * SnapshotCaptureDialogコンポーネントのテスト
 * スナップショット保存のラベル・説明入力ダイアログのUIを検証する
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnapshotCaptureDialog } from './SnapshotCaptureDialog';

describe('SnapshotCaptureDialog', () => {
  const mockOnCapture = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isOpen=false のとき何も表示しない', () => {
    const { container } = render(
      <SnapshotCaptureDialog
        isOpen={false}
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('isOpen=true のときダイアログが表示される', () => {
    render(
      <SnapshotCaptureDialog
        isOpen={true}
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    // ラベル入力フィールドが表示されること
    expect(screen.getByRole('textbox', { name: /ラベル/i })).toBeInTheDocument();
    // 保存ボタンが表示されること
    expect(screen.getByRole('button', { name: /保存/i })).toBeInTheDocument();
    // キャンセルボタンが表示されること
    expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument();
  });

  it('ラベルを入力して保存ボタンを押すと onCapture が呼ばれる', async () => {
    const user = userEvent.setup();
    render(
      <SnapshotCaptureDialog
        isOpen={true}
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    // ラベルを入力
    const labelInput = screen.getByRole('textbox', { name: /ラベル/i });
    await user.type(labelInput, '第1話');

    // 保存ボタンをクリック
    await user.click(screen.getByRole('button', { name: /保存/i }));

    expect(mockOnCapture).toHaveBeenCalledWith('第1話', undefined);
  });

  it('ラベルと説明を入力して保存すると両方が渡される', async () => {
    const user = userEvent.setup();
    render(
      <SnapshotCaptureDialog
        isOpen={true}
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    await user.type(screen.getByRole('textbox', { name: /ラベル/i }), '第2話');
    await user.type(screen.getByRole('textbox', { name: /説明/i }), '明智光秀が登場する回');

    await user.click(screen.getByRole('button', { name: /保存/i }));

    expect(mockOnCapture).toHaveBeenCalledWith('第2話', '明智光秀が登場する回');
  });

  it('ラベルが空のとき保存ボタンが無効になる', () => {
    render(
      <SnapshotCaptureDialog
        isOpen={true}
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('button', { name: /保存/i })).toBeDisabled();
  });

  it('キャンセルボタンを押すと onCancel が呼ばれる', async () => {
    const user = userEvent.setup();
    render(
      <SnapshotCaptureDialog
        isOpen={true}
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: /キャンセル/i }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('Escapeキーで onCancel が呼ばれる', async () => {
    const user = userEvent.setup();
    render(
      <SnapshotCaptureDialog
        isOpen={true}
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    await user.keyboard('{Escape}');

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('ラベル入力中にEnterキーを押すと保存される（IMEなし）', async () => {
    const user = userEvent.setup();
    render(
      <SnapshotCaptureDialog
        isOpen={true}
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    const labelInput = screen.getByRole('textbox', { name: /ラベル/i });
    await user.type(labelInput, '第3話');
    await user.keyboard('{Enter}');

    expect(mockOnCapture).toHaveBeenCalledWith('第3話', undefined);
  });
});
