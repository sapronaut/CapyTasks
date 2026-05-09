let tasks=[], idCtr=0, filter='all', sortOrder='manual';
let selCat='none', selPri='med';
let pets=0, streak=0, celebratedFull=false;
let dragId=null, dragOverId=null, dragSide='bottom';

const CAT_TAGS={work:'cat-work',home:'cat-home',health:'cat-health',fun:'cat-fun'};
const CAT_LABELS={none:'',work:'Work',home:'Home',health:'Health',fun:'Fun'};
const PRI_LABELS={high:'High',med:'Med',low:'Low'};
const PRI_CLS={high:'pri-high',med:'pri-med',low:'pri-low'};

const MOODS=[
  {min:0,  label:'Staring into the void',  mouth:'M 68 90 Q 80 87 92 90',ring:''},
  {min:15, label:'Tolerating existence',   mouth:'M 68 89 Q 80 89 92 89',ring:''},
  {min:35, label:'Feeling okay-ish',       mouth:'M 68 88 Q 80 92 92 88',ring:'rgba(200,160,96,.35)'},
  {min:55, label:'Genuinely content',      mouth:'M 66 87 Q 80 95 94 87',ring:'rgba(74,124,89,.45)'},
  {min:80, label:'Absolutely thriving ✦',  mouth:'M 64 86 Q 80 97 96 86',ring:'rgba(74,124,89,.72)'},
];

// ── INIT ──
function init(){
  try{const s=localStorage.getItem('capy_v4');if(s){const d=JSON.parse(s);tasks=d.tasks||[];idCtr=d.idCtr||0;pets=d.pets||0;streak=d.streak||0;}}catch(e){}
  if(!tasks.length){
    [['Buy some grass to sit in','home','low'],
     ['Take a long bath','health','med'],
     ['Stare at a wall peacefully','fun','low'],
     ['Eat a watermelon','fun','high']]
    .forEach(([text,cat,pri])=>tasks.push({id:++idCtr,text,cat,pri,done:false}));
  }
  setupPickers(); renderAll();
  document.getElementById('streakCount').textContent=streak;
  setInterval(idleBlink,4500+Math.random()*3000);
  setInterval(idleLook, 9000+Math.random()*5000);
}

function save(){
  try{localStorage.setItem('capy_v4',JSON.stringify({tasks,idCtr,pets,streak}));}catch(e){}
}

// ── PICKERS ──
function setupPickers(){
  document.querySelectorAll('#catPick .cat-dot').forEach(el=>{
    el.addEventListener('click',()=>{
      document.querySelectorAll('#catPick .cat-dot').forEach(x=>x.classList.remove('sel'));
      el.classList.add('sel'); selCat=el.dataset.cat;
    });
  });
  document.querySelectorAll('#priPick .pri-btn').forEach(el=>{
    el.addEventListener('click',()=>{
      document.querySelectorAll('#priPick .pri-btn').forEach(x=>x.className='pri-btn');
      el.className='pri-btn sel-'+el.dataset.pri; selPri=el.dataset.pri;
    });
  });
}

// ── RENDER ──
function renderAll(){ renderTasks(); updateMeter(false); document.getElementById('statPets').textContent=pets; }

function getVisible(){
  let t=[...tasks];
  if(filter==='active') t=t.filter(x=>!x.done);
  if(filter==='done')   t=t.filter(x=>x.done);
  if(sortOrder==='pri'){const o={high:0,med:1,low:2};t.sort((a,b)=>o[a.pri]-o[b.pri]);}
  else if(sortOrder==='alpha'){t.sort((a,b)=>a.text.localeCompare(b.text));}
  return t;
}

