"use strict";

/* ======================================================================
   Palmarès — classe une playlist en 6 tiers, avec ordre fin dans chaque
   tier, partage, et mini-jeu "devine le goût". Lecture via l'API YouTube
   (lecteur caché), comme le blindtest.
   ====================================================================== */

/* ---------- Tiers : du meilleur (0) au pire (5) ---------- */
const TIERS = [
  { key:"perfection", label:"Juste la perfection", em:"👑", color:"#ffd43b" },
  { key:"incroyable", label:"Incroyable",          em:"🤩", color:"#ff7a45" },
  { key:"jadore",     label:"J'adore",             em:"❤️", color:"#ff4d8d" },
  { key:"capasse",    label:"Ça passe",            em:"🙂", color:"#8b5cf6" },
  { key:"pasouf",     label:"Pas ouf",             em:"😕", color:"#5b8def" },
  { key:"poubelle",   label:"Poubelle",            em:"🗑️", color:"#8a94a6" },
];
const NT = TIERS.length;

/* ---------- Données ---------- */
let PLAYLIST = [];           // [{title, artist, id}]
let BYID = {};               // id -> track
let N = 0;
const LS = "palmares.v2";
const AV = ["#ff4d8d","#ff7a45","#8b5cf6","#1db954","#3b82f6","#e8a200","#06b6d4","#ec4899"];

/* ---------- État ---------- */
let state = { name:"", tiers:[[],[],[],[],[],[]], queue:[], friends:[] };
let classify = null;   // {id, tier, lo, hi} pendant l'ordre fin dans un tier
let view = "classer";
let sheetId = null;    // chip ouvert dans le palmarès

/* ---------- Utilitaires ---------- */
const $ = s => document.querySelector(s);
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function thumb(id){ return "https://i.ytimg.com/vi/"+id+"/mqdefault.jpg"; }
function initial(s){ return (s||"?").trim().charAt(0).toUpperCase()||"?"; }
function avatarColor(name){ let h=0; for(const c of (name||"")) h=(h*31+c.charCodeAt(0))>>>0; return AV[h%AV.length]; }
function tierOf(tiers,id){ for(let i=0;i<NT;i++) if(tiers[i].includes(id)) return i; return -1; }
function flatOrder(tiers){ return tiers.flat(); }

function save(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }
function load(){ try{ const r=localStorage.getItem(LS); if(r){ const d=JSON.parse(r); if(d&&Array.isArray(d.tiers)&&d.tiers.length===NT) state=Object.assign(state,d); } }catch(e){} }

let toastT;
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("show"),1900); }

/* ======================================================================
   Lecteur YouTube (audio caché)
   ====================================================================== */
