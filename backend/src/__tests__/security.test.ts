/**
 * 涵蓋本次稽核修正的回歸測試。
 *
 * 每一項都對應一個曾經存在的缺陷，避免日後改動時再度退回。
 * 需要可連線的資料庫與已建立的 lab@test.com 種子帳號。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../index'
import prisma from '../db/client'

const API = '/api/v1'
let labToken = ''

beforeAll(async () => {
  const res = await request(app)
    .post(`${API}/auth/login`)
    .send({ email: 'lab@test.com', password: 'lab123' })
  labToken = res.body?.data?.token ?? ''
  if (!labToken) throw new Error('測試前置失敗：無法以 lab@test.com 登入')
})

const auth = () => ({ Authorization: `Bearer ${labToken}` })

describe('認證', () => {
  it('未帶 token 時拒絕存取', async () => {
    const res = await request(app).get(`${API}/qc-daily-logs`)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('偽造的 token 會被拒絕', async () => {
    const res = await request(app)
      .get(`${API}/qc-daily-logs`)
      .set('Authorization', 'Bearer not-a-real-token')
    expect(res.status).toBe(401)
  })

  it('公開註冊預設關閉', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ username: 'x', email: `t${Date.now()}@test.com`, password: 'password123' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('REGISTER_DISABLED')
  })

  it('帳號不存在與密碼錯誤回傳相同訊息（不洩漏帳號是否存在）', async () => {
    const a = await request(app).post(`${API}/auth/login`)
      .send({ email: 'lab@test.com', password: 'wrong-password' })
    const b = await request(app).post(`${API}/auth/login`)
      .send({ email: 'definitely-not-exists@test.com', password: 'wrong-password' })
    expect(a.status).toBe(b.status)
    expect(a.body.error.message).toBe(b.body.error.message)
  })
})

describe('參數驗證', () => {
  it('非數字 ID 回 400 而非 500', async () => {
    const res = await request(app).get(`${API}/qc-daily-logs/abc`).set(auth())
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_ID')
  })

  it('負數 ID 回 400', async () => {
    const res = await request(app).get(`${API}/qc-daily-logs/-1`).set(auth())
    expect(res.status).toBe(400)
  })

  it('分頁筆數受上限箝制', async () => {
    const res = await request(app).get(`${API}/qc-daily-logs?limit=999999`).set(auth())
    expect(res.status).toBe(200)
    expect(res.body.pagination.limit).toBeLessThanOrEqual(200)
  })

  it('非法 page 退回第 1 頁而非造成錯誤', async () => {
    const res = await request(app).get(`${API}/qc-daily-logs?page=abc`).set(auth())
    expect(res.status).toBe(200)
    expect(res.body.pagination.page).toBe(1)
  })
})

describe('權限矩陣', () => {
  it('LAB_STAFF 依矩陣設定無法刪除表單', async () => {
    const res = await request(app).delete(`${API}/qc-daily-logs/1`).set(auth())
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('LAB_STAFF 可讀取表單列表', async () => {
    const res = await request(app).get(`${API}/qc-daily-logs`).set(auth())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('表單更新不得遺失資料', () => {
  let createdId = 0

  it('建立含多個欄位的紀錄', async () => {
    const res = await request(app).post(`${API}/qc-daily-logs`).set(auth()).send({
      logDate: '2025-08-01',
      section1: [{ no: 1, chemCode: 'AAA' }],
      section2: [{ no: 2, chemCode: 'BBB' }],
      section3: [{ no: 3, chemCode: 'CCC' }],
      section4: '備註內容',
    })
    expect(res.status).toBe(201)
    createdId = res.body.data.id
    expect(createdId).toBeGreaterThan(0)
  })

  it('只更新單一欄位時，其他欄位必須保留', async () => {
    const upd = await request(app).put(`${API}/qc-daily-logs/${createdId}`).set(auth())
      .send({ section1: [{ no: 1, chemCode: '已修改' }] })
    expect(upd.status).toBe(200)

    const got = await request(app).get(`${API}/qc-daily-logs/${createdId}`).set(auth())
    const d = got.body.data
    expect(d.section1[0].chemCode).toBe('已修改')
    expect(d.section2).not.toBeNull()
    expect(d.section3).not.toBeNull()
    expect(d.section4).toBe('備註內容')
  })

  it('清理測試資料', async () => {
    await prisma.qcDailyLog.delete({ where: { id: createdId } })
    const got = await request(app).get(`${API}/qc-daily-logs/${createdId}`).set(auth())
    expect(got.status).toBe(404)
  })
})

describe('曾經崩潰的端點', () => {
  // 實驗可以不綁定配方，先前 e.formula.name 會在這種資料上拋 TypeError
  it('報表端點正常回應', async () => {
    const res = await request(app).get(`${API}/reports/experiments`).set(auth())
    expect(res.status).toBe(200)
  })

  it('實驗結果端點正常回應', async () => {
    const res = await request(app).get(`${API}/results`).set(auth())
    expect(res.status).toBe(200)
  })
})

describe('安全性設定', () => {
  it('回應帶有 helmet 安全標頭', async () => {
    const res = await request(app).get(`${API}/health`)
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBeDefined()
  })

  it('簽核數量為批次端點，需要 formType', async () => {
    const res = await request(app).get(`${API}/form-signatures/counts`).set(auth())
    expect(res.status).toBe(400)
  })
})

describe('提醒與儀表板', () => {
  it('提醒明細包含分類與嚴重程度', async () => {
    const res = await request(app).get(`${API}/dashboard/alerts`).set(auth())
    expect(res.status).toBe(200)
    const { items, counts, total } = res.body.data
    expect(Array.isArray(items)).toBe(true)
    expect(total).toBe(items.length)
    // 每項都要有可導向的連結與可辨識的分類
    for (const i of items) {
      expect(i.link).toBeTruthy()
      expect(['lowStock', 'expired', 'expiring', 'retention', 'pendingSignature']).toContain(i.category)
      expect(['critical', 'warning', 'info']).toContain(i.severity)
      // 必須回傳 i18n key 與參數，不可回傳組好的句子——否則無法隨介面語系切換
      expect(i.titleKey).toMatch(/^alertItem\./)
      expect(i.detailKey).toMatch(/^alertItem\./)
      expect(i.title).toBeUndefined()
      expect(i.detail).toBeUndefined()
    }
    // counts 與實際項目數一致
    const recount: Record<string, number> = {}
    for (const i of items) recount[i.category] = (recount[i.category] ?? 0) + 1
    for (const [k, v] of Object.entries(counts)) {
      expect(v).toBe(recount[k] ?? 0)
    }
  })

  it('提醒依嚴重程度排序，critical 在最前', async () => {
    const res = await request(app).get(`${API}/dashboard/alerts`).set(auth())
    const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    const seq = res.body.data.items.map((i: { severity: string }) => rank[i.severity])
    expect(seq).toEqual([...seq].sort((a: number, b: number) => a - b))
  })

  it('count 端點與明細數量一致', async () => {
    const [detail, count] = await Promise.all([
      request(app).get(`${API}/dashboard/alerts`).set(auth()),
      request(app).get(`${API}/dashboard/alerts/count`).set(auth()),
    ])
    expect(count.body.data.total).toBe(detail.body.data.total)
  })

  it('儀表板統計回傳完整結構', async () => {
    const res = await request(app).get(`${API}/dashboard/summary`).set(auth())
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(typeof d.experiments.thisMonth).toBe('number')
    expect(typeof d.totals.formulas).toBe('number')
    expect(Array.isArray(d.recentExperiments)).toBe(true)
    // 成功率無已判定實驗時為 null，不可誤報為 0
    expect(d.experiments.successRate === null || typeof d.experiments.successRate === 'number').toBe(true)
  })

  it('未登入無法取得提醒', async () => {
    const res = await request(app).get(`${API}/dashboard/alerts`)
    expect(res.status).toBe(401)
  })
})

describe('全域查詢', () => {
  it('查詢字串過短時不回傳結果', async () => {
    const res = await request(app).get(`${API}/search?q=R`).set(auth())
    expect(res.status).toBe(200)
    expect(res.body.data.hits).toEqual([])
  })

  it('可跨模組找到資料', async () => {
    const res = await request(app).get(`${API}/search`).query({ q: 'RC' }).set(auth())
    expect(res.status).toBe(200)
    expect(res.body.data.hits.length).toBeGreaterThan(0)
  })

  it('每筆結果都有導向連結與命中欄位 key', async () => {
    const res = await request(app).get(`${API}/search`).query({ q: 'RC' }).set(auth())
    for (const h of res.body.data.hits) {
      expect(h.link).toBeTruthy()
      expect(['formula', 'ingredient', 'experiment', 'sample', 'supplier', 'knowledge'])
        .toContain(h.type)
      // 命中欄位須為 i18n key，不可回傳中文標籤
      if (h.matchedFieldKey) expect(h.matchedFieldKey).toMatch(/^searchField\./)
    }
  })

  it('每個類別的回傳筆數有上限，避免單一類別洗版', async () => {
    const res = await request(app).get(`${API}/search`).query({ q: 'a' + '' }).set(auth())
    const byType: Record<string, number> = {}
    for (const h of res.body.data.hits) byType[h.type] = (byType[h.type] ?? 0) + 1
    for (const n of Object.values(byType)) expect(n).toBeLessThanOrEqual(5)
  })

  it('未登入無法查詢', async () => {
    const res = await request(app).get(`${API}/search?q=RC`)
    expect(res.status).toBe(401)
  })
})