function renderTasks(){
  const list=document.getElementById('taskList');
  const done=tasks.filter(t=>t.done).length;
  document.getElementById('statTotal').textContent=tasks.length;
  document.getElementById('statDone').textContent=done;
  document.getElementById('tasksMeta').textContent=tasks.length?done+' / '+tasks.length+' completed':'';
  const visible=getVisible();
  if(!visible.length){
    list.innerHTML=`<div class="empty">${filter==='done'?'Nothing done yet — get going!':filter==='active'?'All tasks complete 🎉':'No tasks yet — add one above to make the capybara smile'}</div>`;
    return;
  }
  list.innerHTML=visible.map(t=>{
    const catTag=t.cat&&t.cat!=='none'?`<span class="tag ${CAT_TAGS[t.cat]}">${CAT_LABELS[t.cat]}</span>`:'';
    const priTag=`<span class="tag ${PRI_CLS[t.pri||'med']}">${PRI_LABELS[t.pri||'med']}</span>`;
    return `<div class="task-item${t.done?' done':''}" data-id="${t.id}" draggable="true"
        ondragstart="onDragStart(event,${t.id})" ondragend="onDragEnd(event)"
        ondragover="onItemDragOver(event,${t.id})" ondragleave="onItemDragLeave(event,${t.id})">
      <div class="drag-handle" title="Drag to reorder">⠿</div>
      <div class="check${t.done?' done':''}" id="chk-${t.id}" onclick="toggleTask(${t.id})"></div>
      <div class="task-body">
        <div class="task-text-el" contenteditable="true" spellcheck="false"
          onblur="editTask(${t.id},this)"
          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${esc(t.text)}</div>
        <div class="task-tags">${catTag}${priTag}</div>
      </div>
      <div class="task-actions">
        <button class="act-btn del" onclick="deleteTask(${t.id})" title="Delete">×</button>
      </div>
    </div>`;
  }).join('');
}

// ── TASK ACTIONS ──
function addTask(){
  const inp=document.getElementById('taskInput');
  const text=inp.value.trim(); if(!text) return;
  tasks.unshift({id:++idCtr,text,cat:selCat,pri:selPri,done:false});
  inp.value=''; save(); renderAll();
  showToast('Task added ✓');
}

function toggleTask(id){
  const t=tasks.find(x=>x.id===id); if(!t) return;
  t.done=!t.done; save();
  const chk=document.getElementById('chk-'+id);
  if(chk){chk.classList.add('pop');setTimeout(()=>chk&&chk.classList.remove('pop'),360);}
  renderAll(); updateMeter(t.done);
  if(t.done && calcHap()===100 && !celebratedFull){celebratedFull=true;setTimeout(celebrate,450);}
  if(!t.done) celebratedFull=false;
}

function editTask(id,el){
  const text=el.textContent.trim();
  const t=tasks.find(x=>x.id===id); if(!t) return;
  if(!text){el.textContent=t.text;return;}
  t.text=text; save();
}

function deleteTask(id){
  tasks=tasks.filter(x=>x.id!==id);
  if(!tasks.some(t=>!t.done)) celebratedFull=false;
  save(); renderAll(); updateMeter(false);
}

function clearDone(){
  const n=tasks.filter(t=>t.done).length;
  if(!n){showToast('Nothing to clear');return;}
  tasks=tasks.filter(t=>!t.done); celebratedFull=false; save(); renderAll(); updateMeter(false);
  showToast(`Cleared ${n} task${n>1?'s':''}`);
}

function setFilter(f){
  filter=f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.filter===f));
  renderTasks();
}

const SORT_CYCLE=['manual','pri','alpha'];
const SORT_LABELS={manual:'↕ Manual',pri:'⬆ Priority',alpha:'Az Alpha'};
let sortIdx=0;
function cycleSortOrder(){
  sortIdx=(sortIdx+1)%SORT_CYCLE.length; sortOrder=SORT_CYCLE[sortIdx];
  document.getElementById('sortBtn').textContent=SORT_LABELS[sortOrder];
  renderTasks();
}

