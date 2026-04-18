/**
 * TagChipInput コンポーネントのユニットテスト
 * タグのchip表示・追加・削除・IME対応を検証する
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagChipInput } from './TagChipInput';

const SUGGESTIONS = ['友人', '家族', '同僚', '恋人'] as const;

describe('TagChipInput', () => {
  describe('描画', () => {
    it('既存タグがchipとして表示される', () => {
      render(
        <TagChipInput
          value={['友人', '同僚']}
          onChange={vi.fn()}
          suggestions={SUGGESTIONS}
        />
      );
      expect(screen.getByText('友人')).toBeInTheDocument();
      expect(screen.getByText('同僚')).toBeInTheDocument();
    });

    it('タグが空のときchipが表示されない', () => {
      render(
        <TagChipInput
          value={[]}
          onChange={vi.fn()}
          suggestions={SUGGESTIONS}
        />
      );
      // chipエリア（flex-wrap）がレンダリングされないことを確認
      expect(screen.queryByRole('button', { name: /を削除/ })).not.toBeInTheDocument();
    });

    it('各chipに削除ボタンが表示される', () => {
      render(
        <TagChipInput
          value={['友人']}
          onChange={vi.fn()}
          suggestions={SUGGESTIONS}
        />
      );
      expect(screen.getByRole('button', { name: '友人を削除' })).toBeInTheDocument();
    });

    it('タグ入力フィールドが表示される', () => {
      render(
        <TagChipInput
          value={[]}
          onChange={vi.fn()}
          suggestions={SUGGESTIONS}
        />
      );
      // list属性付き input は ARIA role が combobox になる
      expect(screen.getByLabelText('タグを追加')).toBeInTheDocument();
    });
  });

  describe('タグ追加', () => {
    it('Enterキーでタグが追加される', async () => {
      const onChange = vi.fn();
      render(
        <TagChipInput
          value={[]}
          onChange={onChange}
          suggestions={SUGGESTIONS}
        />
      );
      const input = screen.getByLabelText('タグを追加');
      await userEvent.type(input, '友人{Enter}');
      expect(onChange).toHaveBeenCalledWith(['友人']);
    });

    it('前後のスペースはトリムされる', async () => {
      const onChange = vi.fn();
      render(
        <TagChipInput
          value={[]}
          onChange={onChange}
          suggestions={SUGGESTIONS}
        />
      );
      const input = screen.getByLabelText('タグを追加');
      await userEvent.type(input, '  友人  {Enter}');
      expect(onChange).toHaveBeenCalledWith(['友人']);
    });

    it('空白のみのタグは追加されない', async () => {
      const onChange = vi.fn();
      render(
        <TagChipInput
          value={[]}
          onChange={onChange}
          suggestions={SUGGESTIONS}
        />
      );
      const input = screen.getByLabelText('タグを追加');
      await userEvent.type(input, '   {Enter}');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('重複するタグは追加されない', async () => {
      const onChange = vi.fn();
      render(
        <TagChipInput
          value={['友人']}
          onChange={onChange}
          suggestions={SUGGESTIONS}
        />
      );
      const input = screen.getByLabelText('タグを追加');
      await userEvent.type(input, '友人{Enter}');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('タグ削除', () => {
    it('削除ボタンをクリックするとタグが削除される', async () => {
      const onChange = vi.fn();
      render(
        <TagChipInput
          value={['友人', '同僚']}
          onChange={onChange}
          suggestions={SUGGESTIONS}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: '友人を削除' }));
      expect(onChange).toHaveBeenCalledWith(['同僚']);
    });
  });

  describe('IME対応', () => {
    it('IME変換中のEnterキーはタグ追加をしない', async () => {
      const onChange = vi.fn();
      render(
        <TagChipInput
          value={[]}
          onChange={onChange}
          suggestions={SUGGESTIONS}
        />
      );
      const input = screen.getByLabelText('タグを追加');
      // userEvent.type で React の state（inputValue）を実際に更新する
      await userEvent.type(input, 'ともだち');
      // isComposing=true のEnterキーダウンイベントをシミュレート（IME変換確定前）
      // fireEvent.keyDown の isComposing オプションが nativeEvent.isComposing に反映される
      fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
      // IME変換中はタグが追加されない
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
