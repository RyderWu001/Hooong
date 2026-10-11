/**
 * 洗衣精廠資料匯入（純新增，不刪除任何既有資料）。
 *
 * 產生約 1000 筆彼此關聯的資料：原料、庫存、進料批號、供應商、配方、配方成分、實驗。
 * 所有資料的編號都帶 DTG 前綴，方便日後辨識或整批移除：
 *   npx tsx scripts/seed-detergent.ts            # 預覽將產生的筆數
 *   npx tsx scripts/seed-detergent.ts --apply    # 實際寫入
 *   npx tsx scripts/seed-detergent.ts --remove   # 移除本腳本產生的資料
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const REMOVE = process.argv.includes('--remove')

/** 所有本腳本產生的資料都用這個前綴標記 */
const PREFIX = 'DTG'

// ── 決定性亂數 ────────────────────────────────────────────
// 用固定種子，重跑會產生一樣的資料，方便比對與除錯
let seed = 20260818
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]
const rint = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min
const rfloat = (min: number, max: number, dp = 2) =>
  Number((rnd() * (max - min) + min).toFixed(dp))
const daysFromNow = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}

// ── 原料主檔 ──────────────────────────────────────────────
// 洗衣精常用原料，CAS 號為實際登錄號碼
interface RawMat {
  name: string
  en: string
  cas?: string
  cat: string          // 對應系統的「原料分類」下拉選項
  unit: string
  price: number        // 每單位參考單價（TWD）
  solid?: string
  appearance?: string
  hazard?: boolean
}

