/**
 * interview-prompt.ts のテスト
 *
 * AIインタビュアーのシステムプロンプト生成関数を検証する。
 * 主な検証点:
 *   - 知識の封印（AI自身の知識を使わない旨の指示）
 *   - 段階的質問の指示
 *   - 既存データのコンテキスト注入
 *   - 日本語応答指示
 */

import { describe, it, expect } from 'vitest';
import { buildInterviewSystemPrompt } from './interview-prompt';

describe('buildInterviewSystemPrompt', () => {
  it('知識の封印指示を含む', () => {
    const prompt = buildInterviewSystemPrompt([], []);
    // AIが自分の知識を使わないよう指示する関連文言のいずれかを含むこと
    const knowledgeSealingKeywords = ['自分の知識', '知識を一切使って', 'あなたはその人物について何も知らない'];
    expect(knowledgeSealingKeywords.some((kw) => prompt.includes(kw))).toBe(true);
  });

  it('日本語応答の指示を含む', () => {
    const prompt = buildInterviewSystemPrompt([], []);
    // 日本語応答に関する関連文言のいずれかを含むこと
    const languageKeywords = ['日本語', '日本語で応答'];
    expect(languageKeywords.some((kw) => prompt.includes(kw))).toBe(true);
  });

  it('段階的なインタビュー戦略の指示を含む', () => {
    const prompt = buildInterviewSystemPrompt([], []);
    // 登場人物の列挙を促す関連文言のいずれかを含むこと
    const interviewStrategyKeywords = ['登場人物', '関係者', '人物を列挙'];
    expect(interviewStrategyKeywords.some((kw) => prompt.includes(kw))).toBe(true);
  });

  it('既存人物名を含む場合にコンテキストとして注入される', () => {
    const prompt = buildInterviewSystemPrompt(['田中太郎', '佐藤花子'], []);
    expect(prompt).toContain('田中太郎');
    expect(prompt).toContain('佐藤花子');
  });

  it('既存関係サマリを含む場合にコンテキストとして注入される', () => {
    const prompt = buildInterviewSystemPrompt([], ['田中太郎と佐藤花子は友人']);
    expect(prompt).toContain('田中太郎と佐藤花子は友人');
  });

  it('既存データが空の場合でも正常に生成される', () => {
    const prompt = buildInterviewSystemPrompt([], []);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('既存エピソードタイトルを含む場合にコンテキストとして注入される', () => {
    const prompt = buildInterviewSystemPrompt([], [], ['初めての出会い', '卒業式の告白']);
    expect(prompt).toContain('初めての出会い');
    expect(prompt).toContain('卒業式の告白');
  });

  it('既存エピソードが空の場合はエピソードセクションを挿入しない', () => {
    const promptWithEpisodes = buildInterviewSystemPrompt([], [], ['エピソードA']);
    const promptWithoutEpisodes = buildInterviewSystemPrompt([], [], []);
    // エピソードあり → セクション有り
    expect(promptWithEpisodes).toContain('エピソードA');
    // エピソードなし → エピソードセクション無し
    expect(promptWithoutEpisodes).not.toContain('登録済みのエピソード');
  });

  it('エピソードタイトルにMarkdown特殊記号が含まれていてもサニタイズされる', () => {
    const prompt = buildInterviewSystemPrompt([], [], ['重要な出来事 # 秘密']);
    expect(prompt).not.toContain('重要な出来事 # 秘密');
    // # が除去されサニタイズされた形で含まれること
    expect(prompt).toContain('重要な出来事  秘密');
  });

  it('第3引数を省略した場合でも正常に生成される（後方互換性）', () => {
    const prompt = buildInterviewSystemPrompt(['田中太郎'], ['田中太郎と山田花子は友人']);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('人物名にMarkdown特殊記号が含まれていてもサニタイズされる', () => {
    const prompt = buildInterviewSystemPrompt(['田中 # 太郎'], []);
    // 人物名から #（Markdown特殊記号）が除去され、サニタイズ後の名前が含まれること
    expect(prompt).toContain('田中  太郎');
    expect(prompt).not.toContain('田中 # 太郎');
  });

  it('人物名に改行が含まれていてもサニタイズされる', () => {
    const prompt = buildInterviewSystemPrompt(['田中\n太郎'], []);
    // 改行が空白に変換されていること
    expect(prompt).not.toContain('田中\n太郎');
    expect(prompt).toContain('田中 太郎');
  });
});
