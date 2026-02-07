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

  describe('関係タイプの選択', () => {
    it('4種類のラジオボタンが表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 4種類のラジオボタンが表示されることを確認
      expect(screen.getByLabelText(/双方向/)).toBeInTheDocument();
      expect(screen.getByLabelText(/片方向×2/)).toBeInTheDocument();
      expect(screen.getByLabelText(/片方向×1/)).toBeInTheDocument();
      expect(screen.getByLabelText(/無方向/)).toBeInTheDocument();
    });

    it('初期状態では双方向が選択されている', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const bidirectional = screen.getByLabelText(/双方向/) as HTMLInputElement;
      expect(bidirectional).toBeChecked();
    });

    it('関係タイプを変更できる', async () => {
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

      const oneWay = screen.getByLabelText(/片方向×1/) as HTMLInputElement;

      // 片方向×1を選択
      await user.click(oneWay);
      expect(oneWay).toBeChecked();
    });

    it('dual-directed選択時に2つ目のラベル入力が表示される', async () => {
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

      // 初期状態では2つ目のラベル入力は非表示
      expect(screen.queryByLabelText(/逆方向のラベル/)).not.toBeInTheDocument();

      // dual-directedを選択
      const dualDirected = screen.getByLabelText(/片方向×2/);
      await user.click(dualDirected);

      // 2つ目のラベル入力が表示される
      expect(screen.getByLabelText(/逆方向のラベル/)).toBeInTheDocument();
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

      const labelInput = screen.getByLabelText(/関係のラベル/);
      const submitButton = screen.getByRole('button', { name: '登録' });

      // ラベルを入力
      await user.type(labelInput, '親友');

      // 登録ボタンが有効化される
      expect(submitButton).not.toBeDisabled();
    });

    it('dual-directed選択時、逆方向ラベルが空の場合は登録ボタンが無効化される', async () => {
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

      // dual-directedを選択
      const dualDirected = screen.getByLabelText(/片方向×2/);
      await user.click(dualDirected);

      // 1つ目のラベルを入力
      const labelInput = screen.getByLabelText(/関係のラベル/);
      await user.type(labelInput, '好き');

      const submitButton = screen.getByRole('button', { name: '登録' });

      // 逆方向ラベルが空なので無効化されている
      expect(submitButton).toBeDisabled();
    });

    it('dual-directed選択時、両方のラベルが入力されている場合は登録ボタンが有効化される', async () => {
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

      // dual-directedを選択
      const dualDirected = screen.getByLabelText(/片方向×2/);
      await user.click(dualDirected);

      // 1つ目のラベルを入力
      const labelInput = screen.getByLabelText(/関係のラベル/);
      await user.type(labelInput, '好き');

      // 2つ目のラベルを入力
      const reverseLabelInput = screen.getByLabelText(/逆方向のラベル/);
      await user.type(reverseLabelInput, '無関心');

      const submitButton = screen.getByRole('button', { name: '登録' });

      // 登録ボタンが有効化される
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('コールバック呼び出し', () => {
    it('bidirectionalタイプでonSubmitが呼ばれる', async () => {
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

      const labelInput = screen.getByLabelText(/関係のラベル/);
      const submitButton = screen.getByRole('button', { name: '登録' });

      // ラベルを入力（bidirectionalはデフォルト選択）
      await user.type(labelInput, '親子');

      // 登録ボタンをクリック
      await user.click(submitButton);

      // onSubmitが正しい引数で呼ばれることを確認
      expect(onSubmit).toHaveBeenCalledWith('bidirectional', '親子', null);
    });

    it('dual-directedタイプでonSubmitが呼ばれる', async () => {
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

      // dual-directedを選択
      const dualDirected = screen.getByLabelText(/片方向×2/);
      await user.click(dualDirected);

      const labelInput = screen.getByLabelText(/関係のラベル/);
      const reverseLabelInput = screen.getByLabelText(/逆方向のラベル/);
      const submitButton = screen.getByRole('button', { name: '登録' });

      // ラベルを入力
      await user.type(labelInput, '好き');
      await user.type(reverseLabelInput, '無関心');

      // 登録ボタンをクリック
      await user.click(submitButton);

      // onSubmitが正しい引数で呼ばれることを確認
      expect(onSubmit).toHaveBeenCalledWith('dual-directed', '好き', '無関心');
    });

    it('one-wayタイプでonSubmitが呼ばれる', async () => {
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

      // one-wayを選択
      const oneWay = screen.getByLabelText(/片方向×1/);
      await user.click(oneWay);

      const labelInput = screen.getByLabelText(/関係のラベル/);
      const submitButton = screen.getByRole('button', { name: '登録' });

      // ラベルを入力
      await user.type(labelInput, '片想い');

      // 登録ボタンをクリック
      await user.click(submitButton);

      // onSubmitが正しい引数で呼ばれることを確認
      expect(onSubmit).toHaveBeenCalledWith('one-way', '片想い', null);
    });

    it('undirectedタイプでonSubmitが呼ばれる', async () => {
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

      // undirectedを選択
      const undirected = screen.getByLabelText(/無方向/);
      await user.click(undirected);

      const labelInput = screen.getByLabelText(/関係のラベル/);
      const submitButton = screen.getByRole('button', { name: '登録' });

      // ラベルを入力
      await user.type(labelInput, '同一人物');

      // 登録ボタンをクリック
      await user.click(submitButton);

      // onSubmitが正しい引数で呼ばれることを確認
      expect(onSubmit).toHaveBeenCalledWith('undirected', '同一人物', null);
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

      const labelInput = screen.getByLabelText(/関係のラベル/);

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
  });
});