const RAW_MATERIALS: RawMat[] = [
  // ── 陰離子表面活性劑 ──
  { name: '直鏈烷基苯磺酸 LAS-96', en: 'Linear Alkylbenzene Sulfonic Acid', cas: '27176-87-0', cat: '主原料', unit: 'KG', price: 42, solid: '96%', appearance: '棕色黏稠液體', hazard: true },
  { name: '十二烷基苯磺酸鈉', en: 'Sodium Dodecylbenzenesulfonate', cas: '25155-30-0', cat: '主原料', unit: 'KG', price: 38, solid: '90%', appearance: '淺黃色粉末' },
  { name: '脂肪醇聚醚硫酸鈉 AES-70', en: 'Sodium Laureth Sulfate (SLES-70)', cas: '68585-34-2', cat: '主原料', unit: 'KG', price: 46, solid: '70%', appearance: '白色膏狀' },
  { name: '十二烷基硫酸鈉 K12', en: 'Sodium Lauryl Sulfate', cas: '151-21-3', cat: '主原料', unit: 'KG', price: 55, solid: '92%', appearance: '白色針狀結晶' },
  { name: '月桂醇硫酸銨 K12A', en: 'Ammonium Lauryl Sulfate', cas: '2235-54-3', cat: '主原料', unit: 'KG', price: 52, solid: '70%', appearance: '淡黃色液體' },
  { name: 'α-烯基磺酸鈉 AOS-35', en: 'Sodium Alpha Olefin Sulfonate', cas: '68439-57-6', cat: '主原料', unit: 'KG', price: 44, solid: '35%', appearance: '淺黃色液體' },
  { name: '脂肪酸甲酯磺酸鈉 MES', en: 'Methyl Ester Sulfonate', cas: '149458-07-1', cat: '主原料', unit: 'KG', price: 49, solid: '70%', appearance: '淡黃色膏體' },
  { name: '磺基琥珀酸單酯二鈉', en: 'Disodium Laureth Sulfosuccinate', cas: '40754-59-4', cat: '主原料', unit: 'KG', price: 68, solid: '40%', appearance: '無色透明液體' },
  { name: '椰油醯基谷氨酸鈉', en: 'Sodium Cocoyl Glutamate', cas: '68187-32-6', cat: '主原料', unit: 'KG', price: 125, solid: '30%', appearance: '淡黃色液體' },
  { name: '硬脂酸鈉皂基', en: 'Sodium Stearate', cas: '822-16-2', cat: '主原料', unit: 'KG', price: 58, solid: '99%', appearance: '白色粉末' },

  // ── 非離子表面活性劑 ──
  { name: '脂肪醇聚氧乙烯醚 AEO-9', en: 'Fatty Alcohol Polyoxyethylene Ether', cas: '68439-46-3', cat: '主原料', unit: 'KG', price: 51, solid: '99%', appearance: '無色透明液體' },
  { name: '脂肪醇聚氧乙烯醚 AEO-7', en: 'AEO-7', cas: '68439-46-3', cat: '主原料', unit: 'KG', price: 50, solid: '99%', appearance: '無色透明液體' },
  { name: '脂肪醇聚氧乙烯醚 AEO-3', en: 'AEO-3', cas: '68439-46-3', cat: '主原料', unit: 'KG', price: 48, solid: '99%', appearance: '淡黃色液體' },
  { name: '烷基糖苷 APG-0810', en: 'Alkyl Polyglucoside C8-10', cas: '68515-73-1', cat: '主原料', unit: 'KG', price: 78, solid: '50%', appearance: '淡黃色黏稠液' },
  { name: '烷基糖苷 APG-1214', en: 'Alkyl Polyglucoside C12-14', cas: '110615-47-9', cat: '主原料', unit: 'KG', price: 82, solid: '50%', appearance: '淡黃色黏稠液' },
  { name: '椰油脂肪酸二乙醇醯胺 6501', en: 'Cocamide DEA', cas: '68603-42-9', cat: '助劑', unit: 'KG', price: 62, solid: '85%', appearance: '琥珀色黏稠液' },
  { name: '椰油脂肪酸單乙醇醯胺 6502', en: 'Cocamide MEA', cas: '68140-00-1', cat: '助劑', unit: 'KG', price: 66, solid: '90%', appearance: '淡黃色蠟狀' },
  { name: '異構十三醇聚醚 TO-8', en: 'Isotridecanol Ethoxylate', cas: '69011-36-5', cat: '主原料', unit: 'KG', price: 59, solid: '99%', appearance: '無色液體' },
  { name: '平平加 O-25', en: 'Peregal O-25', cas: '9002-92-0', cat: '助劑', unit: 'KG', price: 54, solid: '99%', appearance: '白色膏體' },
  { name: '聚山梨醇酯-80 (吐溫80)', en: 'Polysorbate 80', cas: '9005-65-6', cat: '助劑', unit: 'KG', price: 88, solid: '99%', appearance: '黃色黏稠液' },

  // ── 兩性 / 陽離子 ──
  { name: '椰油醯胺丙基甜菜鹼 CAB-35', en: 'Cocamidopropyl Betaine', cas: '61789-40-0', cat: '助劑', unit: 'KG', price: 47, solid: '35%', appearance: '淡黃色透明液' },
  { name: '椰油醯胺丙基氧化胺 CAO-30', en: 'Cocamidopropylamine Oxide', cas: '68155-09-9', cat: '助劑', unit: 'KG', price: 56, solid: '30%', appearance: '無色透明液體' },
  { name: '月桂基兩性醋酸鈉', en: 'Sodium Lauroamphoacetate', cas: '68647-44-9', cat: '助劑', unit: 'KG', price: 72, solid: '30%', appearance: '淡黃色液體' },
  { name: '酯基季銨鹽柔軟劑 TEA-Esterquat', en: 'TEA-Esterquat', cas: '91995-81-2', cat: '助劑', unit: 'KG', price: 95, solid: '90%', appearance: '乳白色膏體' },
  { name: '雙十八烷基二甲基氯化銨', en: 'Dioctadecyldimethylammonium Chloride', cas: '107-64-2', cat: '助劑', unit: 'KG', price: 105, solid: '75%', appearance: '白色膏體' },
  { name: '咪唑啉型柔軟劑 SOFT-IM', en: 'Imidazoline Softener', cas: '68966-38-1', cat: '助劑', unit: 'KG', price: 98, solid: '85%', appearance: '淡黃色膏體' },

  // ── 助洗劑 Builders ──
  { name: '三聚磷酸鈉 STPP', en: 'Sodium Tripolyphosphate', cas: '7758-29-4', cat: '助劑', unit: 'KG', price: 34, solid: '96%', appearance: '白色粉末' },
  { name: '4A 沸石', en: 'Zeolite 4A', cas: '1318-02-1', cat: '助劑', unit: 'KG', price: 18, solid: '99%', appearance: '白色細粉' },
  { name: '碳酸鈉（純鹼）', en: 'Sodium Carbonate', cas: '497-19-8', cat: '助劑', unit: 'KG', price: 12, solid: '99%', appearance: '白色粉末' },
  { name: '碳酸氫鈉', en: 'Sodium Bicarbonate', cas: '144-55-8', cat: '助劑', unit: 'KG', price: 15, solid: '99%', appearance: '白色粉末' },
  { name: '檸檬酸鈉', en: 'Sodium Citrate', cas: '68-04-2', cat: '助劑', unit: 'KG', price: 46, solid: '99%', appearance: '白色結晶' },
  { name: '檸檬酸（一水）', en: 'Citric Acid Monohydrate', cas: '5949-29-1', cat: '助劑', unit: 'KG', price: 38, solid: '99%', appearance: '白色結晶' },
  { name: '矽酸鈉（水玻璃）', en: 'Sodium Silicate', cas: '1344-09-8', cat: '助劑', unit: 'KG', price: 16, solid: '38%', appearance: '無色黏稠液', hazard: true },
  { name: '偏矽酸鈉', en: 'Sodium Metasilicate', cas: '6834-92-0', cat: '助劑', unit: 'KG', price: 22, solid: '99%', appearance: '白色顆粒', hazard: true },
  { name: 'EDTA 二鈉', en: 'Disodium EDTA', cas: '139-33-3', cat: '助劑', unit: 'KG', price: 88, solid: '99%', appearance: '白色粉末' },
  { name: 'EDTA 四鈉', en: 'Tetrasodium EDTA', cas: '64-02-8', cat: '助劑', unit: 'KG', price: 92, solid: '99%', appearance: '白色粉末' },
  { name: '聚丙烯酸鈉 PAAS', en: 'Sodium Polyacrylate', cas: '9003-04-7', cat: '助劑', unit: 'KG', price: 42, solid: '45%', appearance: '淡黃色黏稠液' },
  { name: '丙烯酸-馬來酸共聚物', en: 'Acrylic-Maleic Copolymer', cas: '52255-49-9', cat: '助劑', unit: 'KG', price: 48, solid: '45%', appearance: '琥珀色液體' },
  { name: 'HEDP 羥基乙叉二膦酸', en: 'HEDP', cas: '2809-21-4', cat: '助劑', unit: 'KG', price: 62, solid: '60%', appearance: '無色液體', hazard: true },
  { name: '硫酸鈉（元明粉）', en: 'Sodium Sulfate', cas: '7757-82-6', cat: '助劑', unit: 'KG', price: 8, solid: '99%', appearance: '白色粉末' },
  { name: '氯化鈉（工業級）', en: 'Sodium Chloride', cas: '7647-14-5', cat: '助劑', unit: 'KG', price: 6, solid: '99%', appearance: '白色結晶' },
  { name: '氫氧化鈉（片鹼）', en: 'Sodium Hydroxide', cas: '1310-73-2', cat: '危害化學品', unit: 'KG', price: 24, solid: '99%', appearance: '白色片狀', hazard: true },
  { name: '三乙醇胺 TEA', en: 'Triethanolamine', cas: '102-71-6', cat: '助劑', unit: 'KG', price: 58, solid: '99%', appearance: '無色黏稠液' },
  { name: '單乙醇胺 MEA', en: 'Monoethanolamine', cas: '141-43-5', cat: '助劑', unit: 'KG', price: 52, solid: '99%', appearance: '無色液體', hazard: true },

  // ── 酵素 ──
  { name: '鹼性蛋白酶 Savinase 16L', en: 'Protease (Savinase 16L)', cas: '9014-01-1', cat: '助劑', unit: 'KG', price: 420, solid: '液體酶', appearance: '棕色液體' },
  { name: '鹼性蛋白酶 Alcalase 2.4L', en: 'Protease (Alcalase 2.4L)', cas: '9014-01-1', cat: '助劑', unit: 'KG', price: 385, solid: '液體酶', appearance: '棕褐色液體' },
  { name: '澱粉酶 Termamyl 120L', en: 'Amylase (Termamyl 120L)', cas: '9000-90-2', cat: '助劑', unit: 'KG', price: 360, solid: '液體酶', appearance: '琥珀色液體' },
  { name: '澱粉酶 Stainzyme 12L', en: 'Amylase (Stainzyme)', cas: '9000-90-2', cat: '助劑', unit: 'KG', price: 395, solid: '液體酶', appearance: '棕色液體' },
  { name: '脂肪酶 Lipolase 100L', en: 'Lipase (Lipolase 100L)', cas: '9001-62-1', cat: '助劑', unit: 'KG', price: 450, solid: '液體酶', appearance: '棕色液體' },
  { name: '纖維素酶 Carezyme 1000L', en: 'Cellulase (Carezyme)', cas: '9012-54-8', cat: '助劑', unit: 'KG', price: 480, solid: '液體酶', appearance: '淡棕色液體' },
  { name: '甘露聚醣酶 Mannaway 4.0L', en: 'Mannanase (Mannaway)', cas: '37288-54-3', cat: '助劑', unit: 'KG', price: 510, solid: '液體酶', appearance: '棕色液體' },
  { name: '果膠酶 Pectaway', en: 'Pectate Lyase', cas: '9015-75-2', cat: '助劑', unit: 'KG', price: 495, solid: '液體酶', appearance: '琥珀色液體' },

  // ── 漂白系統 ──
  { name: '過碳酸鈉', en: 'Sodium Percarbonate', cas: '15630-89-4', cat: '危害化學品', unit: 'KG', price: 32, solid: '85%', appearance: '白色顆粒', hazard: true },
  { name: '過硼酸鈉（四水）', en: 'Sodium Perborate Tetrahydrate', cas: '10486-00-7', cat: '危害化學品', unit: 'KG', price: 36, solid: '99%', appearance: '白色結晶', hazard: true },
  { name: 'TAED 漂白活化劑', en: 'Tetraacetylethylenediamine', cas: '10543-57-4', cat: '助劑', unit: 'KG', price: 128, solid: '92%', appearance: '白色顆粒' },
  { name: '次氯酸鈉溶液', en: 'Sodium Hypochlorite', cas: '7681-52-9', cat: '危害化學品', unit: 'KG', price: 14, solid: '10%', appearance: '淡黃色液體', hazard: true },
  { name: '過氧化氫 35%', en: 'Hydrogen Peroxide 35%', cas: '7722-84-1', cat: '危害化學品', unit: 'KG', price: 26, solid: '35%', appearance: '無色液體', hazard: true },

  // ── 螢光增白劑 ──
  { name: '螢光增白劑 CBS-X', en: 'Optical Brightener CBS-X', cas: '27344-41-8', cat: '助劑', unit: 'KG', price: 285, solid: '99%', appearance: '淡黃綠色粉末' },
  { name: '螢光增白劑 CBS-351', en: 'Optical Brightener CBS-351', cas: '27344-41-8', cat: '助劑', unit: 'KG', price: 295, solid: '99%', appearance: '黃綠色粉末' },
  { name: '螢光增白劑 BBU', en: 'Optical Brightener BBU', cas: '16470-24-9', cat: '助劑', unit: 'KG', price: 268, solid: '99%', appearance: '淡黃色粉末' },
  { name: '螢光增白劑 CXT', en: 'Optical Brightener CXT', cas: '12224-16-7', cat: '助劑', unit: 'KG', price: 258, solid: '99%', appearance: '黃色粉末' },

  // ── 抗再沉積 / 護色 ──
  { name: '羧甲基纖維素鈉 CMC', en: 'Sodium Carboxymethyl Cellulose', cas: '9004-32-4', cat: '助劑', unit: 'KG', price: 72, solid: '99%', appearance: '白色粉末' },
  { name: 'PVP K30 聚乙烯吡咯烷酮', en: 'Polyvinylpyrrolidone K30', cas: '9003-39-8', cat: '助劑', unit: 'KG', price: 168, solid: '99%', appearance: '白色粉末' },
  { name: '防串色捕色劑 DCR', en: 'Dye Transfer Inhibitor', cas: '25232-41-1', cat: '助劑', unit: 'KG', price: 195, solid: '30%', appearance: '淡黃色液體' },
  { name: '護色劑 CP-100', en: 'Color Protection Agent', cat: '助劑', unit: 'KG', price: 152, solid: '40%', appearance: '乳白色液體' },

  // ── 增稠 / 流變 ──
  { name: '聚乙二醇 PEG-6000', en: 'Polyethylene Glycol 6000', cas: '25322-68-3', cat: '助劑', unit: 'KG', price: 64, solid: '99%', appearance: '白色片狀' },
  { name: '聚乙二醇 PEG-400', en: 'Polyethylene Glycol 400', cas: '25322-68-3', cat: '助劑', unit: 'KG', price: 58, solid: '99%', appearance: '無色黏稠液' },
  { name: '卡波姆 Carbomer 940', en: 'Carbomer 940', cas: '9007-20-9', cat: '助劑', unit: 'KG', price: 320, solid: '99%', appearance: '白色鬆散粉末' },
  { name: '羥乙基纖維素 HEC', en: 'Hydroxyethyl Cellulose', cas: '9004-62-0', cat: '助劑', unit: 'KG', price: 185, solid: '99%', appearance: '白色粉末' },
  { name: '黃原膠', en: 'Xanthan Gum', cas: '11138-66-2', cat: '助劑', unit: 'KG', price: 210, solid: '99%', appearance: '米白色粉末' },

  // ── 防腐 / 抗菌 ──
  { name: '卡松防腐劑 CG', en: 'Kathon CG (CMIT/MIT)', cas: '26172-55-4', cat: '抗菌劑（防腐劑）', unit: 'KG', price: 240, solid: '1.5%', appearance: '淡黃色液體', hazard: true },
  { name: '苯氧乙醇', en: 'Phenoxyethanol', cas: '122-99-6', cat: '抗菌劑（防腐劑）', unit: 'KG', price: 156, solid: '99%', appearance: '無色液體' },
  { name: '苯甲酸鈉', en: 'Sodium Benzoate', cas: '532-32-1', cat: '抗菌劑（防腐劑）', unit: 'KG', price: 68, solid: '99%', appearance: '白色粉末' },
  { name: '山梨酸鉀', en: 'Potassium Sorbate', cas: '24634-61-5', cat: '抗菌劑（防腐劑）', unit: 'KG', price: 118, solid: '99%', appearance: '白色顆粒' },
  { name: '布羅波爾 Bronopol', en: 'Bronopol', cas: '52-51-7', cat: '抗菌劑（防腐劑）', unit: 'KG', price: 285, solid: '99%', appearance: '白色結晶', hazard: true },
  { name: 'DMDM 乙內醯脲', en: 'DMDM Hydantoin', cas: '6440-58-0', cat: '抗菌劑（防腐劑）', unit: 'KG', price: 172, solid: '55%', appearance: '無色液體' },
  { name: '苯扎氯銨 BKC-80', en: 'Benzalkonium Chloride', cas: '8001-54-5', cat: '抗菌劑（防腐劑）', unit: 'KG', price: 128, solid: '80%', appearance: '淡黃色液體', hazard: true },
  { name: 'PCMX 對氯間二甲酚', en: 'Chloroxylenol (PCMX)', cas: '88-04-0', cat: '抗菌劑（防腐劑）', unit: 'KG', price: 315, solid: '99%', appearance: '白色結晶' },
  { name: '銀離子抗菌劑 AG-100', en: 'Silver Ion Antibacterial Agent', cat: '抗菌劑（防腐劑）', unit: 'KG', price: 880, solid: '2%', appearance: '白色粉末' },

  // ── 消泡劑 ──
  { name: '有機矽消泡劑 SI-30', en: 'Silicone Antifoam Emulsion', cas: '63148-62-9', cat: '消泡劑', unit: 'KG', price: 145, solid: '30%', appearance: '乳白色乳液' },
  { name: '聚醚消泡劑 PPE', en: 'Polyether Antifoam', cas: '9038-95-3', cat: '消泡劑', unit: 'KG', price: 118, solid: '99%', appearance: '淡黃色液體' },
  { name: '礦物油消泡劑 MO-20', en: 'Mineral Oil Antifoam', cat: '消泡劑', unit: 'KG', price: 96, solid: '20%', appearance: '乳白色乳液' },

  // ── 溶劑 / 助溶 ──
  { name: '乙醇（工業級 95%）', en: 'Ethanol 95%', cas: '64-17-5', cat: '溶劑', unit: 'L', price: 45, solid: '95%', appearance: '無色液體', hazard: true },
  { name: '異丙醇 IPA', en: 'Isopropyl Alcohol', cas: '67-63-0', cat: '溶劑', unit: 'L', price: 52, solid: '99%', appearance: '無色液體', hazard: true },
  { name: '丙二醇 PG', en: 'Propylene Glycol', cas: '57-55-6', cat: '溶劑', unit: 'KG', price: 62, solid: '99%', appearance: '無色黏稠液' },
  { name: '二乙二醇丁醚（丁基卡必醇）', en: 'Diethylene Glycol Monobutyl Ether', cas: '112-34-5', cat: '溶劑', unit: 'KG', price: 78, solid: '99%', appearance: '無色液體', hazard: true },
  { name: '二甲苯磺酸鈉 SXS-40', en: 'Sodium Xylene Sulfonate', cas: '1300-72-7', cat: '助劑', unit: 'KG', price: 38, solid: '40%', appearance: '淡黃色液體' },
  { name: '尿素', en: 'Urea', cas: '57-13-6', cat: '助劑', unit: 'KG', price: 22, solid: '99%', appearance: '白色顆粒' },
  { name: '甘油（丙三醇）', en: 'Glycerin', cas: '56-81-5', cat: '助劑', unit: 'KG', price: 54, solid: '99.5%', appearance: '無色黏稠液' },
  { name: '去離子水', en: 'Deionized Water', cas: '7732-18-5', cat: '溶劑', unit: 'KG', price: 2, solid: '—', appearance: '無色透明' },

  // ── 香精 ──
  { name: '香精 薰衣草 LV-208', en: 'Fragrance Lavender', cat: '助劑', unit: 'KG', price: 680, appearance: '淡紫色液體' },
  { name: '香精 白麝香 WM-115', en: 'Fragrance White Musk', cat: '助劑', unit: 'KG', price: 720, appearance: '無色液體' },
  { name: '香精 檸檬柑橘 CT-330', en: 'Fragrance Citrus', cat: '助劑', unit: 'KG', price: 590, appearance: '淡黃色液體' },
  { name: '香精 海洋微風 OC-042', en: 'Fragrance Ocean Breeze', cat: '助劑', unit: 'KG', price: 640, appearance: '淡藍色液體' },
  { name: '香精 茉莉花 JS-517', en: 'Fragrance Jasmine', cat: '助劑', unit: 'KG', price: 750, appearance: '淡黃色液體' },
  { name: '香精 櫻花 SK-620', en: 'Fragrance Sakura', cat: '助劑', unit: 'KG', price: 810, appearance: '淡粉色液體' },
  { name: '香精 嬰兒爽身 BB-101', en: 'Fragrance Baby Powder', cat: '助劑', unit: 'KG', price: 690, appearance: '無色液體' },
  { name: '香精 森林木質 FW-455', en: 'Fragrance Forest Wood', cat: '助劑', unit: 'KG', price: 705, appearance: '淡棕色液體' },

  // ── 色素 ──
  { name: '色素 亮藍 FCF', en: 'Brilliant Blue FCF', cas: '3844-45-9', cat: '助劑', unit: 'KG', price: 420, solid: '85%', appearance: '藍色粉末' },
  { name: '色素 檸檬黃', en: 'Tartrazine', cas: '1934-21-0', cat: '助劑', unit: 'KG', price: 385, solid: '85%', appearance: '黃色粉末' },
  { name: '色素 胭脂紅', en: 'Ponceau 4R', cas: '2611-82-7', cat: '助劑', unit: 'KG', price: 405, solid: '85%', appearance: '紅色粉末' },
  { name: '色素 酸性綠 25', en: 'Acid Green 25', cas: '4403-90-1', cat: '助劑', unit: 'KG', price: 445, solid: '85%', appearance: '綠色粉末' },

  // ── 特殊功能 ──
  { name: '珠光片 EGDS', en: 'Ethylene Glycol Distearate', cas: '627-83-8', cat: '助劑', unit: 'KG', price: 132, solid: '99%', appearance: '白色片狀' },
  { name: '硼砂（酵素穩定劑）', en: 'Sodium Borate', cas: '1303-96-4', cat: '助劑', unit: 'KG', price: 42, solid: '99%', appearance: '白色結晶', hazard: true },
  { name: '甲酸鈣（酵素穩定劑）', en: 'Calcium Formate', cas: '544-17-2', cat: '助劑', unit: 'KG', price: 48, solid: '98%', appearance: '白色粉末' },
  { name: '織物柔軟矽油 AM-200', en: 'Amino Silicone Softener', cas: '68554-54-1', cat: '助劑', unit: 'KG', price: 225, solid: '60%', appearance: '乳白色乳液' },
  { name: '抗靜電劑 AS-50', en: 'Antistatic Agent', cat: '助劑', unit: 'KG', price: 168, solid: '50%', appearance: '淡黃色液體' },
  { name: '環糊精除臭劑 CD-90', en: 'Cyclodextrin Deodorizer', cas: '7585-39-9', cat: '助劑', unit: 'KG', price: 520, solid: '95%', appearance: '白色粉末' },
  { name: '衣物護理蛋白 WP-30', en: 'Hydrolyzed Wheat Protein', cas: '70084-87-6', cat: '助劑', unit: 'KG', price: 340, solid: '30%', appearance: '淡黃色液體' },
  { name: '蘆薈萃取液', en: 'Aloe Vera Extract', cas: '85507-69-3', cat: '助劑', unit: 'KG', price: 285, solid: '10%', appearance: '淡黃色液體' },
  { name: '維他命E（生育酚）', en: 'Tocopherol', cas: '10191-41-0', cat: '助劑', unit: 'KG', price: 620, solid: '95%', appearance: '淡黃色黏稠液' },
  { name: '茶樹精油', en: 'Tea Tree Oil', cas: '68647-73-4', cat: '助劑', unit: 'KG', price: 780, solid: '100%', appearance: '無色至淡黃液體' },

  // ── 包材 ──
  { name: '5L HDPE 瓶（含蓋）', en: '5L HDPE Bottle', cat: '包材', unit: '其他', price: 28, appearance: '白色瓶身' },
  { name: '2L PET 瓶（含壓頭）', en: '2L PET Bottle with Pump', cat: '包材', unit: '其他', price: 22, appearance: '透明瓶身' },
  { name: '1L PE 瓶（含蓋）', en: '1L PE Bottle', cat: '包材', unit: '其他', price: 14, appearance: '白色瓶身' },
  { name: '洗衣凝珠 PVA 水溶膜', en: 'PVA Water-Soluble Film', cas: '9002-89-5', cat: '包材', unit: 'KG', price: 380, appearance: '透明薄膜' },
  { name: '1.5L 補充包鋁箔袋', en: '1.5L Refill Pouch', cat: '包材', unit: '其他', price: 9, appearance: '銀色軟袋' },
  { name: '200L 開口鐵桶', en: '200L Steel Drum', cat: '包材', unit: '其他', price: 850, appearance: '藍色鐵桶' },
  { name: '1000L IBC 桶', en: '1000L IBC Tank', cat: '包材', unit: '其他', price: 4200, appearance: '白色方桶' },
  { name: '外箱瓦楞紙箱 5L×4', en: 'Corrugated Carton', cat: '包材', unit: '其他', price: 18, appearance: '牛皮紙色' },
]

