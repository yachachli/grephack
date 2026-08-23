import dashboard from '../../engineer_1/generated/dashboard_summary.json'
import harvestPlan from '../../engineer_1/generated/harvest_plan.json'
import candidates from '../../engineer_1/generated/backend_block_candidates.json'

export type Approval = 'Not Required' | 'Awaiting Approval' | 'Approved' | 'Hold'
export type PlannerBlock = {
  id:string; vineyard:string; block:string; client:string; variety:string; acres:number
  tons:number; actualTons?:number; brix:number|null; targetBrix:number|null
  start:string|null; end:string|null; confidence:number|null; approval:Approval; source:'spreadsheet'|'mock'
}
export type PlannerAssignment = { blockId:string; date:string; scheduledLoads:number|null; appointment:string|null; confirmed:boolean }

const latestSnapshot = harvestPlan.reduce((latest,row)=>row.snapshot_date>latest?row.snapshot_date:latest,'')
const statusByBlock = new Map(dashboard.blocks.filter(row=>row.block_id).map(row=>[row.block_id,row]))
const candidateByCode = new Map(candidates.map(row=>[row.externalId,row]))

const rows = harvestPlan.filter(row=>row.snapshot_date===latestSnapshot && row.plan_date>=dashboard.as_of_date)
const scheduledCodes = new Set(rows.map(row=>row.source_code).filter(Boolean))
const horizon = new Date(dashboard.as_of_date+'T12:00:00')
horizon.setDate(horizon.getDate()+7)
const horizonDate = horizon.toISOString().slice(0,10)

const scheduledBlocks:PlannerBlock[] = rows.map(row=>{
  const status=row.block_id?statusByBlock.get(row.block_id):undefined
  const candidate=row.source_code?candidateByCode.get(row.source_code):undefined
  const explicitLoads=typeof row.scheduled_loads==='number'?row.scheduled_loads:null
  return {
    id:row.plan_id,
    vineyard:status?.vineyard_name||row.vineyard_name,
    block:row.source_code||row.vineyard_key,
    client:row.winery_raw||'Winery not listed',
    variety:status?.variety||candidate?.variety||'Unknown variety',
    acres:Number(status?.acres_remaining||candidate?.acres||0),
    tons:explicitLoads!==null?explicitLoads*dashboard.payload_tons:Number(status?.estimated_tons_remaining||candidate?.estimatedTons||0),
    brix:status?.latest_brix??null,
    targetBrix:null,
    start:candidate?.harvestWindowStart||null,
    end:candidate?.harvestWindowEnd||null,
    confidence:null,
    approval:'Awaiting Approval',
    source:'spreadsheet',
  }
})

const readyBlocks:PlannerBlock[] = candidates
  .filter(row=>!scheduledCodes.has(row.externalId) && row.harvestWindowStart && row.harvestWindowEnd && row.harvestWindowStart<=horizonDate && row.harvestWindowEnd>=dashboard.as_of_date)
  .map(row=>{
    const status=statusByBlock.get(`block:${row.externalId}`)
    return {
      id:`ready:${row.externalId}`,
      vineyard:status?.vineyard_name||row.vineyardName,
      block:row.blockName,
      client:'Winery approval not listed',
      variety:status?.variety||row.variety,
      acres:Number(status?.acres_remaining??row.acres),
      tons:Number(status?.estimated_tons_remaining??row.estimatedTons??0),
      brix:status?.latest_brix??null,
      targetBrix:null,
      start:row.harvestWindowStart,
      end:row.harvestWindowEnd,
      confidence:null,
      approval:'Awaiting Approval' as const,
      source:'spreadsheet' as const,
    }
  })

const statusWatchBlocks:PlannerBlock[] = dashboard.blocks
  .filter(row=>row.status==='in_progress' && row.latest_brix!==null && row.latest_brix>=23 && row.estimated_tons_remaining!==null && !scheduledCodes.has(row.parent_code))
  .sort((a,b)=>(b.latest_brix||0)-(a.latest_brix||0))
  .slice(0,8)
  .map(row=>({
    id:`status:${row.subblock_id||row.parent_code}`,
    vineyard:row.vineyard_name,
    block:row.subblock_code,
    client:'Winery approval not listed',
    variety:row.variety,
    acres:Number(row.acres_remaining||0),
    tons:Number(row.estimated_tons_remaining||0),
    brix:row.latest_brix,
    targetBrix:null,
    start:null,
    end:null,
    confidence:null,
    approval:'Awaiting Approval' as const,
    source:'spreadsheet' as const,
  }))

export const liveBlocks:PlannerBlock[] = [...scheduledBlocks,...readyBlocks,...statusWatchBlocks]

export const liveAssignments:PlannerAssignment[] = rows.map(row=>({
  blockId:row.plan_id,
  date:row.plan_date,
  scheduledLoads:typeof row.scheduled_loads==='number'?row.scheduled_loads:null,
  appointment:row.delivery_times_raw,
  confirmed:String(row.confirmed_raw||'').toUpperCase()==='YES',
}))

export const livePlannerMeta = {
  asOfDate:dashboard.as_of_date,
  snapshotDate:latestSnapshot,
  payloadTons:dashboard.payload_tons,
  portfolio:dashboard.portfolio,
}
