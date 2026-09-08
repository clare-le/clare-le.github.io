import * as THREE from './vendor/three.module.min.js';

const $ = id => document.getElementById(id);
const LENGTH = 1200, CAR_LENGTH = 20, SPACING = 20.8, TRAIN_LENGTH = CAR_LENGTH + SPACING * 3;
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
const trackX = z => z <= 100 || z >= 1100 ? 0 : Math.sin(Math.PI * (z - 100) / 1000) ** 2 * (15 * Math.sin(z / 230) + 6 * Math.sin(z / 97));
const trackAngle = z => Math.atan((trackX(z+1)-trackX(z-1))/2);
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
// 方塊建物、稻田與高架軌道使用實例化繪製，手機也不必逐棟送出 draw call。
box(0,-1,600,2600,2,2900,'#9cac77');
for(let z=-200;z<1430;z+=4){
  const x=trackX(z), a=trackAngle(z);
  box(x,3.3,z,8,1.4,4.15,'#b9b9a5',a);
  box(x,4.04,z,5.5,.15,4.15,'#7e8274',a);
  for(const side of [-1,1]){box(x+side*.85,4.25,z,.12,.16,4.2,'#c0c8bc',a);box(x+side*3.9,4.55,z,.18,.9,4.2,'#d0cdb6',a);}
  box(x,4.14,z,2.6,.15,.35,'#605f52',a);
  if(z%40===0){box(x,1.3,z,2.1,3.1,2.5,'#aaa995');box(x-3.3,7.6,z,.17,7,.17,'#687a6d');box(x,10.9,z,6.9,.16,.16,'#687a6d');}
  box(x,10.7,z,.035,.035,4.2,'#718074',a);
}
for(let z=-150;z<1400;z+=31){
  const field=z>270&&z<820;
  for(const side of [-1,1]){
    if(field && rand()>.3){
      const x=trackX(z)+side*(28+rand()*18);box(x,.04,z,30,.1,27,rand()>.5?'#b6be78':'#8caa70');
      for(let j=-12;j<=12;j+=4)box(x+j,.12,z,.22,.12,25,'#6f9569');
    } else {
      const x=trackX(z)+side*(20+rand()*40),w=8+rand()*12,h=5+rand()*(field?8:29),d=10+rand()*10;
      const colors=['#ded7bb','#c5cebb','#c9c8b4','#d7c6b1','#e0ddcc','#aabaa9'];
      box(x,h/2,z,w,h,d,colors[Math.floor(rand()*colors.length)]);box(x,h+.35,z,w+.3,.7,d+.3,'#9ba897');
      box(x+2,h+1.2,z,3,1.2,3,'#bbc1b4');
      for(let yy=3;yy<h-1;yy+=3.5)for(let zz=-d/2+2;zz<d/2-1;zz+=3)box(x-side*(w/2+.015),yy,z+zz,.03,1.6,1.5,'#6b8988');
      for(let yy=3;yy<h-1;yy+=3.5)for(let xx=-w/2+2;xx<w/2-1;xx+=3)box(x+xx,yy,z-d/2-.02,1.4,1.6,.04,'#759592');
    }
    for(let t=0;t<2;t++){
      const x=trackX(z)+side*(12+rand()*60),zz=z+rand()*25,hh=3+rand()*3;
      box(x,hh/2,zz,.5,hh,.5,'#8a8b68');box(x,hh,zz,3.7,3.8,3.5,rand()>.5?'#73956d':'#87a16f');
    }
  }
}
// 平行道路與可辨識的車流方塊。
box(-80,.05,600,9,.1,1600,'#989e8e');
for(let z=-150;z<1400;z+=16){box(-80,.12,z,.18,.03,7,'#e1dfbe');if(z%48===0){box(-82,1,z,1.9,1.5,4.3,'#e3dfc9');box(-82,1.9,z,1.6,.65,2.5,'#698986');}}
for(let i=0;i<24;i++){
 const mountain=new THREE.Mesh(new THREE.ConeGeometry(110+rand()*140,75+rand()*100,5),material(i%2?'#92b8a3':'#8bb39e'));
 mountain.position.set((i%2?-1:1)*(380+rand()*160),20,i*100-400);mountain.rotation.y=rand()*3;scene.add(mountain);
}
function station(z,name,en){
 const x=trackX(z);
 for(const side of [-1,1]){
  box(x+side*6.7,3.9,z,5.1,1.8,180,'#d9d4b8');box(x+side*4.25,4.84,z,.35,.06,180,'#e7c966');
  box(x+side*7,8.3,z,7,.3,120,'#819c8a');box(x+side*7,8.53,z,7.5,.15,120,'#c0cbb7');
  for(let zz=z-55;zz<=z+55;zz+=22){box(x+side*8,6.5,zz,.25,3.2,.25,'#779281');box(x+side*7,5.2,zz,1.2,.6,2,'#8c9b82');}
  label(name,en,x+side*7,6.9,z+side*28,0,5.5);
 }
 box(x,4.27,z,2.7,.04,.35,'#fff6bd');
 label('停車位置','STOP ±8m',x+3.1,5.65,z,0,2.8);
}
station(0,'六家','LIUJIA');station(LENGTH,'竹中','ZHUZHONG');
// 六家端的站體量塊，作為出發與回程的地景記號。
box(75,13,15,65,26,80,'#c5d3c9');box(75,27,15,69,2,84,'#e7e6d4');
for(let y=5;y<25;y+=5)box(41.9,y,15,.15,3.2,75,'#86a9a5');
label('六家','LIUJIA STATION',75,20,-25.1,Math.PI,26);
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
 $('message').textContent=msg;$('coach').textContent=coach;
 $('pause').textContent=state.mode==='paused'?'繼續 ▶':'暫停 Ⅱ';
 for(const id of ['power','brake','neutral','emergency'])$(id).disabled=state.mode!=='driving';
}
function draw(){
 const direction=dir(),z=state.position;
 // 前端位置固定；回程切換駕駛端，不把列車憑空掉頭。
 const front=state.leg===0?z:z+TRAIN_LENGTH;
 cars.forEach((car,i)=>{const zz=front-CAR_LENGTH/2-i*SPACING;car.position.set(trackX(zz),0,zz);car.rotation.y=trackAngle(zz);});
 train.visible=state.view==='exterior';
 if(state.view==='exterior'){
  const center=z-direction*TRAIN_LENGTH/2, distanceScale=Math.max(1,1.6/camera.aspect);
  camera.position.set(trackX(center)+49*distanceScale,5+26*distanceScale,center-direction*32*distanceScale);
  camera.lookAt(trackX(center),5,center);
 }else{
  camera.position.set(trackX(z),7.05,z);
  camera.lookAt(trackX(z+direction*65),5.8,z+direction*65);
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
window.render_game_to_text=()=>JSON.stringify({mode:state.mode,vehicle:'EMU500',car_count:4,camera:state.view,coordinate_system:'meters; +z Liujia to Zhuzhong; position is active cab; +x right/east in simplified world',leg:state.leg,from:state.leg===0?'六家':'竹中',to:state.leg===0?'竹中':'六家',position_m:+state.position.toFixed(2),remaining_m:+remaining().toFixed(2),speed_kmh:+(state.speed*3.6).toFixed(2),notch:state.notch,suggested_kmh:+suggested().toFixed(1),limit_kmh:60,stop_tolerance_m:8,elapsed_s:+state.elapsed.toFixed(2),overspeed_penalty:+state.penalty.toFixed(2),scores:state.scores,dwell_s:+state.dwell.toFixed(2),car_positions:cars.map(c=>+c.position.z.toFixed(1))});
window.advanceTime=ms=>{manualTime=true;let left=Math.max(0,Math.min(ms,300000))/1000;while(left>0){const dt=Math.min(1/60,left);update(dt);left-=dt;}hud();draw();};
function frame(t){if(!manualTime)update(Math.min((t-lastTime)/1000||0, .05));lastTime=t;hud();draw();requestAnimationFrame(frame);}
resize();hud();requestAnimationFrame(frame);