// ── DRAG & DROP ──
function onDragStart(e,id){
  dragId=id; e.dataTransfer.effectAllowed='move';
  setTimeout(()=>{const el=document.querySelector(`[data-id="${id}"]`);if(el)el.classList.add('dragging');},0);
}
function onDragEnd(){
  document.querySelectorAll('.task-item').forEach(el=>{el.classList.remove('dragging','drag-over-top','drag-over-bottom');});
  dragId=null; dragOverId=null;
  document.getElementById('taskList').classList.remove('drag-over');
}
function onDragOver(e){e.preventDefault();document.getElementById('taskList').classList.add('drag-over');}
function onDragLeave(e){if(!document.getElementById('taskList').contains(e.relatedTarget))document.getElementById('taskList').classList.remove('drag-over');}
function onItemDragOver(e,id){
  e.preventDefault(); e.stopPropagation();
  if(id===dragId||sortOrder!=='manual') return;
  document.querySelectorAll('.task-item').forEach(el=>el.classList.remove('drag-over-top','drag-over-bottom'));
  const el=document.querySelector(`[data-id="${id}"]`);
  if(!el) return;
  const rect=el.getBoundingClientRect();
  dragSide=e.clientY<rect.top+rect.height/2?'top':'bottom';
  el.classList.add(dragSide==='top'?'drag-over-top':'drag-over-bottom');
  dragOverId=id;
}
function onItemDragLeave(e,id){
  const el=document.querySelector(`[data-id="${id}"]`);
  if(el){el.classList.remove('drag-over-top','drag-over-bottom');}
  dragOverId=null;
}
function onDrop(e){
  e.preventDefault();
  document.querySelectorAll('.task-item').forEach(el=>el.classList.remove('drag-over-top','drag-over-bottom'));
  document.getElementById('taskList').classList.remove('drag-over');
  if(dragId===null||dragOverId===null||dragId===dragOverId||sortOrder!=='manual') return;
  const fi=tasks.findIndex(x=>x.id===dragId);
  let ti=tasks.findIndex(x=>x.id===dragOverId);
  if(fi<0||ti<0) return;
  const [item]=tasks.splice(fi,1);
  ti=tasks.findIndex(x=>x.id===dragOverId);
  tasks.splice(dragSide==='bottom'?ti+1:ti,0,item);
  save(); renderTasks();
}

// ── METER ──
function calcHap(){if(!tasks.length)return 0;return Math.round(tasks.filter(t=>t.done).length/tasks.length*100);}
let lastMoodMin=-1;
function updateMeter(animate){
  const p=calcHap();
  document.getElementById('meterFill').style.width=p+'%';
  document.getElementById('pctLabel').textContent=p+'%';
  const mood=MOODS.reduce((m,x)=>p>=x.min?x:m,MOODS[0]);
  if(mood.min!==lastMoodMin){
    const lbl=document.getElementById('moodLabel');
    lbl.classList.remove('mood-change'); void lbl.offsetWidth; lbl.classList.add('mood-change');
    lbl.textContent=mood.label; lastMoodMin=mood.min;
  }
  document.getElementById('capyMouth').setAttribute('d',mood.mouth);
  document.getElementById('meterFill').style.background=p<35?'#C8A060':p<65?'#D4890A':'#4A7C59';
  const ring=document.getElementById('moodRing');
  if(mood.ring){ring.style.borderColor=mood.ring;ring.style.boxShadow='0 0 22px '+mood.ring;ring.classList.remove('pulse');void ring.offsetWidth;ring.classList.add('pulse');}
  else{ring.style.borderColor='transparent';ring.style.boxShadow='none';}
  document.getElementById('blob3').style.opacity=p>=55?'1':'0';
  if(animate){capBounce();spawnParticles(p);}
}

function capBounce(){
  const svg=document.getElementById('capySvg');
  svg.classList.remove('capy-bounce');void svg.offsetWidth;svg.classList.add('capy-bounce');
  const ear=document.getElementById('earL');
  ear.classList.remove('ear-wiggle');void ear.offsetWidth;ear.classList.add('ear-wiggle');
}

function spawnParticles(p){
  const g=p>=80?['★','♪','✦','✿','◆','♡']:p>=40?['·','~','•']:['…'];
  const cols=p>=65?['#4A7C59','#639922','#A0C840']:['#D4890A','#C8A060'];
  const rect=document.getElementById('capySvg').getBoundingClientRect();
  const n=p>=80?9:5;
  for(let i=0;i<n;i++){
    setTimeout(()=>{
      const el=document.createElement('div');el.className='particle';
      el.textContent=g[Math.floor(Math.random()*g.length)];
      el.style.left=(rect.left+rect.width*.1+Math.random()*rect.width*.8)+'px';
      el.style.top=(rect.top+rect.height*.15+Math.random()*rect.height*.5)+'px';
      el.style.color=cols[Math.floor(Math.random()*cols.length)];
      el.style.fontSize=(12+Math.random()*10)+'px';
      el.style.setProperty('--dx',(Math.random()*110-55)+'px');
      el.style.setProperty('--dy',(-55-Math.random()*65)+'px');
      el.style.setProperty('--dr',(Math.random()*60-30)+'deg');
      el.style.animationDelay=(i*.07)+'s';
      document.body.appendChild(el);setTimeout(()=>el.remove(),1300);
    },i*55);
  }
}