// ── 供應商 ──────────────────────────────────────────────
const SUPPLIERS = [
  { name: '台塑石化股份有限公司', contact: '陳志明', items: 'LAS、AEO 系列表面活性劑' },
  { name: '和益化學工業股份有限公司', contact: '林淑芬', items: 'AES、CAB 系列' },
  { name: '中日合成化學股份有限公司', contact: '王建國', items: '非離子表面活性劑' },
  { name: '諾維信生物技術（中國）', contact: 'Zhang Wei', items: '洗滌用酵素全系列' },
  { name: '傑能科國際生物科技', contact: 'Li Ming', items: '蛋白酶、澱粉酶' },
  { name: '巴斯夫台灣股份有限公司', contact: '黃美玲', items: '螯合劑、聚合物助劑' },
  { name: '德謙化學股份有限公司', contact: '張家豪', items: '增白劑、色素' },
  { name: '長春人造樹脂廠', contact: '劉俊宏', items: 'PEG、多元醇' },
  { name: '永光化學工業股份有限公司', contact: '吳雅婷', items: '螢光增白劑' },
  { name: '國喬石油化學股份有限公司', contact: '蔡文豪', items: '溶劑類' },
  { name: '奇鈺香料股份有限公司', contact: '鄭佩君', items: '洗滌用香精' },
  { name: '芬美意香料（上海）', contact: 'Chen Hao', items: '高階香精' },
  { name: '聯華化學工業股份有限公司', contact: '許世凱', items: '純鹼、矽酸鈉' },
  { name: '台灣道康寧股份有限公司', contact: '楊心怡', items: '矽油、消泡劑' },
  { name: '宏全國際股份有限公司', contact: '賴俊傑', items: '瓶罐包材' },
]

