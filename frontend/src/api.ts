export type Run = {id:string; name:string; label:string; created_at:string; row_count:number; route_count:number; timestamps:string[]; status:string; source:string}
export type Row = {id:number;route_id:string;timestamp:string;y_pred:number}
export type Result = {rows:Row[];timestamps:string[];row_count:number;route_count:number}
export type Health = {status:string;mapping_available:boolean;startup_error:string|null}
async function request<T>(url:string,init?:RequestInit):Promise<T>{
 const res=await fetch(url,init); if(!res.ok){let message='Не удалось получить данные';try{const data=await res.json();message=data.detail||message}catch{/* network response without JSON */} throw new Error(message)} return res.json()
}
export const api={runs:()=>request<Run[]>('/api/predictions'),results:(id:string)=>request<Result>(`/api/predictions/${encodeURIComponent(id)}/results`),health:()=>request<Health>('/api/health'),upload:(file:File)=>{const form=new FormData();form.append('file',file);return request<Run>('/api/predictions',{method:'POST',body:form})},download:(id:string)=>`/api/predictions/${encodeURIComponent(id)}/download`}
