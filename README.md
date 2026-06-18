# 泓利廣實驗室管理系統

專為實驗室設計的全功能管理平台，涵蓋配方版本控管、實驗流程追蹤、原物料庫存、供應商管理、風險評估及報表匯出。

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端框架 | React 19 + Vite + TypeScript |
| UI 元件庫 | Ant Design 6 |
| 前端狀態管理 | Zustand |
| 前端路由 | React Router v7 |
| 拖曳排序 | dnd-kit |
| 後端框架 | Node.js + Express |
| ORM | Prisma 5 |
| 資料庫 | PostgreSQL（Supabase 雲端）|
| 檔案儲存 | Supabase Storage |
| 認證 | JWT Bearer Token（7 天效期）|
| 報表匯出 | jsPDF + jspdf-autotable（PDF）、xlsx（Excel）|

---

## 功能模組

| 模組 | 功能說明 |
|------|---------|
| **帳號管理** | 登入 / 登出 / 自行註冊（LAB_STAFF）/ 管理員建立帳號（任意角色）/ 修改密碼 |
| **使用者管理** | 管理員查看所有使用者、啟用/停用帳號、變更角色 |
| **配方管理** | 新增 / 編輯 / 查詢配方、原料比例管理、版本歷史紀錄 |
| **實驗管理** | 建立實驗、環境條件（溫度/濕度）、步驟拖曳排序、附件上傳（圖片/影片/PDF/Excel）、附件下載 |
| **樣品管理** | 實驗內樣品 CRUD、樣品照片上傳、樣品附件管理、樣品詳情 Drawer（支援檢視與編輯）|
| **實驗結果** | 建立/修改結果（狀態、心得、問題紀錄、改善建議、客戶回饋）、結果附件上傳 |
| **原物料管理** | 原料維護、庫存管理、安全庫存警示、出入庫紀錄 |
| **供應商管理** | 供應商資料維護、供應商評鑑、採購紀錄（管理員限定新增/編輯/刪除）|
| **風險管理** | 配方風險評估、原料風險評估、異常事件管理（回報/處理/關閉）、風險總覽儀表板 |
| **報表** | 實驗統計、配方統計、結果分析、Excel & PDF 匯出（含中文支援）|
| **個人設定** | 側邊欄設定選單：查看個人資料、修改密碼 |

---

## 目錄結構

```
Hooong/
├── backend/                    # Express 後端
│   ├── prisma/
│   │   └── schema.prisma       # 資料庫 Schema
│   ├── src/
│   │   ├── db/
│   │   │   ├── client.ts       # Prisma Client
│   │   │   ├── seed.ts         # 初始資料
│   │   │   └── storage.ts      # Supabase Storage 工具
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT 認證 middleware
│   │   ├── routes/             # API 路由
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── formulas.ts
│   │   │   ├── ingredients.ts
│   │   │   ├── experiments.ts
│   │   │   ├── results.ts
│   │   │   ├── materials.ts
│   │   │   ├── suppliers.ts
│   │   │   ├── risks.ts
│   │   │   └── reports.ts
│   │   └── index.ts            # 伺服器進入點
│   ├── .env                    # 環境變數（不進 git）
│   └── package.json
│
└── frontend/                   # React 前端
    ├── src/
    │   ├── api/                # 後端 API 呼叫函式
    │   ├── layouts/            # AppLayout（側邊欄 + Header）
    │   ├── pages/              # 各功能頁面
    │   │   ├── auth/           # 登入 / 註冊 / 忘記密碼
    │   │   ├── experiments/    # 實驗管理
    │   │   ├── formulas/       # 配方管理
    │   │   ├── materials/      # 原物料管理
    │   │   ├── suppliers/      # 供應商管理
    │   │   ├── risks/          # 風險管理
    │   │   ├── results/        # 實驗結果
    │   │   ├── reports/        # 報表
    │   │   └── users/          # 使用者管理
    │   ├── stores/             # Zustand 狀態（authStore）
    │   ├── types/              # TypeScript 型別定義
    │   ├── utils/              # 工具函式（download, exportPdf）
    │   └── App.tsx             # 路由設定
    └── package.json
```

---

## 環境設定

### 後端 `backend/.env`