// ── 配方產品線 ────────────────────────────────────────────
interface ProductLine {
  line: string
  productType: string
  /** [原料名稱, 最小比例, 最大比例] */
  recipe: [string, number, number][]
  /**
   * 補足量原料：其比例不是隨機決定，而是 100 減去其他所有成分。
   * 真實配方總和必須是 100%，液劑用水補足、粉劑用元明粉補足。
   */
  balance: string
}

const PRODUCT_LINES: ProductLine[] = [
  {
    line: '濃縮洗衣精',
    productType: '液體洗滌劑',
    recipe: [
      ['直鏈烷基苯磺酸 LAS-96', 12, 18], ['脂肪醇聚醚硫酸鈉 AES-70', 10, 15],
      ['脂肪醇聚氧乙烯醚 AEO-9', 6, 10], ['椰油脂肪酸二乙醇醯胺 6501', 2, 4],
      ['檸檬酸鈉', 1.5, 3], ['丙二醇 PG', 2, 4], ['鹼性蛋白酶 Savinase 16L', 0.3, 0.8],
      ['螢光增白劑 CBS-X', 0.1, 0.3], ['卡松防腐劑 CG', 0.05, 0.15],
      ['去離子水', 45, 60],
    ],
    balance: '去離子水',
  },
  {
    line: '一般洗衣精',
    productType: '液體洗滌劑',
    recipe: [
      ['直鏈烷基苯磺酸 LAS-96', 6, 10], ['脂肪醇聚醚硫酸鈉 AES-70', 4, 8],
      ['脂肪醇聚氧乙烯醚 AEO-9', 3, 5], ['二甲苯磺酸鈉 SXS-40', 1, 3],
      ['氯化鈉（工業級）', 0.5, 1.5], ['苯甲酸鈉', 0.1, 0.3],
      ['去離子水', 70, 82],
    ],
    balance: '去離子水',
  },
  {
    line: '抗菌洗衣精',
    productType: '液體洗滌劑',
    recipe: [
      ['直鏈烷基苯磺酸 LAS-96', 8, 12], ['脂肪醇聚醚硫酸鈉 AES-70', 6, 10],
      ['苯扎氯銨 BKC-80', 0.5, 1.2], ['PCMX 對氯間二甲酚', 0.2, 0.5],
      ['椰油醯胺丙基甜菜鹼 CAB-35', 2, 4], ['EDTA 二鈉', 0.2, 0.5],
      ['去離子水', 65, 78],
    ],
    balance: '去離子水',
  },
  {
    line: '嬰幼兒洗衣精',
    productType: '液體洗滌劑',
    recipe: [
      ['烷基糖苷 APG-1214', 8, 12], ['椰油醯基谷氨酸鈉', 4, 7],
      ['椰油醯胺丙基甜菜鹼 CAB-35', 3, 5], ['甘油（丙三醇）', 2, 4],
      ['蘆薈萃取液', 0.5, 1.5], ['苯氧乙醇', 0.3, 0.6],
      ['去離子水', 68, 80],
    ],
    balance: '去離子水',
  },
  {
    line: '洗衣粉',
    productType: '粉體洗滌劑',
    recipe: [
      ['十二烷基苯磺酸鈉', 14, 20], ['4A 沸石', 20, 28], ['碳酸鈉（純鹼）', 15, 22],
      ['矽酸鈉（水玻璃）', 5, 9], ['硫酸鈉（元明粉）', 15, 25],
      ['羧甲基纖維素鈉 CMC', 0.8, 1.5], ['螢光增白劑 CBS-351', 0.15, 0.35],
      ['澱粉酶 Termamyl 120L', 0.3, 0.7], ['香精 檸檬柑橘 CT-330', 0.1, 0.3],
    ],
    balance: '硫酸鈉（元明粉）',
  },
  {
    line: '含氧漂白洗衣粉',
    productType: '粉體洗滌劑',
    recipe: [
      ['十二烷基苯磺酸鈉', 12, 16], ['4A 沸石', 18, 24], ['碳酸鈉（純鹼）', 14, 20],
      ['過碳酸鈉', 10, 16], ['TAED 漂白活化劑', 2, 4],
      ['硫酸鈉（元明粉）', 15, 22], ['螢光增白劑 BBU', 0.1, 0.3],
    ],
    balance: '硫酸鈉（元明粉）',
  },
  {
    line: '洗衣凝珠',
    productType: '單劑量洗滌劑',
    recipe: [
      ['直鏈烷基苯磺酸 LAS-96', 18, 24], ['脂肪醇聚氧乙烯醚 AEO-7', 14, 20],
      ['丙二醇 PG', 10, 16], ['甘油（丙三醇）', 8, 12],
      ['鹼性蛋白酶 Alcalase 2.4L', 0.8, 1.5], ['脂肪酶 Lipolase 100L', 0.3, 0.7],
      ['螢光增白劑 CBS-X', 0.2, 0.4], ['去離子水', 12, 20],
    ],
    balance: '去離子水',
  },
  {
    line: '衣物柔軟精',
    productType: '衣物護理劑',
    recipe: [
      ['酯基季銨鹽柔軟劑 TEA-Esterquat', 5, 8], ['織物柔軟矽油 AM-200', 0.8, 1.5],
      ['抗靜電劑 AS-50', 0.3, 0.8], ['氯化鈉（工業級）', 0.1, 0.3],
      ['卡松防腐劑 CG', 0.05, 0.12], ['去離子水', 86, 92],
    ],
    balance: '去離子水',
  },
  {
    line: '濃縮柔軟精',
    productType: '衣物護理劑',
    recipe: [
      ['雙十八烷基二甲基氯化銨', 10, 15], ['咪唑啉型柔軟劑 SOFT-IM', 4, 7],
      ['織物柔軟矽油 AM-200', 1.5, 3], ['異丙醇 IPA', 2, 4],
      ['去離子水', 70, 80],
    ],
    balance: '去離子水',
  },
  {
    line: '彩色衣物漂白劑',
    productType: '漂白劑',
    recipe: [
      ['過氧化氫 35%', 6, 10], ['過碳酸鈉', 4, 8], ['HEDP 羥基乙叉二膦酸', 0.5, 1.2],
      ['脂肪醇聚氧乙烯醚 AEO-9', 2, 4], ['去離子水', 76, 86],
    ],
    balance: '去離子水',
  },
  {
    line: '領袖淨去漬劑',
    productType: '前處理劑',
    recipe: [
      ['脂肪醇聚醚硫酸鈉 AES-70', 12, 18], ['二乙二醇丁醚（丁基卡必醇）', 5, 9],
      ['鹼性蛋白酶 Savinase 16L', 1, 2], ['脂肪酶 Lipolase 100L', 0.5, 1],
      ['三乙醇胺 TEA', 1, 2.5], ['去離子水', 68, 78],
    ],
    balance: '去離子水',
  },
  {
    line: '運動衣物專用洗劑',
    productType: '液體洗滌劑',
    recipe: [
      ['脂肪醇聚氧乙烯醚 AEO-9', 8, 12], ['烷基糖苷 APG-0810', 5, 8],
      ['環糊精除臭劑 CD-90', 1, 2.5], ['茶樹精油', 0.3, 0.8],
      ['甘露聚醣酶 Mannaway 4.0L', 0.3, 0.6], ['去離子水', 72, 82],
    ],
    balance: '去離子水',
  },
  {
    line: '冷水速溶洗衣精',
    productType: '液體洗滌劑',
    recipe: [
      ['脂肪醇聚醚硫酸鈉 AES-70', 10, 15], ['烷基糖苷 APG-1214', 6, 9],
      ['澱粉酶 Stainzyme 12L', 0.5, 1], ['纖維素酶 Carezyme 1000L', 0.3, 0.7],
      ['丙二醇 PG', 3, 5], ['去離子水', 68, 78],
    ],
    balance: '去離子水',
  },
  {
    line: '工業用大型洗衣機洗劑',
    productType: '商用洗滌劑',
    recipe: [
      ['直鏈烷基苯磺酸 LAS-96', 15, 22], ['偏矽酸鈉', 8, 12],
      ['氫氧化鈉（片鹼）', 3, 6], ['EDTA 四鈉', 1.5, 3],
      ['有機矽消泡劑 SI-30', 0.3, 0.8], ['去離子水', 55, 68],
    ],
    balance: '去離子水',
  },
  {
    line: '手洗精華洗衣露',
    productType: '液體洗滌劑',
    recipe: [
      ['椰油醯基谷氨酸鈉', 8, 12], ['烷基糖苷 APG-1214', 5, 8],
      ['椰油醯胺丙基氧化胺 CAO-30', 3, 5], ['衣物護理蛋白 WP-30', 0.5, 1.2],
      ['維他命E（生育酚）', 0.1, 0.3], ['去離子水', 70, 80],
    ],
    balance: '去離子水',
  },
]

