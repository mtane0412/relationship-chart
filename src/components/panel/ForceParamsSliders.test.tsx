/**
 * ForceParamsSlidersコンポーネントのテスト
 * force-directedレイアウトのパラメータスライダーの振る舞いを検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForceParamsSliders } from './ForceParamsSliders';
import { useGraphStore } from '@/stores/useGraphStore';

describe('ForceParamsSliders', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    localStorage.clear();
    const store = useGraphStore.getState();
    store.resetForceParams();
  });

  it('3つのスライダーが表示される', () => {
    render(<ForceParamsSliders />);

    expect(screen.getByLabelText('Link Distance')).toBeInTheDocument();
    expect(screen.getByLabelText('Link Strength')).toBeInTheDocument();
    expect(screen.getByLabelText('Charge Strength')).toBeInTheDocument();
  });

  it('各スライダーの初期値がデフォルト値である', () => {
    render(<ForceParamsSliders />);

    const linkDistanceSlider = screen.getByLabelText('Link Distance') as HTMLInputElement;
    const linkStrengthSlider = screen.getByLabelText('Link Strength') as HTMLInputElement;
    const chargeStrengthSlider = screen.getByLabelText('Charge Strength') as HTMLInputElement;

    expect(linkDistanceSlider.value).toBe('150');
    expect(linkStrengthSlider.value).toBe('0.5');
    expect(chargeStrengthSlider.value).toBe('-300');
  });

  it('Link Distanceスライダーを変更するとストアが更新される', () => {
    render(<ForceParamsSliders />);

    const linkDistanceSlider = screen.getByLabelText('Link Distance');

    // スライダーを変更
    fireEvent.change(linkDistanceSlider, { target: { value: '250' } });

    // ストアが更新されていることを確認
    const store = useGraphStore.getState();
    expect(store.forceParams.linkDistance).toBe(250);
  });

  it('Link Strengthスライダーを変更するとストアが更新される', () => {
    render(<ForceParamsSliders />);

    const linkStrengthSlider = screen.getByLabelText('Link Strength');

    // スライダーを変更
    fireEvent.change(linkStrengthSlider, { target: { value: '0.8' } });

    // ストアが更新されていることを確認
    const store = useGraphStore.getState();
    expect(store.forceParams.linkStrength).toBe(0.8);
  });

  it('Charge Strengthスライダーを変更するとストアが更新される', () => {
    render(<ForceParamsSliders />);

    const chargeStrengthSlider = screen.getByLabelText('Charge Strength');

    // スライダーを変更
    fireEvent.change(chargeStrengthSlider, { target: { value: '-500' } });

    // ストアが更新されていることを確認
    const store = useGraphStore.getState();
    expect(store.forceParams.chargeStrength).toBe(-500);
  });

  it('Reset to Defaultボタンが表示される', () => {
    render(<ForceParamsSliders />);

    expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeInTheDocument();
  });

  it('Reset to Defaultボタンをクリックするとパラメータがリセットされる', async () => {
    const user = userEvent.setup();
    render(<ForceParamsSliders />);

    // まずパラメータを変更
    const linkDistanceSlider = screen.getByLabelText('Link Distance');
    fireEvent.change(linkDistanceSlider, { target: { value: '400' } });

    const store = useGraphStore.getState();
    expect(store.forceParams.linkDistance).toBe(400);

    // Reset to Defaultボタンをクリック
    const resetButton = screen.getByRole('button', { name: /Reset to Default/i });
    await user.click(resetButton);

    // パラメータがデフォルト値に戻っていることを確認
    const updatedStore = useGraphStore.getState();
    expect(updatedStore.forceParams).toEqual({
      linkDistance: 150,
      linkStrength: 0.5,
      chargeStrength: -300,
    });
  });

  it('各スライダーの現在値が表示される', () => {
    render(<ForceParamsSliders />);

    // デフォルト値が表示されていることを確認
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('0.5')).toBeInTheDocument();
    expect(screen.getByText('-300')).toBeInTheDocument();
  });
});
