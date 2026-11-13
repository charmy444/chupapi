import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {MercatorCoordinate, type CustomLayerInterface, type Map as MapLibreMap} from 'maplibre-gl'
import {pointAlong, smoothBearing, type Coordinate} from './geometry'
import type {DemoRoute} from './catalog'
import {warehouseForDock,type DockWarehouse} from './docks'

function material(color: string, roughness = 0.65) {
  return new THREE.MeshStandardMaterial({color, roughness, metalness: 0.08})
}

function box(parent: THREE.Group, size: [number, number, number], position: [number, number, number], mat: THREE.Material, rounded = false) {
  const geometry = rounded ? new RoundedBoxGeometry(...size, 2, 0.13) : new THREE.BoxGeometry(...size)
  const mesh = new THREE.Mesh(geometry, mat)
  mesh.position.set(...position)
  parent.add(mesh)
  return mesh
}

export function makeTruck(): THREE.Group {
  const truck = new THREE.Group()
  const violet = material('#a111c3'), roof = material('#b624d7'), white = material('#fbfafc'), steel = material('#47505c'), rubber = material('#24212c'), glass = material('#263647', 0.24)
  box(truck,[2.6,15.6,0.45],[0,-0.7,1.15],steel)
  box(truck,[2.9,11.4,3.45],[0,-2.45,3.02],violet,true)
  box(truck,[3,11.5,0.15],[0,-2.45,4.82],roof,true)
  box(truck,[2.8,3.5,3.4],[0,5.3,2.65],white,true)
  box(truck,[2.65,0.12,1.1],[0,7.07,3.3],glass)
  box(truck,[2.87,1.9,1.05],[0,5.75,3.3],glass,true)
  box(truck,[2.82,0.15,0.7],[0,7.1,1.85],violet)
  box(truck,[2.85,0.16,0.3],[0,7.12,1.17],steel)
  box(truck,[2.35,0.17,0.28],[0,7.13,1.65],glass)
  for (const x of [-1,1]) {
    box(truck,[0.43,0.2,0.22],[x,7.16,2.14],material('#fff4bf'))
    box(truck,[0.12,0.35,0.5],[x*1.6,6.4,3.05],steel)
  }
  for (const y of [-6.7,-5.1,2.4,6]) for (const x of [-1.45,1.45]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.73,0.73,0.44,18),rubber)
    wheel.rotation.z = Math.PI/2
    wheel.position.set(x,y,0.76)
    truck.add(wheel)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.39,0.39,0.46,18),material('#b9bcc6'))
    hub.rotation.z = Math.PI/2; hub.position.copy(wheel.position); truck.add(hub)
  }
  for (const x of [-1.47,1.47]) {
    box(truck,[0.025,10.9,0.08],[x,-2.45,1.55],white)
    for (let y=-7.7; y<2.9; y+=0.55) box(truck,[0.02,0.025,2.8],[x,y,3.1],roof)
  }
  box(truck,[2.65,0.08,3.04],[0,-8.19,3],white)
  box(truck,[0.04,0.1,2.9],[0,-8.25,3],steel)
  for (const x of [-1.1,1.1]) box(truck,[0.27,0.1,0.14],[x,-8.28,1.33],material('#d5456b'))
  const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=256
  const context=canvas.getContext('2d')!
  context.fillStyle='#ffffff';context.font='800 145px Arial';context.textAlign='center';context.textBaseline='middle';context.fillText('WB',256,138)
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace
  const logoMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false})
  const topLogo=new THREE.Mesh(new THREE.PlaneGeometry(4.8,2.4),logoMaterial)
  topLogo.rotation.z=Math.PI/2;topLogo.position.set(0,-2.2,4.91);truck.add(topLogo)
  for (const x of [-1.49,1.49]) {
    const sideLogo=new THREE.Mesh(new THREE.PlaneGeometry(5,2.5),logoMaterial)
    sideLogo.rotation.set(Math.PI/2,Math.PI/2,0);sideLogo.position.set(x,-2.2,3.2);truck.add(sideLogo)
  }
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(5.3,19),new THREE.MeshBasicMaterial({color:'#322044',opacity:0.12,transparent:true,depthWrite:false}))
  shadow.position.set(0,-0.5,0.04);truck.add(shadow)
  return truck
}

export function makeWarehouse(): THREE.Group {
  const group=new THREE.Group(), wall=material('#e9e4ed'), roof=material('#faf9fc'), purple=material('#9913bd'), door=material('#90879c')
  box(group,[28,20,10],[0,0,5],wall)
  box(group,[29,21,0.7],[0,0,10.4],roof)
  box(group,[28.2,0.4,1.4],[0,-10.2,8],purple)
  for (const x of [-8,0,8]) {
    box(group,[5.8,0.25,5.6],[x,-10.3,3],door)
    for(let z=1;z<5.8;z+=0.8)box(group,[5.7,0.1,0.08],[x,-10.46,z],roof)
    box(group,[6.2,3,0.5],[x,-11.5,0.3],door)
  }
  for(const x of [-8,0,8])box(group,[3,13,0.12],[x,0,10.82],material('#aabacb'))
  return group
}

