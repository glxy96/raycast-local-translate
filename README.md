# Plamocast

[PLaMo 3 Translate](https://huggingface.co/collections/pfnet/plamo-3-translate) を LM Studio でローカル実行し、Raycast から日英・英日翻訳する拡張機能。[Deepcast](https://www.raycast.com/drwmrd/deepcast) のローカル LLM 版。

## コマンド

| コマンド | モード | 内容 |
| --- | --- | --- |
| Translate | view | フォームでライブ翻訳（自動 / →日本語 / →英語、文体指定、原文⇄訳文の入れ替え） |
| Translate Auto (JA ⇄ EN) | no-view | 選択テキストの言語を判定して日→英 / 英→日に翻訳 |
| Translate into Japanese | no-view | 選択テキストを日本語へ |
| Translate into English | no-view | 選択テキストを英語へ |

no-view コマンドの結果は設定の **On Translation Action**（コピー / ペースト / Raycast で表示）に従う。

## セットアップ

### 1. モデルを LM Studio に入れる

```bash
lms get "https://huggingface.co/pfnet/plamo-3-translate-0.8b-GGUF@Q4_K_M" -y
lms load plamo-3-translate-0.8b --identifier plamo-3-translate-0.8b -c 8192 -y
lms server start
```

MLX 版ではなく **GGUF 版** を使う。

- MLX 版は同梱の `modeling_plamo_mlx.py` を `trust_remote_code` で読む前提で、LM Studio では動かない
- LM Studio の API は `chat_template_kwargs` を渡せない。GGUF 版のチャットテンプレートは、先頭の system メッセージに `[plamo-translate]\ntarget_lang=ja` のように書いた設定を解釈してくれる（モデルカード "Specifying settings in a system message"）。本拡張はこの方式で翻訳方向と文体を渡している

より高品質にしたい場合は `plamo-3-translate-2b-GGUF` / `8b-GGUF` に替え、拡張機能の設定 **Model Identifier** を合わせて変更する。

### 2. 拡張機能を Raycast に読み込む

```bash
npm install
npm run dev   # Raycast に開発版として登録される。登録後は Ctrl+C で止めても残る
```

Raycast Settings → Extensions → Plamocast で各コマンドにホットキーを割り当てる。

## 設定

| 項目 | 既定値 |
| --- | --- |
| API Endpoint | `http://localhost:1234/v1` |
| Model Identifier | `plamo-3-translate-0.8b` |
| Preferred Source | Selected Text（空ならクリップボード） |
| On Translation Action | Copy to Clipboard |
| Japanese Style | Model Default |

## トラブルシュート

- **「LM Studio に接続できません」**: `lms server start`。常用するなら LM Studio の設定でログイン時にサーバーを自動起動させる
- **HTTP 4xx でモデルが見つからない**: `lms ps` で identifier を確認し、設定の Model Identifier と一致させる。モデルがアンロードされていても、LM Studio の JIT ロードが有効なら初回リクエストで自動ロードされる（数秒かかる）

## License

拡張機能のコードは MIT。モデルは [PLaMo Community License](https://plamo.preferredai.jp/info/plamo-community-license-en)（個人・非商用は無償）。