const SCENT_VARIANTS = [
  ['薰衣草', '香精 薰衣草 LV-208'], ['白麝香', '香精 白麝香 WM-115'],
  ['檸檬柑橘', '香精 檸檬柑橘 CT-330'], ['海洋微風', '香精 海洋微風 OC-042'],
  ['茉莉花', '香精 茉莉花 JS-517'], ['櫻花', '香精 櫻花 SK-620'],
  ['嬰兒爽身', '香精 嬰兒爽身 BB-101'], ['森林木質', '香精 森林木質 FW-455'],
] as const

const FORMULA_STATUS = ['草稿', '審核中', '已發布', '已發布', '已發布', '已凍結'] as const
const FORMULA_TYPES = ['樣品', '實驗', '正式產品', '正式產品'] as const

// ── 移除模式 ──────────────────────────────────────────────
async function removeAll() {
  console.log(`🗑  移除所有 ${PREFIX} 前綴的資料…\n`)
  const ings = await prisma.ingredient.findMany({
    where: { code: { startsWith: PREFIX } }, select: { id: true },
  })
  const ingIds = ings.map((i) => i.id)
  const forms = await prisma.formula.findMany({
    where: { code: { startsWith: PREFIX } }, select: { id: true },
  })
  const formIds = forms.map((f) => f.id)

  // 依外鍵相依順序刪除
  const r1 = await prisma.experimentResult.deleteMany({ where: { experiment: { code: { startsWith: PREFIX } } } })
  const r2 = await prisma.experiment.deleteMany({ where: { code: { startsWith: PREFIX } } })
  const r3 = await prisma.formulaIngredient.deleteMany({ where: { formulaId: { in: formIds } } })
  const r4 = await prisma.formula.deleteMany({ where: { id: { in: formIds } } })
  const r5 = await prisma.ingredientBatch.deleteMany({ where: { ingredientId: { in: ingIds } } })
  const r6 = await prisma.materialInventory.deleteMany({ where: { ingredientId: { in: ingIds } } })
  const r7 = await prisma.ingredient.deleteMany({ where: { id: { in: ingIds } } })
  const r8 = await prisma.supplier.deleteMany({ where: { code: { startsWith: PREFIX } } })

  const total = [r1, r2, r3, r4, r5, r6, r7, r8].reduce((s, r) => s + r.count, 0)
  console.log(`  實驗結果 ${r1.count}｜實驗 ${r2.count}｜配方成分 ${r3.count}｜配方 ${r4.count}`)
  console.log(`  進料批號 ${r5.count}｜庫存 ${r6.count}｜原料 ${r7.count}｜供應商 ${r8.count}`)
  console.log(`\n✓ 共移除 ${total} 筆`)
}