export function createTruckLayer(route: DemoRoute, getProgress: () => number,getRoute:()=>DemoRoute): CustomLayerInterface & {placeWarehouse:(index:number,placement:DockWarehouse)=>void} {
  const scene=new THREE.Scene(), camera=new THREE.Camera(), truck=new THREE.Group(), fallback=makeTruck()
  truck.add(fallback)
  let disposed=false
  const warehouses: THREE.Group[]=[]
  const origin=MercatorCoordinate.fromLngLat(route.coordinates[0])
  const meter=origin.meterInMercatorCoordinateUnits()
  function local(position: Coordinate) {
    const p=MercatorCoordinate.fromLngLat(position)
    return new THREE.Vector3((p.x-origin.x)/meter,-(p.y-origin.y)/meter,0)
  }
  scene.add(truck, new THREE.AmbientLight('#ffffff',1.6))
  const light=new THREE.DirectionalLight('#ffffff',2.3);light.position.set(-100,-200,400);scene.add(light)
  for (const [index, point] of [route.coordinates[0],route.coordinates[route.coordinates.length-1]].entries()) {
    const warehouse=new THREE.Group()
    const fallbackWarehouse=makeWarehouse();fallbackWarehouse.scale.setScalar(3.5);warehouse.add(fallbackWarehouse)
    const bearing=smoothBearing(route.coordinates,route.cumulative,index?1:0)
    const placement=warehouseForDock(point,bearing,index===0)
    warehouse.position.copy(local(placement.center));warehouse.rotation.z=placement.rotation
    warehouse.userData.placed=false;warehouses.push(warehouse);scene.add(warehouse)
  }
  let renderer: THREE.WebGLRenderer, map: MapLibreMap
  const transform=new THREE.Matrix4().makeTranslation(origin.x,origin.y,origin.z).scale(new THREE.Vector3(meter,-meter,meter))
  return {
    id:'demo-truck', type:'custom',renderingMode:'3d',
    placeWarehouse(index,placement){const warehouse=warehouses[index];if(!warehouse)return;warehouse.position.copy(local(placement.center));warehouse.rotation.z=placement.rotation;warehouse.userData.placed=true;map?.triggerRepaint()},
    onAdd(m,gl) {
      map=m
      renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl as WebGL2RenderingContext,antialias:true})
      renderer.autoClear=false
      const loader=new GLTFLoader()
      loader.load('/models/semi-trailer-original.glb',gltf=>{
        if(disposed){disposeScene(gltf.scene);return}
        gltf.scene.traverse(object=>{
          if(!(object instanceof THREE.Mesh))return
          const name=object.name.toLowerCase()
          if(name.includes('box_trailer') || name.includes('tractor_sleeper_cab')){
            const old=object.material as THREE.MeshStandardMaterial
            object.material=old.clone()
            ;(object.material as THREE.MeshStandardMaterial).color.set(name.includes('box_trailer')?'#a110bd':'#f5f3f6')
          }
        })
        // Source model is Y-up with its cab in +Z; the map scene is Z-up and travels +Y.
        const aligned=new THREE.Group();gltf.scene.rotation.x=Math.PI/2;aligned.rotation.z=Math.PI;aligned.add(gltf.scene)
        truck.add(aligned)
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256
        const context=canvas.getContext('2d')!
        context.fillStyle='#fff';context.font='800 150px Arial';context.textAlign='center';context.textBaseline='middle';context.fillText('WB',256,135)
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace
        const print=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false})
        for(const x of [-1.26,1.26]){
          const side=new THREE.Mesh(new THREE.PlaneGeometry(6,2.6),print)
          side.rotation.set(Math.PI/2,x>0?Math.PI/2:-Math.PI/2,0);side.position.set(x,-2.18,2.6);truck.add(side)
        }
        const top=new THREE.Mesh(new THREE.PlaneGeometry(5,2.2),print)
        top.rotation.z=Math.PI/2;top.position.set(0,-2.18,4.01);truck.add(top)
        fallback.visible=false;m.triggerRepaint()
      },undefined,()=>{/* Keep the lightweight built-in model if the asset fails. */})
      loader.load('/warehouse-light.glb',gltf=>{
        if(disposed){disposeScene(gltf.scene);return}
        for(const warehouse of warehouses){
          warehouse.children[0].visible=false
          const model=gltf.scene.clone(true);model.rotation.x=Math.PI/2;model.scale.setScalar(1.4);model.position.y=-25.41;warehouse.add(model)
        }
        m.triggerRepaint()
      },undefined,()=>{/* Keep the fallback warehouse if the asset is unavailable. */})
    },
    render(_gl,args) {
      const route=getRoute()
      const point=pointAlong(route.coordinates,route.cumulative,getProgress())
      truck.position.copy(local(point.coordinate));truck.rotation.z=-smoothBearing(route.coordinates,route.cumulative,getProgress())*Math.PI/180
      // Warehouses are invisible at regional scale; omit their meshes to keep playback smooth.
      for(const warehouse of warehouses)warehouse.visible=map.getZoom()>=14 && warehouse.userData.placed
      const metersPerPixel=40075016.686*Math.cos(point.coordinate[1]*Math.PI/180)/(512*2**map.getZoom())
      truck.scale.setScalar(Math.max(1,Math.min(400,metersPerPixel*2.5)))
      camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix).multiply(transform)
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
      // Render the selected vehicle as a geographic annotation, above the base map's depth.
      // Otherwise MapLibre's road/extrusion depth range can completely hide the truck.
      renderer.resetState();renderer.clearDepth();renderer.render(scene,camera)
    },
    onRemove() {
      disposed=true
      disposeScene(scene)
      renderer?.dispose()
    },
  }
}

function disposeScene(scene: THREE.Object3D) {
  const materials=new Set<THREE.Material>(), geometries=new Set<THREE.BufferGeometry>(), textures=new Set<THREE.Texture>()
  scene.traverse(object=>{
    if(object instanceof THREE.Mesh){
      geometries.add(object.geometry)
      for(const mat of Array.isArray(object.material)?object.material:[object.material]){
        materials.add(mat)
        for(const value of Object.values(mat))if(value instanceof THREE.Texture)textures.add(value)
      }
    }
  })
  textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose())
}
