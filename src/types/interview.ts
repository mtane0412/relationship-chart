/**
 * インタビューセッション関連の型定義
 *
 * AIインタビュアーがユーザーと対話し、人物・関係情報を引き出すセッションの型を定義する。
 * セッションはライフサイクル（active → extracting → preview → completed）に従って状態遷移する。
 */

/** チャットメッセージの送信者の役割 */
export type InterviewRole = 'user' | 'assistant';

/** チャットメッセージ */
export type InterviewMessage = {
  /** メッセージID */
  id: string;
  /** 送信者の役割 */
  role: InterviewRole;
  /** メッセージ本文 */
  content: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
};

/**
 * インタビューセッションの状態
 *
 * - active: インタビュー進行中（ユーザーとAIの対話ループ）
 * - extracting: セッション終了後の抽出処理中
 * - preview: 抽出結果のプレビュー表示中（ユーザーが確認・修正）
 * - completed: 完了（相関図に反映済み、または破棄済み）
 */
export type InterviewSessionStatus = 'active' | 'extracting' | 'preview' | 'completed';

/** インタビューセッション */
export type InterviewSession = {
  /** セッションID */
  id: string;
  /** 対象チャートID */
  chartId: string;
  /**
   * チャットメッセージ履歴（createdAt の昇順で格納される）
   *
   * 配列の先頭が最も古いメッセージ、末尾が最新のメッセージとなる。
   * メッセージを追加する場合は末尾に追加し、この昇順を維持すること。
   */
  messages: InterviewMessage[];
  /** セッションの状態 */
  status: InterviewSessionStatus;
  /** セッション開始日時（ISO 8601形式） */
  createdAt: string;
  /** 最終更新日時（ISO 8601形式） */
  updatedAt: string;
};
