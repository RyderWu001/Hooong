import axios from './client'

export interface FormSignatureRecord {
  id: number
  formType: string
  formId: number
  slotName: string
  slotOrder: number
  signedById: number | null
  signedByName: string | null
  signatureImg: string | null
  signedAt: string | null
}

export function getFormSignatures(formType: string, formId: number) {
  return axios.get<{ success: boolean; data: FormSignatureRecord[] }>(
    `/form-signatures?formType=${formType}&formId=${formId}`
  ).then(r => r.data.data)
}

/**
 * 一次取得某類表單所有紀錄的簽核數量，回傳 { [formId]: count }。
 * 列表頁用這支取代逐筆呼叫 getFormSignatures，避免 N 筆資料發出 N 次請求。
 */
export function getFormSignatureCounts(formType: string) {
  return axios.get<{ success: boolean; data: Record<number, number> }>(
    `/form-signatures/counts?formType=${formType}`
  ).then(r => r.data.data)
}

export function applySignature(payload: {
  formType: string
  formId: number
  slotName: string
  slotOrder: number
  signatureImg: string | null
}) {
  return axios.post<{ success: boolean; data: FormSignatureRecord }>(
    '/form-signatures', payload
  ).then(r => r.data.data)
}

export function retractSignature(id: number) {
  return axios.delete(`/form-signatures/${id}`).then(r => r.data)
}

export function getMySignature(): Promise<string | null> {
  return axios.get<{ success: boolean; data: string | null }>(
    '/users/me/signature'
  ).then(r => r.data.data)
}

export function saveMySignature(signatureData: string | null) {
  return axios.put('/users/me/signature', { signatureData }).then(r => r.data)
}