let player=null, ytReady=false, curId=null, playing=false, progT=null;
window.onYouTubeIframeAPIReady = function(){
  player = new YT.Player("yt-player", {
    height:"1", width:"1", host:"https://www.youtube-nocookie.com",
    playerVars:{ autoplay:0, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0, iv_load_policy:3, playsinline:1 },
    events:{
      onReady:()=>{ ytReady=true; },
      onStateChange:e=>{
        playing = (e.data===YT.PlayerState.PLAYING);
        reflectPlay();
        if(e.data===YT.PlayerState.ENDED){ playing=false; reflectPlay(); }
      }
    }
  });
};
function playTrack(id){
  const tr=BYID[id]; if(!tr) return;
  $("#playbar").hidden=false;
  $("#pbThumb").src=thumb(id); $("#pbTitle").textContent=tr.title; $("#pbArtist").textContent=tr.artist;
  curId=id;
  const go=()=>{ player.loadVideoById(id); player.playVideo(); startProg(); };
  if(ytReady&&player){ go(); }
  else { const w=setInterval(()=>{ if(ytReady&&player){ clearInterval(w); go(); } },120); }
}
function togglePlay(){
  if(!player||!curId) return;
  if(playing) player.pauseVideo(); else player.playVideo();
}
function reflectPlay(){
  const b=$("#pbPlay"); if(b) b.textContent = playing?"⏸":"▶";
  document.querySelectorAll("[data-playbtn]").forEach(el=>{
    const on = (el.dataset.playbtn===curId) && playing;
    el.classList.toggle("on",on);
    const lab=el.querySelector("[data-plabel]"); if(lab) lab.textContent = on?"⏸ Pause":"▶ Écouter";
  });
}
function startProg(){
  clearInterval(progT);
  progT=setInterval(()=>{
    if(!player||!player.getDuration) return;
    const d=player.getDuration()||0, c=player.getCurrentTime()||0;
    const seek=$("#pbSeek"); if(seek && !seek.dataset.drag) seek.value = d? Math.round(c/d*1000):0;
    const tm=$("#pbTime"); if(tm) tm.textContent = fmt(c);
  },500);
}
function fmt(s){ s=Math.max(0,Math.floor(s||0)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }

/* ======================================================================
   Navigation + thème
   ====================================================================== */
function setView(v){
  view=v;
  document.querySelectorAll("#tabs .tab").forEach(b=>b.setAttribute("aria-current", b.dataset.v===v?"true":"false"));
  document.querySelectorAll(".view").forEach(s=>s.hidden = s.id!=="v-"+v);
  render();
}

(function theme(){
  const root=document.documentElement, key="palmares.theme";
  let saved=null; try{ saved=localStorage.getItem(key); }catch(e){}
  if(saved) root.setAttribute("data-theme",saved);
  $("#theme").onclick=()=>{
    const cur=root.getAttribute("data-theme")||"dark";
    const next=cur==="light"?"dark":"light";
    root.setAttribute("data-theme",next);
    try{ localStorage.setItem(key,next); }catch(e){}
  };
})();

/* ======================================================================
   Rendu
   ====================================================================== */
function render(){
  $("#who").textContent = state.name ? "🎧 "+state.name : "";
  $("#bQueue").textContent = state.queue.length;
  $("#bFriends").textContent = state.friends.length;
  if(view==="classer") renderClasser();
  if(view==="palmares") renderPalmares();
  if(view==="amis") renderAmis();
  if(view==="jeu") renderJeu();
  reflectPlay();
}

/* ------------------------- CLASSER ------------------------- */
function renderClasser(){
  const box=$("#npCard");

  if(!state.name){
    box.innerHTML = `
      <div class="eyebrow">Bienvenue</div>
      <h2 style="font-size:24px;margin:6px 0 4px">On classe la playlist, morceau par morceau</h2>
      <p class="muted" style="margin:0 0 14px">Écoute chaque titre, choisis son tier, puis — s'il y a déjà des morceaux dans ce tier — dis juste lequel tu préfères. Ton palmarès se construit tout seul.</p>
      <label class="fld">Ton pseudo
        <input class="txt" id="nameInput" placeholder="ex : Mio" maxlength="16" autocomplete="off"></label>
      <div class="row" style="margin-top:12px"><button class="btn primary block" id="startBtn">C'est parti</button></div>`;
    const go=()=>{ const v=$("#nameInput").value.trim(); if(!v){toast("Entre un pseudo");return;} state.name=v; save(); render(); };
    $("#startBtn").onclick=go;
    $("#nameInput").addEventListener("keydown",e=>{ if(e.key==="Enter") go(); });
    return;
  }

  // ordre fin dans un tier en cours
  if(classify){
    const tr=BYID[classify.id];
    const arr=state.tiers[classify.tier];
    const mid=(classify.lo+classify.hi)>>1;
    const other=BYID[arr[mid]];
    const T=TIERS[classify.tier];
    box.innerHTML = `
      <div class="eyebrow">Dans « ${esc(T.label)} » ${T.em} — tu préfères&nbsp;?</div>
      <div class="vs">${pickHTML(tr)}<span class="vsbadge">VS</span>${pickHTML(other)}</div>`;
    const picks=box.querySelectorAll(".pick");
    picks[0].onclick=e=>{ if(e.target.closest(".pplay"))return; answer(true); };
    picks[1].onclick=e=>{ if(e.target.closest(".pplay"))return; answer(false); };
    box.querySelectorAll(".pplay").forEach(b=>b.onclick=()=>playTrack(b.dataset.play));
    return;
  }

  if(state.queue.length===0){
    box.innerHTML = `<div class="np">
      <div class="cover" style="display:grid;place-items:center;font-size:52px;color:var(--on-accent);font-family:var(--display);font-weight:800">✓</div>
      <h2>Playlist classée&nbsp;!</h2><p class="art">Les ${N} morceaux ont trouvé leur tier.</p>
      <button class="btn primary" id="toP">Voir mon palmarès</button></div>`;
    $("#toP").onclick=()=>setView("palmares");
    return;
  }

  const tr=BYID[state.queue[0]];
  const done=N-state.queue.length;
  box.innerHTML = `
    <div class="eyebrow">Morceau ${done+1} sur ${N}</div>
    <div class="progress" style="margin:10px 0 18px"><i style="width:${Math.round(done/N*100)}%"></i></div>
    <div class="np">
      <img class="cover" src="${thumb(tr.id)}" alt="">
      <h2>${esc(tr.title)}</h2><div class="art">${esc(tr.artist)}</div>
      <button class="playnow" data-playbtn="${tr.id}" data-play="${tr.id}"><span data-plabel>▶ Écouter</span></button>
    </div>
    <div class="eyebrow" style="margin:18px 0 2px">Tu le ranges où&nbsp;?</div>
    <div class="tierbtns" id="tierBtns"></div>`;
  $("[data-play]").onclick=()=>playTrack(tr.id);
  $("#tierBtns").innerHTML = TIERS.map((T,i)=>
    `<button class="tbtn" data-t="${i}"><span class="bar" style="background:${T.color}"></span><span class="em">${T.em}</span>${esc(T.label)}</button>`).join("");
  $("#tierBtns").querySelectorAll(".tbtn").forEach(b=>b.onclick=()=>assignTier(+b.dataset.t));
  reflectPlay();
}
function pickHTML(tr){
  return `<button class="pick">
    <img class="cover" src="${thumb(tr.id)}" alt="">
    <div class="t">${esc(tr.title)}</div><div class="a">${esc(tr.artist)}</div>
    <span class="pplay" data-play="${tr.id}">▶ écouter un extrait</span></button>`;
}
function assignTier(ti){
  const id=state.queue[0], arr=state.tiers[ti];
  if(arr.length===0){ arr.push(id); state.queue.shift(); save(); render(); return; }
  classify={ id, tier:ti, lo:0, hi:arr.length };
  render();
}
function answer(preferNew){
  const arr=state.tiers[classify.tier];
  const mid=(classify.lo+classify.hi)>>1;
  if(preferNew) classify.hi=mid; else classify.lo=mid+1;
  if(classify.lo>=classify.hi){
    arr.splice(classify.lo,0,classify.id);
    state.queue.shift(); classify=null; save(); render();
  } else render();
}

/* ------------------------- PALMARES (tier board) ------------------------- */
function renderPalmares(){
  const board=$("#tierBoard"), share=$("#shareCard");
  const total=flatOrder(state.tiers).length;
  if(total===0){
    board.innerHTML=`<div class="empty">Rien de classé.<br><br><button class="btn primary" id="goClass">Commencer à classer</button></div>`;
    $("#goClass").onclick=()=>setView("classer"); share.hidden=true; return;
  }
  board.innerHTML = TIERS.map((T,i)=>{
    const chips = state.tiers[i].map(id=>chipHTML(BYID[id])).join("")
      || `<span class="tierempty">vide</span>`;
    return `<div class="tier" data-tier="${i}">
      <div class="tierlabel" style="background:${T.color}"><span class="em">${T.em}</span><span class="lb">${esc(T.label)}</span></div>
      <div class="tierrow" data-row="${i}">${chips}</div></div>`;
  }).join("");
  wireBoard(board);
  share.hidden=false;
  $("#shareCode").value = encodeShare();
}
function chipHTML(tr){
  return `<div class="chip" data-id="${tr.id}" draggable="true">
    <img src="${thumb(tr.id)}" alt="" loading="lazy">
    <span class="cn"><span class="t">${esc(tr.title)}</span><span class="a">${esc(tr.artist)}</span></span>
    <span class="gr">⋯</span></div>`;
}
function wireBoard(board){
  board.querySelectorAll(".chip").forEach(c=>{
    c.addEventListener("click",()=>openSheet(c.dataset.id));
    c.addEventListener("dragstart",e=>{ e.dataTransfer.setData("text/plain",c.dataset.id); e.dataTransfer.effectAllowed="move"; });
  });
  board.querySelectorAll(".tierrow").forEach(row=>{
    row.addEventListener("dragover",e=>{ e.preventDefault(); row.classList.add("drop"); });
    row.addEventListener("dragleave",()=>row.classList.remove("drop"));
    row.addEventListener("drop",e=>{
      e.preventDefault(); row.classList.remove("drop");
      const id=e.dataTransfer.getData("text/plain"); if(!id) return;
      const ti=+row.dataset.row;
      // position d'insertion = avant le chip le plus proche
      const after=[...row.querySelectorAll(".chip")].find(ch=>{
        const r=ch.getBoundingClientRect(); return e.clientY < r.top+r.height/2 || (Math.abs(e.clientY-(r.top+r.height/2))<24 && e.clientX < r.left+r.width/2);
      });
      const toIdx = after? state.tiers[ti].indexOf(after.dataset.id) : state.tiers[ti].length;
      moveTo(id,ti,toIdx);
    });
  });
}
function removeEverywhere(id){ for(let i=0;i<NT;i++){ const k=state.tiers[i].indexOf(id); if(k>=0) state.tiers[i].splice(k,1); } }
function moveTo(id, ti, idx){
  const from=tierOf(state.tiers,id); if(from<0) return;
  const sameArr=state.tiers[from];
  const curIdx=sameArr.indexOf(id);
  removeEverywhere(id);
  if(idx===undefined||idx<0) idx=state.tiers[ti].length;
  // si on retire un élément situé avant la cible dans le même tier, l'index glisse
  if(from===ti && curIdx<idx) idx--;
  state.tiers[ti].splice(Math.min(idx,state.tiers[ti].length),0,id);
  save(); render();
}

/* feuille d'actions sur un morceau */
function openSheet(id){ sheetId=id; drawSheet(); }
function closeSheet(){ sheetId=null; const s=$("#sheet"); if(s) s.remove(); }
function drawSheet(){
  closeSheetDom();
  const tr=BYID[sheetId]; const ti=tierOf(state.tiers,sheetId); const arr=state.tiers[ti]; const idx=arr.indexOf(sheetId);
  const el=document.createElement("div"); el.className="sheet"; el.id="sheet";
  el.innerHTML=`<div class="panel" role="dialog" aria-label="Actions">
    <div class="hd"><img src="${thumb(tr.id)}" alt=""><div class="meta"><div class="t">${esc(tr.title)}</div><div class="a">${esc(tr.artist)}</div></div>
      <button class="mini" data-x>✕</button></div>
    <div class="row"><button class="btn primary" data-sp>▶ Écouter</button>
      <button class="btn" data-up ${idx<=0?"disabled":""}>▲ Monter</button>
      <button class="btn" data-dn ${idx>=arr.length-1?"disabled":""}>▼ Descendre</button></div>
    <div class="eyebrow">Changer de tier</div>
    <div class="movegrid">${TIERS.map((T,i)=>`<button class="tbtn" data-mt="${i}" ${i===ti?'aria-current="true"':''}><span class="em">${T.em}</span>${esc(T.label)}</button>`).join("")}</div>
    <button class="btn ghost" data-rm>Retirer du classement</button></div>`;
  el.addEventListener("click",e=>{ if(e.target===el) closeSheet(); });
  el.querySelector("[data-x]").onclick=closeSheet;
  el.querySelector("[data-sp]").onclick=()=>playTrack(sheetId);
  el.querySelector("[data-up]").onclick=()=>{ reorderIn(ti,idx,-1); };
  el.querySelector("[data-dn]").onclick=()=>{ reorderIn(ti,idx,1); };
  el.querySelectorAll("[data-mt]").forEach(b=>b.onclick=()=>{ const t=+b.dataset.mt; if(t!==ti){ moveTo(sheetId,t,0); } closeSheet(); });
  el.querySelector("[data-rm]").onclick=()=>{ removeEverywhere(sheetId); if(!state.queue.includes(sheetId)) state.queue.push(sheetId); closeSheet(); save(); render(); toast("Remis dans « à classer »"); };
  document.body.appendChild(el);
}
function closeSheetDom(){ const s=$("#sheet"); if(s) s.remove(); }
function reorderIn(ti,idx,dir){
  const a=state.tiers[ti], j=idx+dir; if(j<0||j>=a.length) return;
  [a[idx],a[j]]=[a[j],a[idx]]; save(); render();
  sheetId && drawSheet();
}

/* ---------- Partage ---------- */
function encodeShare(){
  const payload={ n:state.name, v:2, t:state.tiers };
  try{ return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); }catch(e){ return JSON.stringify(payload); }
}
function decodeShare(code){
  let txt=(code||"").trim();
  try{ txt=decodeURIComponent(escape(atob(txt))); }catch(e){}
  let d; try{ d=JSON.parse(txt); }catch(e){ return null; }
  if(!d) return null;
  let tiers;
  if(Array.isArray(d.t)&&d.t.length===NT) tiers=d.t.map(a=>a.filter(id=>BYID[id]));
  else if(Array.isArray(d.r)){ tiers=[[],[],[],[],[],[]]; tiers[2]=d.r.filter(id=>BYID[id]); } // compat ancien format
  else return null;
  if(tiers.flat().length===0) return null;
  return { name:(d.n||"Ami").slice(0,16), tiers };
}

