/**
 * ForceLayoutPanelコンポーネントのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { ForceLayoutPanel } from './ForceLayoutPanel';
import { useGraphStore } from '@/stores/useGraphStore';

describe('ForceLayoutPanel', () => {
  beforeEach(() => {
    // 各テスト前にLocalStorageをクリア
    localStorage.clear();

    // ストアをリセット
    const store = useGraphStore.getState();
    store.persons.forEach((person) => {
      store.removePerson(person.id);
    });
    store.relationships.forEach((relationship) => {
      store.removeRelationship(relationship.id);
    });
    store.clearSelection();
    store.resetForceParams();
    store.setForceEnabled(true);
  });

  it('「自動配置」ラベルが表示される', () => {
    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    expect(screen.getByText('自動配置')).toBeInTheDocument();
  });

  it('「(Experimental)」表記が表示される', () => {
    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    expect(screen.getByText('(Experimental)')).toBeInTheDocument();
  });

  it('トグルスイッチが表示される', () => {
    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
  });

  it('forceEnabled: trueの場合、トグルがON状態である', () => {
    // 初期状態でforceEnabled: true
    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('トグルクリックでforceEnabledが切り替わる', async () => {
    const user = userEvent.setup();

    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    const toggle = screen.getByRole('switch');

    // 初期状態: true
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(useGraphStore.getState().forceEnabled).toBe(true);

    // クリックしてfalseに
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(useGraphStore.getState().forceEnabled).toBe(false);

    // もう一度クリックしてtrueに
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(useGraphStore.getState().forceEnabled).toBe(true);
  });

  it('forceEnabled: trueの場合、スライダーが表示される', () => {
    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    // linkDistanceスライダーがあることを確認
    expect(screen.getByLabelText(/リンク距離/)).toBeInTheDocument();
  });

  it('forceEnabled: falseの場合、スライダーが非表示である', async () => {
    const user = userEvent.setup();

    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    // トグルをクリックしてfalseに
    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    // スライダーが非表示
    expect(screen.queryByLabelText(/リンク距離/)).not.toBeInTheDocument();
  });
});
