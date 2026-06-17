# 泓利廣實驗室系統 — API Endpoint 清單

Stack：Node.js + Express + PostgreSQL (Prisma) Base URL：`/api/v1` 認證方式：JWT Bearer Token（除登入/註冊外，所有 API 需帶 `Authorization: Bearer <token>`）

---

## 權限說明

| 角色 | 代碼 |
| :---- | :---- |
| 管理員 | `ADMIN` |
| 實驗室人員 | `LAB_STAFF` |
| 經理 | `MANAGER` |

---

## 0. 帳密管理

### 0.1 登入

POST /api/v1/auth/login

Request Body：

```json
{
  "email": "user@example.com",
  "password": "string"
}
```

Response：

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "LAB_STAFF"
  }
}
```

---

### 0.2 登出

POST /api/v1/auth/logout

前端清除 token 即可，後端可選擇加入 token 黑名單

---

### 0.3 註冊（僅 ADMIN 可操作）

POST /api/v1/auth/register

Request Body：

```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "LAB_STAFF | MANAGER | ADMIN"
}
```

---

### 0.4 忘記密碼

POST /api/v1/auth/forgot-password

Request Body：

```json
{ "email": "user@example.com" }
```

後端寄送重設連結至信箱，連結含 resetToken

---

### 0.5 重設密碼

POST /api/v1/auth/reset-password

Request Body：

```json
{
  "token": "RESET_TOKEN",
  "newPassword": "string"
}
```

---

### 0.6 修改密碼（已登入）

PATCH /api/v1/auth/change-password

Request Body：

```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

---

### 0.7 取得目前登入使用者資訊

GET /api/v1/auth/me

---

### 0.8 取得所有使用者（ADMIN）

GET /api/v1/users

Query Params：`role`, `isActive`, `page`, `limit`

---

### 0.9 更新使用者權限（ADMIN）

PATCH /api/v1/users/:id

Request Body：

```json
{
  "role": "MANAGER",
  "isActive": true
}
```

---

## 1. 配方管理

### 1.1 新增配方

POST /api/v1/formulas

權限：`ADMIN`, `LAB_STAFF`

Request Body：

```json
{
  "code": "F-2024-001",
  "name": "配方名稱",
  "productType": "產品類型",
  "description": "說明",
  "ingredients": [
    { "ingredientId": 1, "ratio": 30.5, "unit": "%" },
    { "ingredientId": 2, "ratio": 20.0, "unit": "%" }
  ]
}
```

---

### 1.2 修改配方

PUT /api/v1/formulas/:id

權限：`ADMIN`, `LAB_STAFF`

修改時自動建立新版本紀錄（`formula_versions`），`currentVersion` +1

Request Body：

```json
{
  "name": "新名稱",
  "productType": "新類型",
  "description": "新說明",
  "changeNote": "調整成分比例",
  "ingredients": [
    { "ingredientId": 1, "ratio": 25.0, "unit": "%" }
  ]
}
```

---

### 1.3 刪除（停用）配方

DELETE /api/v1/formulas/:id

權限：`ADMIN`

軟刪除，將 `status` 改為 `DELETED`，不實際刪除資料

---

### 1.4 查詢配方列表

GET /api/v1/formulas

Query Params：

| 參數 | 說明 |
| :---- | :---- |
| `name` | 配方名稱（模糊搜尋） |
| `productType` | 產品類型 |
| `status` | `ACTIVE` / `INACTIVE` / `DELETED` |
| `page` | 頁碼（預設 1） |
| `limit` | 每頁筆數（預設 20） |

---

### 1.5 取得單一配方

GET /api/v1/formulas/:id

---

### 1.6 取得配方成分

GET /api/v1/formulas/:id/ingredients

---

### 1.7 取得配方版本歷史

GET /api/v1/formulas/:id/versions

---

### 1.8 取得特定版本內容

GET /api/v1/formulas/:id/versions/:version

---

### 原料管理（配合 1.6）

#### 取得原料列表

GET /api/v1/ingredients

Query Params：`name`, `page`, `limit`

#### 取得單一原料

GET /api/v1/ingredients/:id

#### 新增原料

POST /api/v1/ingredients

權限：`ADMIN`, `LAB_STAFF`

Request Body：

```json
{
  "name": "原料名稱",
  "unit": "g",
  "description": "說明"
}
```

