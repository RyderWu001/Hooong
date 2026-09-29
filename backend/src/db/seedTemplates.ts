import { Prisma } from '@prisma/client'
import prisma from './client'

/**
 * 內建實驗範本。以 key 為唯一識別，重複執行是安全的（upsert，只更新內建範本本身，
 * 不會動到使用者自訂的範本）。可獨立執行：npm run db:seed-templates
 */

type Field = {
  key: string; label: string; type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'date'
  unit?: string; placeholder?: string; options?: string[]; section?: string
  showWhen?: { key: string; in?: unknown[]; notIn?: unknown[] }
}

const FIXING_TYPES = ['定型機', '定型機-物性', '定型機-機能']

// 染整範本的 key 與 ExperimentGroup 舊欄位同名，舊資料不需遷移即可在新表單顯示與編輯
const dyeShow = { key: 'experimentType', notIn: FIXING_TYPES }
const fixShow = { key: 'experimentType', in: FIXING_TYPES }

export const BUILTIN_TEMPLATES: {
  key: string; name: string; domain: string; description: string; fields: Field[]
}[] = [
  {
    key: 'generic',
    name: '通用實驗',
    domain: '通用',
    description: '適用任何領域的基本條件欄位，可複製後自行增減欄位',
    fields: [
      { key: 'temperature', label: '溫度', type: 'number', unit: '°C', section: '基本條件' },
      { key: 'duration', label: '時間', type: 'number', unit: 'min', section: '基本條件' },
      { key: 'ph', label: 'pH', type: 'number', section: '基本條件' },
      { key: 'amount', label: '用量／劑量', type: 'text', placeholder: '例：5 g/L', section: '基本條件' },
      { key: 'method', label: '操作方法', type: 'textarea', section: '操作說明' },
    ],
  },
  {
    key: 'food',
    name: '食品配方開發',
    domain: '食品',
    description: '食品、飲料等配方的加工條件與品質指標',
    fields: [
      { key: 'heatTemp', label: '加熱溫度', type: 'number', unit: '°C', section: '加工條件' },
      { key: 'heatTime', label: '加熱時間', type: 'number', unit: 'min', section: '加工條件' },
      { key: 'sterilization', label: '殺菌方式', type: 'select', options: ['無', '巴氏殺菌', 'UHT', '高壓殺菌'], section: '加工條件' },
      { key: 'additives', label: '添加物', type: 'multiselect', options: ['防腐劑', '香料', '色素', '乳化劑', '增稠劑', '抗氧化劑', '甜味劑'], section: '加工條件' },
      { key: 'ph', label: 'pH', type: 'number', section: '品質指標' },
      { key: 'brix', label: '糖度', type: 'number', unit: '°Brix', section: '品質指標' },
      { key: 'aw', label: '水活性 (aw)', type: 'number', section: '品質指標' },
      { key: 'sensory', label: '官能評價', type: 'textarea', section: '品質指標' },
    ],
  },
  {
    key: 'detergent',
    name: '清潔劑／洗潔精',
    domain: '日用化學',
    description: '洗潔精、洗衣精等清潔類配方的性能測試條件',
    fields: [
      { key: 'dilution', label: '稀釋倍率', type: 'text', placeholder: '例：1:100', section: '測試條件' },
      { key: 'washTemp', label: '清洗溫度', type: 'number', unit: '°C', section: '測試條件' },
      { key: 'testMethod', label: '洗淨力測試方法', type: 'select', options: ['油污洗淨', '皂垢去除', '汙布洗淨', '其他'], section: '測試條件' },
      { key: 'ingredients', label: '主要成分', type: 'multiselect', options: ['界面活性劑', '香精', '防腐劑', '酵素', '螯合劑', '增稠劑', '色料'], section: '配方特性' },
      { key: 'ph', label: 'pH', type: 'number', section: '性能指標' },
      { key: 'viscosity', label: '黏度', type: 'number', unit: 'cP', section: '性能指標' },
      { key: 'foamHeight', label: '泡沫高度', type: 'number', unit: 'mm', section: '性能指標' },
      { key: 'remark', label: '觀察紀錄', type: 'textarea', section: '性能指標' },
    ],
  },
  {
    key: 'dyeing',
    name: '染整（相容舊資料）',
    domain: '紡織染整',
    description: '紡織染色與定型加工條件；欄位與舊版試驗組欄位相同，舊資料可直接沿用',
    fields: [
      { key: 'experimentType', label: '實驗項目', type: 'select', options: ['染色機', '定型機-物性', '定型機-機能'] },
      { key: 'bathRatio', label: '浴比', type: 'text', placeholder: '1:10', section: '染色條件', showWhen: dyeShow },
      { key: 'startPH', label: '起染 pH', type: 'number', section: '染色條件', showWhen: dyeShow },
      { key: 'endPH', label: '終染 pH', type: 'number', section: '染色條件', showWhen: dyeShow },
      { key: 'acidMethod', label: '加酸方式', type: 'text', section: '染色條件', showWhen: dyeShow },
      { key: 'tempRate', label: '升溫速率', type: 'text', placeholder: '1°C/min', section: '染色條件', showWhen: dyeShow },
      { key: 'holdTime', label: '保溫時間', type: 'number', unit: '分鐘', section: '染色條件', showWhen: dyeShow },
      { key: 'burningCondition', label: '燒毛/退漿/燒定漿條件', type: 'text', section: '染色條件', showWhen: dyeShow },
      { key: 'washCondition', label: '水洗條件', type: 'text', section: '染色條件', showWhen: dyeShow },
      { key: 'dyeAuxiliaries', label: '染色助劑', type: 'multiselect', options: ['勻染劑', '遮蔽劑', '破壞洗劑', '修復劑', '氯化鈣', '退色劑', '熟洗劑', '浴中柔軟劑'], section: '染色條件', showWhen: dyeShow },
      { key: 'leveler', label: '均染劑（用量）', type: 'text', section: '染色條件', showWhen: dyeShow },
      { key: 'fixer', label: '修補劑（用量）', type: 'text', section: '染色條件', showWhen: dyeShow },
      { key: 'calciumChloride', label: '氯化鈣（用量）', type: 'text', section: '染色條件', showWhen: dyeShow },
      { key: 'colorFixative', label: '固色劑（用量）', type: 'text', section: '染色條件', showWhen: dyeShow },
      { key: 'dyeCombination', label: '染料組合', type: 'text', section: '染料條件', showWhen: dyeShow },
      { key: 'dyeAmount', label: '添加量', type: 'text', section: '染料條件', showWhen: dyeShow },
      { key: 'fixingTemp', label: '加工溫度/時間', type: 'text', placeholder: '180°C × 30s', section: '定型加工條件', showWhen: fixShow },
      { key: 'fixingAuxAmount', label: '助劑用量', type: 'text', section: '定型加工條件', showWhen: fixShow },
      { key: 'fiberSpec', label: '纖維規格', type: 'text', section: '定型加工條件', showWhen: fixShow },
      { key: 'widthShrinkage', label: '門幅縮率', type: 'text', section: '定型加工條件', showWhen: fixShow },
      { key: 'shrinkTime', label: '縮水時間', type: 'text', section: '定型加工條件', showWhen: fixShow },
      {
        key: 'fixingAuxiliaries', label: '定型加工助劑', type: 'multiselect', section: '定型加工條件', showWhen: fixShow,
        options: ['吸濕快乾劑', '接水劑', '消毛劑', '燙煙裂劑', '摩擦電劑', '撥滑紙劑', '摩擦紙劑', '摩起毛起絨劑',
          '摩軟劑', '增硬劑', '增彈劑', '增重劑', '漿色劑', '起毛油劑', '摩紫外線劑', '黏劑',
          '摩耐防蛀劑', '高溫難燃防止劑', '溶液加工劑', '負面離子加工劑', '防毛劑',
          '預縮外線加工劑', '皮革漆沙劑', '皮革磷裂劑'],
      },
    ],
  },
]

export async function seedExperimentTemplates() {
  for (const t of BUILTIN_TEMPLATES) {
    const data = {
      name: t.name, domain: t.domain, description: t.description,
      fields: t.fields as unknown as Prisma.InputJsonValue, isBuiltin: true,
    }
    await prisma.experimentTemplate.upsert({ where: { key: t.key }, update: data, create: { key: t.key, ...data } })
  }
  console.log(`✅ 內建實驗範本 ${BUILTIN_TEMPLATES.length} 筆`)
}

// 直接執行此檔時：僅補齊內建範本（給已存在資料庫使用）
if (require.main === module) {
  seedExperimentTemplates()
    .catch((e) => { console.error(e); process.exitCode = 1 })
    .finally(() => prisma.$disconnect())
}
