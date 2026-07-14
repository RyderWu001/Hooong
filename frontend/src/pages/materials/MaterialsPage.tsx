import { useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  Card, Tabs, Table, Button, Modal, Form, Input, InputNumber,
  Space, Popconfirm, message, Select, DatePicker, Tag, Alert,
  Typography, Drawer, Upload, Divider, Badge, Image, Radio,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  WarningOutlined, AuditOutlined, InboxOutlined,
  FileTextOutlined, UploadOutlined, DownloadOutlined,
  InfoCircleOutlined, ExclamationCircleOutlined, CopyOutlined,
  PrinterOutlined, MedicineBoxOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload'
import dayjs from 'dayjs'
import {
  getIngredients, createIngredient, updateIngredient, deleteIngredient,
  getIngredientDocuments, uploadIngredientDocument, deleteIngredientDocument,
  getIngredientBatches, createIngredientBatch, updateIngredientBatch, deleteIngredientBatch,
  getExpiringBatches,
} from '../../api/formulas'
import {
  getInventory, createInventory, updateInventory, deleteInventory,
  adjustStock, getTransactions, getTraceability,
} from '../../api/materials'
import type {
  Ingredient, IngredientDocument, IngredientBatch,
  MaterialInventory, MaterialTransaction, MaterialTraceability, TransactionType,
} from '../../types'
import { useAuthStore } from '../../stores/authStore'
import DropdownSelect from '../../components/DropdownSelect'

const { Text } = Typography

const DOC_TYPE_OPTIONS = [
  { value: 'SDS', label: 'SDS（安全資料表）' },
  { value: 'TDS', label: 'TDS（技術資料表）' },
  { value: 'COA', label: 'COA（分析報告書）' },
  { value: 'REACH', label: 'REACH 聲明' },
  { value: 'ZDHC', label: 'ZDHC Chemcheck' },
  { value: 'EVAL_CHEM', label: '化學品評估表（CMS01-01-1B）' },
  { value: 'EVAL_REQUEST', label: '需求申請單（CMS01-01-2B）' },
  { value: 'SUPPLIER_INFO', label: '供應商資料表（CMS01-05-1A）' },
  { value: 'SUPPLIER_AUDIT', label: '供應商評鑑表（CMS01-05-2A）' },
  { value: 'OTHER', label: '其他' },
]
const DOC_TYPE_COLOR: Record<string, string> = {
  SDS: 'red', TDS: 'blue', COA: 'green', REACH: 'purple',
  ZDHC: 'geekblue', EVAL_CHEM: 'orange', EVAL_REQUEST: 'orange',
  SUPPLIER_INFO: 'cyan', SUPPLIER_AUDIT: 'cyan', OTHER: 'default',
}

function exportIngredientsCSV(data: Ingredient[]) {
  const headers = ['原料名稱', '原料代碼', '英文名稱', 'CAS No.', '原料分類', '產業分類', '狀態',
    '固含量', '密度', '外觀', '保存條件', '保存期限', '規格資訊', '單位', '單價（元）', '說明', '建立日期', '建立人員']
  const rows = data.map((r) => [
    r.name, r.code ?? '', r.englishName ?? '', r.casNo ?? '',
    r.category ?? '', r.industry ?? '', r.status,
    r.solidContent ?? '', r.density ?? '', r.appearance ?? '',
    r.storageCondition ?? '', r.shelfLife ?? '',
    r.packageSpec ?? '', r.unit, r.unitPrice ?? '', r.description,
    dayjs(r.createdAt).format('YYYY-MM-DD'), r.createdByName ?? '',
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `原料清單_${dayjs().format('YYYYMMDD')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const BATCH_STATUS_COLOR: Record<string, string> = { 正常: 'green', 異常: 'orange', 報廢: 'red' }

// ── 附件2: 進料品質檢驗 QC 報告 ───────────────────────────────────────────────

const QC_ITEMS_DEFAULT = [
  { item: '外觀',       supplierStd: '', actualValue: '', confirmedValue: '', result: 'OK', equipment: '目視' },
  { item: '固成分',     supplierStd: '', actualValue: '', confirmedValue: '', result: 'OK', equipment: '3g×105℃×2hr' },
  { item: 'PH(1%)',    supplierStd: '', actualValue: '', confirmedValue: '', result: 'OK', equipment: 'PH計' },
  { item: '比重',       supplierStd: '', actualValue: '', confirmedValue: '', result: 'OK', equipment: '比重計' },
  { item: '醣度',       supplierStd: '', actualValue: '', confirmedValue: '', result: 'OK', equipment: '醣度計 % BRIX' },
  { item: '黏度(cps)', supplierStd: '', actualValue: '', confirmedValue: '', result: 'OK', equipment: '黏度計 CPS' },
  { item: '導電度(mmho/cm)', supplierStd: '', actualValue: '', confirmedValue: '', result: 'OK', equipment: '導電度計' },
  { item: 'COD(mg/L)', supplierStd: '', actualValue: '', confirmedValue: '', result: 'OK', equipment: 'COD測試儀' },
]

type QCItem = typeof QC_ITEMS_DEFAULT[number]

// 雙語對照表（列印用）
const QC_ITEM_VI: Record<string, { zh: string; vi: string }> = {
  '外觀':              { zh: '外觀',        vi: 'NGOẠI QUAN' },
  '固成分':            { zh: '固成分',      vi: 'NỒNG ĐỘ TP' },
  'PH(1%)':           { zh: 'PH (1%)',     vi: '' },
  '比重':              { zh: '比重',        vi: 'TỶ TRỌNG' },
  '醣度':              { zh: '醣度',        vi: 'ĐỘ ĐƯỜNG' },
  '黏度(cps)':         { zh: '黏度',        vi: 'ĐỘ NHỚT' },
  '導電度(mmho/cm)':   { zh: '導電度 (1%)', vi: 'ĐỘ DẪN ĐIỆN' },
  'COD(mg/L)':        { zh: 'COD',         vi: '' },
}
const QC_EQUIP_VI: Record<string, { zh: string; vi: string }> = {
  '目視':              { zh: '目視',            vi: 'QUAN SÁT' },
  '3g×105℃×2hr':     { zh: '3g*105℃*2 hr',   vi: '' },
  'PH計':              { zh: 'PH 計',           vi: 'MÁY ĐO PH' },
  '比重計':            { zh: '比重 計',          vi: 'TỶ TRỌNG KẾ' },
  '醣度計 % BRIX':     { zh: '醣度 計',         vi: '% BRIX' },
  '黏度計 CPS':        { zh: '黏度 計',         vi: 'CPS' },
  '導電度計':          { zh: '導電度計',         vi: 'MÁY ĐO ĐỘ DẪN ĐIỆN' },
  'COD測試儀':         { zh: 'COD測試儀',        vi: 'MÁY ĐO COD' },
}
const QC_ITEM_UNIT: Record<string, string> = {
  '黏度(cps)':       'cps',
  '導電度(mmho/cm)': 'mmho/cm',
  'COD(mg/L)':      'mg/L',
}

function printQCReport(
  batch: IngredientBatch,
  ingredient: Ingredient,
  acceptanceNo: string,
  orderDate: string,
  qcItems: QCItem[],
  qcNotes: string,
  photoAppearanceUrl: string | null,
  photoSolidUrl: string | null,
  sigSupervisor: string | null,
  sigReviewer: string | null,
  sigInspector: string | null,
) {
  const arrivalStr = batch.arrivalDate ? dayjs(batch.arrivalDate).format('YYYY-MM-DD') : ''

  const rows = qcItems.map(r => {
    const itemBi  = QC_ITEM_VI[r.item]  ?? { zh: r.item,      vi: '' }
    const equipBi = QC_EQUIP_VI[r.equipment] ?? { zh: r.equipment, vi: '' }
    const unit    = QC_ITEM_UNIT[r.item] ?? ''
    const valCell = (v: string) => unit
      ? `${v}<div style="font-size:9px;color:#777;margin-top:1px">${unit}</div>`
      : v
    return `<tr>
      <td style="text-align:center">
        <div style="font-weight:bold;font-size:12px">${itemBi.zh}</div>
        ${itemBi.vi ? `<div style="font-size:9px;color:#555">${itemBi.vi}</div>` : ''}
      </td>
      <td style="text-align:center;vertical-align:middle">${valCell(r.supplierStd)}</td>
      <td style="text-align:center;vertical-align:middle">${valCell(r.actualValue)}</td>
      <td style="text-align:center;vertical-align:middle">${valCell(r.confirmedValue)}</td>
      <td style="text-align:center;font-size:16px;vertical-align:middle">${r.result === 'OK' ? '☑' : '☐'}</td>
      <td style="text-align:center;font-size:16px;vertical-align:middle">${r.result === 'NG' ? '☑' : '☐'}</td>
      <td style="text-align:center">
        <div style="font-weight:bold">${equipBi.zh}</div>
        ${equipBi.vi ? `<div style="font-size:9px;color:#555">${equipBi.vi}</div>` : ''}
      </td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>進料品質檢驗分析報告書</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Microsoft JhengHei','Noto Sans TC',Arial,sans-serif;font-size:11px;color:#000;background:#fff;padding:14px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #000;padding:4px 6px;vertical-align:middle}
  .vi{font-size:9px;color:#555;display:block;margin-top:1px}
  .zh{font-weight:bold;font-size:11px}
  @media print{body{padding:6px}@page{margin:8mm;size:A4}}
</style>
</head>
<body>

<!-- ① 主標頭 -->
<table style="border:2px solid #000;margin-bottom:0">
  <tr>
    <td style="width:110px;border-right:2px solid #000;text-align:center;padding:6px 8px">
      <div style="font-size:20px;font-weight:900;font-style:italic;color:#c0392b;letter-spacing:1px">R<span style="font-size:14px">ICH</span></div>
      <div style="font-size:9px;color:#666;margin-top:2px">旺隆</div>
      <div style="margin-top:6px;font-size:10px;text-align:left">No:&nbsp;<strong>${acceptanceNo}</strong></div>
    </td>
    <td style="text-align:center;padding:10px 8px;border:none">
      <div style="font-size:11px;font-weight:bold;letter-spacing:0.5px">BÁO CÁO KIỂM TRA VÀ PHÂN TÍCH CHẤT LƯỢNG</div>
      <div style="font-size:18px;font-weight:900;letter-spacing:4px;margin-top:4px">進 料 品 質 檢 驗 分 析 報 告 書</div>
    </td>
  </tr>
</table>

<!-- ② 資訊欄（4 欄 × 2 列）-->
<table style="border:2px solid #000;border-top:none;margin-bottom:0">
  <tr>
    <td style="width:22%">
      <div class="zh">驗收單號</div>
      <div class="vi">SỐ PHIẾU NGHIỆM THU</div>
      <div style="font-size:12px;margin-top:3px">${acceptanceNo}</div>
    </td>
    <td style="width:20%">
      <div class="zh">訂貨日期</div>
      <div class="vi">NGÀY ĐẶT HÀNG</div>
      <div style="font-size:12px;margin-top:3px">${orderDate}</div>
    </td>
    <td style="width:20%">
      <div class="zh">進貨日期</div>
      <div class="vi">NGÀY NHẬN HÀNG</div>
      <div style="font-size:12px;margin-top:3px">${arrivalStr}</div>
    </td>
    <td style="width:38%">
      <div class="zh">供應商</div>
      <div class="vi">NHÀ CUNG CẤP</div>
      <div style="font-size:12px;margin-top:3px">${batch.supplierBatch ?? ''}</div>
    </td>
  </tr>
  <tr>
    <td>
      <div class="zh">品名規格</div>
      <div class="vi">QUY CÁCH</div>
      <div style="font-size:12px;margin-top:3px">${ingredient.name}</div>
    </td>
    <td>
      <div class="zh">原料編號</div>
      <div class="vi">MÃ NGUYÊN LIỆU</div>
      <div style="font-size:12px;margin-top:3px">${ingredient.code ?? ''}</div>
    </td>
    <td>
      <div class="zh">批號</div>
      <div class="vi">SỐ LÔ</div>
      <div style="font-size:12px;margin-top:3px">${batch.batchNo}</div>
    </td>
    <td>
      <div class="zh">數量 (${batch.unit})</div>
      <div class="vi">SỐ LƯỢNG</div>
      <div style="font-size:12px;margin-top:3px">${batch.quantity}</div>
    </td>
  </tr>
  <tr>
    <td colspan="4" style="text-align:center;background:#f0f0f0;padding:5px">
      <span style="font-size:13px;font-weight:bold">品質狀況</span>
      <span style="font-size:10px;margin-left:6px">TÌNH TRẠNG CHẤT LƯỢNG</span>
    </td>
  </tr>
</table>

<!-- ③ QC 檢測表 -->
<table style="border:2px solid #000;border-top:none;margin-bottom:0">
  <thead>
    <tr style="background:#f5f5f5">
      <th style="width:13%;text-align:center">
        <div class="zh" style="font-size:10px">檢測項目</div>
        <div class="vi">HẠNG MỤC KIỂM TRA</div>
      </th>
      <th style="width:14%;text-align:center">
        <div class="zh" style="font-size:10px">供應商標準</div>
        <div class="vi">TIÊU CHUẨN NHÀ CUNG CẤP</div>
      </th>
      <th style="width:14%;text-align:center">
        <div class="zh" style="font-size:10px">實際測值</div>
        <div class="vi">GIÁ TRỊ THỬ NGHIỆM THỰC TẾ</div>
      </th>
      <th style="width:14%;text-align:center">
        <div class="zh" style="font-size:10px">二次確認值</div>
        <div class="vi">GIÁ TRỊ KIỂM TRA LẦN 2</div>
      </th>
      <th style="width:9%;text-align:center">
        <div class="zh" style="font-size:10px">檢測OK</div>
        <div class="vi">ĐẠT (OK)</div>
      </th>
      <th style="width:9%;text-align:center">
        <div class="zh" style="font-size:10px">檢測NG</div>
        <div class="vi">KHÔNG ĐẠT (NG)</div>
      </th>
      <th style="width:27%;text-align:center">
        <div class="zh" style="font-size:10px">檢測設備</div>
        <div class="vi">THIẾT BỊ KIỂM TRA</div>
      </th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<!-- ④ 備註 -->
<table style="border:2px solid #000;border-top:none;margin-bottom:0">
  <tr>
    <td style="min-height:90px;vertical-align:top;padding:6px">
      <div><strong>備註</strong><span class="vi" style="display:inline;margin-left:6px">CHÚ THÍCH</span></div>
      <div style="margin-top:6px;white-space:pre-wrap;font-size:11px">${qcNotes}</div>
      <div style="min-height:60px"></div>
    </td>
  </tr>
</table>

<!-- ⑤ 照片 -->
<table style="border:2px solid #000;border-top:none;margin-bottom:0">
  <tr>
    <td style="width:50%;min-height:160px;text-align:center;vertical-align:top;padding:8px;border-right:2px solid #000">
      <div class="zh">產品外觀照片貼處</div>
      <div class="vi">VỊ TRÍ ĐÍNH KÈM ẢNH NGOẠI QUAN SẢN PHẨM</div>
      ${photoAppearanceUrl
        ? `<div style="margin-top:8px"><img src="${photoAppearanceUrl}" style="max-height:140px;max-width:95%;border:1px solid #ccc"></div>`
        : '<div style="min-height:130px"></div>'}
    </td>
    <td style="width:50%;min-height:160px;text-align:center;vertical-align:top;padding:8px">
      <div class="zh">產品固化照片貼處</div>
      <div class="vi">VỊ TRÍ ĐÍNH KÈM ẢNH SẢN PHẨM ĐÃ SẤY KHÔ</div>
      ${photoSolidUrl
        ? `<div style="margin-top:8px"><img src="${photoSolidUrl}" style="max-height:140px;max-width:95%;border:1px solid #ccc"></div>`
        : '<div style="min-height:130px"></div>'}
    </td>
  </tr>
</table>

<!-- ⑥ 簽名列 -->
<table style="border:2px solid #000;border-top:none">
  <tr>
    <td style="width:30%;text-align:center;min-height:65px;vertical-align:top;padding:5px">
      <div><span class="zh">單位主管</span><span class="vi" style="display:inline;margin-left:4px">TRƯỞNG ĐƠN VỊ</span></div>
      ${sigSupervisor ? `<img src="${sigSupervisor}" style="max-height:45px;margin-top:4px">` : '<div style="min-height:45px"></div>'}
    </td>
    <td style="width:30%;text-align:center;min-height:65px;vertical-align:top;padding:5px">
      <div><span class="zh">審核</span><span class="vi" style="display:inline;margin-left:4px">THẨM TRA</span></div>
      ${sigReviewer ? `<img src="${sigReviewer}" style="max-height:45px;margin-top:4px">` : '<div style="min-height:45px"></div>'}
    </td>
    <td style="width:30%;text-align:center;min-height:65px;vertical-align:top;padding:5px">
      <div><span class="zh">檢測員</span><span class="vi" style="display:inline;margin-left:4px">NHÂN VIÊN KIỂM TRA</span></div>
      ${sigInspector ? `<img src="${sigInspector}" style="max-height:45px;margin-top:4px">` : '<div style="min-height:45px"></div>'}
    </td>
    <td style="width:10%;text-align:center;vertical-align:middle;font-weight:bold;font-size:11px;border-left:2px solid #000">
      CMS03-07-2B
    </td>
  </tr>
</table>

<script>window.onload = () => window.print()</script>
</body>
</html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

function QCReportModal({
  open, onClose, batch, ingredient,
}: {
  open: boolean
  onClose: () => void
  batch: IngredientBatch | null
  ingredient: Ingredient
}) {
  const [acceptanceNo, setAcceptanceNo] = useState('')
  const [orderDateStr, setOrderDateStr] = useState('')
  const [qcItems, setQcItems] = useState<QCItem[]>(QC_ITEMS_DEFAULT.map(i => ({ ...i })))
  const [qcNotes, setQcNotes] = useState('')
  const [photoAppearanceFile, setPhotoAppearanceFile] = useState<File | null>(null)
  const [photoSolidFile, setPhotoSolidFile] = useState<File | null>(null)
  const [photoAppearancePreview, setPhotoAppearancePreview] = useState<string | null>(null)
  const [photoSolidPreview, setPhotoSolidPreview] = useState<string | null>(null)
  const [sigSupervisor, setSigSupervisor] = useState<string | null>(null)
  const [sigReviewer, setSigReviewer] = useState<string | null>(null)
  const [sigInspector, setSigInspector] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !batch) return
    setAcceptanceNo(batch.acceptanceNo ?? '')
    setOrderDateStr(batch.orderDate ? dayjs(batch.orderDate).format('YYYY-MM-DD') : '')
    setQcItems(batch.qcItems?.length ? batch.qcItems.map(i => ({ ...i })) : QC_ITEMS_DEFAULT.map(i => ({ ...i })))
    setQcNotes(batch.qcNotes ?? '')
    setPhotoAppearanceFile(null)
    setPhotoSolidFile(null)
    setPhotoAppearancePreview(batch.qcPhotoAppearance ?? null)
    setPhotoSolidPreview(batch.qcPhotoSolid ?? null)
    setSigSupervisor(null)
    setSigReviewer(null)
    setSigInspector(null)
  }, [open, batch?.id])

  const handleSigUpload = (setter: (v: string) => void, file: File) => {
    const reader = new FileReader()
    reader.onload = e => setter(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handlePhotoChange = (field: 'appearance' | 'solid', file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const url = e.target?.result as string
      if (field === 'appearance') { setPhotoAppearanceFile(file); setPhotoAppearancePreview(url) }
      else { setPhotoSolidFile(file); setPhotoSolidPreview(url) }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!batch) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('batchNo', batch.batchNo)
      fd.append('quantity', String(batch.quantity))
      fd.append('unit', batch.unit)
      fd.append('status', batch.status)
      fd.append('notes', batch.notes)
      fd.append('acceptanceNo', acceptanceNo)
      fd.append('orderDate', orderDateStr)
      fd.append('qcItems', JSON.stringify(qcItems))
      fd.append('qcNotes', qcNotes)
      if (photoAppearanceFile) fd.append('qcPhotoAppearance', photoAppearanceFile)
      if (photoSolidFile) fd.append('qcPhotoSolid', photoSolidFile)
      await updateIngredientBatch(batch.id, fd)
      message.success('驗收記錄已儲存')
      onClose()
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const updateItem = (idx: number, field: keyof QCItem, value: string) => {
    setQcItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  if (!batch) return null

  return (
    <Modal
      open={open}
      title={`進料品質檢驗報告 — ${batch.batchNo} (CMS03-07-2B)`}
      onCancel={onClose}
      onOk={handleSave}
      okText="儲存"
      confirmLoading={saving}
      destroyOnHidden
      width={820}
      styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}
      footer={[
        <Button key="print" icon={<PrinterOutlined />} onClick={() => printQCReport(
          batch, ingredient, acceptanceNo, orderDateStr, qcItems, qcNotes,
          photoAppearancePreview, photoSolidPreview, sigSupervisor, sigReviewer, sigInspector,
        )}>列印</Button>,
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>儲存</Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            ['驗收單號', acceptanceNo, (v: string) => setAcceptanceNo(v)],
            ['訂貨日期', orderDateStr, (v: string) => setOrderDateStr(v)],
            ['進貨日期', batch.arrivalDate ? dayjs(batch.arrivalDate).format('YYYY-MM-DD') : '—', null],
            ['供應商批號', batch.supplierBatch ?? '—', null],
            ['品名', ingredient.name, null],
            ['原料代碼', ingredient.code ?? '—', null],
            ['批號', batch.batchNo, null],
            [`數量(${batch.unit})`, String(batch.quantity), null],
          ].map(([label, value, onChange]) => (
            <div key={String(label)}>
              <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
              {onChange
                ? <Input size="small" value={String(value)} onChange={e => (onChange as (v: string) => void)(e.target.value)} />
                : <div style={{ padding: '1px 0', fontSize: 13 }}><Text>{value}</Text></div>
              }
            </div>
          ))}
        </div>

        {/* QC Table */}
        <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 60px 60px 1fr', background: '#162032', padding: '6px 8px', gap: 4 }}>
            {['檢測項目', '供應商標準', '實際測值', '二次確認值', 'OK', 'NG', '檢測設備'].map(h => (
              <Text key={h} strong style={{ fontSize: 11, textAlign: 'center' }}>{h}</Text>
            ))}
          </div>
          {qcItems.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 60px 60px 1fr', gap: 4, padding: '3px 8px', borderTop: '1px solid #2d3f55', alignItems: 'center' }}>
              <Text style={{ fontSize: 12 }}>{item.item}</Text>
              <Input size="small" value={item.supplierStd} onChange={e => updateItem(idx, 'supplierStd', e.target.value)} />
              <Input size="small" value={item.actualValue} onChange={e => updateItem(idx, 'actualValue', e.target.value)} />
              <Input size="small" value={item.confirmedValue} onChange={e => updateItem(idx, 'confirmedValue', e.target.value)} />
              <Radio.Group
                value={item.result}
                onChange={e => updateItem(idx, 'result', e.target.value)}
                size="small"
                style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'center', gap: 8 }}
              >
                <Radio value="OK" style={{ fontSize: 11 }}>OK</Radio>
                <Radio value="NG" style={{ fontSize: 11 }}>NG</Radio>
              </Radio.Group>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>{item.equipment}</Text>
            </div>
          ))}
        </div>

        <Form.Item label="備註" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} value={qcNotes} onChange={e => setQcNotes(e.target.value)} />
        </Form.Item>

        {/* Photos */}
        <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>照片</Divider>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: '產品外觀照片', preview: photoAppearancePreview, field: 'appearance' as const },
            { label: '產品固化照片', preview: photoSolidPreview, field: 'solid' as const },
          ].map(({ label, preview, field }) => (
            <div key={field}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</Text>
              {preview && <Image src={preview} height={100} style={{ borderRadius: 4, marginBottom: 4, display: 'block' }} />}
              <input type="file" accept="image/*" style={{ fontSize: 12 }}
                onChange={e => e.target.files?.[0] && handlePhotoChange(field, e.target.files[0])} />
            </div>
          ))}
        </div>

        {/* Signatures */}
        <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>簽名（僅存於本次瀏覽器）</Divider>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { label: '單位主管', value: sigSupervisor, setter: setSigSupervisor },
            { label: '審核', value: sigReviewer, setter: setSigReviewer },
            { label: '檢測員', value: sigInspector, setter: setSigInspector },
          ].map(({ label, value, setter }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</Text>
              {value && <img src={value} alt={label} style={{ height: 48, border: '1px solid #2d3f55', borderRadius: 4, display: 'block', margin: '0 auto 4px' }} />}
              <input type="file" accept="image/*" style={{ fontSize: 12 }}
                onChange={e => e.target.files?.[0] && handleSigUpload(setter, e.target.files[0])} />
            </div>
          ))}
        </div>
      </Space>
    </Modal>
  )
}

