import {useEffect, useRef, useState, type MutableRefObject} from 'react'
import {Map as MapLibreMap, Marker, LngLatBounds, NavigationControl, AttributionControl, setWorkerUrl, type GeoJSONSource} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import {Crosshair, Expand, Layers3, Map as MapIcon, RefreshCw, RotateCcw, RotateCw} from 'lucide-react'
import {createTruckLayer} from './truck'
import {pointAlong, type Coordinate} from './geometry'
import {routeWithDocks,dockForWarehouse,originForModelCenter,type DockWarehouse} from './docks'
import {findWarehousePlacement} from './warehousePlacement'
import {smoothBearing} from './geometry'
import type {DemoRoute} from './catalog'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)
const line = (coordinates: Coordinate[]): GeoJSON.Feature<GeoJSON.LineString> => ({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}})

export default function RouteMap({route,progressRef,highlighted,onDistanceChange}:{route:DemoRoute;progressRef:MutableRefObject<number>;highlighted:DemoRoute[];onDistanceChange:(value:number)=>void}) {
  const container=useRef<HTMLDivElement>(null), mapRef=useRef<MapLibreMap|null>(null), activeRoute=useRef(route)
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[epoch,setEpoch]=useState(0),[flat,setFlat]=useState(false),[follow,setFollow]=useState(false)
  const followRef=useRef(false)
  followRef.current=follow

  useEffect(()=>{
    if(!container.current)return
    let disposed=false, loaded=false, baseMapFailed=false, frame=0
    activeRoute.current=route
    setStatus('loading');setFlat(false);setFollow(false)
    // Probe before MapLibre creates global handlers, so unsupported devices fail cleanly.
    const probe=document.createElement('canvas'), gl=probe.getContext('webgl2')
    if(!gl){setStatus('error');return}
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    let map:MapLibreMap
    try {
      map=new MapLibreMap({container:container.current,style:'/maps/wb-light.json',center:pointAlong(route.coordinates,route.cumulative,progressRef.current).coordinate,zoom:16.1,pitch:56,bearing:-24,renderWorldCopies:false,attributionControl:false,cooperativeGestures:true,canvasContextAttributes:{antialias:true},maxZoom:19,minZoom:3,locale:{'CooperativeGesturesHandler.WindowsHelpText':'Удерживайте Ctrl для масштабирования','CooperativeGesturesHandler.MacHelpText':'Удерживайте ⌘ для масштабирования','CooperativeGesturesHandler.MobileHelpText':'Перемещайте карту двумя пальцами','NavigationControl.ZoomIn':'Приблизить','NavigationControl.ZoomOut':'Отдалить','NavigationControl.ResetBearing':'Север сверху'}})
    }catch {setStatus('error');return}
    mapRef.current=map
    map.addControl(new NavigationControl({showCompass:true}),'top-right')
    map.addControl(new AttributionControl({compact:true,customAttribution:'<a href="https://project-osrm.org/" target="_blank" rel="noopener noreferrer">OSRM</a>'}),'bottom-right')
    const bounds=new LngLatBounds();route.coordinates.forEach(p=>bounds.extend(p));highlighted.forEach(r=>r.coordinates.forEach(p=>bounds.extend(p)))
    map.fitBounds(bounds,{padding:{top:85,bottom:90,left:70,right:70},maxZoom:12.8,pitch:25,bearing:0,duration:0})
    const timeout=window.setTimeout(()=>{if(!disposed&&!loaded)setStatus('error')},18000)
    map.on('error',()=>{if(!disposed){baseMapFailed=true;setStatus('error')}})
    map.on('dragstart',()=>setFollow(false))
    map.on('zoomstart',e=>{if(e.originalEvent)setFollow(false)})
    const markers:Marker[]=[]
    map.on('load',()=>{
      if(disposed)return
      loaded=true;window.clearTimeout(timeout)
      if(baseMapFailed){setStatus('error');return}
      setStatus('ready')
      const labelLayer=map.getStyle().layers.find(l=>l.type==='symbol')?.id
      map.addLayer({id:'city-buildings-3d',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:13,paint:{'fill-extrusion-color':'#d9d3e2','fill-extrusion-height':['coalesce',['get','render_height'],8],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':0.86}},labelLayer)
      map.addSource('demo-route',{type:'geojson',data:line(route.coordinates)})
      map.addSource('demo-traveled',{type:'geojson',data:line([route.coordinates[0],route.coordinates[0]])})
      if(highlighted.length){map.addSource('assistant-routes',{type:'geojson',data:{type:'FeatureCollection',features:highlighted.map(r=>line(r.coordinates))}});map.addLayer({id:'assistant-routes',type:'line',source:'assistant-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#8e1daa','line-width':4,'line-opacity':.8}})}
      map.addLayer({id:'route-casing',type:'line',source:'demo-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':9,'line-opacity':0.9}})
      map.addLayer({id:'route-remaining',type:'line',source:'demo-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#bf89d4','line-width':5}})
      map.addLayer({id:'route-traveled',type:'line',source:'demo-traveled',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#9b13bc','line-width':5}})
      const warehouseLayer=createTruckLayer(route,()=>progressRef.current,()=>activeRoute.current);map.addLayer(warehouseLayer)
      const placements:[DockWarehouse|null,DockWarehouse|null]=[null,null]
      const resolveWarehouse=(index:number,point:Coordinate)=>{
        if(placements[index])return placements[index]
        const candidate=findWarehousePlacement(map,point,smoothBearing(route.coordinates,route.cumulative,index?1:0),'city-buildings-3d');if(!candidate)return null
        const placement:DockWarehouse=originForModelCenter(candidate.coordinate,candidate.rotation);placements[index]=placement;warehouseLayer.placeWarehouse(index,placement);activeRoute.current=routeWithDocks(route,placements);onDistanceChange(activeRoute.current.length);markers[index]?.setLngLat(dockForWarehouse(placement));(map.getSource('demo-route') as GeoJSONSource)?.setData(line(activeRoute.current.coordinates));previous=-1;lastTrack=-1;map.triggerRepaint();return placement
      }
      map.on('idle',()=>{if(map.getZoom()<14.5)return;[route.coordinates[0],route.coordinates[route.coordinates.length-1]].forEach((point,index)=>{if(!placements[index])resolveWarehouse(index,point)})})
      for(const [index,point] of [route.coordinates[0],route.coordinates[route.coordinates.length-1]].entries()){
        const node=document.createElement('button');node.type='button';node.className=`warehouse-marker ${index?'destination':''}`
        const badge=document.createElement('span');badge.textContent=index?'Б':'А'
        const label=document.createElement('strong');label.textContent=index?'Прибытие':'Отправление'
        node.append(badge,label)
        node.setAttribute('aria-label',index?'Показать склад прибытия':'Показать склад отправления')
        node.addEventListener('click',()=>{
          setFollow(false);setFlat(false)
          const existing=placements[index]
          if(existing){map.flyTo({center:existing.center,zoom:17.2,pitch:58,bearing:-24,duration:800});return}
          map.flyTo({center:point,zoom:14.6,pitch:0,bearing:0,duration:650})
          map.once('idle',()=>{if(disposed)return;const warehouse=resolveWarehouse(index,point);if(warehouse)map.flyTo({center:warehouse.center,zoom:17.2,pitch:58,bearing:-24,duration:700})})
        })
        markers.push(new Marker({element:node,anchor:'bottom',offset:[0,-8]}).setLngLat(point).addTo(map))
      }
      let previous=-1, lastTrack=-1, lastTrackTime=0
      const render=(now:number)=>{
        if(disposed)return
        const p=progressRef.current
        if(p!==previous){
          const point=pointAlong(activeRoute.current.coordinates,activeRoute.current.cumulative,p)
          if(followRef.current&&!map.isRotating())map.jumpTo({center:point.coordinate})
          map.triggerRepaint();previous=p
        }
        // Route geometry is processed by a worker; update it less often than the 3D truck.
        if(p!==lastTrack && (now-lastTrackTime>=150 || Math.abs(p-lastTrack)>0.02)){
          const point=pointAlong(activeRoute.current.coordinates,activeRoute.current.cumulative,p)
          const coordinates=[...activeRoute.current.coordinates.slice(0,point.index),point.coordinate]
          ;(map.getSource('demo-traveled') as GeoJSONSource)?.setData(line(coordinates.length<2?[point.coordinate,point.coordinate]:coordinates))
          lastTrack=p;lastTrackTime=now
        }
        frame=requestAnimationFrame(render)
      }
      frame=requestAnimationFrame(render)
    })
    const observer=new ResizeObserver(()=>map.resize());observer.observe(container.current)
    return()=>{
      disposed=true;window.clearTimeout(timeout);cancelAnimationFrame(frame);observer.disconnect()
      markers.forEach(m=>m.remove());map.remove();mapRef.current=null
    }
  },[route,epoch,progressRef,highlighted,onDistanceChange])

  function fit(){
    const map=mapRef.current;if(!map)return
    setFollow(false)
    const bounds=new LngLatBounds();route.coordinates.forEach(p=>bounds.extend(p))
    map.fitBounds(bounds,{padding:{top:80,bottom:75,left:50,right:65},maxZoom:15.4,pitch:flat?0:52,bearing:flat?0:-22,duration:700})
  }
  function focus(){
    const map=mapRef.current;if(!map)return
    setFollow(false);setFlat(false)
    map.once('moveend',()=>setFollow(true))
    map.flyTo({center:pointAlong(activeRoute.current.coordinates,activeRoute.current.cumulative,progressRef.current).coordinate,zoom:16.3,pitch:60,bearing:map.getBearing(),duration:800})
  }
  return <div className="route-map-shell" data-map-status={status}>
    <div ref={container} className="route-map" aria-label={`3D-карта: ${route.city}, направление ${route.id}`}/>
    <div className="map-location"><span className="map-location-dot"/><span>{route.city}</span></div>
    {status==='loading'&&<div className="map-message" role="status"><span className="loader"/><strong>Загружаем карту города</strong></div>}
    {status==='error'&&<div className="map-message map-error" role="alert"><MapIcon size={28}/><strong>Карта пока недоступна</strong><p>Проверьте интернет и поддержку WebGL в браузере. Прогнозы направления доступны ниже</p><button className="outline-button" onClick={()=>setEpoch(e=>e+1)}><RefreshCw size={16}/>Повторить</button></div>}
    {status==='ready'&&<div className="map-view-controls"><button className={follow?'active':''} onClick={focus}><Crosshair size={17}/><span>К фуре</span></button><button onClick={fit} aria-label="Показать весь маршрут" title="Весь маршрут"><Expand size={17}/></button><button onClick={()=>{setFlat(false);mapRef.current?.jumpTo({bearing:mapRef.current.getBearing()-45,pitch:Math.max(mapRef.current.getPitch(),50)})}} aria-label="Повернуть карту влево" title="Повернуть влево"><RotateCcw size={17}/></button><button onClick={()=>{setFlat(false);mapRef.current?.jumpTo({bearing:mapRef.current.getBearing()+45,pitch:Math.max(mapRef.current.getPitch(),50)})}} aria-label="Повернуть карту вправо" title="Повернуть вправо"><RotateCw size={17}/></button><button className={flat?'active':''} onClick={()=>{setFlat(!flat);setFollow(false);mapRef.current?.easeTo({pitch:flat?52:0,bearing:flat?-22:0,duration:600})}} aria-label={flat?'Объёмный вид':'Вид сверху'}><Layers3 size={17}/><span>{flat?'2D':'3D'}</span></button></div>}
  </div>
}
