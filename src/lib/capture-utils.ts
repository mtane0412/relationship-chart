/**
 * キャンバスキャプチャユーティリティ
 *
 * React Flowのキャンバスを画像としてキャプチャし、ダウンロード、クリップボードコピー、SNS共有を提供します。
 * html-to-image@1.11.11を使用（React Flow公式推奨バージョン）
 */

import { toPng, toBlob } from 'html-to-image';
import { getNodesBounds, getViewportForBounds, Node } from '@xyflow/react';

// 画像サイズの制約
const MIN_IMAGE_WIDTH = 1024;
const MIN_IMAGE_HEIGHT = 768;
const MAX_IMAGE_WIDTH = 4096;
const MAX_IMAGE_HEIGHT = 3072;
const PADDING_RATIO = 0.2;

/**
 * ノード境界のサイズから出力画像のピクセルサイズを動的に計算する
 *
 * @param nodesBounds - ノード境界のサイズ
 * @returns 出力画像の幅と高さ（ピクセル）
 *
 * @remarks
 * - 最小サイズ (1024x768) を保証（ノードが少ない場合も小さくなりすぎない）
 * - 最大サイズ (4096x3072) で上限を設定（メモリ保護）
 * - パディングを20%追加してエッジラベルのはみ出しを防止
 */
export function calculateImageDimensions(nodesBounds: {
  width: number;
  height: number;
}): { width: number; height: number } {
  // パディングを含めたサイズを計算（切り上げ）
  const paddedWidth = Math.ceil(nodesBounds.width * (1 + PADDING_RATIO * 2));
  const paddedHeight = Math.ceil(nodesBounds.height * (1 + PADDING_RATIO * 2));

  // 最小・最大サイズの制約を適用
  const width = Math.max(
    MIN_IMAGE_WIDTH,
    Math.min(paddedWidth, MAX_IMAGE_WIDTH)
  );
  const height = Math.max(
    MIN_IMAGE_HEIGHT,
    Math.min(paddedHeight, MAX_IMAGE_HEIGHT)
  );

  return { width, height };
}

/**
 * React Flowのキャンバスを画像としてキャプチャする共通処理
 *
 * @param nodes - 全ノード（境界計算に使用）
 * @returns キャプチャ対象の要素、ビューポート設定、動的に計算された画像サイズ
 * @throws ノードが存在しない場合やビューポート要素が見つからない場合にエラーをスロー
 */
function getCaptureBounds(nodes: Node[]): {
  viewport: HTMLElement;
  viewportTransform: { x: number; y: number; zoom: number };
  imageWidth: number;
  imageHeight: number;
} {
  // ノードが存在しない場合はエラー
  if (nodes.length === 0) {
    throw new Error('キャプチャするノードが存在しません');
  }

  // .react-flow__viewport 要素を取得
  const viewport = document.querySelector(
    '.react-flow__viewport'
  ) as HTMLElement;
  if (!viewport) {
    throw new Error('React Flowのビューポート要素が見つかりません');
  }

  // 全ノードの境界を計算
  const nodesBounds = getNodesBounds(nodes);

  // 出力画像サイズを動的に計算
  const { width: imageWidth, height: imageHeight } =
    calculateImageDimensions(nodesBounds);

  // ビューポート設定を計算
  const viewportTransform = getViewportForBounds(
    nodesBounds,
    imageWidth,
    imageHeight,
    0.01, // 最小ズーム（0.5 → 0.01に緩和）
    2, // 最大ズーム
    PADDING_RATIO // パディング（0.1 → 0.2）
  );

  return { viewport, viewportTransform, imageWidth, imageHeight };
}

/**
 * キャンバスをPNG Data URLとして取得する
 *
 * @param nodes - 全ノード
 * @returns PNG形式のData URL
 */
export async function captureCanvasAsPng(nodes: Node[]): Promise<string> {
  const { viewport, viewportTransform, imageWidth, imageHeight } =
    getCaptureBounds(nodes);

  // html-to-imageでキャプチャ
  const dataUrl = await toPng(viewport, {
    backgroundColor: '#ffffff',
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
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
  const { viewport, viewportTransform, imageWidth, imageHeight } =
    getCaptureBounds(nodes);

  // html-to-imageでキャプチャ
  const blob = await toBlob(viewport, {
    backgroundColor: '#ffffff',
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
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
  anchor.style.display = 'none';

  // DOMに追加してクリック、その後削除
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
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
