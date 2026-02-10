/**
 * キャンバスキャプチャユーティリティ
 *
 * React Flowのキャンバスを画像としてキャプチャし、ダウンロード、クリップボードコピー、SNS共有を提供します。
 * html-to-image@1.11.11を使用（React Flow公式推奨バージョン）
 */

import { toPng, toBlob } from 'html-to-image';
import { getNodesBounds, getViewportForBounds, Node } from '@xyflow/react';

const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 768;

/**
 * React Flowのキャンバスを画像としてキャプチャする共通処理
 *
 * @param nodes - 全ノード（境界計算に使用）
 * @returns キャプチャ対象の要素とビューポート設定
 */
function getCaptureBounds(nodes: Node[]) {
  // .react-flow__viewport 要素を取得
  const viewport = document.querySelector(
    '.react-flow__viewport'
  ) as HTMLElement;
  if (!viewport) {
    throw new Error('React Flowのビューポート要素が見つかりません');
  }

  // 全ノードの境界を計算
  const nodesBounds = getNodesBounds(nodes);

  // ビューポート設定を計算
  const viewportTransform = getViewportForBounds(
    nodesBounds,
    IMAGE_WIDTH,
    IMAGE_HEIGHT,
    0.5, // 最小ズーム
    2, // 最大ズーム
    0.1 // パディング
  );

  return { viewport, viewportTransform };
}

/**
 * キャンバスをPNG Data URLとして取得する
 *
 * @param nodes - 全ノード
 * @returns PNG形式のData URL
 */
export async function captureCanvasAsPng(nodes: Node[]): Promise<string> {
  const { viewport, viewportTransform } = getCaptureBounds(nodes);

  // html-to-imageでキャプチャ
  const dataUrl = await toPng(viewport, {
    backgroundColor: '#ffffff',
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    style: {
      width: `${IMAGE_WIDTH}px`,
      height: `${IMAGE_HEIGHT}px`,
      transform: `translate(${viewportTransform.x}px, ${viewportTransform.y}px) scale(${viewportTransform.zoom})`,
    },
  });

  return dataUrl;
}

/**
 * キャンバスをBlobとして取得する
 *
 * @param nodes - 全ノード
 * @returns PNG形式のBlob
 */
export async function captureCanvasAsBlob(nodes: Node[]): Promise<Blob> {
  const { viewport, viewportTransform } = getCaptureBounds(nodes);

  // html-to-imageでキャプチャ
  const blob = await toBlob(viewport, {
    backgroundColor: '#ffffff',
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    style: {
      width: `${IMAGE_WIDTH}px`,
      height: `${IMAGE_HEIGHT}px`,
      transform: `translate(${viewportTransform.x}px, ${viewportTransform.y}px) scale(${viewportTransform.zoom})`,
    },
  });

  if (!blob) {
    throw new Error('画像のキャプチャに失敗しました');
  }

  return blob;
}

/**
 * 画像をダウンロードする
 *
 * @param dataUrl - 画像のData URL
 * @param filename - ダウンロードファイル名（デフォルト: relationship-chart.png）
 */
export function downloadImage(
  dataUrl: string,
  filename = 'relationship-chart.png'
): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

/**
 * 画像をクリップボードにコピーする
 *
 * @param blob - 画像のBlob
 */
export async function copyImageToClipboard(blob: Blob): Promise<void> {
  const clipboardItem = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([clipboardItem]);
}

/**
 * X（旧Twitter）投稿画面を開く
 *
 * @param text - 投稿テキスト
 * @param hashtags - ハッシュタグのリスト
 */
export function openXPost(text: string, hashtags: string[]): void {
  const params = new URLSearchParams();
  params.set('text', text);
  if (hashtags.length > 0) {
    params.set('hashtags', hashtags.join(','));
  }

  const url = `https://twitter.com/intent/tweet?${params.toString()}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
