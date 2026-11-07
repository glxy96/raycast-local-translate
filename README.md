# Plamocast

Raycast から日英・英日翻訳する拡張機能。既定ではローカルの [PLaMo 3 Translate](https://huggingface.co/collections/pfnet/plamo-3-translate)（LM Studio）を使い、設定で OpenAI 互換 LLM や DeepL に切り替えられる。[Deepcast](https://www.raycast.com/drwmrd/deepcast) のローカル LLM 版。

## バックエンド

設定の **Backend** で選ぶ。

| Backend | 送り方 | ストリーミング | 必要な設定 |
| --- | --- | --- | --- |
| PLaMo 3 Translate（既定） | PLaMo 3 Translate 専用の `[plamo-translate]` system メッセージ | ○ | なし（LM Studio + 既定モデル名なら） |
| OpenAI-compatible LLM | 「訳文だけを出力せよ」という指示プロンプト | ○ | LLM: Model（クラウドなら LLM: API Key も） |
| DeepL | DeepL API `/v2/translate` | × | DeepL: API Key |

- **PLaMo 3 Translate** は翻訳専用モデルで、設定（翻訳先・文体）を独自形式の system メッセージで受け取る。この形式は PLaMo 3 Translate の GGUF 版チャットテンプレート専用なので、他のモデルには使えない
- **OpenAI-compatible LLM** は LM Studio 上の別モデル、Ollama、OpenAI、OpenRouter など `/v1/chat/completions` を話すもの全般に使える。**LLM: System Prompt** で独自のプロンプトにも差し替えられる（`{{target}}` → Japanese / English、`{{style}}` → 文体の指示）
- 文体（です・ます / だ・である）は PLaMo では `form`、LLM ではプロンプト、DeepL では `formality` に変換して渡す

## コマンド

| コマンド | モード | 内容 |
| --- | --- | --- |
| Translate | view | フォームでライブ翻訳（自動 / →日本語 / →英語、文体指定、原文⇄訳文の入れ替え） |
| Translate Auto (JA ⇄ EN) | no-view | 選択テキストの言語を判定して日→英 / 英→日に翻訳 |
| Translate into Japanese | no-view | 選択テキストを日本語へ |
| Translate into English | no-view | 選択テキストを英語へ |

no-view コマンドの結果は設定の **On Translation Action**（コピー / ペースト / Raycast で表示）に従う。

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

サイズの選択（参考: M4 / 16GB での測定）: 2B は常駐約 2.2GB・1 文 0.3〜1 秒で、`⌘Y` のような記号混じりの技術文も正しく訳す。0.8B は約 0.6GB・0.1〜0.3 秒と軽いが、記号の前後で訳が崩れることがある。別サイズに替えるときは設定の **PLaMo: Model** を合わせる。

### 2. 拡張機能を Raycast に読み込む

```bash
npm install
npm run dev   # Raycast に開発版として登録される。登録後は Ctrl+C で止めても残る
```

Raycast Settings → Extensions → Plamocast で各コマンドにホットキーを割り当てる。

## 設定

| 項目 | 既定値 |
| --- | --- |
| Backend | PLaMo 3 Translate |
| PLaMo: Endpoint / Model | `http://localhost:1234/v1` / `plamo-3-translate-2b` |
| LLM: Endpoint / Model / API Key / System Prompt | `http://localhost:1234/v1` / （要入力） / 空 / 組み込みプロンプト |
| DeepL: API Key | （DeepL を使うなら要入力。Free プランのキーは `:fx` で終わり、自動で Free 用 API に送る） |
| Preferred Source | Selected Text（空ならクリップボード） |
| On Translation Action | Copy to Clipboard |
| Japanese Style | Model Default |

API キーは Raycast のパスワード型設定として保存される（Raycast の暗号化ストア）。

## トラブルシュート

- **「LM Studio に接続できません」**: `lms server start`。常用するなら LM Studio の設定でログイン時にサーバーを自動起動させる
- **HTTP 4xx でモデルが見つからない**: `lms ps` で identifier を確認し、設定の PLaMo: Model（または LLM: Model）と一致させる。モデルがアンロードされていても、LM Studio の JIT ロードが有効なら初回リクエストで自動ロードされる（数秒かかる）

## License

拡張機能のコードは MIT。モデルは [PLaMo Community License](https://plamo.preferredai.jp/info/plamo-community-license-en)（個人・非商用は無償）。
