import client from './client'

export interface ScannedCommission {
  code: string | null
  clientCompany: string | null
  fabricCode: string | null
  clientContact: string | null
  experimentDate: string | null
  expectedDate: string | null
  actualDate: string | null
  commissionType: string | null
  testItems: Array<{
    chemicalName: string
    lotNo: string
    testPurposes: string[]
    description: string
    result: string
  }>
  commissionNotes: {
    waitingForProcessing: boolean
    report: boolean
    cost: number | null
  }
  conclusionBefore: string | null
  conclusionAfter: string | null
}

export const scanCommissionPDF = (file: File) => {
  const form = new FormData()
  form.append('pdf', file)
  return client.post<{ success: boolean; data: ScannedCommission }>(
    '/commission-scan',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
}
