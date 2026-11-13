import {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {ArrowUp, Sparkles, MapPinned, Plus, X} from 'lucide-react'
import type {Row} from './api'
import {samplePrompts} from './prompts'
import './operations.css'
type Message={role:'user'|'assistant';text:string;ids?:string[]}

export default function Assistant({open,active,rows,onClose,onRoute,onMap,selectedRoute,runId,scope,scopeLabel}:{open:boolean;active:string;rows:Row[];onClose:()=>void;onRoute:(id:string)=>void;onMap:(ids:string[])=>void;selectedRoute:string;runId:string;scope:string[]|null;scopeLabel:string}){
 const [messages,setMessages]=useState<Message[]>([]),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[prompts,setPrompts]=useState(samplePrompts)
 const input=useRef<HTMLTextAreaElement>(null),bottom=useRef<HTMLDivElement>(null),pending=useRef<AbortController|null>(null),generation=useRef(0)
 const clearChat=()=>{generation.current++;pending.current?.abort();pending.current=null;setMessages([]);setQuestion('');setBusy(false);setPrompts(samplePrompts())}
 useLayoutEffect(()=>{const el=input.current;if(!el)return;el.style.height='auto';el.style.height=`${Math.min(el.scrollHeight,150)}px`;el.style.overflowY=el.scrollHeight>150?'auto':'hidden'},[question,open])
 useEffect(()=>{if(open)bottom.current?.scrollIntoView({block:'nearest'})},[messages,busy,open])
 useEffect(()=>{clearChat();return()=>pending.current?.abort()},[scopeLabel,scope?.join(',')])
 async function send(text:string){
  const value=text.trim();if(!value||busy)return
  const requestGeneration=generation.current,controller=new AbortController();pending.current=controller
  setMessages(m=>[...m,{role:'user',text:value}]);setQuestion('');setBusy(true)
  try{const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({question:value,timestamp:active,run_id:runId,route_id:selectedRoute||null,route_ids:scope,history:messages.slice(-8).map(m=>({role:m.role,content:m.text}))})});const data=await r.json();if(!r.ok)throw new Error(data.detail||'Не удалось получить ответ');if(generation.current===requestGeneration)setMessages(m=>[...m,{role:'assistant',text:data.answer,ids:data.route_ids}])}
  catch(e){if(!controller.signal.aborted&&generation.current===requestGeneration)setMessages(m=>[...m,{role:'assistant',text:e instanceof Error?e.message:'Ошибка соединения'}])}finally{if(generation.current===requestGeneration){pending.current=null;setBusy(false)}}
 }
 return <div className={`assistant-layer ${open?'is-open':''}`} aria-hidden={!open}><button className="assistant-backdrop" aria-label="Закрыть помощника" tabIndex={open?0:-1} onClick={onClose}/><aside className="assistant-panel" role="dialog" aria-modal="true" aria-label="ИИ помощник"><header><span className="assistant-icon"><Sparkles size={20}/></span><div><strong>ИИ помощник</strong><small>{scopeLabel||`Прогноз на ${active.slice(11,16)}`}</small></div><button className="assistant-new" onClick={clearChat} aria-label="Новый чат" title="Новый чат"><Plus size={17}/><span>Новый чат</span></button><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20}/></button></header><div className="assistant-thread">{!messages.length&&<div className="assistant-start"><h2>С чего начнём?</h2><p>Помогу найти направления, на которые стоит обратить внимание</p><div>{prompts.map(p=><button key={p} onClick={()=>send(p)} disabled={!rows.length}>{p}<ArrowRightIcon/></button>)}</div></div>}{messages.map((m,i)=><div className={`assistant-message ${m.role}`} key={i}><div>{m.text}</div>{!!m.ids?.length&&<section><button onClick={()=>{onMap(m.ids!);onClose()}}><MapPinned size={14}/> Показать на карте</button>{m.ids.map(id=><button key={id} onClick={()=>{onRoute(id);onClose()}}><MapPinned size={14}/> Направление {id}</button>)}</section>}</div>)}{busy&&<div className="assistant-thinking">Изучаю прогноз…</div>}<div ref={bottom}/></div><form className="assistant-form" onSubmit={e=>{e.preventDefault();send(question)}}><textarea ref={input} aria-label="Вопрос помощнику" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Спросите о прогнозе" rows={1} maxLength={2000}/><button disabled={!question.trim()||busy||!rows.length} aria-label="Отправить"><ArrowUp size={19}/></button></form></aside></div>
}
function ArrowRightIcon(){return <span aria-hidden="true">↗</span>}
