import * as THREE from './vendor/three.module.min.js';
import { ROUTE_LENGTH, RAIL_RISE, routeFrame, routePoint, mapPoint, roads, river, riverDistance, reserveScenery, nearestRouteDistance, landmarks, locationAt } from './route.js?v=route-3';

const $ = id => document.getElementById(id);
const LENGTH = ROUTE_LENGTH, CAR_LENGTH = 20, SPACING = 20.8, TRAIN_LENGTH = CAR_LENGTH + SPACING * 3;
const state = { mode: 'ready', leg: 0, position: 0, speed: 0, notch: 0, elapsed: 0, penalty: 0, scores: [], dwell: 0, view: 'cab', sound: false };
let manualTime = false, lastTime = 0, audioContext, renderer;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b9d9da');
scene.fog = new THREE.Fog('#b9d9da', 170, 850);
const camera = new THREE.PerspectiveCamera(58, 1, .1, 1600);
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} catch {
  $('overlay').innerHTML = '<div class="panel"><h2>目前無法啟動 3D 畫面</h2><p>請開啟瀏覽器硬體加速，或使用支援 WebGL 的瀏覽器再試一次。</p><a href="../">回專案首頁</a></div>';
  throw new Error('WebGL unavailable');
}
scene.add(new THREE.HemisphereLight('#fff9df', '#799b7b', 2.6));
const sun = new THREE.DirectionalLight('#fff2d4', 2.4); sun.position.set(-100, 220, 100); scene.add(sun);
const geo = new THREE.BoxGeometry(1,1,1), batches = new Map(), dummy = new THREE.Object3D();
const materials = new Map();
const material = color => { if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color })); return materials.get(color); };
function box(x,y,z,w,h,d,color,rotation=0,parent=null) {
  if (parent) { const m = new THREE.Mesh(geo,material(color)); m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.y=rotation;parent.add(m);return m; }
  if (!batches.has(color)) batches.set(color,[]);
  batches.get(color).push([x,y,z,w,h,d,rotation]);
}
function flush() {
  for (const [color,items] of batches) {
    const mesh = new THREE.InstancedMesh(geo,material(color),items.length);
    items.forEach((v,i)=>{dummy.position.set(v[0],v[1],v[2]);dummy.scale.set(v[3],v[4],v[5]);dummy.rotation.set(0,v[6],0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.computeBoundingSphere();scene.add(mesh);
  }
  batches.clear();
}
let seed = 500;
function rand() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
function label(text, sub, x, y, z, facing=0, width=7) {
  const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');
  ctx.fillStyle='#f7f8eb';ctx.fillRect(0,0,512,160);ctx.fillStyle='#315f54';ctx.fillRect(0,135,512,25);
  ctx.fillStyle='#234e44';ctx.textAlign='center';ctx.font='bold 66px sans-serif';ctx.fillText(text,256,78);ctx.font='22px sans-serif';ctx.fillText(sub,256,115);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Group();sign.position.set(x,y,z);sign.rotation.y=facing;
  for(const side of [0,1]){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*.3125),new THREE.MeshBasicMaterial({map:tex}));mesh.rotation.y=side*Math.PI;mesh.position.z=side?-.015:.015;sign.add(mesh);}
  scene.add(sign);return sign;
}
// 同一份弧長座標同時驅動軌道、列車、站台與鏡頭。
function trackBox(s,offset,y,w,h,d,color){const p=routeFrame(s);box(p.x+p.nx*offset,y+RAIL_RISE,p.z+p.nz*offset,w,h,d,color,p.angle);}
function trackLabel(text,sub,s,offset,y,width=7){const p=routeFrame(s);return label(text,sub,p.x+p.nx*offset,y+RAIL_RISE,p.z+p.nz*offset,p.angle,width);}
function segment(a,b,y,width,height,color){const dx=b.x-a.x,dz=b.z-a.z;box((a.x+b.x)/2,y,(a.z+b.z)/2,width,height,Math.hypot(dx,dz)+.18,color,Math.atan2(dx,dz));}
function strip(points,width,y,color){for(let i=1;i<points.length;i++)segment(mapPoint(...points[i-1]),mapPoint(...points[i]),y,width,.06,color);}
box(-150,-1,650,3100,2,3400,'#9cac77');
// 河濱草地 → 沙礫灘 → 主水道，刻意留出沒有建物的開闊河面。
strip(river.points,river.width+150,.02,'#a5b691');
strip(river.points,river.width+45,.065,'#c7c5a6');
strip(river.points,river.width,.13,'#69b8c5');
strip(river.points.map(([x,y])=>[x,y+13]),river.width*.4,.17,'#77c5cd');
const streams=[[[260,623],[278,653],[370,682],[340,717],[420,758],[390,799]],[[12,488],[90,594],[150,625],[173,697],[230,735]],[[456,753],[423,800],[474,837],[525,851]]];
for(const points of streams){strip(points,8,.08,'#bec5a6');strip(points,4,.16,'#7ab9bb');}
for(let i=0;i<17;i++){
 const xx=-170+i*60,yy=566+.56*(xx-360)+(rand()-.5)*32,p=mapPoint(xx,yy);
 if(nearestRouteDistance(p.x,p.z)<20)continue;
 box(p.x,.21,p.z,9+rand()*16,.13,3+rand()*8,'#d5d1af',-.99);
}
// 路面低於鐵路橋：一般道路走地面，台 68 另設較低的高架路面。
for(const road of roads){
 for(let i=1;i<road.points.length;i++){
  const a=mapPoint(...road.points[i-1]),b=mapPoint(...road.points[i]),dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),nx=dz/length,nz=-dx/length;
  segment(a,b,road.y-.2,road.width+.8,.4,'#b4b8a8');segment(a,b,road.y+.025,road.width,.08,'#777f78');
  for(const side of [-1,1])segment({x:a.x+nx*side*(road.width/2-.5),z:a.z+nz*side*(road.width/2-.5)},{x:b.x+nx*side*(road.width/2-.5),z:b.z+nz*side*(road.width/2-.5)},road.y+.09,.12,.04,'#e3e0bf');
  for(let d=5;d<length;d+=12){const t=d/length;box(a.x+dx*t,road.y+.1,a.z+dz*t,.13,.04,6,'#ebe4bb',angle);}
  if(road.name==='台 68 線'){
   segment(a,b,road.y+.18,.45,.25,'#c6cabc');
   for(let d=22;d<length;d+=40){const t=d/length,x=a.x+dx*t,z=a.z+dz*t;if(nearestRouteDistance(x,z)>10)box(x,1.05,z,1.1,2.1,1.1,'#a0a998');}
  }
  for(let d=17;d<length;d+=78){
   const t=d/length,side=d%2?-1:1,x=a.x+dx*t+nx*road.width*.23*side,z=a.z+dz*t+nz*road.width*.23*side;
   box(x,road.y+.67,z,1.8,1.1,4.2,'#e5dfc6',angle);box(x,road.y+1.4,z,1.65,.5,2.35,'#647f82',angle);
  }
 }
}
for(let s=-200;s<1430;s+=4){
 const p=routeFrame(s),bridge=riverDistance(p.x,p.z)<river.width/2+20;
 trackBox(s,0,3.3,bridge?7:8,1.4,4.18,bridge?'#aeb8ac':'#b9b9a5');
 trackBox(s,0,4.04,5.5,.15,4.18,'#7e8274');
 for(const side of [-1,1]){
  trackBox(s,side*.85,4.25,.12,.16,4.2,'#c0c8bc');
  trackBox(s,side*3.45,4.55,.16,.9,4.2,bridge?'#678d84':'#d0cdb6');
 }
 trackBox(s,0,4.14,2.6,.15,.35,'#605f52');
 if(s%40===0){
  const onRoad=roads.some(r=>{const points=r.points;for(let i=1;i<points.length;i++){const a=mapPoint(...points[i-1]),b=mapPoint(...points[i]),dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));if(Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t)<r.width/2+3)return true;}return false;});
  if(!onRoad)box(p.x,(RAIL_RISE+2.6)/2,p.z,bridge?2.4:2.1,RAIL_RISE+2.6,bridge?3.5:2.5,bridge?'#91a598':'#aaa995',p.angle);
  trackBox(s,-3.1,7.6,.17,7,.17,'#687a6d');trackBox(s,0,10.9,6.5,.16,.16,'#687a6d');
 }
 trackBox(s,0,10.7,.035,.035,4.2,'#718074');
 // 鐵橋上開放式護欄，保留兩侧看見河水的視野。
 if(bridge&&s%8===0)for(const side of [-1,1]){trackBox(s,side*3.4,5.2,.14,1.8,.14,'#678d84');trackBox(s,side*3.4,6,.12,.12,8.2,'#678d84');}
}
for(let s=-150;s<1400;s+=27){
 const field=s>640&&s<1010;
 for(const side of [-1,1]){
  const offset=side*(24+rand()*47),p=routePoint(s,offset);
  if(!reserveScenery(p.x,p.z,15)){
   if(field&&rand()>.25){
    const a=routeFrame(s);box(p.x,.06,p.z,24,.1,23,rand()>.5?'#b6be78':'#8caa70',a.angle);
    for(let j=-10;j<=10;j+=4)box(p.x+a.nx*j,.14,p.z+a.nz*j,.22,.12,21,'#6f9569',a.angle);
   }else{
    const w=8+rand()*9,h=5+rand()*(field?6:24),d=9+rand()*9;
    const colors=['#ded7bb','#c5cebb','#c9c8b4','#d7c6b1','#e0ddcc','#aabaa9'];
    box(p.x,h/2,p.z,w,h,d,colors[Math.floor(rand()*colors.length)]);box(p.x,h+.35,p.z,w+.3,.7,d+.3,'#9ba897');box(p.x+2,h+1.2,p.z,3,1.2,3,'#bbc1b4');
    for(let yy=3;yy<h-1;yy+=3.5)for(let zz=-d/2+2;zz<d/2-1;zz+=3)box(p.x-side*(w/2+.015),yy,p.z+zz,.03,1.6,1.5,'#6b8988');
    for(let yy=3;yy<h-1;yy+=3.5)for(let xx=-w/2+2;xx<w/2-1;xx+=3)box(p.x+xx,yy,p.z-d/2-.02,1.4,1.6,.04,'#759592');
   }
  }
  for(let t=0;t<2;t++){
   const p=routePoint(s+rand()*20,side*(14+rand()*90)),h=3+rand()*3;
   if(reserveScenery(p.x,p.z,4))continue;
   box(p.x,h/2,p.z,.5,h,.5,'#8a8b68');box(p.x,h,p.z,3.7,3.8,3.5,rand()>.5?'#73956d':'#87a16f');
  }
 }
}
for(let i=0;i<10;i++){
 const m=new THREE.Mesh(new THREE.ConeGeometry(130+rand()*130,60+rand()*85,5),material(i%2?'#92b8a3':'#8bb39e'));
 m.position.set(700+rand()*400,10,i*180-250);m.rotation.y=rand()*3;scene.add(m);
}
function station(s,name,en){
 for(const side of [-1,1]){
  for(let d=-88;d<=88;d+=4){trackBox(s+d,side*6.25,3.9,4.9,1.8,4.3,'#d9d4b8');trackBox(s+d,side*3.98,4.84,.35,.06,4.3,'#e7c966');}
  for(let d=-60;d<=60;d+=4){trackBox(s+d,side*6.8,8.3,6.5,.3,4.3,'#819c8a');trackBox(s+d,side*6.8,8.53,7,.15,4.3,'#c0cbb7');}
  for(let d=-55;d<=55;d+=22){trackBox(s+d,side*8,6.5,.25,3.2,.25,'#779281');trackBox(s+d,side*7,5.2,1.2,.6,2,'#8c9b82');}
  trackLabel(name,en,s+side*28,side*7,6.9,5.5);
 }
 trackBox(s,0,4.27,2.7,.04,.35,'#fff6bd');trackLabel('停車位置','STOP ±8m',s,2.6,5.65,2.8);
}
station(0,'六家','LIUJIA');station(LENGTH,'竹中','ZHUZHONG');
const terminal=routePoint(15,90);box(terminal.x,13,terminal.z,55,26,65,'#c5d3c9');box(terminal.x,27,terminal.z,60,2,70,'#e7e6d4');
for(let y=5;y<25;y+=5)box(terminal.x-27.6,y,terminal.z,.15,3.2,60,'#86a9a5');
label('六家','LIUJIA STATION',terminal.x,20,terminal.z-33,Math.PI,22);
for(const mark of landmarks.filter(f=>f.s>100&&f.s<1150)){
 const p=routeFrame(mark.s);trackLabel(mark.name,mark.name==='頭前溪鐵橋'?'TOUQIAN RIVER':'HSINCHU',mark.s,mark.name==='頭前溪鐵橋'?-9:11,7.2,mark.name==='頭前溪鐵橋'?8:7);
}
flush();