#### 修改原料

PUT /api/v1/ingredients/:id

權限：`ADMIN`, `LAB_STAFF`

Request Body：

```json
{
  "name": "原料名稱",
  "unit": "g",
  "description": "說明"
}
```

#### 刪除原料

DELETE /api/v1/ingredients/:id

權限：`ADMIN`

---

## 2. 實驗操作管理

### 2.1 建立實驗紀錄

POST /api/v1/experiments

權限：`ADMIN`, `LAB_STAFF`

Request Body：

```json
{
  "code": "EXP-2024-001",
  "formulaId": 1,
  "experimentDate": "2024-06-17T09:00:00Z",
  "temperature": 25.5,
  "humidity": 60.0,
  "notes": "備註"
}
```

---

### 2.2 更新實驗環境資料

PATCH /api/v1/experiments/:id

權限：`ADMIN`, `LAB_STAFF`

Request Body：

```json
{
  "temperature": 26.0,
  "humidity": 58.5,
  "notes": "更新備註"
}
```

---

### 2.3 新增實驗步驟

POST /api/v1/experiments/:id/steps

Request Body：

```json
{
  "steps": [
    { "stepOrder": 1, "description": "步驟一說明" },
    { "stepOrder": 2, "description": "步驟二說明" }
  ]
}
```

#### 取得實驗步驟

GET /api/v1/experiments/:id/steps

#### 更新單一步驟

PATCH /api/v1/experiments/:id/steps/:stepId

Request Body：

```json
{
  "description": "更新後步驟說明"
}
```

#### 刪除單一步驟

DELETE /api/v1/experiments/:id/steps/:stepId

---

### 2.4 查詢實驗列表

GET /api/v1/experiments

Query Params：

| 參數 | 說明 |
| :---- | :---- |
| `formulaId` | 配方 ID |
| `experimenterId` | 實驗人員 ID |
| `dateFrom` | 開始日期 |
| `dateTo` | 結束日期 |
| `page` | 頁碼 |
| `limit` | 每頁筆數 |

#### 取得單一實驗（含步驟、附件）

GET /api/v1/experiments/:id

---

### 2.5 上傳實驗附件

POST /api/v1/experiments/:id/attachments

Content-Type：`multipart/form-data`

Form Fields：

- `file`：圖片或影片檔案
- `fileType`：`image` | `video`

#### 刪除附件

DELETE /api/v1/experiments/:id/attachments/:attachmentId

---

### 2.6 樣品管理

#### 新增樣品

POST /api/v1/experiments/:id/samples

Request Body：

```json
{
  "sampleCode": "SMP-001",
  "clientName": "客戶名稱",
  "label": "標籤說明",
  "targetItem": "目標原料項目",
  "sampleDate": "2024-06-17",
  "notes": "備註"
}
```

#### 更新樣品

PATCH /api/v1/experiments/:id/samples/:sampleId

Request Body：

```json
{
  "clientName": "客戶名稱",
  "label": "標籤說明",
  "targetItem": "目標原料項目",
  "notes": "備註"
}
```

#### 上傳樣品照片

POST /api/v1/experiments/:id/samples/:sampleId/photo

Content-Type：`multipart/form-data`

#### 取得樣品列表

GET /api/v1/experiments/:id/samples

#### 取得單一樣品

GET /api/v1/experiments/:id/samples/:sampleId

#### 刪除樣品

DELETE /api/v1/experiments/:id/samples/:sampleId

---

## 3. 實驗結果管理

### 3.1 建立實驗結果

POST /api/v1/experiments/:id/result

權限：`ADMIN`, `LAB_STAFF`

Request Body：

```json
{
  "status": "SUCCESS | FAILED | OBSERVING | NEEDS_ADJUST",
  "description": "結果說明",
  "reflection": "實驗心得",
  "issueRecord": "問題紀錄",
  "improvement": "改善建議",
  "clientFeedback": "客戶回饋",
  "notes": "備註"
}
```

---

### 3.2 修改實驗結果

PUT /api/v1/experiments/:id/result

Request Body：（同上，帶要更新的欄位）

---

### 3.3 上傳結果附件

POST /api/v1/experiments/:id/result/attachments

Content-Type：`multipart/form-data`

Form Fields：

- `file`：圖片或影片檔案
- `fileType`：`image` | `video`

