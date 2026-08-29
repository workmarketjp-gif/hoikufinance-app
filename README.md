# Hoiku Finance

保育園の毎日の出納から、月次・決算・経営情報報告までをつなぐ会計管理アプリです。

## Initial scope

- 会計ダッシュボード
- 現金出納帳 / 預金出納帳 / 収入簿 / 支出簿
- 請求・入金 / 未収管理
- 公定価格・加算の収支確認
- 月次締め / 決算書作成
  - 社会福祉法人会計
  - 企業会計
- ここdeサーチ向け経営情報報告の確認・出力UI
- 証憑・監査
- Hoiku Office / Market / Color へのサービス動線
- PC / smartphone responsive UI

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Important

現在の画面内数値はUI確認用サンプルです。次段階でHoiku Officeの既存会計データモデル、Supabase、認証、施設/法人テナント、給与連携、制度・公定価格エンジンを接続します。

ここdeサーチ向け機能は、現段階では公式システムへの自動送信ではなく、入力項目順に確認・転記しやすい出力を作る設計です。