// ── PET ──
function petCapybara(){
  pets++;save();document.getElementById('statPets').textContent=pets;
  // blush
  ['blushL','blushR'].forEach(id=>{
    document.getElementById(id).setAttribute('opacity','0.55');
    setTimeout(()=>document.getElementById(id).setAttribute('opacity','0'),1400);
  });
  capBounce();
  const rect=document.getElementById('capySvg').getBoundingClientRect();
  ['♡','♡','✦','♡'].forEach((g,i)=>{
    setTimeout(()=>{
      const el=document.createElement('div');el.className='particle';
      el.textContent=g;
      el.style.left=(rect.left+30+Math.random()*100)+'px';
      el.style.top=(rect.top+5+Math.random()*50)+'px';
      el.style.color='#E8609A';el.style.fontSize='17px';
      el.style.setProperty('--dx',(Math.random()*70-35)+'px');
      el.style.setProperty('--dy',(-50-Math.random()*50)+'px');
      el.style.setProperty('--dr',(Math.random()*40-20)+'deg');
      document.body.appendChild(el);setTimeout(()=>el.remove(),1200);
    },i*90);
  });
  if(pets===10)showToast('10 pets! Your capybara loves you 💖');
  else if(pets===1)showToast('The capybara appreciated that 🥹');
}

// ── IDLE ANIMATIONS ──
function idleBlink(){
  ['blinkL','blinkR'].forEach(id=>{
    const el=document.getElementById(id);
    el.style.transform='scaleY(1)';
    setTimeout(()=>{el.style.transform='scaleY(0)';},130);
  });
}
function idleLook(){
  const dx=(Math.random()>.5?1:-1)*(2+Math.random()*3);
  const dy=(Math.random()>.7?1:-1)*(Math.random()*1.5);
  ['earL','earR'].forEach(id=>{
    const el=document.getElementById(id);
    const sign=id==='earL'?1:-1;
    el.style.transition='transform .4s ease';
    el.style.transform=`rotate(${dx*sign*2}deg)`;
    setTimeout(()=>{el.style.transform='rotate(0deg)';},1500);
  });
}

// ── CELEBRATE ──
function celebrate(){
  document.getElementById('celebration').classList.add('show');
  const cols=['#C8A060','#4A7C59','#D4890A','#C8D8F0','#F5D98A','#F5D0CC','#D4C5A0'];
  for(let i=0;i<70;i++){
    const el=document.createElement('div');el.className='confetti-piece';
    el.style.left=Math.random()*100+'vw';
    el.style.top='-16px';
    el.style.width=(6+Math.random()*6)+'px';
    el.style.height=(6+Math.random()*6)+'px';
    el.style.background=cols[Math.floor(Math.random()*cols.length)];
    el.style.borderRadius=Math.random()>.5?'50%':'2px';
    el.style.setProperty('--dur',(1.6+Math.random()*2)+'s');
    el.style.setProperty('--dx',(Math.random()*120-60)+'px');
    el.style.animationDelay=(Math.random()*.9)+'s';
    document.body.appendChild(el);setTimeout(()=>el.remove(),4000);
  }
  streak++;document.getElementById('streakCount').textContent=streak;save();
}
function closeCelebration(){document.getElementById('celebration').classList.remove('show');}

// ── TOAST ──
let toastTimer;
function showToast(msg){
  const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);
}

// ── RESET ──
function resetAll(){
  if(!confirm('Reset everything?')) return;
  tasks=[];idCtr=0;pets=0;streak=0;celebratedFull=false;
  save();renderAll();showToast('Fresh start 🌱');
  document.getElementById('streakCount').textContent=0;
  lastMoodMin=-1;
}

// ── UTIL ──
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

init();