#### 刪除結果附件

DELETE /api/v1/experiments/:id/result/attachments/:attachmentId

---

### 3.4 查詢實驗結果列表

GET /api/v1/results

Query Params：

| 參數 | 說明 |
| :---- | :---- |
| `experimentCode` | 實驗編碼 |
| `formulaName` | 配方名稱（模糊） |
| `status` | `SUCCESS` / `FAILED` / `OBSERVING` / `NEEDS_ADJUST` |
| `experimenterId` | 實驗人員 ID |
| `dateFrom` | 開始日期 |
| `dateTo` | 結束日期 |
| `page` | 頁碼 |
| `limit` | 每頁筆數 |

#### 取得單一實驗完整結果

GET /api/v1/experiments/:id/result

---

## 4. 報表功能

### 4.1 實驗紀錄報表

GET /api/v1/reports/experiments

權限：`ADMIN`, `MANAGER`, `LAB_STAFF`

Query Params：

| 參數 | 說明 |
| :---- | :---- |
| `formulaId` | 配方 ID |
| `experimenterId` | 實驗人員 ID |
| `dateFrom` | 開始日期 |
| `dateTo` | 結束日期 |
| `page` | 頁碼 |
| `limit` | 每頁筆數 |

Response：彙整實驗基本資料（編號、配方、人員、日期、環境條件）與操作步驟摘要

---

### 4.2 配方使用報表

GET /api/v1/reports/formulas/usage

權限：`ADMIN`, `MANAGER`

Query Params：

| 參數 | 說明 |
| :---- | :---- |
| `dateFrom` | 開始日期 |
| `dateTo` | 結束日期 |
| `productType` | 產品類型 |

Response：

```json
{
  "success": true,
  "data": [
    {
      "formulaId": 1,
      "formulaCode": "F-2024-001",
      "formulaName": "配方名稱",
      "productType": "產品類型",
      "usageCount": 12,
      "successCount": 8,
      "failedCount": 2,
      "observingCount": 2
    }
  ]
}
```

---

### 4.3 實驗結果統計報表

GET /api/v1/reports/results/summary

權限：`ADMIN`, `MANAGER`

Query Params：

| 參數 | 說明 |
| :---- | :---- |
| `dateFrom` | 開始日期 |
| `dateTo` | 結束日期 |
| `formulaId` | 配方 ID |
| `experimenterId` | 實驗人員 ID |

Response：

```json
{
  "success": true,
  "data": {
    "total": 100,
    "successCount": 60,
    "failedCount": 15,
    "observingCount": 10,
    "needsAdjustCount": 15,
    "successRate": "60%"
  }
}
```

---

### 4.4 條件式查詢報表

GET /api/v1/reports/custom

權限：`ADMIN`, `MANAGER`, `LAB_STAFF`

Query Params：

| 參數 | 說明 |
| :---- | :---- |
| `type` | `experiment` / `formula` / `result` |
| `formulaId` | 配方 ID |
| `experimenterId` | 實驗人員 ID |
| `dateFrom` | 開始日期 |
| `dateTo` | 結束日期 |
| `status` | 結果狀態 |
| `productType` | 產品類型 |
| `page` | 頁碼 |
| `limit` | 每頁筆數 |

---

### 4.5 匯出報表

#### 匯出 Excel

GET /api/v1/reports/export/excel

權限：`ADMIN`, `MANAGER`

Query Params：（同 4.4 條件式查詢參數）

Response：`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

#### 匯出 PDF

GET /api/v1/reports/export/pdf

權限：`ADMIN`, `MANAGER`

Query Params：（同 4.4 條件式查詢參數）

Response：`Content-Type: application/pdf`

---

## 統一回應格式

### 成功

```json
{
  "success": true,
  "data": { },
  "message": "操作成功"
}
```

### 分頁列表

```json
{
  "success": true,
  "data": [ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 錯誤

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "權限不足"
  }
}
```

---

## 常見 HTTP 狀態碼

| 狀態碼 | 說明 |
| :---- | :---- |
| `200` | 成功 |
| `201` | 建立成功 |
| `400` | 請求格式錯誤 |
| `401` | 未登入 / token 過期 |
| `403` | 權限不足 |
| `404` | 資源不存在 |
| `409` | 資料衝突（如重複 code） |
| `500` | 伺服器錯誤 |
