/**
 * PersonRegistrationModalコンポーネントのテスト
 * クロップUI統合後の振る舞いを検証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonRegistrationModal } from './PersonRegistrationModal';

describe('PersonRegistrationModal', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockImageSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('モーダルが閉じている場合は何も表示しない', () => {
    const { container } = render(
      <PersonRegistrationModal
        isOpen={false}
        rawImageSrc={mockImageSrc}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('モーダルが開いている場合はImageCropperを表示する', () => {
    render(
      <PersonRegistrationModal
        isOpen={true}
        rawImageSrc={mockImageSrc}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // ImageCropperのズームスライダーが表示されることを確認
    expect(screen.getByRole('slider', { name: /ズーム/i })).toBeInTheDocument();
  });

  // jsdomの環境ではCanvas APIが正しく動作しないため、skipにする
  it.skip('ImageCropperで確定後、名前入力フォームに遷移する', async () => {
    const user = userEvent.setup();
    render(
      <PersonRegistrationModal
        isOpen={true}
        rawImageSrc={mockImageSrc}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // ImageCropperの確定ボタンをクリック
    const confirmButton = screen.getByRole('button', { name: /確定/i });
    await user.click(confirmButton);

    // 名前入力フィールドが表示されることを確認
    expect(await screen.findByLabelText(/名前/i)).toBeInTheDocument();
  });

  it('ImageCropperでキャンセルするとonCancelが呼ばれる', async () => {
    const user = userEvent.setup();
    render(
      <PersonRegistrationModal
        isOpen={true}
        rawImageSrc={mockImageSrc}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // ImageCropperのキャンセルボタンをクリック
    const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});

describe('PersonRegistrationModal - ラベル入力', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // rawImageSrc=""のため、ImageCropperがレンダリングされず、Canvas APIに依存しない
  it('デフォルトで「人物」ラベルが設定されていること', async () => {
    render(
      <PersonRegistrationModal
        isOpen={true}
        rawImageSrc=""
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // TagChipInput にデフォルトラベル '人物' のチップが表示されていること
    expect(await screen.findByText('人物')).toBeInTheDocument();
    // タグ入力フィールドが表示されていること
    expect(screen.getByLabelText('タグを追加')).toBeInTheDocument();
  });

  // rawImageSrc=""のため、ImageCropperがレンダリングされず、Canvas APIに依存しない
  it('ラベルを変更してもタイトルは「ノードを登録」のまま', async () => {
    const user = userEvent.setup();
    render(
      <PersonRegistrationModal
        isOpen={true}
        rawImageSrc=""
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // タグ入力フィールドに '物' を入力して追加
    const tagInput = await screen.findByLabelText('タグを追加');
    await user.type(tagInput, '物');
    await user.keyboard('{Enter}');

    // タイトルが「ノードを登録」のままであることを確認
    expect(screen.getByText('ノードを登録')).toBeInTheDocument();
  });

  // rawImageSrc=""のため、ImageCropperがレンダリングされず、Canvas APIに依存しない
  it('onSubmitにlabels=["人物"]が渡される（デフォルト）', async () => {
    const user = userEvent.setup();
    render(
      <PersonRegistrationModal
        isOpen={true}
        rawImageSrc=""
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // デフォルトのラベルのまま、名前を入力して登録
    const nameInput = await screen.findByLabelText(/名前/i);
    await user.type(nameInput, '山田太郎');

    const submitButton = screen.getByRole('button', { name: /登録/i });
    await user.click(submitButton);

    // onSubmitが呼ばれ、第3引数としてlabels=['人物']が渡されることを確認
    // rawImageSrc=""のため、croppedImageDataUrlはnull
    expect(mockOnSubmit).toHaveBeenCalledWith('山田太郎', null, ['人物']);
  });

  // rawImageSrc=""のため、ImageCropperがレンダリングされず、Canvas APIに依存しない
  it('onSubmitにlabels=["物"]が渡される', async () => {
    const user = userEvent.setup();
    render(
      <PersonRegistrationModal
        isOpen={true}
        rawImageSrc=""
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // デフォルトの '人物' チップを削除
    const deleteButton = await screen.findByLabelText('人物を削除');
    await user.click(deleteButton);

    // '物' を追加
    const tagInput = screen.getByLabelText('タグを追加');
    await user.type(tagInput, '物');
    await user.keyboard('{Enter}');

    // 名前を入力して登録
    const nameInput = screen.getByLabelText(/名前/i);
    await user.type(nameInput, '伝説の剣');

    const submitButton = screen.getByRole('button', { name: /登録/i });
    await user.click(submitButton);

    // onSubmitが呼ばれ、第3引数としてlabels=['物']が渡されることを確認
    // rawImageSrc=""のため、croppedImageDataUrlはnull
    expect(mockOnSubmit).toHaveBeenCalledWith('伝説の剣', null, ['物']);
  });
});