/* ------------------------- AMIS ------------------------- */
function renderAmis(){
  const list=$("#friendsList");
  if(state.friends.length===0){ list.innerHTML=`<div class="empty">Aucun ami importé.<br>Demande à un pote son lien ou son code&nbsp;!</div>`; return; }
  list.innerHTML = state.friends.map((f,fi)=>friendCard(f,fi)).join("");
  list.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ state.friends.splice(+b.closest("[data-fi]").dataset.fi,1); save(); render(); });
  list.querySelectorAll("[data-play]").forEach(b=>b.onclick=()=>{ gameFriend=+b.closest("[data-fi]").dataset.fi; gameState=null; setView("jeu"); });
}
function friendCard(f,fi){
  const col=avatarColor(f.name);
  const flat=flatOrder(f.tiers);
  const top=flat.slice(0,3).map((id,i)=>{ const ti=tierOf(f.tiers,id); return `<div class="friend-row"><span class="pos tnum">${i+1}</span><img class="thumb" src="${thumb(id)}" alt=""><span class="meta"><span class="t">${esc(BYID[id].title)}</span><span class="a">${esc(BYID[id].artist)}</span></span><span class="pill" style="color:${TIERS[ti].color}">${TIERS[ti].em}</span></div>`; }).join("");
  return `<div class="card" data-fi="${fi}" style="margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span class="dot" style="background:${col}">${esc(initial(f.name))}</span>
      <b style="font-family:var(--display);font-size:18px;flex:1">${esc(f.name)}</b>
      <span class="pill tnum">${flat.length}/${N}</span>
      <button class="mini" data-del title="Retirer">✕</button></div>
    <div class="eyebrow" style="margin:8px 0 2px">Son top 3</div>${top}
    <button class="btn primary block" data-play style="margin-top:12px">🎯 Deviner son goût</button></div>`;
}

