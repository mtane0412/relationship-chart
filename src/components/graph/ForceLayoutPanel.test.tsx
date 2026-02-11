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
    store.setForceEnabled(false);
  });

  it('「Force Layout」ラベルが表示される', () => {
    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    expect(screen.getByText('Force Layout')).toBeInTheDocument();
  });

  it('「(Experimental)」表記が表示される', () => {
    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    // EGO Layoutセクションはノード未選択時に非表示のため、Force Layoutの1つのみ
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

  it('forceEnabled: falseの場合、トグルがOFF状態である', () => {
    // 初期状態でforceEnabled: false
    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('トグルクリックでforceEnabledが切り替わる', async () => {
    const user = userEvent.setup();

    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    const toggle = screen.getByRole('switch');

    // 初期状態: false
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(useGraphStore.getState().forceEnabled).toBe(false);

    // クリックしてtrueに
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(useGraphStore.getState().forceEnabled).toBe(true);

    // もう一度クリックしてfalseに
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(useGraphStore.getState().forceEnabled).toBe(false);
  });

  it('forceEnabled: trueの場合、スライダーが表示される', async () => {
    const user = userEvent.setup();

    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    // 初期状態ではスライダーは非表示（forceEnabled: false）
    expect(screen.queryByLabelText(/Link Distance/)).not.toBeInTheDocument();

    // トグルをクリックしてtrueに
    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    // linkDistanceスライダーがあることを確認
    expect(screen.getByLabelText(/Link Distance/)).toBeInTheDocument();
  });

  it('forceEnabled: falseの場合、スライダーが非表示である', () => {
    render(
      <ReactFlowProvider>
        <ForceLayoutPanel />
      </ReactFlowProvider>
    );

    // 初期状態でforceEnabled: false なので、スライダーが非表示
    expect(screen.queryByLabelText(/Link Distance/)).not.toBeInTheDocument();
  });
});
