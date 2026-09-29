const SCENES=[
  {id:'rain',name:'비 내리는 창가',image:'assets/images/rain-window.webp',video:'assets/video/rain-window.webm',videoFallback:'assets/video/rain-window.mp4',alt:'비 내리는 창밖의 고요한 숲'},
  {id:'forest',name:'달빛 숲',image:'assets/images/forest.webp',video:'assets/video/forest.webm',videoFallback:'assets/video/forest.mp4',alt:'달빛과 안개가 머문 침엽수 숲'},
  {id:'waves',name:'느린 해변',image:'assets/images/coast.webp',video:'assets/video/coast.webm',videoFallback:'assets/video/coast.mp4',alt:'해 질 녘 검은 모래 해변'},
  {id:'train',name:'밤의 기차',image:'assets/images/night-train.webp',video:'assets/video/night-train.webm',videoFallback:'assets/video/night-train.mp4',alt:'밤 기차 창밖으로 흐르는 불빛'},
  {id:'stream',name:'작은 계곡',image:'assets/images/stream.webp',video:'assets/video/stream.webm',videoFallback:'assets/video/stream.mp4',alt:'이끼 낀 돌 사이로 흐르는 작은 계곡'},
  {id:'fireplace',name:'따뜻한 난로',image:'assets/images/fireplace.webp',video:null,alt:'어두운 오두막 안 따뜻한 벽난로'}
];
const TRACKS=[
  {id:'rain',name:'부드러운 비',detail:'고른 빗방울',file:'assets/audio/rain-soft.mp3'},
  {id:'forest',name:'숲의 바람',detail:'바람과 먼 새소리',file:'assets/audio/forest-breeze.mp3'},
  {id:'waves',name:'느린 파도',detail:'낮고 일정한 물결',file:'assets/audio/slow-waves.mp3'},
  {id:'train',name:'밤 기차',detail:'규칙적인 저음',file:'assets/audio/night-train.mp3'},
  {id:'stream',name:'작은 시냇물',detail:'맑은 물의 흐름',file:'assets/audio/small-stream.mp3'},
  {id:'fireplace',name:'장작 난로',detail:'가벼운 불씨 소리',file:'assets/audio/warm-fireplace.mp3'}
];
const MOODS={
  lecture:{scene:'rain',tracks:[['rain',.72],['fireplace',.28]],title:'생각의 잔향을\n빗소리에 놓아두기',kicker:'강의 후 · 비와 장작'},
  work:{scene:'forest',tracks:[['forest',.68],['stream',.36]],title:'오늘의 긴장을\n숲에 내려놓기',kicker:'업무 후 · 숲과 시냇물'},
  sleep:{scene:'train',tracks:[['train',.58],['rain',.34]],title:'창밖으로 오늘을\n천천히 보내기',kicker:'잠들기 전 · 밤 기차와 비'}
};
const DEFAULT={favorites:[],lastUsed:{sceneId:'rain',audio:[{id:'rain',volume:.72},{id:'fireplace',volume:.28}],minutes:5},reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
let store=loadStore();
let config=structuredClone(store.lastUsed||DEFAULT.lastUsed);
let audio={ctx:null,master:null,nodes:[],buffers:new Map(),paused:false,muted:false};
let timer={duration:0,endAt:0,remaining:0,tick:null,pausedAt:0,finishing:false};
let currentView='home';
const $=(s,root=document)=>root.querySelector(s); const $$=(s,root=document)=>[...root.querySelectorAll(s)];

function loadStore(){try{const raw=localStorage.getItem('cooldown:v1');return raw?{...DEFAULT,...JSON.parse(raw)}:structuredClone(DEFAULT)}catch{setTimeout(()=>toast('저장된 설정을 읽지 못해 기본값으로 시작했어요.'),200);return structuredClone(DEFAULT)}}
function saveStore(){localStorage.setItem('cooldown:v1',JSON.stringify(store))}
function scene(id=config.sceneId){return SCENES.find(x=>x.id===id)||SCENES[0]}
function showView(name){currentView=name;$$('.view').forEach(v=>v.classList.toggle('is-active',v.dataset.view===name));$$('[data-nav]').forEach(b=>b.classList.toggle('is-active',b.dataset.nav===name));scrollTo({top:0,behavior:'smooth'});if(name==='saved')renderSaved();if(name==='offline')checkPack()}
window.showCooldownView=showView;
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2600)}
function applyMood(key){const mood=MOODS[key];config.sceneId=mood.scene;config.audio=mood.tracks.map(([id,volume])=>({id,volume}));config.minutes=5;$$('.mood-card').forEach(x=>x.classList.toggle('is-selected',x.dataset.mood===key));$('#featuredImage').src=scene().image;$('#featuredImage').alt=scene().alt;$('#featuredTitle').innerHTML=mood.title.replace('\n','<br>');$('#featuredKicker').textContent=mood.kicker;renderStudio()}

