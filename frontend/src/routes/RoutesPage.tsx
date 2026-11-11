import {useEffect, useMemo, useState} from 'react'
import {ArrowRight, ChevronDown, ChevronLeft, ChevronRight, MapPin, Pause, Play, RotateCcw, Search, Truck, Warehouse, X} from 'lucide-react'
import {Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
import type {Row} from '../api'
import {demoRoute} from './catalog'
import RouteMap from './RouteMap'
import './routes.css'

const number=(n:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n)
const km=(n:number)=>`${(n/1000).toFixed(1).replace('.',',')} км`

export default function RoutesPage({rows,active,routeId,onSelect}:{rows:Row[];active:string;routeId:string;onSelect:(id:string)=>void}) {
  const [search,setSearch]=useState(''),[city,setCity]=useState(''),[listPage,setListPage]=useState(0),[chooser,setChooser]=useState(false)
  const ids=useMemo(()=>[...new Set(rows.map(r=>r.route_id))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),[rows])
  const routes=useMemo(()=>ids.map((id,index)=>demoRoute(id,index,ids.length)),[ids])
  const selected=routes.find(r=>r.id===routeId)||routes[0]
  const cities=useMemo(()=>[...new Set(routes.map(r=>r.city))].sort((a,b)=>a.localeCompare(b,'ru')),[routes])
  const filtered=useMemo(()=>routes.filter(r=>(!city||r.city===city)&&(!search||`${r.id} ${r.city}`.toLowerCase().includes(search.trim().toLowerCase()))),[routes,city,search])
  const lastPage=Math.max(0,Math.ceil(filtered.length/6)-1),safePage=Math.min(lastPage,listPage)
  const forecasts=useMemo(()=>rows.filter(r=>r.route_id===selected?.id).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)),[rows,selected?.id])
  const current=forecasts.find(r=>r.timestamp===active)
  const [progress,setProgress]=useState(0.28),[playing,setPlaying]=useState(false)
  useEffect(()=>{setPlaying(false);setProgress(0.28)},[selected?.id])
  useEffect(()=>{
    if(!playing)return
    let frame=0,last=performance.now(),lastPaint=last
    const tick=(now:number)=>{
      if(document.hidden){last=now;lastPaint=now}
      else if(now-lastPaint>=32){
        const delta=Math.min((now-last)/1000,0.15);last=now;lastPaint=now
        setProgress(p=>Math.min(1,p+delta/45))
      }
      frame=requestAnimationFrame(tick)
    }
    frame=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(frame)
  },[playing])
  useEffect(()=>{if(progress>=1)setPlaying(false)},[progress])
  if(!selected)return null
  return <div className="routes-workspace">
    <div className="route-disclaimer"><span>Демо географии</span><p>Города, склады и движение — иллюстрация. Прогнозы — из выбранного CSV</p></div>
    <button className="route-mobile-picker" onClick={()=>setChooser(!chooser)} aria-expanded={chooser}><MapPin size={18}/><span>Направление {selected.id}<small>{selected.city}</small></span><ChevronDown size={18}/></button>
    <div className="routes-layout">
      <aside className={`route-browser ${chooser?'chooser-open':''}`} aria-label="Выбор маршрута">
        <div className="route-browser-heading"><h2>Направления <span>{number(routes.length)}</span></h2><button className="route-picker-close icon-button" onClick={()=>setChooser(false)} aria-label="Закрыть выбор направления"><X size={18}/></button></div>
        <label className="route-search"><Search size={17}/><input aria-label="Поиск маршрута" placeholder="Номер или город" value={search} onChange={e=>{setSearch(e.target.value);setListPage(0)}}/></label>
        <div className="route-city-select"><select aria-label="Город маршрута" value={city} onChange={e=>{setCity(e.target.value);setListPage(0)}}><option value="">Все города</option>{cities.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={16}/></div>
        <div className="route-options">{filtered.slice(safePage*6,safePage*6+6).map(r=><button key={r.id} className={`route-option ${r.id===selected.id?'selected':''}`} onClick={()=>{onSelect(r.id);setChooser(false)}} aria-pressed={r.id===selected.id}><span className="route-option-top"><strong>Направление {r.id}</strong><ArrowRight size={15}/></span><span className="route-option-city"><MapPin size={13}/>{r.city}</span><span className="route-option-bottom">Склад А <span>→</span> Склад Б <small>{km(r.length)}</small></span></button>)}{!filtered.length&&<p className="route-no-results">Маршруты не найдены</p>}</div>
        <div className="route-list-pagination"><span>{filtered.length?`${safePage*6+1}–${Math.min(safePage*6+6,filtered.length)} из ${number(filtered.length)}`:'0 результатов'}</span><div><button disabled={safePage===0} onClick={()=>setListPage(safePage-1)} aria-label="Предыдущие маршруты"><ChevronLeft size={17}/></button><button disabled={safePage===lastPage} onClick={()=>setListPage(safePage+1)} aria-label="Следующие маршруты"><ChevronRight size={17}/></button></div></div>
      </aside>
      <section className="route-detail" aria-label={`Маршрут направления ${selected.id}`}>
        <div className="route-detail-heading"><div><span>Направление {selected.id}</span><h2>{selected.city}</h2></div><span className="route-demo-label"><Truck size={16}/>Демонстрация рейса</span></div>
        <RouteMap key={selected.id} route={selected} progress={progress}/>
        <div className="route-player">
          <button className="play-button" onClick={()=>{if(progress>=1)setProgress(0);setPlaying(!playing)}} aria-label={playing?'Пауза':'Воспроизвести маршрут'}>{playing?<Pause size={19}/>:<Play size={19}/>}</button>
          <div className="playback-track"><div><strong>{progress>=1?'Фура прибыла':playing?'Фура в пути':'Просмотр маршрута'}</strong><span>{Math.round(progress*100)}%</span></div><input aria-label="Положение фуры на маршруте" type="range" min="0" max="1000" value={Math.round(progress*1000)} onChange={e=>{setPlaying(false);setProgress(Number(e.target.value)/1000)}} style={{'--progress':`${progress*100}%`} as React.CSSProperties}/></div>
          <button className="replay-button" onClick={()=>{setPlaying(false);setProgress(0)}} aria-label="В начало маршрута"><RotateCcw size={18}/></button>
        </div>
        <div className="route-endpoints"><div><span className="endpoint-icon"><Warehouse size={18}/></span><span><small>Отправление</small><strong>{selected.origin}</strong></span></div><div className="endpoint-connection"><span/>{km(selected.length)}<span/></div><div><span className="endpoint-icon destination"><Warehouse size={18}/></span><span><small>Прибытие</small><strong>{selected.destination}</strong></span></div></div>
        <div className="route-forecast"><div className="route-forecast-value"><span>Прогноз отгрузок · {active.slice(11,16)}</span><strong>{current?number(current.y_pred):'—'}<small>товаров</small></strong><p>За предыдущий час · {active.slice(0,10).split('-').reverse().join('.')}</p></div><div className="route-forecast-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={forecasts} margin={{top:16,right:8,bottom:0,left:0}}><XAxis dataKey="timestamp" tickFormatter={t=>t.slice(11,16)} axisLine={false} tickLine={false} interval="preserveStartEnd" tick={{fontSize:10,fill:'#8c8294'}}/><YAxis hide domain={['auto','auto']}/><Tooltip labelFormatter={v=>String(v).slice(11,16)} formatter={(v:number)=>[`${number(v)} товаров`,'Прогноз']} contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e8e1ed'}}/><Line dataKey="y_pred" type="monotone" stroke="#a110bd" strokeWidth={2.5} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div></div>
        <p className="route-data-note">На графике — восемь часовых прогнозов с шагом 30 минут. Соседние периоды пересекаются</p>
      </section>
    </div>
  </div>
}
