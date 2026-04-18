/**
 * NullableSlider コンポーネントのユニットテスト
 * null 値を持てる数値スライダーの描画・インタラクションを検証する
 *
 * Phase 2 対応: onChange(value: number | null) 単一コールバック仕様
 * - チェックボックスON（未設定）→ onChange(null) が呼ばれる
 * - チェックボックスOFF（値あり）→ onChange(defaultValue) が呼ばれる
 * - スライダー変更 → onChange(数値) が呼ばれる
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NullableSlider } from './NullableSlider';

describe('NullableSlider', () => {
  describe('描画', () => {
    it('ラベルが表示される', () => {
      render(
        <NullableSlider
          label="親密度"
          value={0.5}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByText('親密度')).toBeInTheDocument();
    });

    it('スライダーが描画される', () => {
      render(
        <NullableSlider
          label="親密度"
          value={0.5}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByRole('slider', { name: '親密度' })).toBeInTheDocument();
    });

    it('未設定チェックボックスが描画される', () => {
      render(
        <NullableSlider
          label="親密度"
          value={0.5}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByRole('checkbox', { name: '親密度を未設定' })).toBeInTheDocument();
    });

    it('value が null でないとき、数値が表示される', () => {
      render(
        <NullableSlider
          label="親密度"
          value={0.75}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByText('0.75')).toBeInTheDocument();
    });

    it('value が null のとき、スライダーが disabled になる', () => {
      render(
        <NullableSlider
          label="親密度"
          value={null}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByRole('slider', { name: '親密度' })).toBeDisabled();
    });

    it('value が null のとき、未設定チェックボックスがチェック済みになる', () => {
      render(
        <NullableSlider
          label="親密度"
          value={null}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByRole('checkbox', { name: '親密度を未設定' })).toBeChecked();
    });

    it('value が null でないとき、スライダーが enabled になる', () => {
      render(
        <NullableSlider
          label="親密度"
          value={0.5}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          onChange={vi.fn()}
        />
      );
      expect(screen.getByRole('slider', { name: '親密度' })).not.toBeDisabled();
    });
  });

  describe('インタラクション', () => {
    it('値ありの状態でチェックボックスをクリックすると onChange(null) が呼ばれる', async () => {
      const onChange = vi.fn();
      render(
        <NullableSlider
          label="親密度"
          value={0.5}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          onChange={onChange}
        />
      );
      await userEvent.click(screen.getByRole('checkbox', { name: '親密度を未設定' }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('未設定状態のチェックボックスをクリックすると onChange(defaultValue) が呼ばれる', async () => {
      const onChange = vi.fn();
      render(
        <NullableSlider
          label="親密度"
          value={null}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          onChange={onChange}
        />
      );
      await userEvent.click(screen.getByRole('checkbox', { name: '親密度を未設定' }));
      expect(onChange).toHaveBeenCalledWith(0.5);
    });
  });
});