function renderStudio(){
  $('#sceneRail').innerHTML=SCENES.map(s=>`<button class="scene-card ${s.id===config.sceneId?'is-selected':''}" role="radio" aria-checked="${s.id===config.sceneId}" data-scene="${s.id}"><img src="${s.image}" alt=""><span>${s.name}</span></button>`).join('');
  $('#sceneName').textContent=scene().name;
  $('#trackList').innerHTML=TRACKS.map(t=>{const selected=config.audio.find(a=>a.id===t.id);const volume=Math.round((selected?.volume??.5)*100);return `<div class="track ${selected?'is-active':''}" data-track="${t.id}"><div class="track-top"><button class="track-toggle" aria-label="${t.name} ${selected?'끄기':'켜기'}">${selected?'✓':'+'}</button><span class="track-label"><b>${t.name}</b><small>${t.detail}</small></span><output>${volume}%</output></div><input aria-label="${t.name} 음량" type="range" min="0" max="100" value="${volume}"></div>`}).join('');
  $('#trackCount').textContent=`${config.audio.length} / 3`;
  $$('#timerChoices button').forEach(b=>b.classList.toggle('is-active',+b.dataset.minutes===config.minutes));
}
function bindStudio(){
  $('#sceneRail').addEventListener('click',e=>{const b=e.target.closest('[data-scene]');if(!b)return;config.sceneId=b.dataset.scene;renderStudio()});
  $('#trackList').addEventListener('click',e=>{const block=e.target.closest('[data-track]');if(!block)return;const id=block.dataset.track;if(e.target.closest('.track-toggle')){const idx=config.audio.findIndex(a=>a.id===id);if(idx>=0)config.audio.splice(idx,1);else if(config.audio.length<3)config.audio.push({id,volume:.5});else return toast('소리는 최대 3개까지 섞을 수 있어요.');renderStudio()}});
  $('#trackList').addEventListener('input',e=>{if(e.target.type!=='range')return;const block=e.target.closest('[data-track]');const item=config.audio.find(a=>a.id===block.dataset.track);if(item){item.volume=e.target.value/100;block.querySelector('output').value=`${e.target.value}%`;updateLiveGains()}});
  $('#timerChoices').addEventListener('click',e=>{const b=e.target.closest('[data-minutes]');if(!b)return;config.minutes=+b.dataset.minutes;$$('#timerChoices button').forEach(x=>x.classList.toggle('is-active',x===b))});
}