```env
# Supabase PostgreSQL
DATABASE_URL="postgresql://<user>:<password>@<host>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://<user>:<password>@<host>:5432/postgres"

# JWT
JWT_SECRET="your-jwt-secret"

# Supabase Storage
SUPABASE_URL="https://<project>.supabase.co"
SUPABASE_SERVICE_KEY="your-supabase-service-key"

# 伺服器
PORT=3000
```

> `SUPABASE_URL` 與 `SUPABASE_SERVICE_KEY` 用於圖片 / 附件儲存，可在 Supabase 後台 Settings → API 取得。

---

## 安裝與啟動

### 1. 安裝相依套件

```bash
# 後端
cd backend && npm install

# 前端
cd frontend && npm install
```

### 2. 初始化資料庫

```bash
cd backend

# 同步 Schema 到資料庫（開發用）
npm run db:push

# 建立初始資料（管理員帳號等）
npm run db:seed
```

### 3. 啟動開發伺服器

```bash
# 後端（port 3000）
cd backend && npm run dev

# 前端（port 5173）
cd frontend && npm run dev
```

前端會透過 Vite proxy 將 `/api` 請求轉發到 `http://localhost:3000`。

### 4. 正式環境建置

```bash
# 後端
cd backend && npm run build && npm start

# 前端
cd frontend && npm run build
# 產出在 frontend/dist/，部署到靜態伺服器
```

---

## 預設帳號

執行 `npm run db:seed` 後會建立：

| 帳號 | 密碼 | 角色 |
|------|------|------|
| `admin@hooong.com` | `Admin123!` | 管理員 |

---

## 角色權限

| 角色 | 代碼 | 說明 |
|------|------|------|
| 管理員 | `ADMIN` | 完整操作權限，含使用者管理 |
| 實驗室人員 | `LAB_STAFF` | 配方、實驗、結果的新增與修改 |
| 經理 | `MANAGER` | 僅查閱權限 |

> 一般使用者自行註冊後預設為 `LAB_STAFF`，需由管理員啟用帳號。

---

## API 路由總覽

Base URL：`/api/v1`

除 `/auth/login`、`/auth/register`、`/auth/forgot-password` 外，所有請求需帶：
```
Authorization: Bearer <token>
```

| 前綴 | 模組 |
|------|------|
| `/api/v1/auth` | 登入 / 登出 / 註冊 / 修改密碼 |
| `/api/v1/users` | 使用者管理 |
| `/api/v1/formulas` | 配方管理 |
| `/api/v1/ingredients` | 原料管理 |
| `/api/v1/experiments` | 實驗 / 步驟 / 附件 / 樣品 |
| `/api/v1/results` | 實驗結果查詢 |
| `/api/v1/materials` | 原物料庫存 |
| `/api/v1/suppliers` | 供應商 / 評鑑 / 採購 |
| `/api/v1/evaluations` | 供應商評鑑 |
| `/api/v1/purchases` | 採購紀錄 |
| `/api/v1/risks` | 風險評估 / 異常事件 |
| `/api/v1/reports` | 報表統計 |
| `/api/v1/health` | 健康檢查 |

---

## 資料庫 Schema 總覽

```
User                 使用者帳號（角色：ADMIN / LAB_STAFF / MANAGER）
├── Experiment       實驗紀錄
│   ├── ExperimentStep    實驗步驟
│   ├── Sample            樣品
│   │   └── Attachment    樣品附件
│   ├── Attachment        實驗附件
│   └── ExperimentResult  實驗結果
│       └── Attachment    結果附件
├── Formula          配方
│   ├── FormulaIngredient 配方原料比例
│   └── FormulaVersion    配方版本歷史
└── Ingredient       原料
    └── MaterialInventory 庫存
        └── MaterialTransaction 出入庫紀錄

Supplier             供應商
├── SupplierEvaluation   供應商評鑑
└── PurchaseRecord       採購紀錄

FormulaRisk          配方風險評估
IngredientRisk       原料風險評估
AbnormalEvent        異常事件
```

---

## 常用指令

```bash
# 開啟 Prisma Studio（資料庫視覺化介面）
cd backend && npm run db:studio

# 重新產生 Prisma Client（修改 schema 後執行）
cd backend && npx prisma generate

# 前端型別檢查
cd frontend && npx tsc --noEmit
```
