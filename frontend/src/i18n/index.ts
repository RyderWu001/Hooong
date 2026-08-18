import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhTW from './locales/zh-TW'
import vi from './locales/vi'

export const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文', short: '中' },
  { code: 'vi', label: 'Tiếng Việt', short: 'VI' },
] as const

export type LanguageCode = typeof LANGUAGES[number]['code']

const STORAGE_KEY = 'lang'

export function getStoredLanguage(): LanguageCode {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as LanguageCode
  // 未設定時依瀏覽器語系判斷，越南文瀏覽器直接進越南文介面
  return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'zh-TW'
}

export function setLanguage(code: LanguageCode) {
  localStorage.setItem(STORAGE_KEY, code)
  i18n.changeLanguage(code)
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    vi: { translation: vi },
  },
  lng: getStoredLanguage(),
  // 越南文尚未翻譯完的字串回退到中文，而不是顯示原始 key
  fallbackLng: 'zh-TW',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

export default i18n
