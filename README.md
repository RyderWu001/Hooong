# 泓利廣實驗室系統（Hooong Lab System）

專為實驗室設計的配方管理與實驗紀錄系統，涵蓋配方版本控管、實驗流程追蹤、結果分析與報表匯出。

---

## 技術架構

| 層級 | 技術 |
| :--- | :--- |
| 後端 | Node.js + Express |
| 資料庫 | PostgreSQL + Prisma ORM |
| 認證 | JWT Bearer Token |
| 檔案上傳 | multipart/form-data |
| 報表匯出 | Excel / PDF |

---

## 功能模組

### 第一階段

| 模組 | 功能說明 |
| :--- | :--- |
| 0. 帳密管理 | 登入、登出、註冊（ADMIN）、忘記/重設密碼、修改密碼、三角色權限管理（ADMIN / LAB_STAFF / MANAGER） |
| 1. 配方管理 | 新增/修改/刪除（軟刪除）/查詢配方、原料比例管理、版本歷史紀錄 |
| 2. 實驗操作管理 | 建立實驗（廠商編碼）、環境條件紀錄（溫度/濕度）、步驟紀錄、附件上傳、樣品管理 |
| 3. 實驗結果管理 | 建立/修改結果（含狀態、心得、問題、改善建議、客戶回饋）、附件上傳、條件查詢 |
| 4. 報表功能 | 實驗/配方/結果統計報表、條件式自訂查詢、Excel & PDF 匯出 |

### 第二階段（規劃中）

| 模組 | 功能說明 |
| :--- | :--- |
| 5. 原物料管理 | 原料維護、庫存管理、安全庫存警示、原料追溯 |
| 6. 供應商管理 | 資料維護、供應商評鑑、採購紀錄查詢 |
| 7. 風險管理 | 配方/原料風險評估、異常事件管理、風險報表 |
| 8. AI 智慧分析 | 配方推薦、實驗結果分析、圖片辨識、趨勢預測 |

---

## API 總覽

Base URL：`/api/v1`

認證方式：JWT Bearer Token（除登入/忘記密碼外，所有 API 需帶 `Authorization: Bearer <token>`）

| 前綴 | 模組 |
| :--- | :--- |
| `/api/v1/auth` | 帳密管理 |
| `/api/v1/users` | 使用者管理 |
| `/api/v1/formulas` | 配方管理 |
| `/api/v1/ingredients` | 原料管理 |
| `/api/v1/experiments` | 實驗操作管理 |
| `/api/v1/results` | 實驗結果查詢 |
| `/api/v1/reports` | 報表功能 |

完整 API 文件請參閱 [api-endpoints.md](api-endpoints.md)

---

## 角色權限

| 角色 | 代碼 | 說明 |
| :--- | :--- | :--- |
| 管理員 | `ADMIN` | 完整操作權限，含使用者管理與報表匯出 |
| 實驗室人員 | `LAB_STAFF` | 配方、實驗、結果的新增與修改 |
| 經理 | `MANAGER` | 查詢與報表查閱 |

---

## 開始使用

### 安裝

```bash
npm install
```

### 環境設定

建立 `.env` 檔案：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/hooong_lab"
JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### 初始化資料庫

```bash
npx prisma migrate dev
npx prisma db seed
```

### 啟動伺服器

```bash
# 開發模式
npm run dev

# 正式環境
npm start
```

---

## 授權

MIT License
