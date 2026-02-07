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
    it('4種類のセグメントコントロールボタンが表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 4種類のセグメントコントロールボタンが表示されることを確認
      expect(screen.getByRole('button', { name: '片方向' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '双方向' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '片方向×2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '無方向' })).toBeInTheDocument();
    });

    it('defaultType未指定の場合、初期状態では双方向が選択されている', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const bidirectional = screen.getByRole('button', { name: '双方向' });
      expect(bidirectional).toHaveAttribute('aria-pressed', 'true');
    });

    it('defaultType="one-way"を指定した場合、初期状態で片方向が選択されている', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          defaultType="one-way"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const oneWay = screen.getByRole('button', { name: '片方向' });
      expect(oneWay).toHaveAttribute('aria-pressed', 'true');
    });

    it('initialRelationshipがある場合はdefaultTypeより優先される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          defaultType="one-way"
          initialRelationship={{
            type: 'bidirectional',
            sourceToTargetLabel: '親子',
            targetToSourceLabel: null,
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // initialRelationshipのtypeが優先される
      const bidirectional = screen.getByRole('button', { name: '双方向' });
      expect(bidirectional).toHaveAttribute('aria-pressed', 'true');
    });

    it('セグメントコントロールで関係タイプを変更できる', async () => {
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

      const oneWay = screen.getByRole('button', { name: '片方向' });

      // 片方向を選択
      await user.click(oneWay);
      expect(oneWay).toHaveAttribute('aria-pressed', 'true');
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
      const dualDirected = screen.getByRole('button', { name: '片方向×2' });
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
      const dualDirected = screen.getByRole('button', { name: '片方向×2' });
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
      const dualDirected = screen.getByRole('button', { name: '片方向×2' });
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
      const dualDirected = screen.getByRole('button', { name: '片方向×2' });
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
      const oneWay = screen.getByRole('button', { name: '片方向' });
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
      const undirected = screen.getByRole('button', { name: '無方向' });
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

  describe('編集モード', () => {
    it('initialRelationshipがある場合、初期値が設定される（bidirectional）', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          initialRelationship={{
            type: 'bidirectional',
            sourceToTargetLabel: '親子',
            targetToSourceLabel: null,
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 初期値が設定されていることを確認
      const bidirectional = screen.getByRole('button', { name: '双方向' });
      expect(bidirectional).toHaveAttribute('aria-pressed', 'true');

      const labelInput = screen.getByLabelText(/関係のラベル/) as HTMLInputElement;
      expect(labelInput).toHaveValue('親子');
    });

    it('initialRelationshipがある場合、初期値が設定される（dual-directed）', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          initialRelationship={{
            type: 'dual-directed',
            sourceToTargetLabel: '好き',
            targetToSourceLabel: '無関心',
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 初期値が設定されていることを確認
      const dualDirected = screen.getByRole('button', { name: '片方向×2' });
      expect(dualDirected).toHaveAttribute('aria-pressed', 'true');

      const labelInput = screen.getByLabelText(/関係のラベル/) as HTMLInputElement;
      expect(labelInput).toHaveValue('好き');

      const reverseLabelInput = screen.getByLabelText(/逆方向のラベル/) as HTMLInputElement;
      expect(reverseLabelInput).toHaveValue('無関心');
    });

    it('編集モードではタイトルが「関係を編集」になる', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          initialRelationship={{
            type: 'bidirectional',
            sourceToTargetLabel: '親子',
            targetToSourceLabel: null,
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // タイトルが「関係を編集」であることを確認
      expect(screen.getByText('関係を編集')).toBeInTheDocument();
    });

    it('編集モードではボタンラベルが「更新」になる', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          initialRelationship={{
            type: 'bidirectional',
            sourceToTargetLabel: '親子',
            targetToSourceLabel: null,
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // ボタンラベルが「更新」であることを確認
      expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
    });

    it('編集モードでフォームを送信すると更新された値でonSubmitが呼ばれる', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          initialRelationship={{
            type: 'bidirectional',
            sourceToTargetLabel: '友人',
            targetToSourceLabel: null,
          }}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      );

      // ラベルを変更
      const labelInput = screen.getByLabelText(/関係のラベル/);
      await user.clear(labelInput);
      await user.type(labelInput, '親友');

      // 更新ボタンをクリック
      const submitButton = screen.getByRole('button', { name: '更新' });
      await user.click(submitButton);

      // onSubmitが更新された値で呼ばれることを確認
      expect(onSubmit).toHaveBeenCalledWith('bidirectional', '親友', null);
    });
  });

  describe('ラベル入力の方向コンテキスト表示', () => {
    it('one-way選択時、方向インジケーターと適切なプレースホルダーが表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,test1' }}
          targetPerson={{ name: '佐藤花子', imageDataUrl: 'data:image/jpeg;base64,test2' }}
          defaultType="one-way"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 方向インジケーターのミニアイコンが表示される
      const miniIcons = screen.getAllByTestId(/mini-icon/);
      expect(miniIcons.length).toBeGreaterThanOrEqual(2);

      // one-way用のプレースホルダーが表示される
      const labelInput = screen.getByLabelText(/関係のラベル/) as HTMLInputElement;
      expect(labelInput.placeholder).toMatch(/片想い|憧れ/);
    });

    it('dual-directed選択時、2つの方向インジケーターと適切なプレースホルダーが表示される', async () => {
      const user = userEvent.setup();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎', imageDataUrl: 'data:image/jpeg;base64,test1' }}
          targetPerson={{ name: '佐藤花子', imageDataUrl: 'data:image/jpeg;base64,test2' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // dual-directedを選択
      const dualDirected = screen.getByRole('button', { name: '片方向×2' });
      await user.click(dualDirected);

      // 2セットの方向インジケーターが表示される
      const miniIcons = screen.getAllByTestId(/mini-icon/);
      expect(miniIcons.length).toBeGreaterThanOrEqual(4); // 2セット × 2アイコン

      // dual-directed用のプレースホルダーが表示される
      const forwardLabel = screen.getByLabelText(/関係のラベル/) as HTMLInputElement;
      expect(forwardLabel.placeholder).toMatch(/好き|憧れ/);

      const reverseLabel = screen.getByLabelText(/逆方向のラベル/) as HTMLInputElement;
      expect(reverseLabel.placeholder).toMatch(/無関心|嫌い/);
    });

    it('bidirectional選択時、適切なプレースホルダーが表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          defaultType="bidirectional"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const labelInput = screen.getByLabelText(/関係のラベル/) as HTMLInputElement;
      expect(labelInput.placeholder).toMatch(/友人|親子|同僚/);
    });

    it('undirected選択時、適切なプレースホルダーが表示される', async () => {
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

      // undirectedを選択
      const undirected = screen.getByRole('button', { name: '無方向' });
      await user.click(undirected);

      const labelInput = screen.getByLabelText(/関係のラベル/) as HTMLInputElement;
      expect(labelInput.placeholder).toMatch(/同一人物|別名/);
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

      // 接続元の画像が表示されることを確認（複数存在するためAllByを使用）
      const images = screen.getAllByAltText('山田太郎');
      expect(images.length).toBeGreaterThan(0);
      // ヘッダー部分の大きい画像（w-10 h-10）が存在することを確認
      const headerImage = images.find(img => img.className.includes('w-10 h-10'));
      expect(headerImage).toBeInTheDocument();
      expect(headerImage).toHaveAttribute('src', 'data:image/jpeg;base64,test1');
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
