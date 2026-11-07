# Local Translate

Raycast から日英・英日翻訳する拡張機能。既定ではローカルの [PLaMo 3 Translate](https://huggingface.co/collections/pfnet/plamo-3-translate)（LM Studio / Ollama）を自動検出して使い、Choose Model で他の LLM や DeepL に切り替えられる。[Deepcast](https://www.raycast.com/drwmrd/deepcast) のローカル LLM 版。

## コマンド

| コマンド                 | モード  | 内容                                                                                       |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------ |
| Translate                | view    | フォームでライブ翻訳（自動 / →日本語 / →英語、文体指定、原文⇄訳文の入れ替え、⌘Y で全画面） |
| Translate Auto (JA ⇄ EN) | no-view | 選択テキストの言語を判定して日→英 / 英→日に翻訳                                            |
| Translate into Japanese  | no-view | 選択テキストを日本語へ                                                                     |
| Translate into English   | no-view | 選択テキストを英語へ                                                                       |
| Choose Model             | view    | 翻訳に使うモデルを選ぶ                                                                     |

no-view コマンドの結果は設定の **翻訳後の動作**（コピー / ペースト / Raycast で表示）に従う。「ペースト」にすると、選択したテキストがその場で訳文に置き換わる（例: 日本語で下書き → 選択 → ホットキーで英文に）。

## モデルの選び方

**何も設定しなくても動く。** LM Studio（`localhost:1234`）と Ollama（`localhost:11434`）を自動で探し、PLaMo 3 Translate が見つかればそれを使う（ロード済みのものを優先、なければ小さい＝速いもの）。

### 自動で探すサーバー

| サーバー  | 見に行く場所                |
| --------- | --------------------------- |
| LM Studio | `http://localhost:1234/v1`  |
| Ollama    | `http://localhost:11434/v1` |

どちらも**既定のポート**。ポートを変えている場合（LM Studio のサーバー設定や `lms server start --port`、Ollama の `OLLAMA_HOST`）や、別マシン・クラウドのサーバーを使う場合は、設定の **カスタムサーバー: エンドポイント** に手で入れる。`localhost:5678` のように `http://` と `/v1` は省略できる。

別のモデルにしたいときは **Choose Model** コマンドを開く。

- ローカルのサーバーにあるモデルが一覧で出る（LM Studio はロード状態も表示、埋め込みモデルは除外）
- 選んだモデルの名前に `plamo-3-translate` が含まれていれば PLaMo 3 Translate 専用の送り方、それ以外は汎用 LLM 向けの送り方を自動で使い分ける
- DeepL は設定に API キーを入れると選べる
- OpenAI などのクラウドや、既定ポート以外のサーバーは、設定の **カスタムサーバー** に登録すると一覧に出る
- 選択は Raycast の LocalStorage に保存される。一番上の「自動（サーバー名 / モデル名）」を選ぶと自動に戻る

| 送り方            | 中身                                                                                                                                                     | ストリーミング |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| PLaMo 3 Translate | 独自形式の system メッセージ `[plamo-translate]`（PLaMo 3 Translate の GGUF 版チャットテンプレート専用）                                                 | ○              |
| 汎用 LLM          | 「訳文だけを出力せよ」という指示プロンプト。設定 **LLM: システムプロンプト** で差し替え可（`{{target}}` → Japanese / English、`{{style}}` → 文体の指示） | ○              |
| DeepL             | DeepL API `/v2/translate`                                                                                                                                | ×              |

文体（です・ます / だ・である）は PLaMo では `form`、汎用 LLM ではプロンプト、DeepL では `formality` に変換して渡す。

## セットアップ

### AI エージェントに任せる場合

Claude Code などの AI エージェントに以下を貼る。

```
https://github.com/glxy96/raycast-local-translate を導入してください。
README のセットアップ手順に従ってください。LM Studio と PLaMo 3 Translate（https://huggingface.co/pfnet/plamo-3-translate-2b-GGUF の Q4_K_M）が必要なので、未導入であれば導入してください。
```

### 手で入れる場合

#### 1. モデルを LM Studio に入れる（PLaMo を使う場合）

```bash
lms get "https://huggingface.co/pfnet/plamo-3-translate-2b-GGUF@Q4_K_M" -y
lms load plamo-3-translate-2b --identifier plamo-3-translate-2b -c 8192 -y
lms server start
```

MLX 版ではなく **GGUF 版** を使う。

- MLX 版は同梱の `modeling_plamo_mlx.py` を `trust_remote_code` で読む前提で、LM Studio では動かない
- LM Studio の API は `chat_template_kwargs` を渡せない。GGUF 版のチャットテンプレートは、先頭の system メッセージに `[plamo-translate]\ntarget_lang=ja` のように書いた設定を解釈してくれる（モデルカード "Specifying settings in a system message"）。本拡張はこの方式で翻訳方向と文体を渡している

サイズの選択（参考: M4 / 16GB での測定）: 2B は常駐約 2.2GB・1 文 0.3〜1 秒で、`⌘Y` のような記号混じりの技術文も正しく訳す。0.8B は約 0.6GB・0.1〜0.3 秒と軽いが、記号の前後で訳が崩れることがある。複数サイズを入れている場合は Choose Model で選ぶ。

#### 2. 拡張機能を Raycast に読み込む

Raycast Store には出していないので、ソースから入れる。Node.js 22 以上が必要。

```bash
git clone https://github.com/glxy96/raycast-local-translate.git
cd raycast-local-translate
npm install
npm run dev   # Raycast に開発版として登録される。登録後は Ctrl+C で止めても残る
```

更新するときは `git pull` してからもう一度 `npm run dev`。

Raycast Settings → Extensions → Local Translate で各コマンドにホットキーを割り当てる。

### 開発

```bash
npm test          # ユニットテスト（Vitest。@raycast/api は test/raycast-api.ts の代替実装に差し替え）
npm run lint      # ESLint + Prettier（Store 向けの ray lint は使わない）
npm run typecheck
```

## 設定

どれも任意。

| 項目                                        | 用途                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| カスタムサーバー: エンドポイント / API キー | 自動検出されないサーバー（OpenAI、OpenRouter、別マシンなど）を Choose Model に出す |
| DeepL: API キー                             | DeepL を使う。Free プランのキーは `:fx` で終わり、自動で Free 用 API に送る        |
| LLM: システムプロンプト                     | 汎用 LLM 向けプロンプトの差し替え                                                  |
| 入力元                                      | 選択テキスト（空ならクリップボード）                                               |
| 翻訳後の動作                                | コピー / 最前面のアプリにペースト / Raycast で表示                                 |
| 日本語の文体                                | モデルに任せる / です・ます / だ・である                                           |

API キーは Raycast のパスワード型設定として保存される（Raycast の暗号化ストア）。

## トラブルシュート

- **「LM Studio に接続できません」**: `lms server start`。常用するなら LM Studio の設定でログイン時にサーバーを自動起動させる
- **「PLaMo 3 Translate が見つかりません」**: LM Studio が起動していて、PLaMo 3 Translate がダウンロード済みか確認する。モデルがアンロードされていても、LM Studio の JIT ロードが有効なら初回リクエストで自動ロードされる（数秒かかる）

## License

この拡張機能のコードは [MIT License](LICENSE)。

翻訳に使うモデルやサービス（PLaMo 3 Translate、その他の LLM、DeepL など）は、それぞれの利用規約・ライセンスに従う。利用前に各モデル・サービスのライセンスを確認すること。
