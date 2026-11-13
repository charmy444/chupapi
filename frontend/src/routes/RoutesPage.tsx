import {useEffect, useMemo, useRef, useState} from 'react'
import {ArrowRight, ChevronDown, ChevronLeft, ChevronRight, MapPin, Pause, Play, RotateCcw, Search, Warehouse, X} from 'lucide-react'
import {Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
import type {Row} from '../api'
import {demoRoute} from './catalog'
import {estimateLoads} from './capacity'
import RouteMap from './RouteMap'
import './routes.css'

const number=(n:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n)
const km=(n:number)=>`${(n/1000).toFixed(1).replace('.',',')} км`

export default function RoutesPage({rows,active,routeId,onSelect,highlighted,onWarehouses}:{rows:Row[];active:string;routeId:string;onSelect:(id:string)=>void;highlighted:string[];onWarehouses:()=>void}) {
  const [search,setSearch]=useState(''),[city,setCity]=useState(''),[listPage,setListPage]=useState(0),[chooser,setChooser]=useState(false)
  const [capacity,setCapacity]=useState('5000')
  const ids=useMemo(()=>[...new Set(rows.map(r=>r.route_id))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),[rows])
  const routes=useMemo(()=>ids.map((id,index)=>demoRoute(id,index,ids.length)),[ids])
  const byId=useMemo(()=>new Map(rows.filter(r=>r.timestamp===active).map(r=>[r.route_id,r.y_pred])),[rows,active])
  const selected=routes.find(r=>r.id===routeId)||routes[0]
  const highlightedRoutes=useMemo(()=>routes.filter(r=>highlighted.includes(r.id)&&r.id!==selected?.id),[routes,highlighted,selected?.id])
  const cities=useMemo(()=>[...new Set(routes.map(r=>r.city))].sort((a,b)=>a.localeCompare(b,'ru')),[routes])
  const filtered=useMemo(()=>routes.filter(r=>(!city||r.city===city)&&(!search||`${r.id} ${r.city}`.toLowerCase().includes(search.trim().toLowerCase()))),[routes,city,search])
  const lastPage=Math.max(0,Math.ceil(filtered.length/6)-1),safePage=Math.min(lastPage,listPage)
  const forecasts=useMemo(()=>rows.filter(r=>r.route_id===selected?.id).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)),[rows,selected?.id])
  const current=forecasts.find(r=>r.timestamp===active)
  const loads=estimateLoads(current?.y_pred,Number(capacity))
  const [progress,setProgress]=useState(0.28),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[distance,setDistance]=useState(selected?.length||0)
  const progressRef=useRef(0.28)
  const seek=(value:number)=>{progressRef.current=value;setProgress(value)}
  useEffect(()=>{setPlaying(false);progressRef.current=0.28;setProgress(0.28);setDistance(selected?.length||0)},[selected?.id,selected?.length])
  useEffect(()=>{
    if(!playing)return
    let frame=0,last=performance.now(),lastPaint=last
    const tick=(now:number)=>{
      if(document.hidden){last=now;lastPaint=now}
      else {
        const delta=Math.min((now-last)/1000,0.1);last=now
        progressRef.current=Math.min(1,progressRef.current+delta*speed/45)
        if(now-lastPaint>=100 || progressRef.current>=1){setProgress(progressRef.current);lastPaint=now}
        if(progressRef.current>=1){setPlaying(false);return}
      }
      frame=requestAnimationFrame(tick)
    }
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)
  },[playing,speed])
  useEffect(()=>{if(!chooser)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setChooser(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[chooser])
  if(!selected)return null
  return <div className="routes-workspace">
    <div className="route-toolbar">
      <div className="route-toolbar-title"><span className="route-toolbar-icon"><MapPin size={19}/></span><span><small>Направление {selected.id}</small><strong>{selected.city} · Склад А → Склад Б</strong></span></div>
      <div className="route-toolbar-actions"><button className="route-picker" onClick={onWarehouses}><Warehouse size={16}/><span>Все склады</span></button><button className="route-picker" onClick={()=>setChooser(true)} aria-expanded={chooser}><span>Выбрать маршрут</span><ChevronDown size={17}/></button></div>
    </div>
    {chooser&&<><button className="chooser-backdrop" aria-label="Закрыть выбор маршрута" onClick={()=>setChooser(false)}/><aside className="route-browser" aria-label="Выбор маршрута" role="dialog" aria-modal="true">
      <div className="route-browser-heading"><div><h2>Маршруты</h2></div><button className="route-picker-close icon-button" onClick={()=>setChooser(false)} aria-label="Закрыть выбор маршрута"><X size={19}/></button></div>
      <label className="route-search"><Search size={17}/><input autoFocus aria-label="Поиск маршрута" placeholder="Номер или город" value={search} onChange={e=>{setSearch(e.target.value);setListPage(0)}}/></label>
      <div className="route-city-select"><select aria-label="Город маршрута" value={city} onChange={e=>{setCity(e.target.value);setListPage(0)}}><option value="">Все города</option>{cities.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={16}/></div>
      <div className="route-options">{filtered.slice(safePage*6,safePage*6+6).map(r=><button key={r.id} className={`route-option ${r.id===selected.id?'selected':''}`} onClick={()=>{onSelect(r.id);setChooser(false)}} aria-pressed={r.id===selected.id}><span className="route-option-top"><strong>Направление {r.id}</strong><ArrowRight size={15}/></span><span className="route-option-city"><MapPin size={13}/>{r.city} <span className="option-distance">{km(r.length)}</span></span><span className="route-option-bottom">{byId.has(r.id)?`${number(byId.get(r.id)!)} товаров к ${active.slice(11,16)}`:'Нет прогноза'}</span></button>)}{!filtered.length&&<p className="route-no-results">Маршруты не найдены</p>}</div>
      <div className="route-list-pagination"><span>{filtered.length?`${safePage*6+1}–${Math.min(safePage*6+6,filtered.length)} из ${number(filtered.length)}`:'0 результатов'}</span><div><button disabled={safePage===0} onClick={()=>setListPage(safePage-1)} aria-label="Предыдущие маршруты"><ChevronLeft size={17}/></button><button disabled={safePage===lastPage} onClick={()=>setListPage(safePage+1)} aria-label="Следующие маршруты"><ChevronRight size={17}/></button></div></div>
    </aside></>}
    <section className="route-detail" aria-label={`Маршрут направления ${selected.id}`}>
      <RouteMap key={selected.id} route={selected} progressRef={progressRef} highlighted={highlightedRoutes} onDistanceChange={setDistance}/>
      <div className="route-player">
        <button className="play-button" onClick={()=>{if(progressRef.current>=1)seek(0);setPlaying(!playing)}} aria-label={playing?'Пауза':'Воспроизвести маршрут'}>{playing?<Pause size={19}/>:<Play size={19}/>}</button>
        <div className="playback-track"><div><strong>{progress>=1?'Маршрут показан':playing?'Просмотр маршрута':'Движение по маршруту'}</strong><span>{Math.round(progress*100)}%</span></div><input aria-label="Положение фуры на маршруте" type="range" min="0" max="1000" value={Math.round(progress*1000)} onChange={e=>{setPlaying(false);seek(Number(e.target.value)/1000)}} style={{'--progress':`${progress*100}%`} as React.CSSProperties}/></div>
        <label className="playback-speed" title="Скорость анимации"><span>Скорость</span><span className="speed-value">{String(speed).replace('.',',')}×</span><select aria-label="Скорость анимации" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[0.25,0.5,1,2,4,8].map(v=><option value={v} key={v}>{String(v).replace('.',',')}×</option>)}</select><ChevronDown size={14}/></label>
        <button className="replay-button" onClick={()=>{setPlaying(false);seek(0)}} aria-label="В начало маршрута"><RotateCcw size={18}/></button>
      </div>
      <div className="route-endpoints"><div><span className="endpoint-icon"><Warehouse size={18}/></span><span><small>Отправление</small><strong>Склад А</strong></span></div><div className="endpoint-connection"><span/>{km(distance)}<span/></div><div><span className="endpoint-icon destination"><Warehouse size={18}/></span><span><small>Прибытие</small><strong>Склад Б</strong></span></div></div>
    </section>
    <div className="route-insights">
      <section className="route-forecast"><div className="route-forecast-value"><span>Прогноз на {active.slice(11,16)}</span><strong>{current?number(current.y_pred):'—'}<small>товаров</small></strong><p>За предыдущий час</p></div><div className="route-forecast-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={forecasts} margin={{top:12,right:8,bottom:0,left:0}}><XAxis dataKey="timestamp" tickFormatter={t=>t.slice(11,16)} axisLine={false} tickLine={false} interval="preserveStartEnd" tick={{fontSize:10,fill:'#8c8294'}}/><YAxis hide domain={['auto','auto']}/><Tooltip labelFormatter={v=>String(v).slice(11,16)} formatter={(v:number)=>[`${number(v)} товаров`,'Прогноз']} contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e8e1ed'}}/><Line dataKey="y_pred" type="monotone" stroke="#a110bd" strokeWidth={2.5} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div></section>
      <section className="capacity-card"><div className="capacity-heading"><span>Оценка транспорта</span><strong>{loads===null?'—':number(loads)}<small> условных машин</small></strong></div><label htmlFor="truck-capacity">Вместимость машины, товаров</label><div className="capacity-input"><input id="truck-capacity" type="number" min="1" max="1000000000" step="100" inputMode="numeric" value={capacity} onChange={e=>setCapacity(e.target.value)} aria-describedby="capacity-note"/><span>шт.</span></div><p id="capacity-note">Расчёт для одного часа: прогноз ÷ вместимость, с округлением вверх. Вместимость условная, без учёта габаритов и реального парка</p></section>
    </div>
  </div>
}