const train = new THREE.Group();scene.add(train);
const cars=[];
for(let i=0;i<4;i++){
 const car=new THREE.Group();train.add(car);cars.push(car);
 box(0,6.2,0,2.85,2.8,CAR_LENGTH,'#c5ccc8',0,car);box(0,7.65,0,2.9,.25,19.8,'#a2ada8',0,car);
 box(0,4.75,0,2.35,.55,18.5,'#4b5957',0,car);
 for(const side of [-1,1]){
  box(side*1.435,5.65,0,.035,.65,19.7,'#244c8a',0,car);
  box(side*1.458,6.03,0,.035,.10,19.7,'#d39759',0,car);
  for(let zz=-8;zz<=8;zz+=2){box(side*1.44,6.85,zz,.035,.85,1.25,'#385b68',0,car);}
  for(const zz of [-6,0,6]){
   box(side*1.465,6.38,zz,.035,2.2,1.4,'#b1bcb9',0,car);
   box(side*1.49,6.92,zz-.34,.035,.75,.48,'#385b68',0,car);box(side*1.49,6.92,zz+.34,.035,.75,.48,'#385b68',0,car);
   box(side*1.5,6.1,zz,.035,1.5,.035,'#7e9291',0,car);
  }
  for(const zz of [-6.7,6.7])box(side*1.12,4.55,zz,.32,.65,2.5,'#394d4b',0,car);
 }
 for(const zz of [-5,5])box(0,7.97,zz,2,.45,2.8,'#8c9c97',0,car);
 if(i===1){box(0,8.5,0,1.3,.1,2.3,'#5b6b64',0,car);box(0,9.1,.5,.08,1.2,.08,'#5b6b64',0,car);box(0,9.7,.5,1.7,.08,.12,'#465c50',0,car);}
 if(i===0 || i===3){
  const zz=i===0?10.02:-10.02;
  box(0,5.65,zz,2.85,.65,.04,'#244c8a',0,car);
  box(0,6.08,zz,2.85,.1,.04,'#d39759',0,car);
  box(-.8,6.95,zz,.76,.82,.045,'#294e5d',0,car);box(.8,6.95,zz,.76,.82,.045,'#294e5d',0,car);
  box(0,6.5,zz,.56,2.2,.05,'#a4b3ad',0,car);box(0,7.05,zz,.38,.55,.06,'#315260',0,car);
  box(0,7.5,zz,.9,.25,.06,'#243d3d',0,car);
  for(const side of [-1,1])box(side*.96,5.6,zz,.35,.2,.06,'#fff0b8',0,car);
 }
 if(i<3)box(0,5.8,-10.4,1.9,1.8,.8,'#52625e',0,car);
}