// ── 原料詳情 Drawer ──────────────────────────────────────────────────────────

function IngredientDetailDrawer({
  ingredient, open, onClose, canEdit,
}: {
  ingredient: Ingredient | null
  open: boolean
  onClose: () => void
  canEdit: boolean
}) {
  const [docs, setDocs] = useState<IngredientDocument[]>([])
  const [batches, setBatches] = useState<IngredientBatch[]>([])
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [docType, setDocType] = useState('SDS')
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<IngredientBatch | null>(null)
  const [batchForm] = Form.useForm()
  const [qcBatch, setQcBatch] = useState<IngredientBatch | null>(null)

  const loadDocs = useCallback(async () => {
    if (!ingredient) return
    const res = await getIngredientDocuments(ingredient.id)
    setDocs(res.data.data ?? [])
  }, [ingredient?.id])

  const loadBatches = useCallback(async () => {
    if (!ingredient) return
    const res = await getIngredientBatches(ingredient.id)
    setBatches(res.data.data ?? [])
  }, [ingredient?.id])

  useEffect(() => {
    if (open && ingredient) {
      loadDocs()
      loadBatches()
      setFileList([])
    }
  }, [open, ingredient?.id])

  const handleUpload = async () => {
    if (!ingredient || fileList.length === 0) return
    const file = fileList[0]
    if (!file.originFileObj) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file.originFileObj)
      fd.append('fileType', docType)
      await uploadIngredientDocument(ingredient.id, fd)
      message.success('文件已上傳')
      setFileList([])
      loadDocs()
    } catch {
      message.error('上傳失敗')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDoc = async (id: number) => {
    try {
      await deleteIngredientDocument(id)
      message.success('已刪除')
      loadDocs()
    } catch {
      message.error('刪除失敗')
    }
  }

  const openAddBatch = () => {
    setEditingBatch(null)
    batchForm.resetFields()
    batchForm.setFieldsValue({ unit: ingredient?.unit, status: '正常' })
    setBatchModalOpen(true)
  }
  const openEditBatch = (b: IngredientBatch) => {
    setEditingBatch(b)
    batchForm.setFieldsValue({
      ...b,
      mfgDate: b.mfgDate ? dayjs(b.mfgDate) : undefined,
      expiryDate: b.expiryDate ? dayjs(b.expiryDate) : undefined,
      arrivalDate: b.arrivalDate ? dayjs(b.arrivalDate) : undefined,
      warehousingDate: b.warehousingDate ? dayjs(b.warehousingDate) : undefined,
      usageDate: b.usageDate ? dayjs(b.usageDate) : undefined,
      openedDate: b.openedDate ? dayjs(b.openedDate) : undefined,
    })
    setBatchModalOpen(true)
  }

  const handleSaveBatch = async (values: any) => {
    if (!ingredient) return
    const toDate = (v: any) => (v ? v.format('YYYY-MM-DD') : null)
    const payload = {
      ...values,
      mfgDate: toDate(values.mfgDate),
      expiryDate: toDate(values.expiryDate),
      arrivalDate: toDate(values.arrivalDate),
      warehousingDate: toDate(values.warehousingDate),
      usageDate: toDate(values.usageDate),
      openedDate: toDate(values.openedDate),
    }
    try {
      if (editingBatch) {
        await updateIngredientBatch(editingBatch.id, payload)
        message.success('已更新')
      } else {
        await createIngredientBatch(ingredient.id, payload)
        message.success('已新增')
      }
      setBatchModalOpen(false)
      loadBatches()
    } catch {
      message.error('儲存失敗')
    }
  }

  const handleDeleteBatch = async (id: number) => {
    try {
      await deleteIngredientBatch(id)
      message.success('已刪除')
      loadBatches()
    } catch {
      message.error('刪除失敗')
    }
  }

  if (!ingredient) return null

  const today = dayjs()
  const docColumns: ColumnsType<IngredientDocument> = [
    {
      title: '文件類型', dataIndex: 'fileType', key: 'fileType', width: 120,
      render: (t: string) => <Tag color={DOC_TYPE_COLOR[t] ?? 'default'}>{t}</Tag>,
    },
    { title: '檔名', dataIndex: 'fileName', key: 'fileName' },
    {
      title: '上傳時間', dataIndex: 'uploadedAt', key: 'uploadedAt', width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    { title: '上傳者', dataIndex: 'uploaderName', key: 'uploaderName', width: 100 },
    {
      title: '操作', key: 'action', width: 120,
      render: (_: unknown, row: IngredientDocument) => (
        <Space>
          <Button size="small" icon={<DownloadOutlined />} href={row.fileUrl} target="_blank">下載</Button>
          {canEdit && (
            <Popconfirm title="確定刪除此文件？" onConfirm={() => handleDeleteDoc(row.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const batchColumns: ColumnsType<IngredientBatch> = [
    { title: '批號', dataIndex: 'batchNo', key: 'batchNo' },
    { title: '供應商批號', dataIndex: 'supplierBatch', key: 'supplierBatch', width: 110, render: (v) => v ?? '—' },
    { title: '進貨量', key: 'qty', width: 100, render: (_, r) => `${r.quantity} ${r.unit}` },
    { title: '剩餘量', key: 'remainingQty', width: 90, render: (_, r) => r.remainingQty != null ? `${r.remainingQty} ${r.unit}` : '—' },
    {
      title: '到貨日', dataIndex: 'arrivalDate', key: 'arrivalDate', width: 100,
      render: (v?: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    {
      title: '效期', dataIndex: 'expiryDate', key: 'expiryDate', width: 120,
      render: (v?: string) => {
        if (!v) return '—'
        const d = dayjs(v)
        const diff = d.diff(today, 'day')
        const color = diff < 0 ? 'red' : diff <= 30 ? 'orange' : 'default'
        return <Tag color={color}>{d.format('YYYY-MM-DD')}{diff < 0 ? '（過期）' : diff <= 30 ? `（${diff}天）` : ''}</Tag>
      },
    },
    {
      title: '開封後有效(天)', dataIndex: 'openedExpiry', key: 'openedExpiry', width: 120,
      render: (v?: number) => v != null ? `${v} 天` : '—',
    },
    {
      title: '狀態', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => <Tag color={BATCH_STATUS_COLOR[v]}>{v}</Tag>,
    },
    { title: '備註', dataIndex: 'notes', key: 'notes', render: (v) => v || '—' },
    {
      title: '原物料驗收', key: 'qc', width: 140,
      render: (_: unknown, row: IngredientBatch) => {
        const hasQC = row.qcItems && row.qcItems.length > 0
        const ngCount = hasQC ? row.qcItems!.filter((i: any) => i.result === 'NG').length : 0
        const statusTag = !hasQC
          ? <Tag color="orange" icon={<ExclamationCircleOutlined />} style={{ fontSize: 11, fontWeight: 600 }}>待驗收</Tag>
          : ngCount > 0
            ? <Tag color="warning" style={{ fontSize: 11 }}>不合格 {ngCount}項</Tag>
            : <Tag color="success" style={{ fontSize: 11 }}>合格</Tag>
        return (
          <Space size={4} direction="vertical" style={{ width: '100%' }}>
            {statusTag}
            <Button
              size="small"
              type={hasQC ? 'default' : 'primary'}
              icon={<MedicineBoxOutlined />}
              onClick={() => setQcBatch(row)}
            >
              {hasQC ? '查看驗收' : '填寫驗收'}
            </Button>
          </Space>
        )
      },
    },
    ...(canEdit ? [{
      title: '操作', key: 'action', width: 120,
      render: (_: unknown, row: IngredientBatch) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditBatch(row)} />
          <Popconfirm title="確定刪除？" onConfirm={() => handleDeleteBatch(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  const industryTags = ingredient.industry
    ? ingredient.industry.split(',').filter(Boolean).map((t) => <Tag key={t}>{t}</Tag>)
    : ['—']
  const fields: [string, ReactNode][] = [
    ['原料名稱', ingredient.name],
    ['原料代碼', ingredient.code ?? '—'],
    ['英文名稱', ingredient.englishName ?? '—'],
    ['CAS No.', ingredient.casNo ?? '—'],
    ['原料分類', ingredient.category ?? '—'],
    ['產業分類', industryTags],
    ['固含量/有效成分', ingredient.solidContent ?? '—'],
    ['密度', ingredient.density ?? '—'],
    ['外觀', ingredient.appearance ?? '—'],
    ['保存條件', ingredient.storageCondition ?? '—'],
    ['保存期限', ingredient.shelfLife ?? '—'],
    ['規格資訊', ingredient.packageSpec ?? '—'],
    ['單位', ingredient.unit],
    ['單價', ingredient.unitPrice != null ? `${ingredient.unitPrice} 元` : '—'],
    ['狀態', ingredient.status],
    ['建立日期', dayjs(ingredient.createdAt).format('YYYY-MM-DD')],
    ['建立人員', ingredient.createdByName ?? '—'],
    ['說明', ingredient.description || '—'],
  ]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`原料詳情 — ${ingredient.name}`}
      width={820}
      styles={{ body: { padding: '0 24px 24px' } }}
    >
      <Tabs
        items={[
          {
            key: 'info',
            label: <span><InfoCircleOutlined />基本資料</span>,
            children: (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', padding: '8px 0' }}>
                {fields.map(([label, value]) => (
                  <div key={String(label)}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                    <div><Text>{value}</Text></div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'docs',
            label: <span><FileTextOutlined />文件管理 <Badge count={docs.length} color="blue" /></span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {canEdit && (
                  <Card size="small" title="上傳文件">
                    <Space wrap>
                      <Select
                        value={docType}
                        onChange={setDocType}
                        options={DOC_TYPE_OPTIONS}
                        style={{ width: 200 }}
                      />
                      <Upload
                        fileList={fileList}
                        beforeUpload={(file) => { setFileList([file as any]); return false }}
                        onRemove={() => setFileList([])}
                        maxCount={1}
                      >
                        <Button icon={<UploadOutlined />}>選擇檔案</Button>
                      </Upload>
                      <Button
                        type="primary"
                        onClick={handleUpload}
                        loading={uploading}
                        disabled={fileList.length === 0}
                      >
                        上傳
                      </Button>
                    </Space>
                  </Card>
                )}
                <Table
                  rowKey="id"
                  columns={docColumns}
                  dataSource={docs}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: '尚無文件' }}
                />
              </Space>
            ),
          },
          {
            key: 'batches',
            label: <span><InboxOutlined />批號管理 <Badge count={batches.length} color="blue" /></span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {canEdit && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAddBatch}>
                    新增批號
                  </Button>
                )}
                <Table
                  rowKey="id"
                  columns={batchColumns}
                  dataSource={batches}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: '尚無批號紀錄' }}
                />
              </Space>
            ),
          },
        ]}
      />

      <QCReportModal
        open={!!qcBatch}
        onClose={() => { setQcBatch(null); loadBatches() }}
        batch={qcBatch}
        ingredient={ingredient}
      />

      <Modal
        open={batchModalOpen}
        title={editingBatch ? '編輯批號' : '新增批號'}
        onCancel={() => setBatchModalOpen(false)}
        onOk={() => batchForm.submit()}
        destroyOnHidden
        width={640}
      >
        <Form form={batchForm} layout="vertical" onFinish={handleSaveBatch} style={{ marginTop: 8 }}>
          <Divider titlePlacement="left" plain style={{ margin: '0 0 8px', fontSize: 12, color: '#888' }}>基本資訊</Divider>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="batchNo" label="批號" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="supplierBatch" label="供應商批號" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="quantity" label="進貨數量" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="remainingQty" label="剩餘量" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="unit" label="單位" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Divider titlePlacement="left" plain style={{ margin: '4px 0 8px', fontSize: 12, color: '#888' }}>日期資訊</Divider>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="mfgDate" label="製造日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="expiryDate" label="效期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="arrivalDate" label="到貨日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="warehousingDate" label="入庫日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="usageDate" label="使用日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="usageQuantity" label="使用數量" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="openedDate" label="開封日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="openedExpiry" label="開封後有效期（天）" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="status" label="狀態" style={{ flex: 1 }}>
              <Select options={[
                { value: '正常', label: '正常' },
                { value: '異常', label: '異常' },
                { value: '報廢', label: '報廢' },
              ]} />
            </Form.Item>
            <Form.Item name="notes" label="備註" style={{ flex: 2 }}>
              <Input />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Drawer>
  )
}

// ─── Tab 1：原料資料維護 ───────────────────────────────────────────────────────

function IngredientTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const [data, setData] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [detailTarget, setDetailTarget] = useState<Ingredient | null>(null)
  const [form] = Form.useForm()
  const [search, setSearch] = useState('')


  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getIngredients({ limit: 500, name: search || undefined })
      setData(res.data.data)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const toIndustryArr = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: '使用中', industry: [] })
    setModalOpen(true)
  }
  const openEdit = (row: Ingredient) => {
    setEditing(row)
    form.setFieldsValue({
      ...row,
      industry: toIndustryArr(row.industry),
      category: row.category ?? undefined,
      packageSpec: row.packageSpec ?? undefined,
    })
    setModalOpen(true)
  }
  const openCopy = (row: Ingredient) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      ...row,
      name: `${row.name} - 複製`,
      code: null,
      industry: toIndustryArr(row.industry),
      packageSpec: row.packageSpec ?? undefined,
    })
    setModalOpen(true)
  }

  const handleSave = async (values: any) => {
    const payload = {
      ...values,
      industry: Array.isArray(values.industry) && values.industry.length
        ? values.industry.join(',')
        : null,
    }
    try {
      if (editing) {
        await updateIngredient(editing.id, payload)
        message.success('已更新')
      } else {
        await createIngredient(payload)
        message.success('已新增')
      }
      setModalOpen(false)
      load()
    } catch {
      message.error('儲存失敗')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteIngredient(id)
      message.success('已刪除')
      load()
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error?.message
      message.error(msg ?? '刪除失敗，此原料可能仍被配方或庫存引用')
    }
  }

  const columns: ColumnsType<Ingredient> = [
    { title: '原料名稱', dataIndex: 'name', key: 'name' },
    { title: '代碼', dataIndex: 'code', key: 'code', width: 100, render: (v) => v ?? '—' },
    { title: '分類', dataIndex: 'category', key: 'category', width: 120, render: (v) => v ?? '—' },
    { title: '單位', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: '狀態', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => {
        const color = v === '使用中' ? 'green' : v === '停用' ? 'orange' : 'red'
        return <Tag color={color}>{v}</Tag>
      },
    },
    {
      title: '操作', key: 'action', width: 220,
      render: (_: unknown, row: Ingredient) => (
        <Space>
          <Button size="small" icon={<InfoCircleOutlined />} onClick={() => setDetailTarget(row)}>詳情</Button>
          {canEdit && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>編輯</Button>
          )}
          {canEdit && (
            <Button size="small" icon={<CopyOutlined />} onClick={() => openCopy(row)}>複製</Button>
          )}
          {canEdit && (
            <Popconfirm title="確定刪除？" onConfirm={() => handleDelete(row.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增原料</Button>
        )}
        <Input.Search
          placeholder="搜尋原料名稱"
          allowClear
          style={{ width: 220 }}
          onSearch={setSearch}
          onChange={(e) => !e.target.value && setSearch('')}
        />
        <Button icon={<DownloadOutlined />} onClick={() => exportIngredientsCSV(data)}>匯出 CSV</Button>
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={{ pageSize: 20 }} size="small" />

      {/* 新增/編輯 Modal */}
      <Modal
        open={modalOpen}
        title={editing ? '編輯原料' : '新增原料'}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="name" label="原料名稱" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Input />
            </Form.Item>
            <Form.Item name="code" label="原料代碼" style={{ flex: 1 }}>
              <Input placeholder="ING-001" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="englishName" label="英文名稱" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="casNo" label="CAS No." style={{ flex: 1 }}>
              <Input placeholder="7732-18-5" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="category" label="原料分類" style={{ flex: 1 }}>
              <DropdownSelect categoryKey="ingredient_category" allowClear placeholder="選擇或新增" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="industry" label="產業分類（可複選）" style={{ flex: 1 }}>
              <DropdownSelect categoryKey="ingredient_industry" allowClear mode="multiple" placeholder="選擇或新增" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="unit" label="單位" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DropdownSelect categoryKey="ingredient_unit" allowClear placeholder="選擇或新增" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="packageSpec" label="規格資訊" style={{ flex: 1 }}>
              <DropdownSelect categoryKey="ingredient_package" allowClear placeholder="選擇或新增" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="狀態" style={{ flex: 1 }}>
              <DropdownSelect categoryKey="ingredient_status" placeholder="請選擇" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Divider titlePlacement="left" plain style={{ margin: '4px 0 8px', fontSize: 12, color: '#888' }}>物性資訊</Divider>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="solidContent" label="固含量/有效成分" style={{ flex: 1 }}>
              <Input placeholder="例：45%" />
            </Form.Item>
            <Form.Item name="density" label="密度" style={{ flex: 1 }}>
              <Input placeholder="例：1.05 g/mL" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="appearance" label="外觀" style={{ flex: 1 }}>
              <Input placeholder="例：淡黃色液體" />
            </Form.Item>
            <Form.Item name="storageCondition" label="保存條件" style={{ flex: 1 }}>
              <Input placeholder="例：陰涼乾燥處，避免陽光直射" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="shelfLife" label="保存期限" style={{ flex: 1 }}>
              <Input placeholder="例：24 個月" />
            </Form.Item>
            <Form.Item name="unitPrice" label="單價（元）" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="說明">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 詳情 Drawer */}
      <IngredientDetailDrawer
        ingredient={detailTarget}
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        canEdit={canEdit}
      />
    </>
  )
}

// ─── Tab 2：庫存管理 ──────────────────────────────────────────────────────────

function InventoryTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const [data, setData] = useState<MaterialInventory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MaterialInventory | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<MaterialInventory | null>(null)
  const [addForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [adjustForm] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, ingRes] = await Promise.all([getInventory(), getIngredients({ limit: 500 })])
      setData(invRes.data.data)
      setIngredients(ingRes.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (values: any) => {
    try {
      await createInventory({ ...values, expiryDate: values.expiryDate?.format('YYYY-MM-DD') })
      message.success('已新增庫存紀錄')
      setAddOpen(false)
      load()
    } catch { message.error('新增失敗') }
  }

  const handleEdit = async (values: any) => {
    if (!editTarget) return
    try {
      await updateInventory(editTarget.id, { ...values, expiryDate: values.expiryDate?.format('YYYY-MM-DD') })
      message.success('已更新')
      setEditTarget(null)
      load()
    } catch { message.error('更新失敗') }
  }

  const handleAdjust = async (values: { transactionType: TransactionType; quantity: number; note: string }) => {
    if (!adjustTarget) return
    try {
      await adjustStock(adjustTarget.id, values)
      message.success('庫存已調整')
      setAdjustTarget(null)
      load()
    } catch { message.error('調整失敗') }
  }

  const openEdit = (row: MaterialInventory) => {
    setEditTarget(row)
    editForm.setFieldsValue({ ...row, expiryDate: row.expiryDate ? dayjs(row.expiryDate) : undefined })
  }

  const columns: ColumnsType<MaterialInventory> = [
    { title: '原料名稱', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '單位', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: '當前庫存', dataIndex: 'currentStock', key: 'currentStock', width: 110,
      render: (v: number, row) => (
        <Text type={v < row.safetyStock ? 'danger' : undefined} strong={v < row.safetyStock}>{v}</Text>
      ),
    },
    { title: '安全庫存', dataIndex: 'safetyStock', key: 'safetyStock', width: 110 },
    { title: '供應商', dataIndex: 'supplier', key: 'supplier' },
    {
      title: '到期日', dataIndex: 'expiryDate', key: 'expiryDate', width: 110,
      render: (v?: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    {
      title: '最後更新', dataIndex: 'lastUpdated', key: 'lastUpdated', width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    ...(canEdit ? [{
      title: '操作', key: 'action', width: 160,
      render: (_: unknown, row: MaterialInventory) => (
        <Space>
          <Button size="small" icon={<InboxOutlined />} onClick={() => setAdjustTarget(row)}>調整</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>編輯</Button>
          <Popconfirm title="確定刪除？" onConfirm={async () => {
            try {
              await deleteInventory(row.id); message.success('已刪除'); load()
            } catch (err: any) {
              message.error(err?.response?.data?.error?.message ?? '刪除失敗')
            }
          }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  const usedIngredientIds = data.map((d) => d.ingredientId)
  const availableIngredients = ingredients.filter((i) => !usedIngredientIds.includes(i.id))

  return (
    <>
      {canEdit && (
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { addForm.resetFields(); setAddOpen(true) }}>
          新增庫存紀錄
        </Button>
      )}
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />

      <Modal open={addOpen} title="新增庫存紀錄" onCancel={() => setAddOpen(false)} onOk={() => addForm.submit()} destroyOnHidden>
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="ingredientId" label="原料" rules={[{ required: true }]}>
            <Select options={availableIngredients.map((i) => ({ value: i.id, label: `${i.name}（${i.unit}）` }))} placeholder="選擇原料" showSearch filterOption={(i, o) => (o?.label ?? '').includes(i)} />
          </Form.Item>
          <Form.Item name="currentStock" label="初始庫存" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="safetyStock" label="安全庫存" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="supplier" label="供應商" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="expiryDate" label="到期日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!editTarget} title="編輯庫存設定" onCancel={() => setEditTarget(null)} onOk={() => editForm.submit()} destroyOnHidden>
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="safetyStock" label="安全庫存" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="supplier" label="供應商" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="expiryDate" label="到期日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!adjustTarget} title={`調整庫存：${adjustTarget?.ingredientName}`} onCancel={() => setAdjustTarget(null)} onOk={() => adjustForm.submit()} destroyOnHidden>
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjust} initialValues={{ transactionType: 'IN' }}>
          <Form.Item name="transactionType" label="類型" rules={[{ required: true }]}>
            <Select options={[{ value: 'IN', label: '入庫' }, { value: 'OUT', label: '出庫' }, { value: 'ADJUST', label: '盤點調整（直接設定庫存量）' }]} />
          </Form.Item>
          <Form.Item name="quantity" label="數量" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} addonAfter={adjustTarget?.unit} />
          </Form.Item>
          <Form.Item name="note" label="備註" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ─── Tab 3：安全庫存警示 ──────────────────────────────────────────────────────

function SafetyStockTab() {
  const [data, setData] = useState<MaterialInventory[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getInventory()
      setData(res.data.data.filter((i: MaterialInventory) => i.currentStock < i.safetyStock))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const columns: ColumnsType<MaterialInventory> = [
    { title: '狀態', key: 'status', width: 100, render: () => <Tag color="red" icon={<WarningOutlined />}>庫存不足</Tag> },
    { title: '原料名稱', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '當前庫存', dataIndex: 'currentStock', key: 'currentStock', width: 110,
      render: (v: number) => <Text type="danger" strong>{v}</Text> },
    { title: '安全庫存', dataIndex: 'safetyStock', key: 'safetyStock', width: 110 },
    { title: '單位', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: '供應商', dataIndex: 'supplier', key: 'supplier' },
    { title: '到期日', dataIndex: 'expiryDate', key: 'expiryDate', width: 110,
      render: (v?: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—' },
    { title: '缺口', key: 'gap', width: 100,
      render: (_: unknown, row) => <Text type="danger">-{row.safetyStock - row.currentStock} {row.unit}</Text> },
  ]

  return (
    <>
      {data.length > 0
        ? <Alert type="warning" showIcon icon={<WarningOutlined />} style={{ marginBottom: 16 }}
            message={`共 ${data.length} 項原料庫存低於安全庫存，請儘快補貨`} />
        : <Alert type="success" showIcon style={{ marginBottom: 16 }} message="所有原料庫存皆在安全水位以上" />
      }
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
    </>
  )
}

// ─── Tab 4：效期警示 ──────────────────────────────────────────────────────────

function ExpiryTab() {
  const [data, setData] = useState<IngredientBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getExpiringBatches(days)
      setData(res.data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  const today = dayjs()
  const expired = data.filter((b) => b.expiryDate && dayjs(b.expiryDate).isBefore(today))
  const expiring = data.filter((b) => b.expiryDate && !dayjs(b.expiryDate).isBefore(today))

  const columns: ColumnsType<IngredientBatch> = [
    { title: '原料名稱', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '批號', dataIndex: 'batchNo', key: 'batchNo', width: 120 },
    { title: '數量', key: 'qty', width: 100, render: (_, r) => `${r.quantity} ${r.unit}` },
    { title: '剩餘量', key: 'rem', width: 90, render: (_, r) => r.remainingQty != null ? `${r.remainingQty} ${r.unit}` : '—' },
    {
      title: '效期', dataIndex: 'expiryDate', key: 'expiryDate', width: 140,
      render: (v?: string) => {
        if (!v) return '—'
        const d = dayjs(v)
        const diff = d.diff(today, 'day')
        return (
          <Tag color={diff < 0 ? 'red' : diff <= 7 ? 'red' : diff <= 30 ? 'orange' : 'default'}>
            {d.format('YYYY-MM-DD')}{diff < 0 ? '（已過期）' : `（${diff}天後到期）`}
          </Tag>
        )
      },
    },
    {
      title: '開封日', dataIndex: 'openedDate', key: 'openedDate', width: 100,
      render: (v?: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    {
      title: '開封後有效(天)', dataIndex: 'openedExpiry', key: 'openedExpiry', width: 120,
      render: (v?: number) => v != null ? `${v} 天` : '—',
    },
    {
      title: '狀態', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => <Tag color={BATCH_STATUS_COLOR[v]}>{v}</Tag>,
    },
    { title: '備註', dataIndex: 'notes', key: 'notes', render: (v) => v || '—' },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space>
        <Text>顯示</Text>
        <Select
          value={days}
          onChange={setDays}
          options={[
            { value: 7, label: '7 天內' },
            { value: 14, label: '14 天內' },
            { value: 30, label: '30 天內' },
            { value: 60, label: '60 天內' },
            { value: 90, label: '90 天內' },
          ]}
          style={{ width: 120 }}
        />
        <Text>內效期將至或已過期的批號</Text>
      </Space>

      {expired.length > 0 && (
        <Alert type="error" showIcon icon={<ExclamationCircleOutlined />}
          message={`${expired.length} 批原料已過期，請立即處理`} />
      )}
      {expiring.length > 0 && (
        <Alert type="warning" showIcon icon={<WarningOutlined />}
          message={`${expiring.length} 批原料將在 ${days} 天內到期`} />
      )}
      {data.length === 0 && (
        <Alert type="success" showIcon message={`${days} 天內無效期將至的批號`} />
      )}

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={false}
        size="small"
        rowClassName={(row) => row.expiryDate && dayjs(row.expiryDate).isBefore(today) ? 'ant-table-row-danger' : ''}
      />
    </Space>
  )
}

// ─── Tab 5：原料追溯 ──────────────────────────────────────────────────────────

function TraceabilityTab() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [result, setResult] = useState<MaterialTraceability | null>(null)
  const [txData, setTxData] = useState<MaterialTransaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getIngredients({ limit: 500 }).then((res) => setIngredients(res.data.data))
  }, [])

  const handleSelect = async (id: number) => {
    setLoading(true)
    try {
      const [traceRes, txRes] = await Promise.all([getTraceability(id), getTransactions({ ingredientId: id })])
      setResult(traceRes.data.data)
      setTxData(txRes.data.data)
    } finally {
      setLoading(false)
    }
  }

  const formulaColumns: ColumnsType<MaterialTraceability['usedInFormulas'][number]> = [
    { title: '配方編號', dataIndex: 'formulaCode', key: 'formulaCode' },
    { title: '配方名稱', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '用量比例', key: 'ratio', render: (_, r) => `${r.ratio} ${r.unit}` },
  ]
  const experimentColumns: ColumnsType<MaterialTraceability['usedInExperiments'][number]> = [
    { title: '實驗編號', dataIndex: 'experimentCode', key: 'experimentCode' },
    { title: '使用配方', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '實驗日期', dataIndex: 'experimentDate', key: 'experimentDate', render: (v) => dayjs(v).format('YYYY-MM-DD') },
  ]
  const txColumns: ColumnsType<MaterialTransaction> = [
    { title: '時間', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '類型', dataIndex: 'transactionType', key: 'transactionType', width: 80,
      render: (v) => <Tag color={({ IN: 'green', OUT: 'red', ADJUST: 'blue' } as Record<string, string>)[v]}>{v === 'IN' ? '入庫' : v === 'OUT' ? '出庫' : '盤點'}</Tag> },
    { title: '數量', key: 'quantity', width: 100, render: (_, r) => `${r.quantity} ${r.unit}` },
    { title: '關聯實驗', dataIndex: 'relatedExperimentCode', key: 'relatedExperimentCode', render: (v) => v ?? '—' },
    { title: '操作人員', dataIndex: 'operator', key: 'operator', width: 110 },
    { title: '備註', dataIndex: 'note', key: 'note' },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Text>選擇原料：</Text>
        <Select
          style={{ width: 240 }}
          placeholder="請選擇要追溯的原料"
          options={ingredients.map((i) => ({ value: i.id, label: `${i.name}（${i.unit}）` }))}
          onChange={handleSelect}
          showSearch
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </Space>
      {result && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card size="small" title={`使用此原料的配方（共 ${result.usedInFormulas.length} 筆）`} loading={loading}>
            <Table rowKey="formulaId" columns={formulaColumns} dataSource={result.usedInFormulas} pagination={false} size="small" />
          </Card>
          <Card size="small" title={`使用此原料的實驗（共 ${result.usedInExperiments.length} 筆）`} loading={loading}>
            <Table rowKey="experimentId" columns={experimentColumns} dataSource={result.usedInExperiments} pagination={false} size="small" />
          </Card>
          <Card size="small" title={`進出庫紀錄（共 ${txData.length} 筆）`} loading={loading}>
            <Table rowKey="id" columns={txColumns} dataSource={txData} pagination={false} size="small" />
          </Card>
        </Space>
      )}
    </>
  )
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  return (
    <Card title="原物料管理">
      <Tabs
        items={[
          { key: '1', label: '原料資料維護', icon: <EditOutlined />, children: <IngredientTab /> },
          { key: '2', label: '庫存管理', icon: <InboxOutlined />, children: <InventoryTab /> },
          { key: '3', label: '安全庫存警示', icon: <WarningOutlined />, children: <SafetyStockTab /> },
          { key: '4', label: '效期警示', icon: <ExclamationCircleOutlined />, children: <ExpiryTab /> },
          { key: '5', label: '原料追溯', icon: <AuditOutlined />, children: <TraceabilityTab /> },
        ]}
      />
    </Card>
  )
}
