import {useMemo, useState} from 'react'
import {AlertTriangle, ArrowRight} from 'lucide-react'
import type {Row} from './api'
import './operations.css'

const fmt=(v:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(v)
type Props={rows:Row[];active:string;onRoute:(id:string)=>void}
export function Monitoring({rows,active,onRoute}:Props){
 const [route,setRoute]=useState(''),[stamp,setStamp]=useState(active)
 const [fleet,setFleet]=useState([4,5,8]),[capacities,setCapacities]=useState([20000,8000,2500])
 const stamps=useMemo(()=>[...new Set(rows.map(r=>r.timestamp))].sort(),[rows])
 const focused=rows.filter(r=>r.timestamp===active).sort((a,b)=>b.y_pred-a.y_pred)
 const selected=route||focused[0]?.route_id||''
 const selectedTime=stamps.includes(stamp)?stamp:active
 const volume=rows.find(r=>r.route_id===selected&&r.timestamp===selectedTime)?.y_pred||0
 const capacity=fleet.reduce((sum,n,i)=>sum+n*capacities[i],0)
 const coverage=volume?Math.round(capacity/volume*100):0
 const discrepancies=useMemo(()=>{
  const groups=new Map<string,number[]>()
  rows.forEach(r=>groups.set(r.route_id,[...(groups.get(r.route_id)||[]),r.y_pred]))
  const deviations=focused.map(r=>{const values=groups.get(r.route_id)||[];const avg=values.reduce((a,b)=>a+b,0)/values.length;return {...r,change:avg?(r.y_pred-avg)/avg:0}})
  return [...deviations.filter(r=>r.change>0).sort((a,b)=>b.change-a.change).slice(0,4),...deviations.filter(r=>r.change<0).sort((a,b)=>a.change-b.change).slice(0,4)]
 },[rows,active])
 return <div className="operations">
  <div className="ops-heading"><div><span className="ops-kicker">На {active.slice(11,16)}</span><h2>Требуют внимания</h2></div><span className="ops-muted">Отклонение от среднего прогноза по направлению</span></div>
  <section className="alert-list">{discrepancies.map(r=><button key={r.id} className="alert-row" onClick={()=>{setRoute(r.route_id);onRoute(r.route_id)}}><span className={`alert-symbol ${r.change<0?'low':''}`}><AlertTriangle size={17}/></span><span className="alert-main"><strong>Направление {r.route_id}</strong><small>{r.change>=0?'Объём выше среднего':'Объём ниже среднего'} · {fmt(r.y_pred)} товаров за час</small></span><strong className="alert-delta">{r.change>=0?'+':''}{Math.round(r.change*100)}%</strong><ArrowRight size={17}/></button>)}</section>
  <div className="scenario-head"><div><span className="ops-kicker">Планирование</span><h2>Сценарий подачи транспорта</h2></div></div>
  <section className="scenario-grid"><div className="scenario-settings"><div className="scenario-fields"><label>Направление<select value={selected} onChange={e=>{setRoute(e.target.value)}}>{[...new Set(rows.map(r=>r.route_id))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(id=><option key={id} value={id}>{id}</option>)}</select></label><label>Прогноз к моменту подачи<select value={selectedTime} onChange={e=>setStamp(e.target.value)}>{stamps.map(t=><option key={t} value={t}>{t.slice(11,16)}</option>)}</select></label></div>
   <div className="fleet-head"><span>Транспорт</span><span>Машин</span><span>Товаров / машина</span></div>{['Фура','Средний грузовик','Малый грузовик'].map((name,i)=><div className="fleet-row" key={name}><span><VehicleIcon type={i}/>{name}</span><input aria-label={`${name}: число машин`} type="number" min="0" max="100000" value={fleet[i]} onChange={e=>setFleet(fleet.map((x,j)=>j===i?Math.max(0,Number(e.target.value)||0):x))}/><input aria-label={`${name}: вместимость`} type="number" min="1" max="1000000000" value={capacities[i]} onChange={e=>setCapacities(capacities.map((x,j)=>j===i?Math.max(1,Number(e.target.value)||1):x))}/></div>)}<p className="scenario-note">Вместимость условная и задаётся в товарах. Расчёт на один час, без учёта габаритов и времени оборота.</p></div>
   <div className="scenario-result"><span>Прогноз к {selectedTime.slice(11,16)}</span><strong>{fmt(volume)} <small>товаров</small></strong><div className="coverage-track"><i style={{width:`${Math.min(100,coverage)}%`}}/></div><div className="coverage-line"><b>{coverage}% обеспечено</b><span>{fmt(capacity)} мест</span></div><div className="scenario-suggestion">{capacity>=volume?'Текущей вместимости достаточно для прогноза':'Не хватает '+fmt(volume-capacity)+' мест. Можно добавить '+fmt(Math.ceil((volume-capacity)/capacities[0]))+' фур с указанной вместимостью.'}</div></div>
  </section>
  <p className="scenario-note">Отклонения рассчитаны относительно среднего по восьми точкам прогноза. Это повод проверить направление, а не подтверждённая аномалия.</p>
 </div>
}

function VehicleIcon({type}:{type:number}){return <svg aria-hidden="true" width="30" height="24" viewBox="0 0 36 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{type===0?<><path d="M1.5 5h21v12h-21zM22.5 9h5l4 3v5h-9zM25 9v4h5M3 8h17M22.5 16h-2"/><circle cx="6" cy="18" r="2.4"/><circle cx="17" cy="18" r="2.4"/><circle cx="28" cy="18" r="2.4"/></>:type===1?<><path d="M3 6h16v11H3zM19 9h5l4 4v4h-9zM21 10v3h5M5 9h12"/><circle cx="7" cy="18" r="2.4"/><circle cx="24" cy="18" r="2.4"/></>:<><path d="M5 9h14l4 1 4 4v3H5zM9 9V6h10l4 4M20 10v4h6M7 12h10M17 10v7"/><circle cx="9" cy="18" r="2.4"/><circle cx="23" cy="18" r="2.4"/></>}</svg>}