$('view').insertAdjacentHTML('beforeend','<div id="location-tag"><small>沿途地景</small><span id="location-name">六家站</span></div>');
const cameraButton=document.createElement('button');cameraButton.id='camera';cameraButton.textContent='車外 C';cameraButton.setAttribute('aria-label','切換駕駛與車外視角');$('sound').before(cameraButton);
$('leg').insertAdjacentHTML('afterend','<span class="train-type">EMU500 · 4 輛</span>');
$('overlay').querySelector('.note').innerHTML='EMU500 四節編組 · 手機可用下方按鈕操作<br>原創鐵道駕駛雛形，場景與里程經簡化，非官方作品。';
for(let i=-8;i<=5;i++){const el=document.createElement('i');el.dataset.notch=i;el.className=i<0?'braking':'';$('notches').append(el);}
const dir=()=>state.leg===0?1:-1;
const remaining=()=>state.leg===0?LENGTH-state.position:state.position;
const suggested=()=>Math.min(60,Math.sqrt(2*.72*Math.max(0,remaining()-3))*3.6);
function setNotch(n){if(state.mode!=='driving')return;state.notch=Math.max(-8,Math.min(5,n));hud();}
function start(){Object.assign(state,{mode:'driving',leg:0,position:0,speed:0,notch:0,elapsed:0,penalty:0,scores:[],dwell:0});$('overlay').hidden=true;$('modal').hidden=true;hud();}
function toggleView(){state.view=state.view==='cab'?'exterior':'cab';cameraButton.textContent=state.view==='cab'?'車外 C':'車內 C';document.querySelector('.view-label').innerHTML=state.view==='cab'?'<i></i> CAB VIEW <span>前方展望</span>':'<i></i> EMU500 <span>四節編組・車外視角</span>';draw();}
function tone(freq,duration,volume=.05){
 if(!state.sound)return;
 audioContext ||= new (window.AudioContext || window.webkitAudioContext)();audioContext.resume();
 const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration);
}
function arrival(){
 const error=Math.abs(remaining()),score=Math.max(0,Math.round(100-error*5-state.penalty));state.scores.push(score);state.speed=0;state.notch=-5;state.dwell=4;
 state.mode=state.leg===0?'station':'complete';tone(660,.4);
 $('result-tag').textContent=state.leg===0?'ZHUZHONG · 抵達竹中':'LIUJIA · 返回六家';
 $('result-title').textContent=state.leg===0?'停穩了，換端折返。':'往返乘務完成！';
 $('result-copy').textContent=state.leg===0?'旅客上下車中。稍後換到另一端駕駛室，返回六家。':'六家 → 竹中 → 六家。謝謝你平穩地完成今天的乘務。';
 $('result-stats').innerHTML=`<div><b>${error.toFixed(1)}<small> m</small></b><small>停車誤差</small></div><div><b>${score}</b><small>本程評分</small></div>${state.leg?`<div><b>${Math.round((state.scores[0]+score)/2)}</b><small>往返平均</small></div>`:''}`;
 $('continue-btn').textContent=state.leg===0?'旅客上下車 · 4 秒':'再跑一趟 →';$('continue-btn').disabled=state.leg===0;$('restart-modal').hidden=state.leg===1;$('modal').hidden=false;
}
function fail(){state.mode='failed';state.speed=0;state.notch=-8;$('result-tag').textContent='STOP OVERRUN';$('result-title').textContent='超過停車位置';$('result-copy').textContent='下次提早減速，最後 30 公尺降至 10 km/h 以下，並在停車線前後 8 公尺內完全停穩。';$('result-stats').innerHTML='';$('continue-btn').textContent='重新挑戰 →';$('continue-btn').disabled=false;$('restart-modal').hidden=true;$('modal').hidden=false;}
function continueTrip(){
 if(state.mode==='station'&&state.dwell<=0){
  // 換端會把駕駛位置移至實際四節列車的另一端，保留同一組車輛。
  state.position-=TRAIN_LENGTH;state.leg=1;state.notch=0;state.penalty=0;state.mode='driving';$('modal').hidden=true;
 }else if(['complete','failed'].includes(state.mode))start();
 else if(state.mode==='paused')togglePause();
 hud();
}
function togglePause(){
 if(state.mode==='driving'){
  state.mode='paused';$('result-tag').textContent='TAKE A BREAK';$('result-title').textContent='乘務暫停';$('result-copy').textContent='列車與計時已暫停，準備好就繼續。';$('result-stats').innerHTML='';$('continue-btn').textContent='繼續駕駛 →';$('continue-btn').disabled=false;$('restart-modal').hidden=false;$('modal').hidden=false;
 }else if(state.mode==='paused'){state.mode='driving';$('modal').hidden=true;}
 hud();
}
function update(dt){
 if(state.mode==='station'){state.dwell=Math.max(0,state.dwell-dt);return;}
 if(state.mode!=='driving')return;
 state.elapsed+=dt;
 const traction=state.notch>0?state.notch*.18*Math.max(.48,1-state.speed/50):0;
 const braking=state.notch<0?(-state.notch===8?1.65:-state.notch*.19):0;
 const resistance=state.speed>0?.022+state.speed*.0022:0;
 const old=state.speed;state.speed=Math.max(0,Math.min(24,state.speed+(traction-braking-resistance)*dt));
 state.position+=dir()*(old+state.speed)*.5*dt;
 if(state.speed*3.6>61)state.penalty+=dt*.7;
 const r=remaining();
 if(r < -35 || (r < -8 && state.speed<.12))fail();
 else if(Math.abs(r)<=8 && state.speed<.035 && state.notch<0)arrival();
}
function hud(){
 $('game').dataset.mode=state.mode;
 const r=remaining(), kmh=state.speed*3.6, rec=suggested();
 $('speed').textContent=Math.round(kmh);$('speed').classList.toggle('overspeed',kmh>60);$('speed-bar').style.width=`${Math.min(100,kmh/80*100)}%`;$('speed-bar').style.background=kmh>60?'#c27840':'#548b72';
 $('remaining').innerHTML=`${r<0?'−':''}${Math.round(Math.abs(r)).toLocaleString()} <small>m</small>`;
 $('from').textContent=state.leg===0?'六家':'竹中';$('to').textContent=$('next-name').textContent=state.leg===0?'竹中':'六家';$('leg').textContent=state.leg===0?'去程 01':'回程 02';
 $('train-dot').style.left=`${Math.max(0,Math.min(100,(1-r/LENGTH)*100))}%`;
 $('recommended').innerHTML=`${Math.round(rec)} <span>km/h</span>`;
 $('notch-label').textContent=state.notch===0?'N · 惰行':state.notch>0?`P${state.notch} · 動力`:state.notch===-8?'EB · 緊急煞車':`B${-state.notch} · 煞車`;
 $('notches').querySelectorAll('i').forEach(el=>el.classList.toggle('active',Number(el.dataset.notch)===state.notch));
 $('timer').textContent=`${String(Math.floor(state.elapsed/60)).padStart(2,'0')}:${String(Math.floor(state.elapsed%60)).padStart(2,'0')}`;
 $('score').textContent=state.scores.length?`去程 ${state.scores[0]} 分`:`超速扣分 ${Math.floor(state.penalty)}`;
 let msg='前方路線暢通，保持平穩運轉。',coach='接近 60 km/h 時，切至 N 惰行。';
 if(state.speed<.1&&r>100){msg='車門已關閉，可以出發。';coach='按動力 + 或 ↑，逐段加到 P5。';}
 if(r<280){msg=`接近${state.leg===0?'竹中':'六家'}，請準備減速停站。`;coach='以 B3～B5 減速，對照建議速度微調。';}
 if(r<45){msg='停車線前後 8 公尺內停穩，即可完成停站。';coach='低速接近；太早停住可再加一段動力。';}
 if(kmh>rec+5&&r<280){msg='進站速度偏高，請加強煞車。';coach='按 ↓ 增加煞車；Space 可緊急煞車。';}
 if(kmh>60){msg='超過 60 km/h 限速，請減速。';coach='超速持續扣分，請收動力並施加煞車。';}
 if(state.mode==='ready')msg='準備好，開始今天的乘務。';
 if(state.mode==='station'){msg='竹中站・開門上下車';$('continue-btn').textContent=state.dwell>0?`旅客上下車 · ${Math.ceil(state.dwell)} 秒`:'換端駕駛，返回六家 →';$('continue-btn').disabled=state.dwell>0;}
 if(state.mode==='complete')msg='往返乘務完成，辛苦了。';
 $('location-name').textContent=locationAt(state.position);$('message').textContent=msg;$('coach').textContent=coach;
 $('pause').textContent=state.mode==='paused'?'繼續 ▶':'暫停 Ⅱ';
 for(const id of ['power','brake','neutral','emergency'])$(id).disabled=state.mode!=='driving';
}
function draw(){
 const direction=dir(),s=state.position;
 const front=state.leg===0?s:s+TRAIN_LENGTH;
 cars.forEach((car,i)=>{const d=front-CAR_LENGTH/2-i*SPACING,p=routeFrame(d);car.position.set(p.x,RAIL_RISE,p.z);car.rotation.y=p.angle;car.userData.routeDistance=d;});
 train.visible=state.view==='exterior';
 if(state.view==='exterior'){
  const center=routeFrame(s-direction*TRAIN_LENGTH/2), distanceScale=Math.max(1,1.6/camera.aspect);
  camera.position.set(center.x+(center.nx*49-center.tx*direction*32)*distanceScale,RAIL_RISE+5+26*distanceScale,center.z+(center.nz*49-center.tz*direction*32)*distanceScale);
  camera.lookAt(center.x,RAIL_RISE+5,center.z);
 }else{
  const p=routeFrame(s),ahead=routePoint(s+direction*50);
  camera.position.set(p.x,RAIL_RISE+7.05,p.z);camera.lookAt(ahead.x,RAIL_RISE+5.8,ahead.z);
 }
 renderer.render(scene,camera);
}
function resize(){const b=$('view').getBoundingClientRect();renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();draw();}
$('start-btn').onclick=start;$('continue-btn').onclick=continueTrip;$('restart-modal').onclick=start;$('restart').onclick=start;
$('power').onclick=()=>setNotch(state.notch+1);$('brake').onclick=()=>setNotch(state.notch-1);$('neutral').onclick=()=>setNotch(0);$('emergency').onclick=()=>{setNotch(-8);tone(150,.3);};
$('pause').onclick=togglePause;cameraButton.onclick=toggleView;
$('sound').onclick=()=>{state.sound=!state.sound;$('sound').textContent=`音效 ${state.sound?'ON':'OFF'}`;tone(440,.25);};
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if($('game').requestFullscreen)await $('game').requestFullscreen();}catch{/* 全螢幕不可用時仍可直接玩。 */}}
$('fullscreen').onclick=fullscreen;
window.addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
 if(e.repeat)return;
 if(e.code==='ArrowUp')setNotch(state.notch+1);
 if(e.code==='ArrowDown')setNotch(state.notch-1);
 if(e.code==='KeyN')setNotch(0);
 if(e.code==='Space'){setNotch(-8);tone(150,.3);}
 if(e.code==='KeyP'||e.code==='Escape')togglePause();
 if(e.code==='KeyC')toggleView();if(e.code==='KeyF')fullscreen();if(e.code==='KeyH')tone(330,.7,.12);
 if(e.code==='Enter'&&e.target.tagName!=='BUTTON'){if(state.mode==='ready')start();else continueTrip();}
});
window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('view'));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='driving')togglePause();});
window.render_game_to_text=()=>JSON.stringify({mode:state.mode,vehicle:'EMU500',car_count:4,camera:state.view,coordinate_system:'meters; position_m is arc distance along track; world +x map right, +z map down; active cab reverses on return',leg:state.leg,from:state.leg===0?'六家':'竹中',to:state.leg===0?'竹中':'六家',position_m:+state.position.toFixed(2),remaining_m:+remaining().toFixed(2),speed_kmh:+(state.speed*3.6).toFixed(2),notch:state.notch,suggested_kmh:+suggested().toFixed(1),limit_kmh:60,stop_tolerance_m:8,elapsed_s:+state.elapsed.toFixed(2),overspeed_penalty:+state.penalty.toFixed(2),scores:state.scores,dwell_s:+state.dwell.toFixed(2),car_positions:cars.map(c=>+c.userData.routeDistance.toFixed(1)),car_world_positions:cars.map(c=>({x:+c.position.x.toFixed(2),z:+c.position.z.toFixed(2),heading:+c.rotation.y.toFixed(3)})),location:locationAt(state.position),landmarks:landmarks.map(f=>({name:f.name,route_m:f.s})),route_revision:3});
window.advanceTime=ms=>{manualTime=true;let left=Math.max(0,Math.min(ms,300000))/1000;while(left>0){const dt=Math.min(1/60,left);update(dt);left-=dt;}hud();draw();};
function frame(t){if(!manualTime)update(Math.min((t-lastTime)/1000||0, .05));lastTime=t;hud();draw();requestAnimationFrame(frame);}
resize();hud();requestAnimationFrame(frame);
