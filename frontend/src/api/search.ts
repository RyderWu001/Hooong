import client from './client'

export type SearchType =
  | 'formula' | 'ingredient' | 'experiment'
  | 'sample' | 'supplier' | 'knowledge'

export interface SearchHit {
  type: SearchType
  id: number
  title: string
  subtitle: string
  /** 命中欄位的 i18n key，文字由前端翻譯 */
  matchedFieldKey: string
  link: string
}

export interface SearchResult {
  query: string
  hits: SearchHit[]
  total: number
}

/** 類別顯示順序，與後端查詢順序無關，這裡固定讓結果分組穩定 */
export const SEARCH_TYPE_ORDER: SearchType[] = [
  'formula', 'ingredient', 'experiment', 'sample', 'supplier', 'knowledge',
]

/** 各類別「查看全部」要導向的列表頁 */
export const SEARCH_TYPE_LIST_ROUTE: Record<SearchType, string> = {
  formula: '/formulas',
  ingredient: '/materials',
  experiment: '/experiments',
  sample: '/samples',
  supplier: '/suppliers',
  knowledge: '/knowledge',
}

export const globalSearch = (q: string, signal?: AbortSignal) =>
  client.get<{ success: boolean; data: SearchResult }>('/search', {
    params: { q },
    signal,
  }).then(r => r.data.data)
