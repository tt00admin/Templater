# templater タスクリスト

## 1. プロジェクト初期化

- [x] VS Code 拡張機能プロジェクトを TypeScript で作成する。
- [x] `package.json` に拡張機能名 `templater`、表示名、説明を設定する。
- [x] ESLint、Prettier、TypeScript 設定を追加する。
- [x] テスト実行環境をセットアップする。
- [x] `README.md` に拡張機能の目的と基本利用手順を書く。

## 2. 拡張機能の基本構造

- [x] `src/extension.ts` を作成し、activate/deactivate を実装する。
- [x] Output Channel `templater` を作成する。
- [x] コマンド登録の基盤を作る。
- [x] エラー表示用の共通ユーティリティを作る。

## 3. 設定定義

- [x] `templater.sources` 設定を `package.json` に定義する。
- [x] `templater.defaultConflictAction` 設定を定義する。
- [x] `templater.enableVariableReplacement` 設定を定義する。
- [x] `templater.renameSuffix` 設定を定義する。
- [x] 設定読み書き用の `templateSources.ts` を実装する。
- [x] 設定値のバリデーションを実装する。

## 4. テンプレートスキャン

- [x] `TemplateSource` 型を定義する。
- [x] `TemplateSet` 型を定義する。
- [x] ソース配下の第1階層ディレクトリをテンプレートセットとして検出する。
- [x] `template.json` がある場合に読み込む。
- [x] `template.json` がない場合のデフォルトメタデータを生成する。
- [x] ignore パターンの扱いを実装する。
- [x] 存在しないソースを警告として扱う。
- [x] スキャン処理のユニットテストを追加する。

## 5. Tree View

- [x] Activity Bar に `templater` ビューコンテナを追加する。
- [x] `templateTreeProvider.ts` を実装する。
- [x] ソース、テンプレートセット、ファイルを階層表示する。
- [x] refresh コマンドで Tree View を再読み込みできるようにする。
- [x] テンプレートセット右クリックメニューを追加する。
- [x] ソース右クリックメニューを追加する。
- [x] 空状態やエラー状態の表示を整える。

## 6. コマンド

- [x] `templater.addSource` を実装する。
- [x] `templater.removeSource` を実装する。
- [x] `templater.refresh` を実装する。
- [x] `templater.applyTemplate` を実装する。
- [x] `templater.previewTemplate` を実装する。
- [x] `templater.openTemplateSource` を実装する。
- [x] コマンドパレットと Tree View メニューから同じ処理を呼べるようにする。

## 7. 適用計画

- [x] `templateApplier.ts` を作成する。
- [x] テンプレートセットから作成予定ファイル一覧を生成する。
- [x] ディレクトリ作成計画を生成する。
- [x] 既存ファイルとの衝突を検出する。
- [x] バイナリファイル判定を実装する。
- [x] 適用計画をテスト可能な純粋ロジックとして分離する。
- [x] 適用計画のユニットテストを追加する。

## 8. 衝突解決

- [x] `ConflictAction` 型を定義する。
- [x] `ask`, `skip`, `overwrite`, `rename`, `cancel` を扱う。
- [x] 設定 `templater.defaultConflictAction` を反映する。
- [x] `ask` の場合に Quick Pick で選択できるようにする。
- [x] Rename 時の suffix を設定から読む。
- [x] 複数衝突時の一括選択を検討し、MVP では最低限の逐次選択を実装する。
- [x] 衝突解決のユニットテストを追加する。

## 9. 変数置換

- [x] `variableResolver.ts` を作成する。
- [x] `workspaceName`, `date`, `year` を組み込み変数として実装する。
- [x] `template.json` の variables を読み取る。
- [x] 必須変数の入力 UI を実装する。
- [x] default 値内の組み込み変数を解決する。
- [x] テキストファイルに対して `{{name}}` 形式の置換を行う。
- [x] バイナリファイルでは置換を行わない。
- [x] 変数置換のユニットテストを追加する。

## 10. ファイル適用

- [x] ワークスペース未選択時のエラーを実装する。
- [x] ディレクトリ作成を実装する。
- [x] 新規ファイル作成を実装する。
- [x] Skip 処理を実装する。
- [x] Overwrite 処理を実装する。
- [x] Rename 処理を実装する。
- [x] 適用結果の集計を実装する。
- [x] Output Channel に詳細ログを出す。
- [x] 適用処理の統合テストを追加する。

## 11. プレビューと差分

- [x] テンプレートセットのファイル一覧プレビューを実装する。
- [x] テンプレートファイルを読み取り専用で開けるようにする。
- [x] 衝突ファイルの diff editor 表示コマンドを実装する。
- [x] 一時ファイルまたは `TextDocumentContentProvider` を使ってテンプレート側の内容を表示する。
- [x] プレビュー関連の手動確認手順を README に追記する。

## 12. 品質とリリース準備

- [x] 主要ロジックのユニットテストを通す。
- [ ] VS Code 拡張の統合テストを通す。
- [x] `npm run lint` を通す。
- [x] `npm run test` を通す。
- [x] サンプルテンプレートを `examples/` に追加する。
- [x] README にスクリーンショットまたは操作例を追加する。
- [x] CHANGELOG を作成する。
- [x] 拡張機能パッケージング手順を確認する。

## 13. MVP 完了条件

- [x] ユーザーがローカルテンプレートソースを追加できる。
- [x] Tree View にテンプレートセットが表示される。
- [x] テンプレートセットを現在のワークスペースへ適用できる。
- [x] 既存ファイル衝突時に安全に処理方針を選べる。
- [x] `{{workspaceName}}` などの基本変数が置換される。
- [x] 主要処理にテストがある。
- [x] README を読めば基本利用手順が分かる。
