/**
 * スナップショット保存ボタンコンポーネント
 *
 * グラフキャンバス上に配置されるFABボタン（カメラアイコン）。
 * クリック時にSnapshotCaptureDialogを表示し、ラベルを入力してスナップショットを保存する。
 *
 * タイムラインモード中はボタンを非表示にする。
 */

'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { useGraphStore } from '@/stores/useGraphStore';
import { SnapshotCaptureDialog } from '@/components/ui/SnapshotCaptureDialog';

/**
 * スナップショット保存ボタンコンポーネント
 */
export function SnapshotCaptureButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { captureSnapshot, timelineMode } = useGraphStore((state) => ({
    captureSnapshot: state.captureSnapshot,
    timelineMode: state.timelineMode,
  }));

  // タイムラインモード中はボタンを非表示
  if (timelineMode) return null;

  /**
   * スナップショット保存ハンドラ
   */
  const handleCapture = (label: string, description?: string) => {
    captureSnapshot(label, description);
    setIsDialogOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium shadow-md hover:bg-gray-50 border border-gray-200 transition-colors"
        title="スナップショットを保存"
        aria-label="スナップショットを保存"
      >
        <Camera size={16} />
        <span>保存</span>
      </button>

      <SnapshotCaptureDialog
        isOpen={isDialogOpen}
        onCapture={handleCapture}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  );
}