async function fetchBuffer(track){if(audio.buffers.has(track.id))return audio.buffers.get(track.id);const response=await fetch(track.file);if(!response.ok)throw new Error(track.id);const buffer=await audio.ctx.decodeAudioData(await response.arrayBuffer());audio.buffers.set(track.id,buffer);return buffer}
async function startAudio(){
  if(!config.audio.length)throw new Error('empty');
  audio.ctx ||= new (window.AudioContext||window.webkitAudioContext)();await audio.ctx.resume();stopNodes();
  audio.master=audio.ctx.createGain();audio.master.gain.setValueAtTime(0,audio.ctx.currentTime);audio.master.gain.linearRampToValueAtTime($('#masterVolume').value/100,audio.ctx.currentTime+1.5);audio.master.connect(audio.ctx.destination);
  const selected=await Promise.all(config.audio.map(async item=>({item,buffer:await fetchBuffer(TRACKS.find(t=>t.id===item.id))})));
  selected.forEach(({item,buffer})=>{const source=audio.ctx.createBufferSource();const gain=audio.ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=item.volume/Math.max(1,Math.sqrt(selected.length));source.connect(gain).connect(audio.master);source.start();audio.nodes.push({source,gain,id:item.id})});
}
function stopNodes(){audio.nodes.forEach(n=>{try{n.source.stop()}catch{}});audio.nodes=[]}
function updateLiveGains(){audio.nodes.forEach(n=>{const item=config.audio.find(a=>a.id===n.id);if(item)n.gain.gain.setTargetAtTime(item.volume/Math.max(1,Math.sqrt(config.audio.length)),audio.ctx.currentTime,.05)})}
async function beginSession(){
  if(!config.audio.length)return toast('먼저 하나 이상의 소리를 골라 주세요.');
  try{await startAudio()}catch{toast('선택한 소리를 준비하지 못했어요. 다른 소리를 골라 주세요.');return}
  store.lastUsed=structuredClone(config);saveStore();const s=scene();$('#sessionImage').src=s.image;$('#sessionImage').alt=s.alt;$('#sessionScene').textContent=s.name;
  const video=$('#sessionVideo');const allowVideo=s.video&&!store.reduceMotion;if(allowVideo){try{const source=video.canPlayType('video/webm; codecs="vp9"')?s.video:s.videoFallback;const response=await fetch(source);if(!response.ok)throw new Error('video');const blob=await response.blob();video._blobURL=URL.createObjectURL(blob);video.src=video._blobURL;video.hidden=false;await video.play()}catch{video.hidden=true;toast('영상 대신 정지 풍경으로 재생해요.')}}else{video.hidden=true}
  $('#toggleVideo').hidden=!s.video;$('#toggleVideo').textContent=allowVideo?'영상 끄기':'영상 켜기';
  $('#session').hidden=false;document.body.style.overflow='hidden';timer.duration=config.minutes*60;timer.remaining=timer.duration;timer.endAt=Date.now()+timer.remaining*1000;timer.finishing=false;audio.paused=false;audio.muted=false;$('#pauseButton').textContent='Ⅱ';$('#playState').textContent='재생 중';updateTimer();timer.tick=setInterval(updateTimer,250)
}
function updateTimer(){if(audio.paused)return;timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));const min=String(Math.floor(timer.remaining/60)).padStart(2,'0'),sec=String(timer.remaining%60).padStart(2,'0');$('#timeRemaining').textContent=`${min}:${sec}`;document.title=`${min}:${sec} · 쿨다운 스튜디오`;if(timer.remaining<=10&&!timer.finishing&&audio.master){timer.finishing=true;audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);audio.master.gain.setValueAtTime(audio.master.gain.value,audio.ctx.currentTime);audio.master.gain.linearRampToValueAtTime(0,audio.ctx.currentTime+timer.remaining)}if(timer.remaining<=0)finishSession(true)}
async function togglePause(){if(!audio.ctx)return;if(audio.paused){await audio.ctx.resume();timer.endAt=Date.now()+timer.remaining*1000;audio.paused=false;$('#pauseButton').textContent='Ⅱ';$('#playState').textContent='재생 중'}else{await audio.ctx.suspend();audio.paused=true;$('#pauseButton').textContent='▶';$('#playState').textContent='잠시 멈춤'}}
function finishSession(completed=false){clearInterval(timer.tick);stopNodes();audio.ctx?.close();audio.ctx=null;const video=$('#sessionVideo');video.pause();video.removeAttribute('src');if(video._blobURL){URL.revokeObjectURL(video._blobURL);video._blobURL=null}$('#session').hidden=true;document.body.style.overflow='';document.title='쿨다운 스튜디오';if(completed){$('#dialog').hidden=false}else toast('세션을 조용히 마쳤어요.')}
function toggleVideo(){const v=$('#sessionVideo');if(v.hidden){v.hidden=false;v.play().catch(()=>v.hidden=true);$('#toggleVideo').textContent='영상 끄기'}else{v.hidden=true;v.pause();$('#toggleVideo').textContent='영상 켜기'}}

function savePreset(){const base=scene().name;const name=prompt('저장할 풍경의 이름을 적어 주세요.',`${base}의 쉼`);if(!name)return;store.favorites.unshift({id:crypto.randomUUID(),name:name.trim().slice(0,32),sceneId:config.sceneId,audio:structuredClone(config.audio),minutes:config.minutes});saveStore();toast('내 풍경에 저장했어요.');if(currentView==='saved')renderSaved()}
function renderSaved(){const grid=$('#savedGrid'),empty=$('#savedEmpty');empty.hidden=store.favorites.length>0;grid.hidden=!store.favorites.length;grid.innerHTML=store.favorites.map(f=>{const s=SCENES.find(x=>x.id===f.sceneId)||SCENES[0];const names=f.audio.map(a=>TRACKS.find(t=>t.id===a.id)?.name).filter(Boolean).join(' · ');return `<article class="saved-card" data-id="${f.id}"><img src="${s.image}" alt="${s.alt}"><div><h3>${escapeHtml(f.name)}</h3><p>${f.minutes}분 · ${names}</p><div class="saved-card-actions"><button data-apply>불러오기</button><button class="delete" data-delete aria-label="${escapeHtml(f.name)} 삭제">×</button></div></div></article>`}).join('')}
function escapeHtml(value){const d=document.createElement('div');d.textContent=value;return d.innerHTML}
function applyFavorite(id){const f=store.favorites.find(x=>x.id===id);if(!f)return;config={sceneId:f.sceneId,audio:structuredClone(f.audio),minutes:f.minutes};renderStudio();showView('mix');toast('저장한 조합을 불러왔어요.')}

