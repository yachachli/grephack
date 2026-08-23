import { useMemo, useState } from 'react'
import './styles.css'
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, CloudSun, Grape, LayoutDashboard, Menu, Search, Settings, Sprout, Truck, X } from 'lucide-react'

type Block={id:string;vineyard:string;block:string;client:string;variety:string;acres:number;tons:number;start:string;end:string;confidence:number}
type Assignment={blockId:string;date:string}
const START='2026-09-14', TONS_PER_LOAD=20
const blocks:Block[]=[
 {id:'smith',vineyard:'Smith Vineyard',block:'12',client:'Winery A',variety:'Cabernet Sauvignon',acres:22,tons:90,start:'2026-09-14',end:'2026-09-16',confidence:82},
 {id:'jones',vineyard:'Jones Ranch',block:'4',client:'Winery B',variety:'Chardonnay',acres:24,tons:82,start:'2026-09-15',end:'2026-09-17',confidence:88},
 {id:'mesa',vineyard:'Mesa Ridge',block:'C-04',client:'Oak & Stone',variety:'Pinot Noir',acres:31,tons:118,start:'2026-09-16',end:'2026-09-18',confidence:76},
 {id:'robles',vineyard:'Los Robles',block:'D-17',client:'Winery A',variety:'Merlot',acres:18,tons:68,start:'2026-09-14',end:'2026-09-15',confidence:91},
 {id:'stone',vineyard:'Stone Creek',block:'A-03',client:'Cedar Cellars',variety:'Sauvignon Blanc',acres:27,tons:104,start:'2026-09-17',end:'2026-09-19',confidence:79},
 {id:'coyote',vineyard:'Coyote Run',block:'B-08',client:'Winery C',variety:'Zinfandel',acres:20,tons:76,start:'2026-09-18',end:'2026-09-20',confidence:73},
 {id:'river',vineyard:'River Bend',block:'7',client:'Oak & Stone',variety:'Cabernet Franc',acres:25,tons:96,start:'2026-09-20',end:'2026-09-22',confidence:68},
]
const seeded:Assignment[]=[{blockId:'robles',date:'2026-09-14'},{blockId:'smith',date:'2026-09-15'},{blockId:'jones',date:'2026-09-15'},{blockId:'mesa',date:'2026-09-16'},{blockId:'stone',date:'2026-09-18'}]
const date=(v:string)=>new Date(v+'T12:00:00'), iso=(d:Date)=>d.toISOString().slice(0,10)
const add=(v:string,n:number)=>{const d=date(v);d.setDate(d.getDate()+n);return iso(d)}
const short=(v:string)=>date(v).toLocaleDateString('en-US',{month:'short',day:'numeric'})
const outside=(d:string,b:Block)=>d<b.start?Math.round((date(b.start).getTime()-date(d).getTime())/86400000):d>b.end?Math.round((date(d).getTime()-date(b.end).getTime())/86400000):0

