import type { TemplateDraft } from './templateDraft'

type Field = TemplateDraft['fields'][number]
const f = (key: string, label: string, placeholder: string, section = '設計與判定', type: Field['type'] = 'textarea', unit = ''): Field => ({ key, label, placeholder, section, type, unit, options: [] })
const common = [
  f('objective', '實驗目的與假設', '寫出比較對象、希望改善的性質及可觀察的假設；例如比較不同製程条件對主要性能及穩定性的影響。'),
  f('fixedFactors', '固定條件', '比較單一變因時，固定基礎配方、樣品量、製備順序、攪拌、測量方法；多變因設計需記錄各組合。'),
  f('replicateCount', '重複次數', '起始設計建議：先考慮各組獨立製備 3 次，並評估資源及變異；同一樣品重複讀值不能代替獨立製備。', '設計與判定', 'number', '次'),
  f('replicateMethod', '重複方式與測試順序', '分別記錄獨立製備與重複量測；可打散測試順序，避免時間、溫度漂移造成偏差。'),
  f('equipment', '設備與校驗確認', '列出實際可用設備、型號、量程、校驗狀態與前次使用後清潔情況。'),
  f('acceptanceCriteria', '目標與判定基準', '測試前定義目標、容許變動、淘汰條件與比較方式；沒有產品規格時標示「探索性比較」，不可事後挑標準。'),
  f('dataAnalysis', '數據整理與異常處理', '保留各次原始數據、平均值與離散程度；記錄異常原因，不因結果不理想而刪除數據。'),
  f('safety', '操作與材料適用性', '依原料安全資料及設備要求確認防護、相容性、清潔、廢棄物處理；食品／人體用途須另做適用性評估。'),
]
const hints: Record<string, string> = {
  sampleCode: '填入可追溯的樣品或基礎配方代號；內部代號留在本地。',
  variable: '起始建議：先比較單一變因，例如增稠方式；若比較添加量，其他配方與製程保持一致。',
  variableLevel: '列出各組低／中／高設定及對照組；實際數值依材料適用範圍和既有配方決定。',
  temperature: '填入實際製備或處理溫度；與量測溫度分開記錄，不能直接套用通用值。',
  duration: '從明確的起始事件計時，記錄處理時間與溫度是否達標。',
  sampleAmount: '統一各組樣品量與質量／體積單位；記錄取樣位置與容器。',
  control: '起始建議：保留原配方或未改變因的基準組；與實驗組用同一批材料及測試方式。',
  method: '記錄加料順序、攪拌方式、時間、溫度、靜置與取樣，讓另一位操作者可以重做。',
  observations: '記錄外觀、顏色、均勻性、氣泡及異常，使用一致光線與背景拍照；區分主觀觀察與量測值。',
  targetPH: '依界面活性劑、增稠劑、防腐及用途相容性定義目標，不預設所有產品適用同一範圍。',
  thickener: '候選方向：鹽增稠、聚合物或界面活性劑系統調整；先確認基礎配方相容性，並非每種系統都可鹽增稠。',
  thickenerLevel: '在供應商建議與實際配方允許範圍內安排梯度；鹽的黏度反應未必單調上升，不假設越多越稠。',
  targetViscosity: '先訂目標並附量測方法；目標表觀黏度不能當成已測得的黏度。',
  measurementTemp: '比較組別需固定量測溫度，樣品、容器與轉子完成溫度平衡後再讀值。',
  spindle: '依實際儀器與有效量程選擇轉子；組間比較記錄並固定適用的轉子型號。',
  speed: '依樣品和儀器有效量程決定；非牛頓流體黏度可能隨轉速改變，組間比較要一致。',
  readingTime: '定義開始轉動後何時讀值，記錄讀值是否穩定；組間固定讀值時點。',
  mixing: '記錄攪拌設備、方式、時間與靜置／消泡條件；避免把不同氣泡量造成的差異當成配方效果。',
  stability: '先排定追蹤時間與儲存條件，觀察分層、沉澱、顏色及 pH／黏度變動；短期無異常不等於保存期限已驗證。',
}
const aliases: Record<string, RegExp> = {
  targetPest: /目標害蟲|害蟲與來源/,
  pestStage: /害蟲.*蟲齡|試蟲.*發育階段|蟲齡/,
  productInfo: /試驗產品|產品.*劑型|有效成分/,
  studyMethod: /試驗方法|SOP/,
  treatmentSetting: /處理設定|用量依據|用量.*施用型態/,
  controlDesign: /未處理|載體對照|基準對照/,
  insectCount: /每組試蟲數|試蟲數/,
  environment: /試驗環境/,
  assessmentTimes: /觀察時點/,
  knockdownCount: /擊倒數/,
  deadCount: /死亡數/,
  aliveCount: /存活數/,
  missingCount: /失蹤|排除.*原因/,
  efficacyAnalysis: /藥效.*分析|藥效判定/,
  controlValidity: /對照.*有效性/,
  deviations: /偏差.*異常|不良觀察/,
  control: /對照/, variable: /比較變因|變因描述|變因說明/, variableLevel: /變因設定|變因水準/,
  temperature: /製備溫度|處理溫度/, duration: /製備時間|處理時間/, sampleAmount: /樣品量|樣品體積/,
  targetPH: /目標.*pH/i, measuredPH: /實測.*pH|測得.*pH/i,
  targetViscosity: /目標.*黏度/, measuredViscosity: /實測.*黏度|測得.*黏度/,
  measurementTemp: /量測.*溫度|測量.*溫度|黏度.*溫度/, spindle: /轉子/, speed: /轉速/,
  readingTime: /讀值.*時間|讀取.*時間|讀數.*時間/, thickener: /增稠方式|增稠材料/, thickenerLevel: /增稠.*添加量|增稠條件/,
  objective: /實驗目的|研究目的|目的與假設/, fixedFactors: /固定條件|控制變因/, replicateCount: /重複.*次數|重複數/,
  acceptanceCriteria: /判定基準|驗收基準|判定標準/, dataAnalysis: /數據.*分析|數據整理/,
  viscosityContainer: /黏度.*容器/, foamMethod: /泡沫.*方法/, foamWater: /泡沫.*水|泡沫.*稀釋/,
  storageConditions: /穩定性.*儲存|儲存條件/, stabilitySchedule: /穩定性.*時點|穩定性.*時間點/,
}
export function equivalentField(existing: Field, candidate: Field) {
  return existing.key === candidate.key || existing.label === candidate.label || !!aliases[candidate.key]?.test(existing.label)
}
function domainKnowledge(topic: string, goals: string[]): Field[] {
  if (topic === 'insecticide') return [
    f('pesticideUse', '試驗用途與評估目的', '確認農業、居家或公共衛生用途；區分篩選、比較或正式藥效評估。', '試驗基本資料'),
    f('productInfo', '試驗產品／劑型／批次', '記錄產品代號、有效成分資訊、劑型及批次；不由 AI 推薦配方。', '試驗基本資料'),
    f('targetPest', '目標害蟲與來源', '記錄物種、品系或來源；與產品宣稱防治對象對應。', '試驗基本資料'),
    f('pestStage', '試蟲發育階段與狀態', '記錄蟲齡／發育階段及健康狀態，組間保持可比。', '試驗基本資料'),
    f('studyMethod', '試驗方法與 SOP 版本', '記錄適用方法、版本及核准計畫，不混用不同施用型態的評估方法。', '組別與處理'),
    f('treatmentSetting', '處理設定與用量依據', '填入適用標籤或核准計畫的用量、單位與施用型態；不自動推薦濃度。', '組別與處理'),
    f('controlDesign', '未處理／基準對照設定', '記錄未處理或載體對照；需要比較產品時另設適用的基準產品組。', '組別與處理'),
    f('insectCount', '每組試蟲數', '記錄各重複組的實際數量，不把總數當成每組數量。', '組別與處理', 'number', '隻'),
    f('exposureRecord', '處理與接觸條件紀錄', '按核准方法記錄施用方式、接觸條件及起訖；不補成未知的操作參數。', '組別與處理'),
    f('environment', '試驗環境條件', '記錄溫度、濕度及方法要求的環境資訊；組間條件一致。', '觀察與結果'),
    f('assessmentTimes', '觀察時點', '按適用方法預先列出觀察時點，區分處理後時間與實際觀察時間。', '觀察與結果'),
    f('aliveCount', '存活數', '依方法定義記錄各組與各時點的存活數。', '觀察與結果', 'number', '隻'),
    f('knockdownCount', '擊倒數', '依方法定義判讀擊倒；擊倒可能恢復，不直接當成死亡。', '觀察與結果', 'number', '隻'),
    f('deadCount', '死亡數', '依方法定義判讀死亡，與擊倒及失蹤分開記錄。', '觀察與結果', 'number', '隻'),
    f('missingCount', '失蹤／排除數及原因', '保留失蹤、排除及計數差異原因，核對各類數量與原始試蟲數。', '觀察與結果'),
    f('efficacyAnalysis', '死亡率／藥效分析方法', '保留原始計數與分母；對照修正及有效性依適用方法決定，不擅定合格門檻。', '判定與追蹤'),
    f('controlValidity', '對照組有效性與判定', '依方法检查對照組結果是否使本次試驗有效；不忽略對照死亡或異常。', '判定與追蹤'),
    f('deviations', '偏差、不良觀察與處置', '記錄方法偏差、非目標觀察、追查及處置；試驗材料與廢棄物按既有程序處理。', '判定與追蹤'),
  ]

  const fields: Field[] = []
  if (topic === 'shampoo' || topic === 'cleaning') {
    fields.push(f('measuredPH', '實測 pH', '使用適用且校驗完成的儀器，記錄溫度、直接測量或稀釋方法。', '量測記錄', 'number'),
      f('measuredViscosity', '實測表觀黏度', '與目標值分開；附溫度、轉子、轉速、容器與讀值時間，保留原始數據。', '量測記錄', 'number', 'mPa·s'),
      f('viscosityContainer', '黏度量測容器與取樣', '記錄容器規格、樣品量、取樣位置、浸入設定及氣泡；不同容器的結果不可直接視為相同方法。', '量測設定'))
    if (goals.includes('foam')) fields.push(
      f('foamMethod', '泡沫產生與量測方法', '可選搖盪或攪拌等可重現方法；固定容器、樣品量、稀釋、操作次數／時間與讀值時點。', '泡沫測試'),
      f('foamWater', '泡沫測試用水與稀釋條件', '記錄水源／硬度、溫度、稀釋比例；各組條件保持一致。', '泡沫測試'),
      f('foamReadings', '泡沫初始值與衰減記錄', '統一使用高度或體積，記錄初始值及後續時間點；泡沫多寡不直接代表清潔力。', '泡沫測試'))
    if (goals.includes('stability')) fields.push(
      f('storageConditions', '穩定性儲存條件', '比較前訂定溫度、容器密封、光照與樣品量；探索性加速觀察不可直接換算保存期限。', '穩定性測試'),
      f('stabilitySchedule', '穩定性追蹤時點', '起始建議：包含初始、早期與後續時點，實際排程依產品目的和可用資源確認。', '穩定性測試'))
  }
  if (topic === 'lubricant') fields.push(
    f('lubricantUse', '潤滑液用途與基礎類型', '先確認工業或人體等用途、水基／油基等類型與接觸材料；未指定時保留待確認，不混用不同用途的判定依據。'),
    f('viscosityMethod', '黏度種類、方法與單位', '區分動力黏度、運動黏度或表觀黏度，記錄方法、溫度及單位；不同方法不能只比較數字。', '量測設定'),
    f('frictionMethod', '潤滑與摩擦測試方法', '使用實際可用且適合用途的測试；定義接觸幾何、材料及評估指標，不能用手感或黏度取代摩擦測試。', '潤滑性能'),
    f('frictionConditions', '摩擦試驗條件', '固定試驗方法、接觸材料、载荷、速度、溫度、樣品用量及接觸時間；精確值依設備、材料與目的決定。', '潤滑性能'),
    f('lubricationResults', '潤滑表現與衰減記錄', '記錄方法所能量測的摩擦、磨耗或性能衰減與原始數據；不要預設各用途皆適用同一指標。', '潤滑性能'),
    f('materialCompatibility', '接觸材料與相容性', '記錄接觸材質及變化，如膨潤、表面變化或分層；依實際用途決定確認方法。', '適用性'),
    f('lubricantStability', '潤滑液穩定性與保存觀察', '定義容器、密封、儲存溫度及追蹤時點，觀察分層、沉澱及性質變動；人體用途需另做適用安全評估。', '穩定性測試'))
  if (topic === 'dyeing') fields.push(f('substrate', '基材及前處理', '記錄纖維種類、同批布樣、前處理與乾重。'), f('bathRatio', '浴比與用量基準', '分清相對布重百分比與浴液濃度，避免單位混用。'), f('dyeProfile', '升溫／保溫／洗滌流程', '記錄升溫方式、加料、保溫、後洗及乾燥，依染料與基材適用性確認。'), f('colorAssessment', '色差與均勻性評估', '固定光源、量測設定與取樣位置；標準測試方法需另行確認。'))
  if (topic === 'food') fields.push(f('foodBatch', '原料批次與前處理', '記錄原料狀態、批次、用量基準與前處理，控制批次差異。'), f('foodProcess', '製程與冷卻／保存流程', '記錄實際溫度時間、冷卻及保存條件；一般範本不能替代食品安全製程驗證。'), f('foodMetrics', '理化與品質觀察', '依目的選擇 pH、外觀、質地等可用方法；微生物或感官評估須另訂合適程序。'))
  return fields
}
const baseSteps = [
  '明確寫出本次目的、假設與主要評估指標；先定義目標、容許變動或探索性比較方式。',
  '安排基準／對照組及變因組，固定非比較條件；分別規劃獨立製備次數與同樣品的量測次數。',
  '確認同批基礎材料、設備與安全要求，標記樣品代號；記錄實際秤量、加料順序、攪拌及溫度時間。',
  '依一致的靜置／平衡與取樣方法準備各組，打散測試順序；記錄與計畫不同之處。',
  '以相同量測方法記錄各次原始數據及外觀；區分目標與實測值，不把空白或待確認值補成結果。',
  '整理各組平均與變異、與對照的差異及異常，依事先訂定的基準判斷；提出下一輪改善方向。',
]
const baseChecks = [
  '需要使用者確認：基礎配方／材料、實際設備、適用操作範圍、精確數值及產品規格。',
  '設計檢查：對照組、變因水準、固定條件、獨立重複與測試順序是否可以區分真實差異。',
  '資料檢查：單位、方法、時間點與原始數據是否完整；異常需保留並追查原因。',
  '結果判定：先定義規格或探索性比較，允許失敗／分層等結果出現；不可要求樣品一定通過。',
]
export function completeCommonKnowledge(draft: TemplateDraft, topic: string, goals: string[], preserveEdits = false): TemplateDraft {
  const out = structuredClone(draft)
  const unsupportedSetting = /\d[\d.\s~～–—\-、，]*(?:°|℃|rpm|%|mL|ml|mg|kg|分鐘|小時|天)|標準搖晃法|確保數據可靠|確保結果合理/i
  if (!preserveEdits) for (const field of out.fields) {
    if (unsupportedSetting.test(field.placeholder)) field.placeholder = hints[field.key] || `此欄位的數值與方法需依實際材料、設備及產品規格確認；記錄${field.label}，不預設通用操作值。`
  }
  for (const field of out.fields) if (!preserveEdits && field.placeholder.trim().length < 15 && hints[field.key]) field.placeholder = hints[field.key]
  for (const field of out.fields) if (!field.placeholder.trim()) field.placeholder = hints[field.key] || `記錄${field.label}的實際設定與方法，區分已知資訊及待確認條件。`
  for (const candidate of topic === 'insecticide' ? [...domainKnowledge(topic, goals), ...common.filter(f => ['objective', 'replicateCount', 'replicateMethod', 'acceptanceCriteria', 'dataAnalysis', 'safety'].includes(f.key))] : [...common, ...domainKnowledge(topic, goals)]) {
    const match = out.fields.find(x => equivalentField(x, candidate))
    if (match) { if (!match.placeholder.trim() || (!preserveEdits && match.placeholder.trim().length < 15)) match.placeholder = candidate.placeholder }
    else if (out.fields.length < 40) out.fields.push(candidate)
  }
  const steps = topic === 'insecticide' ? [
    '確認用途、目標害蟲、產品劑型與適用試驗方法，登錄 SOP 及核准計畫版本。',
    '建立處理組、未處理／載體對照及需要的基準組，記錄各組試蟲數與獨立重複。',
    '依適用標籤或核准計畫執行處理，記錄用量依據、接觸條件及環境，不自行套用通用濃度。',
    '按預先訂定時點分別記錄存活、擊倒、死亡與失蹤／排除數，保存各重複組原始資料。',
    '核對計數、對照組有效性與偏差，依適用方法分析藥效及必要的對照修正。',
    '按事先訂定基準形成試驗結論，記錄限制、後續試驗及材料／廢棄物處置。',
  ] : [...baseSteps]
  const checks = topic === 'insecticide' ? [
    '用途、害蟲與施用型態是否符合所選方法；未知資料標示待確認。',
    '處理組與對照組的蟲齡、數量及環境是否可比，獨立重複是否完整。',
    '擊倒與死亡分開判讀，核對計數與分母；對照異常時依方法判定有效性。',
    '用量與判定門檻依標籤／核准計畫，不能由通用範本宣稱試驗合格。',
  ] : [...baseChecks]
  if (topic === 'shampoo' || topic === 'cleaning') {
    steps.splice(4, 0, '依原料相容性設計增稠比較；固定基礎配方，確認加料與 pH 調整順序。鹽增稠需評估適用性及反應趨勢，不能假定持續加鹽必然增加黏度。', '黏度量測前完成溫度平衡與消泡，使用適用轉子和轉速；固定容器、取樣量與讀值時間，記錄實测 pH 與表觀黏度。')
    checks.push('黏度可比性：核對儀器、轉子、轉速、容器、溫度與讀值時間；目標黏度与實測值須分開。')
    if (goals.includes('foam')) steps.splice(steps.length - 1, 0, '泡沫比較固定稀釋、水質、容器與產泡方式，在相同時點記錄初始值及衰減；另行評估清潔能力，不由泡沫量推論。')
    if (goals.includes('stability')) { steps.splice(steps.length - 1, 0, '分裝各組到一致容器，依預訂儲存條件與時點追蹤外觀、分層、沉澱、pH 與黏度變化，保留初始數據作比較。'); checks.push('穩定性限制：短期觀察不等於保存期限、安全性或微生物防護已驗證。') }
  }
  if (topic === 'lubricant') {
    steps.splice(0, 0, '先確認潤滑液用途、基礎類型及接觸材料；用途未確定時以探索性性能比較為限，不把工業條件套入人體用途。')
    steps.splice(5, 0, '選擇與樣品性質相符的黏度方法，明確記錄黏度種類、單位、溫度、設備及讀值條件。', '以可用的摩擦／潤滑試驗比較對照及變因組，固定接觸材料、載荷、速度、溫度與接觸時間，保留各次原始數據。', '按預先訂定時點追蹤性能衰減、接觸材料變化、分層及儲存後性質；按用途設定判定依據。')
    checks.push('潤滑液用途尚需確認：工業与人體等用途的安全及性能要求不同，範本不代表人體使用適用性。', '黏度與潤滑性能：方法和單位需一致；黏度較高不能直接推論摩擦更低或使用更安全。')
  }
  if (topic === 'dyeing') {
    steps.splice(3, 0, '使用同批且相同前處理的基材，按乾重記錄染料／助劑用量與浴比，明確区分相對布重百分比及浴液濃度。', '記錄加料順序、pH、升溫及保溫曲線；依一致後洗、乾燥及調濕方式處理各組，再以相同光源和量測位置比較色差與均勻性。')
    checks.push('染整適用性：依實際基材及染料類別確認條件；色差或牢度合格標準需事先訂定，不能由範本宣稱。')
  }
  if (topic === 'food') {
    steps.splice(3, 0, '使用可追溯的原料批次，固定前處理及取樣方法，記錄實際製程溫度、時間、冷卻與保存流程。', '依用途選擇可執行的理化或品質評估；食品安全、微生物與食用感官試驗另依適用程序審查，不能由一般品質範本代替。')
    checks.push('食品適用性：一般外觀、pH 或質地數據不代表食品安全或保存期限驗證通過。')
  }
  if (topic === 'insecticide') {
    const expected = '殺蟲劑效力試驗管理'
    out.name = expected
    out.domain = '殺蟲劑／藥效評估'
    out.description = '管理目標害蟲、產品與劑型、處理／對照組、觀察時點及藥效結果；試驗方法與用量依適用標籤或核准計畫確認。'
  }
  // Keep user edits; supplementation is additive and repeatable.
  out.protocol = topic === 'insecticide' ? steps.slice(0, 12)
    : preserveEdits ? [...new Set([...out.protocol, ...steps])].slice(0, 20)
      : [...new Set([...steps, ...out.protocol.filter(s => !unsupportedSetting.test(s) && !steps.includes(s)).map(s => `模型補充（待確認）：${s}`)])].slice(0, 20)
  out.checks = topic === 'insecticide' ? checks.slice(0, 16)
    : [...new Set([...out.checks.filter(s => preserveEdits || !unsupportedSetting.test(s)).map(s => !preserveEdits && /(?:確認|確保).*(?:無明顯|沒有).*(?:分層|沉澱|異常)/.test(s) ? '記錄是否有分層、沉澱或其他異常；按預先訂定的判定基準比較，不假定樣品必須通過。' : s), ...checks])].slice(0, 16)
  return out
}