// ── 主流程 ────────────────────────────────────────────────
async function main() {
  if (REMOVE) return removeAll()

  const existing = await prisma.ingredient.count({ where: { code: { startsWith: PREFIX } } })
  if (existing > 0 && APPLY) {
    console.log(`⚠️  已存在 ${existing} 筆 ${PREFIX} 原料，請先執行 --remove 再重新匯入。`)
    return
  }

  const creator = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    ?? await prisma.user.findFirst()

  const plan = {
    供應商: SUPPLIERS.length,
    原料: RAW_MATERIALS.length,
    庫存: RAW_MATERIALS.length,
    進料批號: 0,
    配方: 0,
    配方成分: 0,
    實驗: 0,
  }

  // 預估批號與配方數量
  // 每種原料 1~2 筆批號
  plan.進料批號 = Math.round(RAW_MATERIALS.length * 1.5)
  const formulaCount = 65
  plan.配方 = formulaCount
  plan.配方成分 = PRODUCT_LINES.reduce((s, l) => s + l.recipe.length, 0) / PRODUCT_LINES.length * formulaCount
  plan.實驗 = 30
  const 實驗結果 = 24

  const est = Object.values(plan).reduce((a, b) => a + b, 0) + 實驗結果
  console.log(APPLY ? '⚙️  寫入模式\n' : '🔍 預覽模式（加上 --apply 才會寫入）\n')
  for (const [k, v] of Object.entries(plan)) console.log(`  ${k}: ${Math.round(v)}`)
  console.log(`  實驗結果: 約 ${實驗結果}`)
  console.log(`  ──────────────`)
  console.log(`  預估合計: 約 ${Math.round(est)} 筆\n`)

  if (!APPLY) {
    console.log('確認無誤後加上 --apply 執行。')
    return
  }

  let created = 0

  // 1) 新增產業別選項（洗衣精屬清潔用品業，原本的選項沒有）
  const industryCat = await prisma.dropdownCategory.findUnique({ where: { key: 'ingredient_industry' } })
  if (industryCat) {
    const has = await prisma.dropdownOption.findFirst({
      where: { categoryId: industryCat.id, value: '清潔用品業' },
    })
    if (!has) {
      const max = await prisma.dropdownOption.aggregate({
        where: { categoryId: industryCat.id }, _max: { sortOrder: true },
      })
      await prisma.dropdownOption.create({
        data: {
          categoryId: industryCat.id,
          value: '清潔用品業',
          label: '清潔用品業',
          sortOrder: (max._max.sortOrder ?? 0) + 1,
        },
      })
      console.log('  ✓ 已新增產業別選項「清潔用品業」')
    }
  }

  // 2) 供應商
  const supplierIds: number[] = []
  for (let i = 0; i < SUPPLIERS.length; i++) {
    const s = SUPPLIERS[i]
    const sup = await prisma.supplier.create({
      data: {
        code: `${PREFIX}-SUP-${String(i + 1).padStart(3, '0')}`,
        name: s.name,
        contactPerson: s.contact,
        phone: `0${rint(2, 7)}-${rint(2000000, 9999999)}`,
        email: `sales${i + 1}@example.com.tw`,
        address: `${pick(['台北市', '新北市', '桃園市', '台中市', '高雄市', '彰化縣'])}${pick(['中山區', '大安區', '西屯區', '前鎮區', '平鎮區'])}${pick(['工業一路', '中華路', '民生東路', '成功路'])}${rint(1, 500)}號`,
        supplyItems: s.items,
        status: 'ACTIVE',
      },
    })
    supplierIds.push(sup.id)
    created++
  }
  console.log(`  ✓ 供應商 ${SUPPLIERS.length} 筆`)

  // 3) 原料 + 庫存 + 進料批號
  const ingByName = new Map<string, number>()
  let batchCount = 0

  for (let i = 0; i < RAW_MATERIALS.length; i++) {
    const m = RAW_MATERIALS[i]
    const code = `${PREFIX}-${String(i + 1).padStart(4, '0')}`
    const ing = await prisma.ingredient.create({
      data: {
        name: m.name,
        code,
        casNo: m.cas ?? null,
        englishName: m.en,
        category: m.cat,
        industry: '清潔用品業',
        status: i % 40 === 39 ? '停用' : '使用中',
        solidContent: m.solid ?? null,
        density: m.unit === 'KG' || m.unit === 'L' ? `${rfloat(0.85, 1.35)} g/cm³` : null,
        appearance: m.appearance ?? null,
        storageCondition: m.hazard
          ? '陰涼通風處，遠離火源與氧化劑，專區存放'
          : pick(['常溫陰涼乾燥處', '常溫避光保存', '15-30°C 密封保存']),
        shelfLife: pick(['12 個月', '18 個月', '24 個月', '36 個月']),
        packageSpec: m.unit === '其他' ? '包' : pick(['鐵桶', '塑膠桶', 'IBC桶', '包']),
        unit: m.unit,
        unitPrice: m.price,
        description: `${m.en}${m.hazard ? '（危害性化學品，操作須配戴防護具）' : ''}`,
        createdById: creator?.id ?? null,
        qcStandards: {
          外觀: m.appearance ?? '符合標準品',
          固含量: m.solid ?? '—',
          pH值: m.cat === '危害化學品' ? `${rfloat(10, 13, 1)}` : `${rfloat(5.5, 9.5, 1)}`,
        },
      },
    })
    ingByName.set(m.name, ing.id)
    created++

    // 庫存：約 1/6 的原料設為低於安全庫存，讓提醒功能有真實資料可顯示
    const safety = Math.round(rfloat(100, 800, 0))
    const low = i % 6 === 0
    await prisma.materialInventory.create({
      data: {
        ingredientId: ing.id,
        currentStock: low ? Math.round(safety * rfloat(0.1, 0.85)) : Math.round(safety * rfloat(1.2, 4)),
        safetyStock: safety,
        supplier: SUPPLIERS[i % SUPPLIERS.length].name,
        expiryDate: daysFromNow(rint(30, 900)),
      },
    })
    created++

    // 進料批號：少數刻意設為已過期或即將到期
    const nBatches = i % 2 === 0 ? 2 : 1
    for (let b = 0; b < nBatches; b++) {
      const arrival = daysFromNow(-rint(20, 400))
      const shelfDays = rint(360, 1080)
      const expiry = new Date(arrival)
      expiry.setDate(expiry.getDate() + shelfDays)
      // 每 25 個原料安排一筆已過期、一筆近效期，供效期提醒測試
      const special = i % 25
      const expiryFinal =
        special === 0 && b === 0 ? daysFromNow(-rint(3, 45))
        : special === 12 && b === 0 ? daysFromNow(rint(3, 28))
        : expiry
      const qty = Math.round(rfloat(200, 3000, 0))
      await prisma.ingredientBatch.create({
        data: {
          ingredientId: ing.id,
          batchNo: `${PREFIX}B${String(i + 1).padStart(3, '0')}${String(b + 1).padStart(2, '0')}`,
          supplierBatch: `${pick(['LOT', 'SB', 'B'])}${rint(230000, 269999)}`,
          mfgDate: arrival,
          expiryDate: expiryFinal,
          arrivalDate: arrival,
          warehousingDate: arrival,
          quantity: qty,
          remainingQty: Math.round(qty * rfloat(0.15, 1)),
          unit: m.unit === '其他' ? 'KG' : m.unit,
          status: rnd() < 0.05 ? '異常' : '正常',
          notes: rnd() < 0.15 ? pick(['外觀略有色差，經確認符合規格', '包裝輕微凹損，內容物完好', '供應商提前交貨']) : '',
        },
      })
      created++
      batchCount++
    }
  }
  console.log(`  ✓ 原料 ${RAW_MATERIALS.length} 筆｜庫存 ${RAW_MATERIALS.length} 筆｜進料批號 ${batchCount} 筆`)

  // 4) 配方 + 配方成分
  let fiCount = 0
  const formulaIds: { id: number; name: string }[] = []

  for (let n = 0; n < formulaCount; n++) {
    const line = PRODUCT_LINES[n % PRODUCT_LINES.length]
    const [scentName, scentMat] = SCENT_VARIANTS[Math.floor(n / PRODUCT_LINES.length) % SCENT_VARIANTS.length]
    const serial = String(n + 1).padStart(3, '0')
    const status = pick(FORMULA_STATUS)

    const formula = await prisma.formula.create({
      data: {
        code: `${PREFIX}-F${serial}`,
        name: `${line.line}（${scentName}）`,
        category: '製成品',
        formulaType: pick(FORMULA_TYPES),
        productType: line.productType,
        description: `${line.line}系列，${scentName}香型。適用於家用洗衣機與手洗，建議用量 ${rint(20, 60)} mL/次。`,
        status,
        currentVersion: rint(1, 4),
      },
    })
    formulaIds.push({ id: formula.id, name: formula.name })
    created++

    // 配方成分：先決定各成分比例，最後由補足量原料吸收餘數，讓總和剛好 100%
    const recipe: [string, number][] = line.recipe
      .filter(([mat]) => mat !== line.balance)
      .map(([mat, lo, hi]) => [mat, rfloat(lo, hi)])
    recipe.push([scentMat, rfloat(0.2, 0.8)])
    if (rnd() < 0.5) {
      recipe.push([pick(['色素 亮藍 FCF', '色素 檸檬黃', '色素 胭脂紅', '色素 酸性綠 25']), rfloat(0.001, 0.01, 3)])
    }
    const used = recipe.reduce((sum, [, r]) => sum + r, 0)
    recipe.push([line.balance, Number((100 - used).toFixed(3))])

    for (const [matName, ratio] of recipe) {
      const ingId = ingByName.get(matName)
      if (!ingId) continue
      await prisma.formulaIngredient.create({
        data: { formulaId: formula.id, ingredientId: ingId, ratio, unit: '%' },
      })
      created++
      fiCount++
    }
  }
  console.log(`  ✓ 配方 ${formulaCount} 筆｜配方成分 ${fiCount} 筆`)

  // 5) 實驗 + 結果
  const EXP_CATEGORIES = ['配方優化', '新原料評估', '客戶開發', '客戶產品對抗', '製程優化', '穩定性異常分析', '原料替代評估']
  const EXP_NOTES = [
    '調整 LAS/AES 比例，觀察去污力與泡沫穩定性差異',
    '評估國產酵素替代進口品的洗淨效果',
    '低溫（15°C）條件下速溶性與去污力測試',
    '客戶反映久放後分層，進行黏度與相穩定性追蹤',
    '香精留香度測試，比較三種包覆技術',
    '降低 STPP 用量，以 4A 沸石與檸檬酸鈉補償硬水結合力',
    '濃縮配方黏度過高導致傾倒困難，調整 SXS 助溶劑用量',
    '抗菌配方對金黃色葡萄球菌與大腸桿菌的抑菌率測試',
    '評估過碳酸鈉與 TAED 比例對彩色衣物的損傷程度',
    '柔軟精陽離子與洗衣精陰離子殘留相容性測試',
  ]
  const RESULT_STATUS = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED', 'OBSERVING', 'NEEDS_ADJUST'] as const

  let expCount = 0
  let resCount = 0
  const experimenters = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'LAB_STAFF'] } } })

  for (let n = 0; n < 30; n++) {
    const f = formulaIds[rint(0, formulaIds.length - 1)]
    const expDate = daysFromNow(-rint(1, 300))
    const exp = await prisma.experiment.create({
      data: {
        code: `${PREFIX}-EXP-${String(n + 1).padStart(3, '0')}`,
        formulaId: f.id,
        experimenterId: experimenters.length
          ? experimenters[n % experimenters.length].id
          : creator!.id,
        experimentDate: expDate,
        category: pick(EXP_CATEGORIES),
        temperature: rfloat(20, 30, 1),
        humidity: rfloat(45, 75, 1),
        notes: `${f.name}：${pick(EXP_NOTES)}`,
        clientCompany: rnd() < 0.6
          ? pick(['家福股份有限公司', '統一超商', '寶雅國際', '全聯實業', '屈臣氏', '康是美', '大潤發'])
          : null,
      },
    })
    created++
    expCount++

    // 約八成的實驗已有判定結果
    if (rnd() < 0.8) {
      const st = pick(RESULT_STATUS)
      await prisma.experimentResult.create({
        data: {
          experimentId: exp.id,
          status: st,
          score: rint(5, 10),
          handFeelScore: rint(4, 10),
          colorShadeScore: rint(4, 10),
          fastnessScore: rint(4, 10),
          moistureScore: rint(4, 10),
          description: st === 'SUCCESS'
            ? '去污力測試達標，泡沫適中易漂清，外觀與氣味符合規格。'
            : st === 'FAILED'
              ? '去污力未達標準品水準，且高溫儲存後出現分層。'
              : '結果接近規格邊緣，需再追蹤穩定性後判定。',
          improvement: st === 'SUCCESS' ? '' : pick([
            '提高非離子表面活性劑比例，改善油污去除力',
            '增加助溶劑用量，改善低溫儲存穩定性',
            '調整螯合劑種類，提升硬水適應性',
          ]),
        },
      })
      created++
      resCount++
    }
  }
  console.log(`  ✓ 實驗 ${expCount} 筆｜實驗結果 ${resCount} 筆`)

  console.log(`\n✓ 完成，共新增 ${created} 筆資料`)
  console.log(`  所有資料編號都以 ${PREFIX} 開頭，要移除請執行：`)
  console.log(`  npx tsx scripts/seed-detergent.ts --remove`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
