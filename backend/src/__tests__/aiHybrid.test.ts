import { beforeEach, expect, it, vi } from 'vitest'
const m=vi.hoisted(()=>({completion:vi.fn(),local:vi.fn(),tools:vi.fn(),run:vi.fn()}))
vi.mock('openai',()=>({default:class{chat={completions:{create:m.completion}}}}))
vi.mock('../lib/aiTools',()=>({toolsForRole:m.tools}))
vi.mock('../lib/aiAssistant',()=>({askAssistant:m.local}))
import { askHybrid } from '../lib/aiHybrid'
import { z } from 'zod'
beforeEach(()=>{
 vi.resetAllMocks();vi.unstubAllEnvs();vi.stubEnv('AI_CLOUD_ENABLED','no')
 m.local.mockResolvedValue({answer:'local',toolCalls:[],usage:{inputTokens:0,outputTokens:0}})
 m.run.mockResolvedValue({formulas:[{name:'secret',code:'PRIVATE',costPerKg:123}]})
 m.tools.mockResolvedValue([{name:'rank_formula_cost',inputSchema:z.object({order:z.enum(['asc','desc']),limit:z.number()}),run:m.run}])
})
it('preview queries locally and makes no cloud request',async()=>{
 const r=await askHybrid({question:'配方成本排行',role:'ADMIN',mode:'preview'})
 expect(m.run).toHaveBeenCalled();expect(m.completion).not.toHaveBeenCalled();expect(r.routing.engine).toBe('preview')
})
it('disabled cloud stays in preview',async()=>{
 expect((await askHybrid({question:'配方成本排行',role:'ADMIN',mode:'hybrid'})).routing.engine).toBe('preview');expect(m.completion).not.toHaveBeenCalled()
})
it('history is never sent to the cloud',async()=>{
 expect((await askHybrid({question:'配方成本排行',history:[{role:'user',content:'secret'}],role:'ADMIN',mode:'hybrid'})).routing.engine).toBe('local')
 expect(m.completion).not.toHaveBeenCalled()
})
it('role permission prevents unauthorized tool execution',async()=>{
 m.tools.mockResolvedValue([]);await askHybrid({question:'配方成本排行',role:'LAB_STAFF',mode:'preview'});expect(m.run).not.toHaveBeenCalled()
})
it('cloud receives projection, never query, identity, amounts or tools',async()=>{
 vi.stubEnv('AI_CLOUD_ENABLED','yes');vi.stubEnv('AI_CLOUD_BASE_URL','https://example.test/v1');vi.stubEnv('AI_CLOUD_MODEL','test');vi.stubEnv('AI_CLOUD_API_KEY','test')
 m.completion.mockResolvedValue({choices:[{message:{content:'摘要'}}],usage:{}})
 const r=await askHybrid({question:'配方成本排行',role:'ADMIN',mode:'hybrid'})
 const request=m.completion.mock.calls[0][0];expect(request.store).toBe(false);expect(request.tools).toBeUndefined()
 for(const s of ['配方成本排行','PRIVATE','secret','costPerKg'])expect(JSON.stringify(request)).not.toContain(s)
 expect(r.routing.engine).toBe('cloud')
})
it('query errors do not leave the server',async()=>{
 m.run.mockRejectedValue(Error('password secret'));const r=await askHybrid({question:'配方成本排行',role:'ADMIN',mode:'hybrid'})
 expect(m.completion).not.toHaveBeenCalled();expect(JSON.stringify(r)).not.toContain('password')
})