/* ------------------------- DEVINE LE GOÛT ------------------------- */
let gameFriend=null, gameState=null; // {order:[ids], i, guesses:{id:tier}}
function renderJeu(){
  const home=$("#gameHome");
  if(state.friends.length===0){ home.innerHTML=`<div class="empty">Importe d'abord un ami (onglet <b>Amis</b>) pour deviner son goût.</div>`; return; }
  if(gameFriend===null||!state.friends[gameFriend]){
    home.innerHTML=`<div class="eyebrow">Choisis un ami</div>`+state.friends.map((f,fi)=>
      `<button class="btn block" data-fi="${fi}" style="display:flex;gap:10px;align-items:center;margin-top:8px;text-align:left">
        <span class="dot" style="background:${avatarColor(f.name)}">${esc(initial(f.name))}</span>
        <span style="flex:1">${esc(f.name)}</span><span class="muted tnum">${flatOrder(f.tiers).length}/${N}</span></button>`).join("");
    home.querySelectorAll("[data-fi]").forEach(b=>b.onclick=()=>{ gameFriend=+b.dataset.fi; gameState=null; render(); });
    return;
  }
  const f=state.friends[gameFriend];
  const order=flatOrder(f.tiers);
  if(!gameState){
    const sh=order.slice(); for(let i=sh.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [sh[i],sh[j]]=[sh[j],sh[i]]; }
    gameState={ order:sh, i:0, guesses:{} };
  }

  if(gameState.i < gameState.order.length){
    const id=gameState.order[gameState.i], tr=BYID[id];
    home.innerHTML=`
      <div class="eyebrow">Devine le goût de ${esc(f.name)} — ${gameState.i+1}/${gameState.order.length}</div>
      <div class="progress" style="margin:10px 0 16px"><i style="width:${Math.round(gameState.i/gameState.order.length*100)}%"></i></div>
      <div class="gq">
        <img class="cover" src="${thumb(id)}" alt="" style="width:120px;height:120px">
        <h2 style="font-size:22px">${esc(tr.title)}</h2><div class="muted">${esc(tr.artist)}</div>
        <button class="playnow" data-playbtn="${id}" data-play="${id}"><span data-plabel>▶ Écouter</span></button>
        <p style="margin:6px 0 2px;font-weight:600">Dans quel tier ${esc(f.name)} l'a mis&nbsp;?</p>
      </div>
      <div class="tierbtns" style="margin-top:4px">${TIERS.map((T,i)=>`<button class="tbtn" data-g="${i}"><span class="bar" style="background:${T.color}"></span><span class="em">${T.em}</span>${esc(T.label)}</button>`).join("")}</div>`;
    $("[data-play]").onclick=()=>playTrack(id);
    home.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{ gameState.guesses[id]=+b.dataset.g; gameState.i++; render(); });
    reflectPlay();
    return;
  }

  // résultats
  let err=0, exact=0;
  gameState.order.forEach(id=>{ const g=gameState.guesses[id], real=tierOf(f.tiers,id); const d=Math.abs(g-real); err+=d; if(d===0)exact++; });
  const maxErr=gameState.order.length*(NT-1)||1;
  const score=Math.max(0,Math.round(100*(1-err/maxErr)));
  const verdict = score>=85?"Tu le connais par cœur 🔥":score>=60?"Beau feeling !":score>=35?"Tu le découvres encore":"Vous n'avez pas les mêmes oreilles 😅";
  home.innerHTML=`
    <div class="card" style="text-align:center">
      <div class="eyebrow">Ton score</div><div class="scorebig tnum">${score}%</div>
      <p style="margin:6px 0 0;font-weight:600">${verdict}</p>
      <p class="muted tnum" style="margin:4px 0 0">${exact}/${gameState.order.length} tiers devinés pile</p></div>
    <div class="eyebrow" style="margin-top:4px">Tes réponses vs ${esc(f.name)}</div>
    <div id="rev"></div>
    <div class="row"><button class="btn primary" id="again">Rejouer</button><button class="btn ghost" id="other">Autre ami</button></div>`;
  $("#rev").innerHTML = order.map(id=>{
    const g=gameState.guesses[id], real=tierOf(f.tiers,id), d=g-real;
    const col=d===0?"var(--good)":Math.abs(d)===1?"var(--warn)":"var(--bad)";
    const lab=d===0?"✓ pile":(`toi ${TIERS[g].em} · lui ${TIERS[real].em}`);
    return `<div class="friend-row"><img class="thumb" src="${thumb(id)}" alt=""><span class="meta"><span class="t">${esc(BYID[id].title)}</span><span class="a">${esc(BYID[id].artist)}</span></span><span class="delta" style="background:${col}">${lab}</span></div>`;
  }).join("");
  $("#again").onclick=()=>{ gameState=null; render(); };
  $("#other").onclick=()=>{ gameFriend=null; gameState=null; render(); };
}

