# Plamocast

Raycast から日英・英日翻訳する拡張機能。既定ではローカルの [PLaMo 3 Translate](https://huggingface.co/collections/pfnet/plamo-3-translate)（LM Studio / Ollama）を自動検出して使い、Choose Model で他の LLM や DeepL に切り替えられる。[Deepcast](https://www.raycast.com/drwmrd/deepcast) のローカル LLM 版。

## コマンド

| コマンド | モード | 内容 |
| --- | --- | --- |
| Translate | view | フォームでライブ翻訳（自動 / →日本語 / →英語、文体指定、原文⇄訳文の入れ替え、⌘Y で全画面） |
| Translate Auto (JA ⇄ EN) | no-view | 選択テキストの言語を判定して日→英 / 英→日に翻訳 |
| Translate into Japanese | no-view | 選択テキストを日本語へ |
| Translate into English | no-view | 選択テキストを英語へ |
| Choose Model | view | 翻訳に使うモデルを選ぶ |

no-view コマンドの結果は設定の **On Translation Action**（コピー / ペースト / Raycast で表示）に従う。

## モデルの選び方

**何も設定しなくても動く。** LM Studio（`localhost:1234`）と Ollama（`localhost:11434`）を自動で探し、PLaMo 3 Translate が見つかればそれを使う（ロード済みのものを優先、なければ小さい＝速いもの）。

別のモデルにしたいときは **Choose Model** コマンドを開く。

- ローカルのサーバーにあるモデルが一覧で出る（LM Studio はロード状態も表示、埋め込みモデルは除外）
- 選んだモデルの名前に `plamo-3-translate` が含まれていれば PLaMo 3 Translate 専用の送り方、それ以外は汎用 LLM 向けの送り方を自動で使い分ける
- DeepL は設定に API キーを入れると選べる
- OpenAI などのクラウドや、既定ポート以外のサーバーは、設定の **Custom Server** に登録すると一覧に出る
- 選択は Raycast の LocalStorage に保存される。一番上の「自動（サーバー名 / モデル名）」を選ぶと自動に戻る

| 送り方 | 中身 | ストリーミング |
| --- | --- | --- |
| PLaMo 3 Translate | 独自形式の system メッセージ `[plamo-translate]`（PLaMo 3 Translate の GGUF 版チャットテンプレート専用） | ○ |
| 汎用 LLM | 「訳文だけを出力せよ」という指示プロンプト。設定 **LLM: System Prompt** で差し替え可（`{{target}}` → Japanese / English、`{{style}}` → 文体の指示） | ○ |
| DeepL | DeepL API `/v2/translate` | × |

文体（です・ます / だ・である）は PLaMo では `form`、汎用 LLM ではプロンプト、DeepL では `formality` に変換して渡す。

## セットアップ

### 1. モデルを LM Studio に入れる（PLaMo を使う場合）

```bash
lms get "https://huggingface.co/pfnet/plamo-3-translate-2b-GGUF@Q4_K_M" -y
lms load plamo-3-translate-2b --identifier plamo-3-translate-2b -c 8192 -y
lms server start
```

MLX 版ではなく **GGUF 版** を使う。

- MLX 版は同梱の `modeling_plamo_mlx.py` を `trust_remote_code` で読む前提で、LM Studio では動かない
- LM Studio の API は `chat_template_kwargs` を渡せない。GGUF 版のチャットテンプレートは、先頭の system メッセージに `[plamo-translate]\ntarget_lang=ja` のように書いた設定を解釈してくれる（モデルカード "Specifying settings in a system message"）。本拡張はこの方式で翻訳方向と文体を渡している

サイズの選択（参考: M4 / 16GB での測定）: 2B は常駐約 2.2GB・1 文 0.3〜1 秒で、`⌘Y` のような記号混じりの技術文も正しく訳す。0.8B は約 0.6GB・0.1〜0.3 秒と軽いが、記号の前後で訳が崩れることがある。複数サイズを入れている場合は Choose Model で選ぶ。

### 2. 拡張機能を Raycast に読み込む

```bash
npm install
npm run dev   # Raycast に開発版として登録される。登録後は Ctrl+C で止めても残る
```

Raycast Settings → Extensions → Plamocast で各コマンドにホットキーを割り当てる。

## 設定

どれも任意。

| 項目 | 用途 |
| --- | --- |
| Custom Server: Endpoint / API Key | 自動検出されないサーバー（OpenAI、OpenRouter、別マシンなど）を Choose Model に出す |
| DeepL: API Key | DeepL を使う。Free プランのキーは `:fx` で終わり、自動で Free 用 API に送る |
| LLM: System Prompt | 汎用 LLM 向けプロンプトの差し替え |
| Preferred Source | Selected Text（空ならクリップボード） |
| On Translation Action | Copy to Clipboard / Paste / View |
| Japanese Style | Model Default / です・ます / だ・である |

API キーは Raycast のパスワード型設定として保存される（Raycast の暗号化ストア）。

## トラブルシュート

- **「LM Studio に接続できません」**: `lms server start`。常用するなら LM Studio の設定でログイン時にサーバーを自動起動させる
- **「PLaMo 3 Translate が見つかりません」**: LM Studio が起動していて、PLaMo 3 Translate がダウンロード済みか確認する。モデルがアンロードされていても、LM Studio の JIT ロードが有効なら初回リクエストで自動ロードされる（数秒かかる）

## License

拡張機能のコードは MIT。モデルは [PLaMo Community License](https://plamo.preferredai.jp/info/plamo-community-license-en)（個人・非商用は無償）。
