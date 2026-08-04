import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📋 開始寫入實驗結果資料...')

  // EXP-2025-006：去污力效能比較 → SUCCESS
  await prisma.experimentResult.create({
    data: {
      experimentId: 26,
      status: 'SUCCESS',
      score: 87,
      handFeelScore: 88,       // 布料手感保持度
      colorShadeScore: 85,     // 色彩保護效果
      fastnessScore: 90,       // 去污穩定性
      moistureScore: 84,       // 清洗殘留（泡沫）
      otherScoreName: '生物降解性',
      otherScore: 92,
      description:
        'B組（LAS 15% 標準型）以整體去污率 85% 通過目標門檻，草漬、醬油、口紅三項汙漬均達優良等級。A 組節能配方去污率僅 72%，未達量產標準；C 組強效配方去污率雖達 89%，但泡沫殘留量超標，洗衣機排水測試不合格。綜合成本與效能，B 組確定為量產優選配方。',
      reflection:
        '本次實驗確認 LAS 15% 為最佳用量平衡點。提升至 18% 對去污力的邊際效益有限（僅 +4%），卻帶來泡沫管控問題，未來可考慮搭配消泡劑進行 C 組優化實驗。',
      issueRecord:
        'C 組在排水管道泡沫殘留量超標（>5cm），可能導致滾筒洗衣機漏水警示，需進一步調整消泡劑比例後再評估。',
      abnormalReason: null,
      improvement:
        '建議以 B 組配方（LAS 15%、AEO-9 7%、6501 3%）作為量產基準，後續規劃加入去漬酵素版本進行擴展實驗。',
      improvementAction: '調整 C 組配方加入矽類消泡劑 0.1%，預計下季進行追加驗證實驗（EXP-2026-001）',
      clientFeedback:
        '清淨海股份有限公司初步反饋：去污效果滿意，香氣清新度需再調整，希望降低洗後布料的殘留感。',
      clientFeedbackResult: 'APPROVED',
      notes: '本批次使用去離子水配製，建議量產前以硬水（250 ppm CaCO₃）進行重現性驗證。',
    },
  })
  console.log('✅ EXP-2025-006 結果建立完成')

  // EXP-2025-007：低溫洗滌酵素穩定性 → SUCCESS
  await prisma.experimentResult.create({
    data: {
      experimentId: 27,
      status: 'SUCCESS',
      score: 89,
      handFeelScore: 91,       // 低溫洗滌後手感保持
      colorShadeScore: 93,     // 低溫對色彩保護更佳
      fastnessScore: 87,       // 酵素去污穩定性
      moistureScore: 86,       // 清洗殘留
      otherScoreName: '酵素儲存穩定性（6個月）',
      otherScore: 88,
      description:
        'B 組低溫強化酵素（Coronase 0.4%）在 15°C 條件下整體去污率達 87%，優於 A 組標準蛋白酶在 30°C 的 82%，驗證了低溫酵素在冬季節能洗滌場景的核心優勢。C 組廣溫域酵素表現平穩但無突出優勢，建議僅作為備選方案。色牢度測試顯示，低溫洗滌對深色布料色彩保護效果明顯優於高溫洗滌（色差 ΔE 值降低 1.8）。',
      reflection:
        '低溫酵素配方在節能（減少加熱能耗約 40%）與去污力雙重優勢下，具有高度市場差異化潛力。建議以「冷水洗衣精」為產品定位切入歐美環保洗滌市場。',
      issueRecord:
        '測試期間發現 B 組在硬水環境（350 ppm）下酵素活性下降約 12%，建議添加 EDTA 0.1% 作為螯合劑改善。',
      abnormalReason: null,
      improvement:
        '最終配方：低溫蛋白酶 Coronase 0.4% + EDTA 螯合劑 0.1% + 基礎配方，預計可將硬水條件下去污率回升至 85% 以上。',
      improvementAction: '追加硬水條件（250/350/500 ppm）重現性測試，計畫 2026 Q1 完成。',
      clientFeedback:
        '清淨海股份有限公司回饋：低溫洗滌效果超出預期，有意以本配方開發新品線，要求提供 1000L 中試量産樣品報價。',
      clientFeedbackResult: 'APPROVED',
      notes: '酵素在 45°C 以上快速失活，調配溫度需嚴格控制，量產混配程序需加入溫度警報機制。',
    },
  })
  console.log('✅ EXP-2025-007 結果建立完成')

  // EXP-2025-008：嬰幼兒配方 pH 最佳化 → OBSERVING（等待認證）
  await prisma.experimentResult.create({
    data: {
      experimentId: 28,
      status: 'OBSERVING',
      score: 85,
      handFeelScore: 90,       // 洗後布料柔軟度
      colorShadeScore: 88,     // 嬰兒衣物色彩保護
      fastnessScore: 80,       // 去污穩定性
      moistureScore: 94,       // 低刺激性／清潔殘留
      otherScoreName: '皮膚刺激性評估（Patch Test）',
      otherScore: 98,
      description:
        'B 組（pH 7.0 中性）以去污率 83%、皮膚刺激性 Grade 0 的表現兼顧洗淨效能與嬰幼兒安全性，確定為最終推薦配方。A 組（pH 6.5）雖皮膚安全性最佳，但去污率 73% 不足；C 組（pH 7.5）去污率最高（88%），但 Grade 1 皮膚刺激等級不符合嬰幼兒產品規範。本實驗確立 pH 7.0 中性配方為嬰幼兒洗衣精的最適條件。',
      reflection:
        '實驗數據顯示嬰幼兒配方的 pH 區間極為敏感：每 0.5 pH 單位的差異即造成去污率 5–8% 的變化，同時顯著影響皮膚刺激性等級。精密 pH 控制（±0.1）將是量產品質管制的關鍵指標。',
      issueRecord:
        'A 組 pH 6.5 配方在常溫儲存 3 個月後出現輕微混濁，懷疑為 APG 原料在酸性環境下的穩定性問題，已送樣至第三方分析。',
      abnormalReason: 'A 組配方儲存穩定性異常，混濁原因待釐清，不影響 B 組推薦配方。',
      improvement:
        '針對 A 組穩定性問題，評估加入穩定劑（PEG-4000 0.5%）後重新進行 6 個月加速老化測試。B 組配方持續推進 CNS 15003 認證流程。',
      improvementAction: 'B 組已送 SGS 台灣進行 CNS 15003 嬰幼兒洗劑安全認證，預計 2026 Q1 取得報告。',
      clientFeedback:
        '清淨海股份有限公司表示對配方方向認可，待取得認證後將優先納入 2026 年嬰幼兒產品線，並希望協助申請媽媽寶寶認證標章。',
      clientFeedbackResult: null,
      notes: '目前處於觀察期，等待 SGS 認證報告與 A 組穩定性分析結果，預計下季轉為 SUCCESS。',
    },
  })
  console.log('✅ EXP-2025-008 結果建立完成')

  console.log('\n🎉 實驗結果寫入完成！')
  console.log('  EXP-2025-006：SUCCESS（去污力 85%，B組量產確定）')
  console.log('  EXP-2025-007：SUCCESS（低溫去污率 87%，客戶要求中試報價）')
  console.log('  EXP-2025-008：OBSERVING（等待 CNS 認證，Q1 預計 SUCCESS）')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
