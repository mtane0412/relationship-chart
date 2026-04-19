/**
 * TurningPointsEditor コンポーネントのユニットテスト
 * ターニングポイントの動的リスト編集（追加・削除・変更）を検証する
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TurningPointsEditor } from './TurningPointsEditor';
import type { TurningPointRow } from './TurningPointsEditor';

/** テスト用ターニングポイント行を生成するファクトリ */
function makeRow(id: string, at: string, note: string): TurningPointRow {
  return { id, at, note };
}

const noopChange = () => {};

describe('TurningPointsEditor', () => {
  describe('描画', () => {
    it('「ターニングポイント」ラベルが表示される', () => {
      render(<TurningPointsEditor value={[]} onChange={vi.fn()} />);
      expect(screen.getByText('ターニングポイント')).toBeInTheDocument();
    });

    it('「+ ターニングポイントを追加」ボタンが表示される', () => {
      render(<TurningPointsEditor value={[]} onChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: /ターニングポイントを追加/ })).toBeInTheDocument();
    });

    it('既存の行が表示される', () => {
      const rows = [makeRow('r1', '2020年', '出会い'), makeRow('r2', '2022年', '別れ')];
      render(<TurningPointsEditor value={rows} onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('2020年')).toBeInTheDocument();
      expect(screen.getByDisplayValue('出会い')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2022年')).toBeInTheDocument();
      expect(screen.getByDisplayValue('別れ')).toBeInTheDocument();
    });

    it('各行に削除ボタンが表示される', () => {
      const rows = [makeRow('r1', '2020年', '出会い')];
      render(<TurningPointsEditor value={rows} onChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'このターニングポイントを削除' })).toBeInTheDocument();
    });
  });

  describe('追加', () => {
    it('追加ボタンをクリックすると onChange が新しい行を含む配列で呼ばれる', async () => {
      const onChange = vi.fn();
      render(<TurningPointsEditor value={[]} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));
      expect(onChange).toHaveBeenCalledTimes(1);
      const [newRows] = onChange.mock.calls[0];
      expect(newRows).toHaveLength(1);
      expect(newRows[0]).toMatchObject({ at: '', note: '' });
      // 新規行に id が自動生成されていることを確認
      expect(newRows[0].id).toEqual(expect.any(String));
    });

    it('既存行がある場合、追加後も既存行が保持される', async () => {
      const existing = [makeRow('r1', '2020年', '出会い')];
      const onChange = vi.fn();
      render(<TurningPointsEditor value={existing} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));
      const [newRows] = onChange.mock.calls[0];
      expect(newRows).toHaveLength(2);
      expect(newRows[0]).toMatchObject({ id: 'r1', at: '2020年', note: '出会い' });
    });
  });

  describe('削除', () => {
    it('削除ボタンをクリックすると該当行が削除される', async () => {
      const rows = [makeRow('r1', '2020年', '出会い'), makeRow('r2', '2022年', '別れ')];
      const onChange = vi.fn();
      render(<TurningPointsEditor value={rows} onChange={onChange} />);
      const deleteButtons = screen.getAllByRole('button', { name: 'このターニングポイントを削除' });
      await userEvent.click(deleteButtons[0]);
      expect(onChange).toHaveBeenCalledWith([makeRow('r2', '2022年', '別れ')]);
    });
  });

  describe('編集', () => {
    it('「at」フィールドを変更すると onChange が更新された行を含む配列で呼ばれる', () => {
      const rows = [makeRow('r1', '2020年', '出会い')];
      const onChange = vi.fn();
      render(<TurningPointsEditor value={rows} onChange={onChange} />);
      const atInput = screen.getByRole('textbox', { name: 'ターニングポイント1の時期・時点' });
      // 制御コンポーネントのため fireEvent.change で一括変更をシミュレート
      fireEvent.change(atInput, { target: { value: '2021年' } });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([{ id: 'r1', at: '2021年', note: '出会い' }]);
    });

    it('「note」フィールドを変更すると onChange が更新された行を含む配列で呼ばれる', () => {
      const rows = [makeRow('r1', '2020年', '出会い')];
      const onChange = vi.fn();
      render(<TurningPointsEditor value={rows} onChange={onChange} />);
      const noteInput = screen.getByRole('textbox', { name: 'ターニングポイント1の出来事' });
      fireEvent.change(noteInput, { target: { value: '再会' } });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([{ id: 'r1', at: '2020年', note: '再会' }]);
    });
  });

  describe('スナップショットジャンプボタン', () => {
    it('findSnapshotIndexByAt が null を返す行にはジャンプボタンが表示されない', () => {
      const rows = [makeRow('r1', '第1話', '出来事')];
      const findSnapshotIndexByAt = vi.fn().mockReturnValue(null);
      const onJumpToSnapshot = vi.fn();

      render(
        <TurningPointsEditor
          value={rows}
          onChange={noopChange}
          findSnapshotIndexByAt={findSnapshotIndexByAt}
          onJumpToSnapshot={onJumpToSnapshot}
        />
      );

      expect(screen.queryByRole('button', { name: /スナップショットへジャンプ/ })).toBeNull();
    });

    it('findSnapshotIndexByAt が 0 以上の値を返す行にはジャンプボタンが表示される', () => {
      const rows = [makeRow('r1', '第1話', '出来事')];
      const findSnapshotIndexByAt = vi.fn().mockReturnValue(0);
      const onJumpToSnapshot = vi.fn();

      render(
        <TurningPointsEditor
          value={rows}
          onChange={noopChange}
          findSnapshotIndexByAt={findSnapshotIndexByAt}
          onJumpToSnapshot={onJumpToSnapshot}
        />
      );

      expect(screen.getByRole('button', { name: /スナップショットへジャンプ/ })).toBeTruthy();
    });

    it('at が空文字の行にはジャンプボタンが表示されない', () => {
      const rows = [makeRow('r1', '', '出来事')];
      const findSnapshotIndexByAt = vi.fn().mockReturnValue(0);
      const onJumpToSnapshot = vi.fn();

      render(
        <TurningPointsEditor
          value={rows}
          onChange={noopChange}
          findSnapshotIndexByAt={findSnapshotIndexByAt}
          onJumpToSnapshot={onJumpToSnapshot}
        />
      );

      expect(screen.queryByRole('button', { name: /スナップショットへジャンプ/ })).toBeNull();
    });

    it('ジャンプボタンをクリックすると onJumpToSnapshot がマッチしたインデックスで呼ばれる', async () => {
      const user = userEvent.setup();
      const rows = [makeRow('r1', '第1話', '出来事')];
      const findSnapshotIndexByAt = vi.fn().mockReturnValue(2);
      const onJumpToSnapshot = vi.fn();

      render(
        <TurningPointsEditor
          value={rows}
          onChange={noopChange}
          findSnapshotIndexByAt={findSnapshotIndexByAt}
          onJumpToSnapshot={onJumpToSnapshot}
        />
      );

      const jumpButton = screen.getByRole('button', { name: /スナップショットへジャンプ/ });
      await user.click(jumpButton);

      expect(onJumpToSnapshot).toHaveBeenCalledOnce();
      expect(onJumpToSnapshot).toHaveBeenCalledWith(2);
    });

    it('findSnapshotIndexByAt と onJumpToSnapshot を渡さない場合（後方互換）、ジャンプボタンが表示されない', () => {
      const rows = [makeRow('r1', '第1話', '出来事')];

      render(
        <TurningPointsEditor
          value={rows}
          onChange={noopChange}
        />
      );

      expect(screen.queryByRole('button', { name: /スナップショットへジャンプ/ })).toBeNull();
    });

    it('複数行のうちマッチする行にだけジャンプボタンが表示される', () => {
      const rows = [
        makeRow('r1', '第1話', '出来事A'),
        makeRow('r2', '該当なし', '出来事B'),
      ];
      const findSnapshotIndexByAt = vi.fn().mockImplementation((at: string) => {
        return at === '第1話' ? 0 : null;
      });
      const onJumpToSnapshot = vi.fn();

      render(
        <TurningPointsEditor
          value={rows}
          onChange={noopChange}
          findSnapshotIndexByAt={findSnapshotIndexByAt}
          onJumpToSnapshot={onJumpToSnapshot}
        />
      );

      const jumpButtons = screen.queryAllByRole('button', { name: /スナップショットへジャンプ/ });
      expect(jumpButtons).toHaveLength(1);
    });
  });
});