async function getManifest(){const res=await fetch('assets/manifest.json',{cache:'no-store'});return res.json()}
async function cachedAssets(manifest){if(!('caches'in window))return 0;const cache=await caches.open('cooldown-pack-v1');const checks=await Promise.all(manifest.assets.map(a=>cache.match(a.path)));return checks.filter(Boolean).length}
async function checkPack(){try{const m=await getManifest(),done=await cachedAssets(m);updatePack(done,m.assets.length,m.totalBytes);if(done===m.assets.length)packReady(m.assets.length)}catch{$('#packStatus').textContent='목록을 확인하지 못했어요';$('#packDetail').textContent='인터넷 연결 후 다시 시도해 주세요.'}}
function updatePack(done,total,bytes){const pct=total?Math.round(done/total*100):0;$('#packPercent').textContent=`${pct}%`;$('#packRing').style.setProperty('--progress',`${pct}%`);$('#packProgress').style.width=`${pct}%`;$('#packDetail').textContent=`${done}/${total}개 파일 확인 · ${(bytes/1024/1024).toFixed(1)}MB`;$('#storageNote').textContent='브라우저 설정에서 저장 공간을 지우면 다시 준비해야 해요.'}
function packReady(total){$('#packStatus').textContent='오프라인 준비 완료';$('#packDetail').textContent=`${total}/${total}개 파일 검증 완료`;$('#downloadPack').textContent='팩 다시 확인';$('.status-dot').style.background='var(--lime)';$('#networkLabel').textContent='오프라인 준비 완료'}
async function downloadPack(){const button=$('#downloadPack');button.disabled=true;try{const m=await getManifest(),cache=await caches.open('cooldown-pack-v1');let done=0;for(const asset of m.assets){$('#packStatus').textContent=`기본 팩 ${done+1}/${m.assets.length}개 준비 중`;let response=await fetch(asset.path,{cache:'reload'});if(!response.ok)throw new Error(asset.path);const bytes=await response.clone().arrayBuffer();if(asset.bytes&&bytes.byteLength!==asset.bytes)throw new Error(`${asset.path} 크기 불일치`);if(asset.sha256&&crypto.subtle){const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==asset.sha256)throw new Error(`${asset.path} 검증 실패`)}await cache.put(asset.path,response);done++;updatePack(done,m.assets.length,m.totalBytes)}await navigator.storage?.persist?.();packReady(m.assets.length);toast('비행기 모드에서도 사용할 준비가 끝났어요.')}catch(err){$('#packStatus').textContent='일부 파일 준비 실패';$('#packDetail').textContent=err.message;toast('중단된 파일부터 다시 시도할 수 있어요.')}finally{button.disabled=false}}

function setup(){
  const hour=new Date().getHours();$('#todayLabel').textContent=hour<12?'가볍게 하루를 시작해요':hour<18?'잠시 속도를 낮춰요':'오늘도 수고했어요';
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));$$('.mood-card').forEach(b=>b.addEventListener('click',()=>applyMood(b.dataset.mood)));
  $('#quickStart').addEventListener('click',beginSession);$('#startSession').addEventListener('click',beginSession);$('#savePreset').addEventListener('click',savePreset);$('#saveAfter').addEventListener('click',()=>{savePreset();$('#dialog').hidden=true});$('#againButton').addEventListener('click',()=>{$('#dialog').hidden=true;beginSession()});$('#dialogClose').addEventListener('click',()=>$('#dialog').hidden=true);
  $('#pauseButton').addEventListener('click',togglePause);$('#closeSession').addEventListener('click',()=>finishSession(false));$('#endButton').addEventListener('click',()=>finishSession(false));$('#toggleVideo').addEventListener('click',toggleVideo);$('#muteButton').addEventListener('click',()=>{audio.muted=!audio.muted;if(audio.master)audio.master.gain.setTargetAtTime(audio.muted?0:$('#masterVolume').value/100,audio.ctx.currentTime,.08);$('#muteButton').textContent=audio.muted?'×':'♬'});
  $('#masterVolume').addEventListener('input',e=>{$('#masterOutput').value=`${e.target.value}%`;if(audio.master&&!audio.muted)audio.master.gain.setTargetAtTime(e.target.value/100,audio.ctx.currentTime,.05)});
  $('#savedGrid').addEventListener('click',e=>{const card=e.target.closest('[data-id]');if(!card)return;if(e.target.closest('[data-apply]'))applyFavorite(card.dataset.id);if(e.target.closest('[data-delete]')){store.favorites=store.favorites.filter(f=>f.id!==card.dataset.id);saveStore();renderSaved();toast('저장한 풍경을 삭제했어요.')}});
  $('#offlineShortcut').addEventListener('click',()=>showView('offline'));$('#downloadPack').addEventListener('click',downloadPack);
  window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);updateNetwork();bindStudio();renderStudio();renderSaved();checkPack();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');
}
function updateNetwork(){if(navigator.onLine){$('#networkLabel').textContent='온라인';$('.status-dot').style.background='var(--mint)'}else{$('#networkLabel').textContent='오프라인';$('.status-dot').style.background='var(--amber)'}}
setup();
