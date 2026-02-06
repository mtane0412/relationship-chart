/**
 * RelationshipRegistrationModalのテスト
 * エッジ接続による関係登録モーダルの振る舞いを検証
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RelationshipRegistrationModal } from './RelationshipRegistrationModal';

describe('RelationshipRegistrationModal', () => {
  describe('表示/非表示', () => {
    it('isOpen=falseの場合は表示されない', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={false}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // モーダルが表示されていないことを確認
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('isOpen=trueの場合は表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // モーダルが表示されることを確認
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('人物名の表示', () => {
    it('2人の人物名が表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 2人の人物名が表示されることを確認
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤花子')).toBeInTheDocument();
    });
  });

  describe('フォーム入力', () => {
    it('ラベルを入力できる', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const labelInput = screen.getByLabelText('関係のラベル');

      // ラベルを入力
      await user.type(labelInput, '親友');

      expect(labelInput).toHaveValue('親友');
    });

    it('方向性チェックボックスを切り替えられる', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const checkbox = screen.getByLabelText('方向性あり');

      // 初期状態ではチェックされていない
      expect(checkbox).not.toBeChecked();

      // チェックを入れる
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      // もう一度クリックでチェックを外す
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('バリデーション', () => {
    it('ラベルが空の場合は登録ボタンが無効化される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const submitButton = screen.getByRole('button', { name: '登録' });

      // ラベルが空なので無効化されている
      expect(submitButton).toBeDisabled();
    });

    it('ラベルが入力されている場合は登録ボタンが有効化される', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const labelInput = screen.getByLabelText('関係のラベル');
      const submitButton = screen.getByRole('button', { name: '登録' });

      // ラベルを入力
      await user.type(labelInput, '親友');

      // 登録ボタンが有効化される
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('コールバック呼び出し', () => {
    it('登録ボタンをクリックするとonSubmitが呼ばれる', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      );

      const labelInput = screen.getByLabelText('関係のラベル');
      const submitButton = screen.getByRole('button', { name: '登録' });

      // ラベルを入力
      await user.type(labelInput, '親友');

      // 登録ボタンをクリック
      await user.click(submitButton);

      // onSubmitが正しい引数で呼ばれることを確認
      expect(onSubmit).toHaveBeenCalledWith('親友', false);
    });

    it('方向性ありでonSubmitが呼ばれる', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      );

      const labelInput = screen.getByLabelText('関係のラベル');
      const checkbox = screen.getByLabelText('方向性あり');
      const submitButton = screen.getByRole('button', { name: '登録' });

      // ラベルを入力
      await user.type(labelInput, '上司');

      // 方向性ありにチェック
      await user.click(checkbox);

      // 登録ボタンをクリック
      await user.click(submitButton);

      // onSubmitが正しい引数で呼ばれることを確認
      expect(onSubmit).toHaveBeenCalledWith('上司', true);
    });

    it('キャンセルボタンをクリックするとonCancelが呼ばれる', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={onCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });

      // キャンセルボタンをクリック
      await user.click(cancelButton);

      // onCancelが呼ばれることを確認
      expect(onCancel).toHaveBeenCalled();
    });

    it('Escapeキーを押すとonCancelが呼ばれる', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={onCancel}
        />
      );

      // Escapeキーを押す
      await user.keyboard('{Escape}');

      // onCancelが呼ばれることを確認
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('フォーカス管理', () => {
    it('モーダルが開いたときにラベル入力にフォーカスされる', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePersonName="山田太郎"
          targetPersonName="佐藤花子"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const labelInput = screen.getByLabelText('関係のラベル');

      // ラベル入力にフォーカスされている
      expect(labelInput).toHaveFocus();
    });
  });
});
