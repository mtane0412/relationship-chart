/**
 * PropertiesKvEditor コンポーネントのユニットテスト
 * KV プロパティの追加・変更・削除・型切替・バリデーション・IME対応を検証する
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertiesKvEditor } from './PropertiesKvEditor';

describe('PropertiesKvEditor', () => {
  describe('空の状態', () => {
    it('プロパティが空のとき「プロパティなし」と表示される', () => {
      render(<PropertiesKvEditor value={{}} onChange={vi.fn()} />);
      expect(screen.getByText('プロパティなし')).toBeInTheDocument();
    });

    it('追加ボタンが表示される', () => {
      render(<PropertiesKvEditor value={{}} onChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: /追加/ })).toBeInTheDocument();
    });
  });

  describe('既存プロパティの表示', () => {
    it('string プロパティのキーと値が表示される', () => {
      render(<PropertiesKvEditor value={{ 名前: '光源氏' }} onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('名前')).toBeInTheDocument();
      expect(screen.getByDisplayValue('光源氏')).toBeInTheDocument();
    });

    it('number プロパティが表示される', () => {
      render(<PropertiesKvEditor value={{ 年齢: 25 }} onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });

    it('boolean プロパティが表示される（true）', () => {
      render(<PropertiesKvEditor value={{ 主人公: true }} onChange={vi.fn()} />);
      // boolean は select で表示される
      expect(screen.getByDisplayValue('true')).toBeInTheDocument();
    });

    it('boolean プロパティが表示される（false）', () => {
      render(<PropertiesKvEditor value={{ 登場済み: false }} onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('false')).toBeInTheDocument();
    });

    it('各行に削除ボタンが表示される', () => {
      render(<PropertiesKvEditor value={{ 名前: '光源氏' }} onChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: /削除/ })).toBeInTheDocument();
    });
  });

  describe('プロパティの追加', () => {
    it('追加ボタンで新しい行が追加される', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropertiesKvEditor value={{}} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /追加/ }));

      // キーと値の入力フィールドが表示される
      expect(screen.getAllByPlaceholderText(/キー/)).toHaveLength(1);
    });

    it('キーと値を入力して blur するとonChangeが呼ばれる', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropertiesKvEditor value={{}} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /追加/ }));

      const keyInput = screen.getByPlaceholderText(/キー/);
      await user.type(keyInput, '所属');
      await user.tab();

      const valueInput = screen.getByPlaceholderText(/値/);
      await user.type(valueInput, '平安宮廷');
      await user.tab();

      expect(onChange).toHaveBeenCalledWith({ 所属: '平安宮廷' });
    });
  });

  describe('プロパティの削除', () => {
    it('削除ボタンで対象プロパティが削除される', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropertiesKvEditor value={{ 身分: '貴族', 時代: '平安' }} onChange={onChange} />);

      const deleteButtons = screen.getAllByRole('button', { name: /削除/ });
      // 最初のプロパティ（身分）を削除
      await user.click(deleteButtons[0]);

      expect(onChange).toHaveBeenCalledWith({ 時代: '平安' });
    });
  });

  describe('型の切替', () => {
    it('型セレクトで string → number に切り替えると値が変換される', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropertiesKvEditor value={{ 年齢: '30' }} onChange={onChange} />);

      const typeSelect = screen.getByDisplayValue('文字列');
      await user.selectOptions(typeSelect, 'number');

      expect(onChange).toHaveBeenCalledWith({ 年齢: 30 });
    });

    it('型セレクトで number → boolean に切り替えると値が変換される', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropertiesKvEditor value={{ フラグ: 1 }} onChange={onChange} />);

      const typeSelect = screen.getByDisplayValue('数値');
      await user.selectOptions(typeSelect, 'boolean');

      expect(onChange).toHaveBeenCalledWith({ フラグ: true });
    });

    it('型セレクトで boolean → string に切り替えると値が変換される', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropertiesKvEditor value={{ 主人公: true }} onChange={onChange} />);

      const typeSelect = screen.getByDisplayValue('真偽値');
      await user.selectOptions(typeSelect, 'string');

      expect(onChange).toHaveBeenCalledWith({ 主人公: 'true' });
    });
  });

  describe('バリデーション', () => {
    it('キーが空文字のときonChangeは呼ばれない', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropertiesKvEditor value={{}} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /追加/ }));
      // キーを入力せず値だけ入力してblur
      const valueInput = screen.getByPlaceholderText(/値/);
      await user.type(valueInput, '何か');
      await user.tab();

      expect(onChange).not.toHaveBeenCalled();
    });

    it('重複するキーを入力してもonChangeは呼ばれない', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropertiesKvEditor value={{ 名前: '光源氏' }} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /追加/ }));
      // 既存行＋新規行で 2 つあるため、最後（新規行）を取得する
      const keyInputs = screen.getAllByPlaceholderText(/キー/);
      const keyInput = keyInputs[keyInputs.length - 1];
      await user.type(keyInput, '名前');
      await user.tab();

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('IME対応', () => {
    it('IME変換中のEnterキーでプロパティが追加されない', async () => {
      const onChange = vi.fn();
      render(<PropertiesKvEditor value={{}} onChange={onChange} />);

      await userEvent.click(screen.getByRole('button', { name: /追加/ }));
      const keyInput = screen.getByPlaceholderText(/キー/);
      fireEvent.change(keyInput, { target: { value: '所属' } });
      // IME変換中のEnter
      fireEvent.keyDown(keyInput, { key: 'Enter', isComposing: true });

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