// eslint-disable-next-line no-unused-vars
function Card({block,day,move,days}:{block:Block;day:string;move:(id:string,d:string)=>void;days:string[]}){
 const late=outside(day,block)
 return <article className={'block-card '+(late?'outside':'')} draggable onDragStart={e=>e.dataTransfer.setData('block',block.id)}>
  <div className="block-title"><div><b>{block.vineyard} · {block.block}</b><span>{block.client} · {block.variety}</span></div><i>⠿</i></div>
  <div className="numbers"><span><b>{block.acres}</b> acres</span><span><b>{block.tons}</b> tons</span><span><b>{Math.ceil(block.tons/TONS_PER_LOAD)}</b> loads</span></div>
  <p className="forecast"><CloudSun size={13}/>Forecast {short(block.start)}–{short(block.end).replace(/^\w+\s/,'')} · {block.confidence}%</p>
  {!!late&&<p className="warning"><AlertTriangle size={12}/>Scheduled {late} day{late>1?'s':''} {day>block.end?'after':'before'} window</p>}
  <label>Move to <select value={day} onChange={e=>move(block.id,e.target.value)}>{days.map(d=><option value={d} key={d}>{date(d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</option>)}<option value="">Unscheduled</option></select></label>
 </article>
}

export default function App(){
 const [week,setWeek]=useState(START),[assignments,setAssignments]=useState(seeded),[capacity,setCapacity]=useState<Record<string,number>>({'2026-09-14':5,'2026-09-15':6,'2026-09-16':7,'2026-09-17':5,'2026-09-18':7,'2026-09-19':4,'2026-09-20':4}),[query,setQuery]=useState(''),[mobile,setMobile]=useState(false),[toast,setToast]=useState('')
 const days=useMemo(()=>Array.from({length:7},(_,i)=>add(week,i)),[week]);const assigned=new Set(assignments.map(a=>a.blockId))
 const unscheduled=blocks.filter(b=>!assigned.has(b.id)&&`${b.vineyard} ${b.variety} ${b.client}`.toLowerCase().includes(query.toLowerCase()))
 const move=(id:string,d:string)=>{setAssignments(a=>d?[...a.filter(x=>x.blockId!==id),{blockId:id,date:d}]:a.filter(x=>x.blockId!==id));setToast(d?`${blocks.find(b=>b.id===id)?.vineyard} moved to ${short(d)}`:'Block moved to unscheduled');setTimeout(()=>setToast(''),1800)}
 const scheduled=assignments.filter(a=>days.includes(a.date)).map(a=>blocks.find(b=>b.id===a.blockId)!).filter(Boolean), tons=scheduled.reduce((n,b)=>n+b.tons,0)
 const alerts=days.filter(d=>Math.ceil(assignments.filter(a=>a.date===d).reduce((n,a)=>n+(blocks.find(b=>b.id===a.blockId)?.tons||0),0)/TONS_PER_LOAD)>(capacity[d]||0)).length
 return <div className="shell"><aside className={mobile?'open':''}><div className="brand"><span><Sprout/></span><div><b>VineFlow</b><small>HARVEST OPERATIONS</small></div></div><button className="close" onClick={()=>setMobile(false)}><X/></button><nav>{[['Overview',LayoutDashboard],['Block Status',Grape],['Harvest Planner',CalendarDays],['Forecasting',CloudSun],['Fleet & Logistics',Truck]].map(([n,I]:any)=><button className={n==='Harvest Planner'?'active':''} key={n}><I size={18}/>{n}</button>)}</nav><div className="bottom"><button><Settings size={18}/>Settings</button><div className="profile"><span>JM</span><div><b>Jordan Miller</b><small>Operations Manager</small></div></div></div></aside>
 <main><header><button className="menu" onClick={()=>setMobile(true)}><Menu/></button><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search vineyards, blocks, varieties..."/></div><div>2026 Harvest</div></header><div className="content">
  <div className="page-head"><div><p>HARVEST PLANNER</p><h1>Weekly harvest plan</h1><span>Balance predicted fruit volume with nightly truck capacity.</span></div><div className="week-nav"><button onClick={()=>setWeek(add(week,-7))}><ChevronLeft/></button><b><CalendarDays/> {short(week)} – {short(add(week,6))}</b><button onClick={()=>setWeek(add(week,7))}><ChevronRight/></button></div></div>
  <section className="metrics"><div><span>Blocks scheduled</span><b>{scheduled.length}</b><small>{unscheduled.length} awaiting assignment</small></div><div><span>Planned volume</span><b>{tons} <i>tons</i></b><small>{Math.ceil(tons/20)} expected truck loads</small></div><div><span>Capacity alerts</span><b className="red">{alerts}</b><small>nights under capacity</small></div><div><span>Planning assumption</span><b>20 <i>tons</i></b><small>per truck load</small></div></section>
  <div className="layout"><section className="board">{days.map(d=>{const bs=assignments.filter(a=>a.date===d).map(a=>blocks.find(b=>b.id===a.blockId)!).filter(Boolean), t=bs.reduce((n,b)=>n+b.tons,0),loads=Math.ceil(t/20),trucks=capacity[d]||0,delta=trucks-loads;return <div className={'day '+(delta<0?'deficit':'')} key={d} onDragOver={e=>e.preventDefault()} onDrop={e=>move(e.dataTransfer.getData('block'),d)}><div className="summary"><div className="day-title"><div><b>{date(d).toLocaleDateString('en-US',{weekday:'long'})}</b><span>{short(d)}</span></div>{delta<0&&<strong><AlertTriangle/> {Math.abs(delta)} truck deficit</strong>}</div><div className="stats"><span><b>{bs.length}</b> blocks</span><span><b>{t}</b> tons</span><span><b>{loads}</b> loads</span></div><div className="trucks"><label><Truck/>Trucks available</label><div><button onClick={()=>setCapacity(c=>({...c,[d]:Math.max(0,trucks-1)}))}>−</button><input type="number" min="0" value={trucks} onChange={e=>setCapacity(c=>({...c,[d]:+e.target.value}))}/><button onClick={()=>setCapacity(c=>({...c,[d]:trucks+1}))}>+</button></div></div><p className={delta<0?'red':'green'}>{delta<0?`${Math.abs(delta)} more trucks needed`:delta?`${delta} truck${delta===1?'':'s'} available`:'Capacity exactly covered'}</p></div><div className="cards">{bs.length?bs.map(b=><Card block={b} day={d} move={move} days={days} key={b.id}/>):<div className="empty"><CalendarDays/>Drop a block here to schedule</div>}</div></div>})}</section>
  <section className="unscheduled"><div className="u-head"><div><h2>Unscheduled blocks</h2><p>Drag into a harvest night</p></div><b>{unscheduled.length}</b></div><div className="filter"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter blocks"/></div>{unscheduled.map(b=><article key={b.id} draggable onDragStart={e=>e.dataTransfer.setData('block',b.id)}><b>{b.vineyard} · {b.block}</b><span>{b.client} · {b.variety}</span><div><i>{b.acres} ac</i><i>{b.tons} tons</i><i>{Math.ceil(b.tons/20)} loads</i></div><p><CloudSun/> {short(b.start)}–{short(b.end).replace(/^\w+\s/,'')} · {b.confidence}% confidence</p><select defaultValue="" onChange={e=>move(b.id,e.target.value)}><option value="" disabled>Assign to night…</option>{days.map(d=><option value={d} key={d}>{date(d).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</option>)}</select></article>)}</section></div>
 </div></main>{toast&&<div className="toast">{toast}</div>}</div>
}
