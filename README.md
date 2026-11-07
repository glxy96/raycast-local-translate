# Local Translate

Raycast から日英・英日の翻訳を行う拡張機能です。既定ではローカルの [PLaMo 3 Translate](https://huggingface.co/collections/pfnet/plamo-3-translate)（LM Studio / Ollama）を自動で検出して使用します。Choose Model コマンドから、他の LLM や DeepL に切り替えられます。

## コマンド

| コマンド                 | モード  | 内容                                                                                      |
| ------------------------ | ------- | ----------------------------------------------------------------------------------------- |
| Translate                | view    | フォームで翻訳（自動 / →日本語 / →英語、文体指定、原文と訳文の入れ替え、⌘Y で全画面表示） |
| Translate Auto (JA ⇄ EN) | no-view | 選択したテキストの言語を判定して、日→英 または 英→日の翻訳を行う                          |
| Translate into Japanese  | no-view | 選択したテキストを日本語に翻訳                                                            |
| Translate into English   | no-view | 選択したテキストを英語に翻訳                                                              |
| Choose Model             | view    | 翻訳に使用するモデルを選択                                                                |

no-view コマンドの結果は、設定の **翻訳後の動作**（コピー / ペースト / Raycast で表示）に従います。「ペースト」を選択すると、選択したテキストがその場で訳文に置き換わります。

## モデルの選び方

LM Studio か Ollama に PLaMo 3 Translate を導入して起動していれば、拡張機能側の設定は不要です。LM Studio（`localhost:1234`）と Ollama（`localhost:11434`）を自動で探し、PLaMo 3 Translate が見つかればそれを使用します。

### 自動で探すサーバー

| サーバー  | 確認する場所                |
| --------- | --------------------------- |
| LM Studio | `http://localhost:1234/v1`  |
| Ollama    | `http://localhost:11434/v1` |

ポートを変更している場合や、別のマシン・クラウドのサーバーを使用する場合は、設定の **カスタムサーバー: エンドポイント** に入力してください。`localhost:5678` のように `http://` と `/v1` は省略できます。

別のモデルを使用する場合は **Choose Model** コマンドを開いてください。

- ローカルのサーバーにあるモデルが一覧で表示されます（LM Studio のロード状態を表示し、埋め込みモデルは除外します）
- モデル名に `plamo-3-translate` が含まれている場合は PLaMo 3 Translate 専用の形式を使い、それ以外は汎用 LLM 向けの形式を自動で使い分けます
- DeepL は設定に API キーを入力すると選択できます
- OpenAI などのクラウドや、カスタムポートのサーバーは、設定の **カスタムサーバー** に登録すると一覧に表示されます
- 選択内容は Raycast の LocalStorage に保存されます。一番上の「自動」を選ぶと自動検出に戻ります

| 送り方            | 内容                                                                                                                              | ストリーミング |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| PLaMo 3 Translate | 独自形式の system メッセージ `[plamo-translate]`（PLaMo 3 Translate の GGUF 版チャットテンプレート専用）                          | ○              |
| 汎用 LLM          | 「訳文だけを出力する」という指示プロンプト。設定 **LLM: システムプロンプト** で変更できます（`{{target}}` と `{{style}}` を使用） | ○              |
| DeepL             | DeepL API `/v2/translate`                                                                                                         | ×              |

文体（です・ます / だ・である）は、PLaMo では `form`、汎用 LLM ではプロンプト、DeepL では `formality` に変換して渡します。

## セットアップ

### AI エージェントに依頼する場合

Claude Code などの AI エージェントに以下を伝えてください。

```
https://github.com/glxy96/raycast-local-translate を導入してください。
README の手順に従ってください。LM Studio と PLaMo 3 Translate（https://huggingface.co/pfnet/plamo-3-translate-2b-GGUF の Q4_K_M）が必要です。
```

### 手動で行う場合

#### 1. モデルを LM Studio に入れる（PLaMo を使う場合）

```bash
lms get "https://huggingface.co/pfnet/plamo-3-translate-2b-GGUF@Q4_K_M" -y
lms load plamo-3-translate-2b --identifier plamo-3-translate-2b -c 8192 -y
lms server start
```

**GGUF 版** を使用してください。MLX 版は動作を確認していません。

モデルのサイズについて（M4 / 16GB での測定）：

- **2B**: 常駐約 2.2GB。1 文 0.3〜1 秒で、記号を含む技術文も正しく翻訳できます。
- **0.8B**: 約 0.6GB で高速ですが、記号の前後で翻訳が崩れることがあります。

#### 2. 拡張機能を Raycast に読み込む

Raycast Store には公開していないため、ソースから導入してください。Node.js 22 以上が必要です。

```bash
git clone https://github.com/glxy96/raycast-local-translate.git
cd raycast-local-translate
npm install
npm run dev   # 開発版として登録されます。Ctrl+C で止めても拡張機能は Raycast に残ります
```

更新するときは `git pull` をしてから、もう一度 `npm run dev` を実行してください。

Raycast Settings → Extensions → Local Translate からホットキーを割り当ててください。

### 開発

```bash
npm test          # ユニットテスト（Vitest を使用）
npm run lint      # ESLint + Prettier
npm run typecheck
```

## 設定

すべて任意です。

| 項目                                        | 用途                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| カスタムサーバー: エンドポイント / API キー | 自動検出されないサーバー（OpenAI、OpenRouter、別マシンなど）を Choose Model に表示 |
| DeepL: API キー                             | DeepL を使用。Free プランのキーは自動で Free 用 API に送信                         |
| LLM: システムプロンプト                     | 汎用 LLM 向けプロンプトの変更                                                      |
| 入力元                                      | 選択テキスト（空の場合はクリップボード）                                           |
| 翻訳後の動作                                | コピー / ペースト / Raycast で表示                                                 |
| 日本語の文体                                | モデルに任せる / です・ます / だ・である                                           |

API キーは Raycast の暗号化ストアに保存されます。

## トラブルシュート

- **「LM Studio に接続できません」**: `lms server start` を実行してください。常用する場合は、LM Studio の設定でログイン時にサーバーを自動起動するようにしてください。
- **「PLaMo 3 Translate が見つかりません」**: LM Studio の起動と、モデルのダウンロード済み状態を確認してください。初回リクエスト時は自動ロードに数秒かかります。

## 謝辞

[Deepcast](https://www.raycast.com/mooxl/deepcast) の使い勝手を参考に作成しました。本プロジェクトは Deepcast とは別のものです。

## License

この拡張機能のコードは [MIT License](LICENSE) です。

翻訳に使用するモデルやサービス（PLaMo 3 Translate、その他の LLM、DeepL など）は、それぞれの利用規約・ライセンスに従います。利用前に各サービスのライセンスを確認してください。
