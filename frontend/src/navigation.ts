export type Page='overview'|'results'|'routes'|'warehouses'|'monitoring'
export type Navigation={page:Page;route:string;time:string;warehouse:string}
const pages:Page[]=['overview','results','routes','warehouses','monitoring']
export function parseLocation(hash:string):Navigation {
 const [part,query='']=hash.replace(/^#/,'').split('?');const params=new URLSearchParams(query)
 return {page:pages.includes(part as Page)?part as Page:'overview',route:params.get('route')||'',time:params.get('time')||'',warehouse:params.get('warehouse')||''}
}
export function makeLocation(state:Partial<Navigation>&{page:Page}):string {
 const params=new URLSearchParams();if(state.route)params.set('route',state.route);if(state.time)params.set('time',state.time);if(state.warehouse)params.set('warehouse',state.warehouse)
 const query=params.toString();return `#${state.page}${query?'?'+query:''}`
}
