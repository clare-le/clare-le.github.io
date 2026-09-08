import * as THREE from './vendor/three.module.min.js';

export const ROUTE_LENGTH = 1200;
export const RAIL_RISE = 6;
// 手動參照使用者地圖的相對布局；像素只是製作座標，不是 GIS 或實測里程。
const pixels = [[414,321],[412,376],[402,439],[385,497],[364,553],[352,600],[339,686],[320,787],[309,839],[294,881],[275,913],[247,937],[217,957]];
const raw = new THREE.CatmullRomCurve3(pixels.map(([x,y])=>new THREE.Vector3(x-414,0,y-321)),false,'centripetal');
raw.arcLengthDivisions=8192;
const scale=ROUTE_LENGTH/raw.getLength();
export function mapPoint(x,y){return {x:(x-414)*scale,z:(y-321)*scale};}
export function mapPixel(x,z){return {x:x/scale+414,y:z/scale+321};}
const curve=new THREE.CatmullRomCurve3(pixels.map(([x,y])=>{const p=mapPoint(x,y);return new THREE.Vector3(p.x,0,p.z);}),false,'centripetal');
curve.arcLengthDivisions=8192;
const samples=Array.from({length:2401},(_,i)=>curve.getPointAt(i/2400));
function center(s){
 const q=Math.max(0,Math.min(2400,s/ROUTE_LENGTH*2400)),i=Math.min(2399,Math.floor(q)),f=q-i;
 const a=samples[i],b=samples[i+1];
 let x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;
 if(s<0||s>ROUTE_LENGTH){const edge=s<0?0:2399,aa=samples[edge],bb=samples[edge+1],d=Math.hypot(bb.x-aa.x,bb.z-aa.z),extra=s<0?s:s-ROUTE_LENGTH;x+=(bb.x-aa.x)/d*extra;z+=(bb.z-aa.z)/d*extra;}
 return {x,z};
}
export function routeFrame(s){
 const p=center(s),a=center(s-.25),b=center(s+.25),length=Math.hypot(b.x-a.x,b.z-a.z);
 const tx=(b.x-a.x)/length,tz=(b.z-a.z)/length;
 return {...p,tx,tz,nx:tz,nz:-tx,angle:Math.atan2(tx,tz)};
}
export function routePoint(s,offset=0){const p=routeFrame(s);return {x:p.x+p.nx*offset,z:p.z+p.nz*offset};}
export function nearestRouteDistance(x,z){let best=Infinity;for(let s=-100;s<=1300;s+=4){const p=center(s);best=Math.min(best,Math.hypot(p.x-x,p.z-z));}return best;}
export const roads = [
 {name:'文興路二段',en:'WENXING RD.',width:13,y:.15,points:[[170,219],[320,272],[445,314],[580,365]]},
 {name:'高鐵五路',en:'GAOTIE 5TH RD.',width:10,y:.15,points:[[436,322],[432,380],[421,441],[407,495]]},
 {name:'興隆路五段',en:'XINGLONG RD.',width:13,y:.15,points:[[-180,196],[140,367],[375,510],[670,680],[850,788]]},
 {name:'台 68 線',en:'PROVINCIAL HWY 68',width:19,y:2.5,points:[[-190,324],[120,496],[345,624],[630,790],[860,912]]},
 {name:'員山路',en:'YUANSHAN RD.',width:11,y:.15,points:[[70,765],[199,834],[305,889],[440,947],[580,975]]},
];
export const river = {name:'頭前溪',width:96,points:[[-340,158],[-80,307],[160,449],[360,566],[620,695],[900,850]]};
export function distanceToLine(x,z,points){
 let best=Infinity;
 for(let i=1;i<points.length;i++){
  const a=mapPoint(...points[i-1]),b=mapPoint(...points[i]),dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
  best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
 }
 return best;
}
export function riverDistance(x,z){return distanceToLine(x,z,river.points);}
export function reserveScenery(x,z,radius=0){
 return riverDistance(x,z)<river.width/2+70+radius || roads.some(r=>distanceToLine(x,z,r.points)<r.width/2+radius+3);
}
const features=[
 {name:'六家站',s:0},
 ...roads.filter(r=>r.name!=='文興路二段'&&r.name!=='高鐵五路').map(road=>{let closest={s:0,d:Infinity};for(let s=0;s<=1200;s++){const p=center(s),d=distanceToLine(p.x,p.z,road.points);if(d<closest.d)closest={s,d};}return {name:road.name,s:closest.s};}),
 (()=>{let closest={s:0,d:Infinity};for(let s=0;s<=1200;s++){const p=center(s),d=riverDistance(p.x,p.z);if(d<closest.d)closest={s,d};}return {name:'頭前溪鐵橋',s:closest.s};})(),
 {name:'竹中站',s:1200},
].sort((a,b)=>a.s-b.s);
export const landmarks=features;
export function locationAt(s){const p=center(s);if(riverDistance(p.x,p.z)<70)return '頭前溪鐵橋';const close=features.find(f=>Math.abs(f.s-s)<38);if(close)return close.name;if(s<300)return '六家・高鐵五路';if(s>1050)return '竹中站前彎道';if(s>660)return '下員山';return '頭前溪河濱';}