/* ======================================================================
   Boutons globaux + barre de lecture
   ====================================================================== */
document.addEventListener("click",e=>{
  if(e.target.id==="copyLink"){
    const url=location.origin+location.pathname+"?top="+encodeURIComponent(encodeShare());
    copy(url,"Lien copié ✓");
  }
  if(e.target.id==="copyCode"){ copy($("#shareCode").value,"Code copié ✓"); }
  if(e.target.id==="resetBtn"){ state.tiers=[[],[],[],[],[],[]]; state.queue=PLAYLIST.map(x=>x.id); classify=null; save(); setView("classer"); toast("Classement remis à zéro"); }
  if(e.target.id==="importBtn"){
    const code=$("#importCode").value; if(!code.trim()){ toast("Colle un code d'abord"); return; }
    addFriend(code);
    $("#importCode").value="";
  }
});
function addFriend(code){
  const f=decodeShare(code); if(!f){ toast("Code invalide"); return false; }
  const i=state.friends.findIndex(x=>x.name.toLowerCase()===f.name.toLowerCase());
  if(i>=0) state.friends[i]=f; else state.friends.push(f);
  save(); toast(f.name+" ajouté ✓"); render(); return true;
}
function copy(txt,ok){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast(ok)).catch(()=>fallbackCopy(txt));
  } else fallbackCopy(txt);
}
function fallbackCopy(txt){ const t=$("#shareCode"); t.value=txt; t.select(); try{document.execCommand("copy");toast("Copié ✓");}catch(e){toast("Sélectionné — Ctrl+C");} }

