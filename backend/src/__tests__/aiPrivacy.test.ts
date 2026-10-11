import { expect, it } from 'vitest'
import { projectCloudData, restoreAliases, isCloudTool } from '../lib/aiPrivacy'
it('rank exports only rank and random alias, not confidential fields', () => {
 const p=projectCloudData('rank_formula_cost',{formulas:[{id:42,code:'PRIVATE',name:'秘密客戶',costPerKg:912.33,notes:'attack',ratio:25,newField:'secret'}]})
 for(const s of ['PRIVATE','秘密','912','attack','ratio','newField'])expect(JSON.stringify(p.payload)).not.toContain(s)
 expect(p.payload).toMatchObject({data:{rows:[{rank:1}]}})
 expect(restoreAliases(Object.keys(p.mapping)[0],p.mapping)).toBe('PRIVATE ／ 秘密客戶')
})
it('impact exports percentage, not ingredient identity or absolute cost',()=>{
 const p=projectCloudData('simulate_price_change',{ingredient:{name:'secret'},changePercent:20,affectedFormulaCount:1,formulas:[{formulaName:'secret',costBefore:100,costAfter:120,deltaPercent:20}]})
 expect(p.payload).toMatchObject({data:{rows:[{deltaPercent:20}]}})
 for(const s of ['secret','costBefore','costAfter','ingredient'])expect(JSON.stringify(p.payload)).not.toContain(s)
})
it('inventory rejects arbitrary strings, date, batch names and invalid numeric fields',()=>{
 const p=projectCloudData('check_inventory',{lowStock:[{name:'secret',shortfall:'secret',unit:'secret'}],expiringBatches:[{batchNo:'secret',expiryDate:'2026-10-11',daysLeft:-2,remaining:3,unit:'kg'}]})
 expect(JSON.stringify(p.payload)).not.toContain('secret');expect(JSON.stringify(p.payload)).not.toContain('2026')
 expect(p.payload).toMatchObject({data:{lowStock:[{shortfall:null,unit:'未提供'}]}})
})
it('tokens and mappings cannot be reused across requests',()=>{
 const a=projectCloudData('rank_formula_cost',{formulas:[{name:'A'}]});const b=projectCloudData('rank_formula_cost',{formulas:[{name:'B'}]})
 expect(Object.keys(a.mapping)).not.toEqual(Object.keys(b.mapping));expect(restoreAliases(Object.keys(a.mapping)[0],b.mapping)).toBe('[未知紀錄]')
})
it('detail, experiments, ingredients and unknown tools have no cloud policy',()=>{
 for(const name of ['get_formula_detail','search_experiments','search_ingredients','where_ingredient_used','delete_formula'])expect(isCloudTool(name)).toBe(false)
})
