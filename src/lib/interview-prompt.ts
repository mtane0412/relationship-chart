/**
 * AIインタビュアーのシステムプロンプト生成モジュール
 *
 * AIがユーザーの脳内にある人物・関係情報を引き出すためのインタビュアーとして機能するための
 * システムプロンプトを生成する。
 *
 * 設計原則:
 *   - 知識の封印: AIは自分の知識を使わず、ユーザーの発言だけを情報源にする
 *   - 段階的質問: 登場人物の列挙 → 属性深掘り → 関係探索 → 確認・補足
 *   - スキーマ意識: プロパティグラフのスキーマ要素を自然な日本語の質問で引き出す
 *   - 既存データ注入: 既登録の人物名・関係サマリをコンテキストとして渡す
 */

/** プロンプトインジェクション対策のための最大件数 */
const MAX_EXISTING_NAMES = 200;
const MAX_EXISTING_RELATIONSHIPS = 200;

/**
 * プロンプトインジェクション対策のため人物名をサニタイズする
 *
 * @param name - サニタイズ対象の人物名
 * @returns サニタイズ後の人物名
 */
function sanitizeName(name: string): string {
  return name
    .replace(/[\r\n\t]/g, ' ') // 改行・タブを空白に
    .replace(/[#\-`*_[\]()!]/g, '') // Markdown特殊記号を除去
    .trim();
}

/**
 * AIインタビュアーのシステムプロンプトを生成する
 *
 * @param existingPersonNames - 既に相関図に登録されている人物名リスト
 * @param existingRelationshipSummaries - 既に登録されている関係のサマリリスト（例: "AさんとBさんは友人"）
 * @returns システムプロンプト文字列
 */
export function buildInterviewSystemPrompt(
  existingPersonNames: string[],
  existingRelationshipSummaries: string[],
): string {
  const sanitizedNames = existingPersonNames
    .slice(0, MAX_EXISTING_NAMES)
    .map(sanitizeName)
    .filter((n) => n.length > 0);

  const sanitizedRelationships = existingRelationshipSummaries
    .slice(0, MAX_EXISTING_RELATIONSHIPS)
    .map(sanitizeName)
    .filter((s) => s.length > 0);

  // 既存データのコンテキストセクション
  const existingDataSection =
    sanitizedNames.length > 0 || sanitizedRelationships.length > 0
      ? buildExistingDataSection(sanitizedNames, sanitizedRelationships)
      : '';

  return `あなたは人物相関図を作成するためのインタビュアーです。
ユーザーが持つ人物・物・組織の関係についての理解を引き出すことがあなたの役割です。

## 重要な制約: 自分の知識を使わないこと

あなたは自分の知識を一切使ってはいけません。
ユーザーが有名な人物名（例：歴史上の人物、著名人、フィクションのキャラクター）を挙げた場合でも、
あなたはその人物について何も知らないものとして振る舞ってください。
「〇〇は△△ですよね？」のような確認や補足を絶対にしないでください。
情報はすべてユーザーの口から引き出してください。

## インタビューの進め方

以下の順序で段階的に情報を引き出してください：

1. **登場人物の列挙**: まず「この物語・出来事・組織などに登場する人物や物をすべて教えてください」と聞く
2. **個々の属性の深掘り**: 各登場人物について「どのような人ですか？」「どのような役割を持っていますか？」などを聞く
3. **人物間の関係の探索**: 「〇〇さんと△△さんはどのような関係ですか？」「どのくらい仲が良いですか？」「信頼関係はありますか？」「何か秘密にしていることはありますか？」などを聞く
4. **確認・補足**: 「他に付け加えることはありますか？」「見落としている関係はありますか？」と聞く

## 質問のコツ

- 一度に複数の質問をしないこと。一つずつ丁寧に聞く
- ユーザーの回答を受けて、より深い質問を重ねる
- 人物間の関係を引き出す際は、以下の観点を自然な言葉で聞く:
  - 親密度（「どのくらい親しい間柄ですか？」）
  - 信頼関係（「お互いを信頼していますか？」）
  - 緊張や対立（「何か対立や緊張はありますか？」）
  - 秘匿している事柄（「何か隠していることや秘密はありますか？」）
  - 好悪（「好意的な関係ですか？それとも敵対的ですか？」）
  - 関係性の認識（「この関係をお互いに認識していますか？」）
  - 重要な転換点（「この関係が変わった出来事はありますか？」）
- 関係のタイプ（友人、親子、上司部下、恋人など）も確認する
- 関係が一方的か双方向かも確認する（「これはお互い様の関係ですか？」）

## 応答スタイル

- 常に日本語で応答すること
- 丁寧で親しみやすいトーンを保つ
- ユーザーの回答を簡潔に受け止めてから次の質問をする
- 共感を示しながら掘り下げる（「なるほど、では...」「それは興味深いですね。では...」）
- 長い回答をしない。質問は簡潔に${existingDataSection}`;
}

/**
 * 既存データのコンテキストセクションを生成する
 *
 * @param names - サニタイズ済みの既存人物名リスト
 * @param relationships - サニタイズ済みの既存関係サマリリスト
 * @returns コンテキストセクション文字列
 */
function buildExistingDataSection(names: string[], relationships: string[]): string {
  let section = '\n\n## 相関図に登録済みの情報\n\n以下の情報はすでに相関図に登録されています。これらを踏まえて、新しい情報や関係を中心に聞き取りを行ってください。';

  if (names.length > 0) {
    section += `\n\n### 登録済みの人物・物\n${names.map((n) => `- ${n}`).join('\n')}`;
  }

  if (relationships.length > 0) {
    section += `\n\n### 登録済みの関係\n${relationships.map((r) => `- ${r}`).join('\n')}`;
  }

  return section;
}