$("#pbPlay").onclick=togglePlay;
$("#pbSeek").addEventListener("input",e=>{ e.target.dataset.drag="1"; });
$("#pbSeek").addEventListener("change",e=>{
  if(player&&player.getDuration){ const d=player.getDuration()||0; player.seekTo(d*e.target.value/1000,true); }
  delete e.target.dataset.drag;
});
document.getElementById("tabs").addEventListener("click",e=>{ const b=e.target.closest(".tab"); if(b) setView(b.dataset.v); });

/* ======================================================================
   Démarrage
   ====================================================================== */
async function boot(){
  try{
    const res=await fetch("tracks.json",{cache:"no-store"});
    PLAYLIST=await res.json();
  }catch(e){ PLAYLIST=[]; }
  BYID=Object.fromEntries(PLAYLIST.map(x=>[x.id,x]));
  N=PLAYLIST.length;

  load();
  // file = morceaux encore non classés (robuste si la playlist change)
  const placed=new Set(flatOrder(state.tiers));
  state.queue = PLAYLIST.map(x=>x.id).filter(id=>!placed.has(id));
  // nettoie d'éventuels ids disparus
  state.tiers = state.tiers.map(a=>a.filter(id=>BYID[id]));

  // ami de démo (généré à partir de la vraie playlist) pour tester le jeu tout de suite
  if(state.friends.length===0 && N>0){
    const sample=PLAYLIST.slice(0,Math.min(12,N)).map(x=>x.id);
    const demo=[[],[],[],[],[],[]];
    sample.forEach((id,i)=>demo[i%NT].push(id));
    state.friends.push({ name:"Léa (démo)", tiers:demo });
  }

  // lien partagé : ?top=CODE
  try{
    const p=new URLSearchParams(location.search).get("top");
    if(p && addFriend(p)){ history.replaceState(null,"",location.pathname); setView("amis"); return; }
  }catch(e){}

  setView("classer");
}
boot();
