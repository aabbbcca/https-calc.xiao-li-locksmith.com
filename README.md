# Cloudflare Workers + D1 旅程分帳

這個專案已經從 GitHub Pages 靜態站改成 Cloudflare Workers + D1。

目標功能：

- 用旅程代碼跨裝置同步
- 每筆帳單存在 D1
- 載入同一個旅程代碼時，可以在不同裝置看到相同結果

## 專案結構

- `public/index.html`: 前端頁面
- `src/worker.js`: API 與靜態資產入口
- `migrations/0001_init.sql`: D1 資料表
- `wrangler.toml`: Workers 與 D1 設定

## 第一次設定

1. 安裝依賴

```bash
npm install
```

2. 登入 Cloudflare

```bash
npx wrangler login
```

3. 建立 D1 database

```bash
npx wrangler d1 create calc-xiao-li-locksmith
```

4. 把 Cloudflare 回傳的 `database_id` 填進 [wrangler.toml](/c:/Users/aabbb/Desktop/分帳/github-pages-calc/wrangler.toml) 的 `database_id`

5. 套用 migration

本機：

```bash
npm run db:migrate:local
```

正式環境：

```bash
npm run db:migrate:remote
```

## 本機開發

```bash
npm run dev
```

## 部署

```bash
npm run deploy
```

## 網域

部署完成後，把 Worker 綁到 `calc.xiao-li-locksmith.com`。

如果你的 DNS 已經在 Cloudflare，通常是：

1. 到 Workers 的 routes / domains 設定
2. 把 `calc.xiao-li-locksmith.com/*` 指到這個 Worker

## 安全提醒

目前版本使用「旅程代碼」作為共享識別。

也就是說：

- 知道旅程代碼的人，可以看到那個旅程的資料
- 如果你之後要更私密，我們可以再加「旅程密碼」或 Cloudflare Access
