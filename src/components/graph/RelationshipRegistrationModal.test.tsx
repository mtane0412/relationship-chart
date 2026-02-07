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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
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
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const labelInput = screen.getByLabelText('関係のラベル');

      // ラベル入力にフォーカスされている
      expect(labelInput).toHaveFocus();
    });
  });

  describe('人物アイコンの表示', () => {
    it('画像がある場合、接続元の画像がimg要素で表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,test1' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 接続元の画像が表示されることを確認
      const sourceImage = screen.getByAltText('山田太郎');
      expect(sourceImage).toBeInTheDocument();
      expect(sourceImage).toHaveAttribute('src', 'data:image/jpeg;base64,test1');
    });

    it('画像がある場合、接続先の画像がimg要素で表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子', imageDataUrl: 'data:image/jpeg;base64,test2' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 接続先の画像が表示されることを確認
      const targetImage = screen.getByAltText('佐藤花子');
      expect(targetImage).toBeInTheDocument();
      expect(targetImage).toHaveAttribute('src', 'data:image/jpeg;base64,test2');
    });

    it('画像がない場合、接続元のイニシャル（大文字）がフォールバック表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: 'yamada taro' }}
          targetPerson={{ name: '佐藤花子', imageDataUrl: 'data:image/jpeg;base64,test' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 接続元のイニシャルが大文字で表示されることを確認
      const sourceInitial = screen.getByTestId('person-initial-source');
      expect(sourceInitial).toBeInTheDocument();
      expect(sourceInitial).toHaveTextContent('Y');
    });

    it('画像がない場合、接続先のイニシャル（大文字）がフォールバック表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,test' }}
          targetPerson={{ name: 'sato hanako' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 接続先のイニシャルが大文字で表示されることを確認
      const targetInitial = screen.getByTestId('person-initial-target');
      expect(targetInitial).toBeInTheDocument();
      expect(targetInitial).toHaveTextContent('S');
    });

    it('両方に画像がある場合、2つのimg要素が表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,test1' }}
          targetPerson={{ name: '佐藤花子', imageDataUrl: 'data:image/jpeg;base64,test2' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 2つの画像が表示されることを確認
      const sourceImage = screen.getByAltText('山田太郎');
      const targetImage = screen.getByAltText('佐藤花子');
      expect(sourceImage).toBeInTheDocument();
      expect(targetImage).toBeInTheDocument();
      expect(sourceImage).toHaveAttribute('src', 'data:image/jpeg;base64,test1');
      expect(targetImage).toHaveAttribute('src', 'data:image/jpeg;base64,test2');
    });

    it('名前が空文字列の場合、接続元のイニシャルは"?"が表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '' }}
          targetPerson={{ name: '佐藤花子', imageDataUrl: 'data:image/jpeg;base64,test' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 接続元のイニシャルが"?"で表示されることを確認
      const sourceInitial = screen.getByTestId('person-initial-source');
      expect(sourceInitial).toBeInTheDocument();
      expect(sourceInitial).toHaveTextContent('?');
    });

    it('名前が空文字列の場合、接続先のイニシャルは"?"が表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,test' }}
          targetPerson={{ name: '' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 接続先のイニシャルが"?"で表示されることを確認
      const targetInitial = screen.getByTestId('person-initial-target');
      expect(targetInitial).toBeInTheDocument();
      expect(targetInitial).toHaveTextContent('?');
    });
  });
});
