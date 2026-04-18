/**
 * RelationshipRegistrationModal のテスト（v11）
 * エッジ接続時の関係登録モーダルの振る舞いを検証する。
 *
 * v11 の仕様:
 *   - type: エッジ型ラベルを自由入力（例: "友人", "親子"）
 *   - symmetric: true=無向（矢印なし）、false=有向（矢印あり）
 *   - label は onSubmit で null 固定（表示ラベルは type を使用）
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RelationshipRegistrationModal } from './RelationshipRegistrationModal';

describe('RelationshipRegistrationModal', () => {
  describe('表示/非表示', () => {
    it('isOpen=false の場合は表示されない', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={false}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('isOpen=true の場合はモーダルが表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('人物情報の表示', () => {
    it('画像がない場合はイニシャルが表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 「山田太郎」「佐藤花子」の名前が表示される（方向インジケーターにも重複表示されるためgetAllByTextを使用）
      expect(screen.getAllByText('山田太郎').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('佐藤花子').length).toBeGreaterThanOrEqual(1);
      // イニシャル（先頭文字）が表示される（data-testid で確認）
      // '山田太郎' の先頭文字は '山'、'佐藤花子' の先頭文字は '佐'
      expect(screen.getByTestId('person-initial-source')).toHaveTextContent('山');
      expect(screen.getByTestId('person-initial-target')).toHaveTextContent('佐');
    });

    it('imageDataUrl が指定された場合は画像が表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎', imageDataUrl: 'data:image/png;base64,abc' }}
          targetPerson={{ name: '佐藤花子', imageDataUrl: 'data:image/png;base64,def' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // img タグが表示され、イニシャルが表示されないことを確認
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByTestId('person-initial-source')).not.toBeInTheDocument();
      expect(screen.queryByTestId('person-initial-target')).not.toBeInTheDocument();
    });
  });

  describe('方向切替ボタン', () => {
    it('「有向（矢印あり）」と「無向（矢印なし）」ボタンが表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: '有向（矢印あり）' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '無向（矢印なし）' })).toBeInTheDocument();
    });

    it('defaultSymmetric 未指定の場合、有向がデフォルト選択される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 有向ボタンが選択されている（aria-pressed="true"）
      const directedButton = screen.getByRole('button', { name: '有向（矢印あり）' });
      expect(directedButton).toHaveAttribute('aria-pressed', 'true');
      const undirectedButton = screen.getByRole('button', { name: '無向（矢印なし）' });
      expect(undirectedButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('defaultSymmetric=true を指定した場合、無向がデフォルト選択される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          defaultSymmetric={true}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const undirectedButton = screen.getByRole('button', { name: '無向（矢印なし）' });
      expect(undirectedButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('無向ボタンをクリックすると無向が選択される', async () => {
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

      await user.click(screen.getByRole('button', { name: '無向（矢印なし）' }));

      expect(screen.getByRole('button', { name: '無向（矢印なし）' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: '有向（矢印あり）' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('有向ボタンをクリックすると有向に戻る', async () => {
      const user = userEvent.setup();
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          defaultSymmetric={true}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 無向 → 有向に切替
      await user.click(screen.getByRole('button', { name: '有向（矢印あり）' }));

      expect(screen.getByRole('button', { name: '有向（矢印あり）' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('関係タイプ入力', () => {
    it('関係の種類入力欄が表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByLabelText('関係の種類')).toBeInTheDocument();
    });

    it('タイプが空の場合は登録ボタンが無効化される', () => {
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
      expect(submitButton).toBeDisabled();
    });

    it('タイプを入力すると登録ボタンが有効化される', async () => {
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

      await user.type(screen.getByLabelText('関係の種類'), '友人');

      expect(screen.getByRole('button', { name: '登録' })).not.toBeDisabled();
    });
  });

  describe('フォーム送信', () => {
    it('タイプ入力後に登録ボタンを押すと onSubmit が呼ばれる', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={mockSubmit}
          onCancel={vi.fn()}
        />
      );

      await user.type(screen.getByLabelText('関係の種類'), '友人');
      await user.click(screen.getByRole('button', { name: '登録' }));

      // onSubmit に type="友人", label=null, symmetric=false が渡される
      expect(mockSubmit).toHaveBeenCalledWith('友人', null, false);
    });

    it('無向を選択した状態で登録すると symmetric=true で呼ばれる', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={mockSubmit}
          onCancel={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: '無向（矢印なし）' }));
      await user.type(screen.getByLabelText('関係の種類'), '同期');
      await user.click(screen.getByRole('button', { name: '登録' }));

      expect(mockSubmit).toHaveBeenCalledWith('同期', null, true);
    });

    it('Enterキーで登録できる', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={mockSubmit}
          onCancel={vi.fn()}
        />
      );

      const typeInput = screen.getByLabelText('関係の種類');
      await user.type(typeInput, '親子');
      await user.keyboard('{Enter}');

      expect(mockSubmit).toHaveBeenCalledWith('親子', null, false);
    });

    it('タイプが空の状態でEnterを押しても送信されない', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={mockSubmit}
          onCancel={vi.fn()}
        />
      );

      const typeInput = screen.getByLabelText('関係の種類');
      await user.click(typeInput);
      await user.keyboard('{Enter}');

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('前後の空白はトリムされて送信される', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={mockSubmit}
          onCancel={vi.fn()}
        />
      );

      await user.type(screen.getByLabelText('関係の種類'), '  友人  ');
      await user.click(screen.getByRole('button', { name: '登録' }));

      expect(mockSubmit).toHaveBeenCalledWith('友人', null, false);
    });
  });

  describe('キャンセル', () => {
    it('キャンセルボタンをクリックすると onCancel が呼ばれる', async () => {
      const user = userEvent.setup();
      const mockCancel = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={mockCancel}
        />
      );

      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(mockCancel).toHaveBeenCalled();
    });

    it('Escapeキーを押すと onCancel が呼ばれる', () => {
      const mockCancel = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={mockCancel}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe('編集モード（initialRelationship）', () => {
    it('initialRelationship がある場合は「更新」ボタンが表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          initialRelationship={{ type: '友人', label: null, symmetric: false }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '登録' })).not.toBeInTheDocument();
    });

    it('initialRelationship の type が入力欄に初期値として設定される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          initialRelationship={{ type: '同僚', label: null, symmetric: false }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const typeInput = screen.getByLabelText('関係の種類') as HTMLInputElement;
      expect(typeInput.value).toBe('同僚');
    });

    it('initialRelationship.symmetric=true の場合、無向が選択されている', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          initialRelationship={{ type: '知人', label: null, symmetric: true }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: '無向（矢印なし）' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('initialRelationship がある場合、更新ボタンを押すと onSubmit に更新内容が渡される', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          initialRelationship={{ type: '同僚', label: null, symmetric: false }}
          onSubmit={mockSubmit}
          onCancel={vi.fn()}
        />
      );

      // タイプを変更して更新
      const typeInput = screen.getByLabelText('関係の種類');
      await user.clear(typeInput);
      await user.type(typeInput, '親友');
      await user.click(screen.getByRole('button', { name: '更新' }));

      expect(mockSubmit).toHaveBeenCalledWith('親友', null, false);
    });
  });

  describe('方向インジケーター', () => {
    it('有向選択時に source → target の向きが表示される', () => {
      render(
        <RelationshipRegistrationModal
          isOpen={true}
          sourcePerson={{ name: '山田太郎' }}
          targetPerson={{ name: '佐藤花子' }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // 有向時は「→」インジケーターが表示される
      expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('無向選択時に「—」インジケーターが表示される', async () => {
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

      await user.click(screen.getByRole('button', { name: '無向（矢印なし）' }));

      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });
});
