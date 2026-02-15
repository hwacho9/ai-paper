# D-11: AIエージェント（Natural Language Automation）

## ドメイン概要

自然言語リクエストを受け取り、実行計画の生成と複数APIアクションの自動実行を行うオーケストレーションドメイン。

## 責務境界

- チャット入力の解釈（LLM優先、失敗時はルールベース）
- 実行計画（plan/actions）の生成
- 許可済みアクションの逐次実行
- 実行結果の検証（LLM監査 + フォールバック判定）
- 次画面遷移ヒント（`target_path`）と再実行候補（`pending_actions`）の返却

## 機能一覧（現行）

| 機能ID | 機能名 | 説明 |
| ------ | ------ | ---- |
| F-1101 | 自然言語プランニング | `message` から actions を生成 |
| F-1102 | 自動実行 | 許可アクションを順次実行 |
| F-1103 | リトライ | 一部アクションで代替再試行 |
| F-1104 | 実行検証 | `met/partial/not_met` 判定 |
| F-1105 | 実行結果返却 | `steps/artifacts/target_path/pending_actions` を返却 |

## API仕様（現行）

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `POST` | `/api/v1/agent/chat` | 計画生成 + 任意実行 |

## リクエスト

### `AgentChatRequest`

```json
{
  "message": "GNNの論文を探して保存して、プロジェクトを作って追加して",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "execute": true,
  "context": {
    "project_id": "optional-project-id",
    "paper_id": "optional-paper-id"
  },
  "actions_override": [
    { "action": "search_papers", "params": { "query": "graph neural network" } }
  ]
}
```

補足:
- `execute=false` なら計画のみ返却（実行しない）
- `actions_override` 指定時はクライアント指定アクションで実行

## レスポンス

### `AgentChatResponse`（主要項目）

```json
{
  "reply": "3 ステップ完了。検証: 一部は実現しましたが未達項目があります。",
  "plan": ["論文を検索", "論文をライブラリに保存", "プロジェクトを作成"],
  "actions": [{ "action": "search_papers", "params": { "query": "..." } }],
  "steps": [
    {
      "action": "search_papers",
      "status": "completed",
      "detail": "8 件の論文を取得",
      "output": { "total": 8 }
    }
  ],
  "artifacts": {},
  "target_path": "/projects/xxx",
  "verification": {
    "verdict": "partial",
    "summary": "一部は実現しましたが未達があります。",
    "achieved": ["プロジェクト作成は完了しました。"],
    "missing": ["メモ作成が未実施です。"]
  },
  "pending_actions": [],
  "pending_plan": []
}
```

## 実装済みアクション（allowlist）

- `search_papers`
- `like_paper_from_last_search`
- `create_project`
- `add_paper_to_project`
- `add_last_liked_paper_to_project`
- `list_library`
- `ask_library`
- `create_memo_for_last_paper`
- `suggest_keywords_for_last_paper`
- `get_related_for_last_paper`
- `compile_project_tex`

## 実行フロー（実装）

1. プラン生成
- LLMで `summary/plan/actions` JSON生成を試行
- 失敗時はルールベースで生成

2. アクション実行（`execute=true` の場合）
- 先頭から順次実行
- 失敗時はアクション別の代替再試行を実施
  - 例: `like_paper_from_last_search` の index+1再試行
- 再試行も失敗したら以降を中断し `pending_actions` に残す

3. 結果検証
- LLM監査で `verdict/achieved/missing` を生成
- 失敗時はヒューリスティック判定

4. 画面遷移先提案
- 実行内容から `target_path` を返却（例: `/projects/{id}`, `/papers/{id}`, `/library`, `/search`）

## 現状の注意点

- ストリーミング応答は未対応（単発レスポンス）
- 実行は直列で、並列アクション実行は未対応
- アクションは allowlist 外を実行しない
- 多くのアクションは前段依存あり（例: `like_paper_from_last_search` は先に検索が必要）
- 詳細な業務機能は各ドメインAPIに委譲（D-03, D-04, D-06, D-08, D-09, D-10）

## 実装ステータス

- 実装済み: 自然言語プランニング（LLM + ルールフォールバック）
- 実装済み: 計画実行と結果返却
- 実装済み: 失敗時の部分リトライ
- 実装済み: 実行後検証（LLM監査 + フォールバック）
- 未実装: SSE/ストリーミング応答
- 未実装: アクション並列実行
