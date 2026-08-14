/* =========================================================
   DEMO DATA GENERATION
   ========================================================= */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd = mulberry32(88172645);
const R = (min,max)=>Math.floor(rnd()*(max-min+1))+min;
const pick = arr=>arr[R(0,arr.length-1)];
const round1 = n=>Math.round(n*10)/10;

/* =========================================================
   LOCAL JSON DATABASE
   Members and branches only — everything else on this page
   stays as in-memory demo data. Persisted to this browser's
   localStorage as a single JSON blob; nothing is sent
   anywhere over the network. Export/Import lets you treat it
   like an actual .json database file.
   ========================================================= */
const DB_KEY = 'luna.localdb.v1';
function coreBranch(b){
  return {id:b.id, code:b.code, name:b.name, address:b.address, phone:b.phone, hours:b.hours, manager:b.manager};
}
const LocalDB = (function(){
  function readRaw(){
    try{
      const raw = localStorage.getItem(DB_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      console.warn('Local JSON DB: could not read localStorage, starting fresh.', e);
      return null;
    }
  }
  function writeRaw(){
    try{
      localStorage.setItem(DB_KEY, JSON.stringify(cache));
      return true;
    }catch(e){
      console.error('Local JSON DB: could not write to localStorage.', e);
      toast('Could not save to the local database (storage full or disabled).');
      return false;
    }
  }
  let cache = readRaw();
  function ensure(){
    if(!cache) cache = {members:null, branches:null, meta:{createdAt:new Date().toISOString(), source:'seed'}};
    return cache;
  }
  return {
    getOrSeedBranches(seed){
      ensure();
      if(!cache.branches || !cache.branches.length){ cache.branches = seed.map(coreBranch); writeRaw(); }
      return cache.branches;
    },
    getOrSeedMembers(seed){
      ensure();
      if(!cache.members || !cache.members.length){ cache.members = seed; writeRaw(); }
      return cache.members;
    },
    saveBranches(branches){ ensure(); cache.branches = branches.map(coreBranch); return writeRaw(); },
    saveMembers(members){ ensure(); cache.members = members; return writeRaw(); },
    resetToSeed(branchSeed, memberSeed){
      cache = {members:memberSeed, branches:branchSeed.map(coreBranch), meta:{createdAt:new Date().toISOString(), source:'reset'}};
      writeRaw();
      return cache;
    },
    importData(parsed){
      if(!parsed || !Array.isArray(parsed.members) || !Array.isArray(parsed.branches)){
        throw new Error('File must contain "members" and "branches" arrays.');
      }
      cache = {members:parsed.members, branches:parsed.branches.map(coreBranch), meta:{createdAt:new Date().toISOString(), source:'import'}};
      writeRaw();
      return cache;
    },
    exportJSON(){
      ensure();
      return JSON.stringify({members:cache.members, branches:cache.branches, exportedAt:new Date().toISOString()}, null, 2);
    },
    raw(){ return ensure(); },
  };
})();

/* =========================================================
   LIBRARY CALENDAR
   A user-editable events calendar shown on the Dashboard.
   Persisted to this browser's localStorage (its own JSON blob,
   separate from the members/branches DB above) so added, edited
   and deleted events survive a reload.
   ========================================================= */
const CAL_KEY = 'luna.calendar.v1';
const CAL_TYPES = [
  {id:'event',     label:'Programme / Event',        badge:'success', dot:'#1E8A5D'},
  {id:'due',       label:'Due-date reminder',         badge:'warning', dot:'#B7791F'},
  {id:'meeting',   label:'Staff meeting',             badge:'info',    dot:'#2864B0'},
  {id:'closure',   label:'Closure / Maintenance',     badge:'danger',  dot:'#C0362C'},
  {id:'holiday',   label:'Public holiday',            badge:'neutral', dot:'#8B9096'},
];
function calType(id){ return CAL_TYPES.find(t=>t.id===id) || CAL_TYPES[0]; }
function calTypeStyle(id){
  const map = {
    event:  {bg:'var(--success-soft)', fg:'var(--success)'},
    due:    {bg:'var(--warning-soft)', fg:'var(--warning)'},
    meeting:{bg:'var(--info-soft)',    fg:'var(--info)'},
    closure:{bg:'var(--danger-soft)',  fg:'var(--danger)'},
    holiday:{bg:'var(--paper)',        fg:'var(--ink-faint)'},
  };
  return map[id] || map.event;
}
const CalendarDB = (function(){
  function readRaw(){
    try{
      const raw = localStorage.getItem(CAL_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      console.warn('Calendar: could not read localStorage, starting fresh.', e);
      return null;
    }
  }
  function writeRaw(){
    try{
      localStorage.setItem(CAL_KEY, JSON.stringify(cache));
      return true;
    }catch(e){
      console.error('Calendar: could not write to localStorage.', e);
      toast('Could not save the calendar (storage full or disabled).');
      return false;
    }
  }
  let cache = readRaw();
  return {
    getOrSeed(seedFn){
      if(!cache || !Array.isArray(cache.events)){
        cache = {events: seedFn(), meta:{createdAt:new Date().toISOString()}};
        writeRaw();
      }
      return cache.events;
    },
    save(events){
      if(!cache) cache = {events, meta:{createdAt:new Date().toISOString()}};
      else cache.events = events;
      return writeRaw();
    },
  };
})();
function pad2(n){ return String(n).padStart(2,'0'); }
function toISODate(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function monthLabel(y,m){ return new Date(y,m,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}); }
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function seedCalendarEvents(){
  const today = new Date();
  const mk=(offsetDays,hh,mm,title,type,notes)=>{
    const d=new Date(today.getFullYear(), today.getMonth(), today.getDate()+offsetDays);
    return {id:'ev'+Math.random().toString(36).slice(2,9), date:toISODate(d),
      time:(hh==null?'':`${pad2(hh)}:${pad2(mm)}`), title, type, branchId:'all', notes:notes||''};
  };
  return [
    mk(-4, 10, 0, 'Branch managers sync', 'meeting', 'Quarterly review of loans and overdue trends'),
    mk(-2, null, null, 'Public holiday — all branches closed', 'holiday', ''),
    mk(1, 15, 0, "Storytime for kids", 'event', "Children's corner · ages 4–8"),
    mk(2, 9, 30, 'Overdue reminders batch', 'due', 'Automated reminder run for items 7+ days overdue'),
    mk(4, 17, 0, 'Book club: contemporary fiction', 'event', 'Meeting room B'),
    mk(6, 13, 0, 'HVAC maintenance', 'closure', 'Reading hall closed 1–4pm'),
    mk(9, 10, 0, 'New titles arrival — Fiction & Fantasy', 'event', ''),
    mk(13, 16, 0, 'Teen writing workshop', 'event', 'Registration required'),
    mk(17, 9, 0, 'Staff training: new circulation system', 'meeting', ''),
  ];
}
let calendarEvents = [];
let calendarState = { year: new Date().getFullYear(), month: new Date().getMonth() };
function buildCalendarCells(year,month){
  const first = new Date(year,month,1);
  const gridStart = new Date(year,month,1-first.getDay());
  const cells=[];
  for(let i=0;i<42;i++){
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate()+i);
    cells.push({date:d, inMonth:d.getMonth()===month});
  }
  return cells;
}
function chevronLeftIcon(){return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>`;}
function chevronRightIcon(){return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg>`;}
function pageCalendarCard(){
  const {year,month} = calendarState;
  const scopeId = dashboardBranchId;
  const cells = buildCalendarCells(year,month);
  const todayISO = toISODate(new Date());
  const visibleEvents = scopeId==='all' ? calendarEvents : calendarEvents.filter(e=>e.branchId==='all' || e.branchId===scopeId);
  const eventsByDate = {};
  visibleEvents.forEach(ev=>{ (eventsByDate[ev.date] = eventsByDate[ev.date] || []).push(ev); });
  Object.values(eventsByDate).forEach(list=>list.sort((a,b)=>(a.time||'').localeCompare(b.time||'')));
  const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `
  <div class="card calendar-card">
    <div class="cal-toolbar">
      <div class="cal-nav">
        <button class="icon-btn" id="calPrevBtn" aria-label="Previous month">${chevronLeftIcon()}</button>
        <div class="cal-month-label serif">${monthLabel(year,month)}</div>
        <button class="icon-btn" id="calNextBtn" aria-label="Next month">${chevronRightIcon()}</button>
      </div>
      <div class="cal-toolbar-actions">
        <button class="btn" id="calTodayBtn">Today</button>
        <button class="btn primary" id="calAddBtn">${plusIcon()}Add event</button>
      </div>
    </div>
    <div class="cal-legend">
      ${CAL_TYPES.map(t=>{const s=calTypeStyle(t.id); return `<span class="cal-legend-item" style="background:${s.bg};color:${s.fg};"><span class="cal-dot" style="background:${s.fg};"></span>${t.label}</span>`;}).join('')}
    </div>
    <div class="cal-grid cal-grid-head">
      ${dayNames.map((d,i)=>`<div class="cal-daylabel ${i===0||i===6?'weekend':''}">${d}</div>`).join('')}
    </div>
    <div class="cal-grid cal-grid-body">
      ${cells.map(c=>{
        const iso=toISODate(c.date);
        const dayEvents = eventsByDate[iso]||[];
        const isToday = iso===todayISO;
        const isWeekend = c.date.getDay()===0 || c.date.getDay()===6;
        const shown = dayEvents.slice(0,3);
        const more = dayEvents.length-shown.length;
        return `<div class="cal-cell ${c.inMonth?'':'other-month'} ${isToday?'today':''} ${isWeekend?'weekend':''}" data-cal-day="${iso}">
          <div class="cal-daynum"><span>${c.date.getDate()}</span></div>
          <div class="cal-events">
            ${shown.map(ev=>{const s=calTypeStyle(ev.type); return `<div class="cal-event-chip" data-cal-event="${ev.id}" style="background:${s.bg};color:${s.fg};">${ev.time?`<span class="cal-event-time">${ev.time}</span>`:`<span class="cal-dot" style="background:${s.fg};"></span>`}<span class="cal-event-title">${escapeHtml(ev.title)}</span></div>`;}).join('')}
            ${more>0?`<div class="cal-more">+${more} more</div>`:''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function bindCalendarWidget(){
  const prev=document.getElementById('calPrevBtn');
  const next=document.getElementById('calNextBtn');
  const todayBtn=document.getElementById('calTodayBtn');
  const addBtn=document.getElementById('calAddBtn');
  if(prev) prev.addEventListener('click',()=>{ calendarState.month--; if(calendarState.month<0){calendarState.month=11;calendarState.year--;} render(); });
  if(next) next.addEventListener('click',()=>{ calendarState.month++; if(calendarState.month>11){calendarState.month=0;calendarState.year++;} render(); });
  if(todayBtn) todayBtn.addEventListener('click',()=>{ const d=new Date(); calendarState.year=d.getFullYear(); calendarState.month=d.getMonth(); render(); });
  if(addBtn) addBtn.addEventListener('click',()=>{
    const now=new Date();
    const preset = (calendarState.year===now.getFullYear() && calendarState.month===now.getMonth())
      ? toISODate(now) : toISODate(new Date(calendarState.year, calendarState.month, 1));
    openEventForm(preset);
  });
  document.querySelectorAll('[data-cal-day]').forEach(cell=>cell.addEventListener('click',(e)=>{
    if(e.target.closest('[data-cal-event]')) return;
    openDayDrawer(cell.dataset.calDay);
  }));
  document.querySelectorAll('[data-cal-event]').forEach(chip=>chip.addEventListener('click',(e)=>{
    e.stopPropagation();
    const ev=calendarEvents.find(x=>x.id===chip.dataset.calEvent);
    if(ev) openEventForm(ev.date, ev.id);
  }));
}
function openDayDrawer(iso){
  const list = calendarEvents.filter(e=>e.date===iso).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const dateLabel = new Date(iso+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const drawer=document.getElementById('drawer');
  drawer.innerHTML=`
    <div class="drawer-head">
      <div>
        <div style="font-family:'Source Serif 4',serif;font-size:19px;font-weight:600;">${dateLabel}</div>
        <div style="font-size:12.5px;color:var(--ink-faint);margin-top:2px;">${list.length} event${list.length===1?'':'s'} · saved to this browser</div>
      </div>
      <button class="drawer-close" id="drawerClose">${closeIcon()}</button>
    </div>
    <div class="drawer-body">
      ${list.length ? list.map(ev=>{
        const t=calType(ev.type); const s=calTypeStyle(ev.type);
        return `<div class="cal-day-event-row" data-cal-edit="${ev.id}">
          <span class="cal-dot" style="background:${s.fg}"></span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:13.5px;">${escapeHtml(ev.title)}</div>
            <div style="font-size:12px;color:var(--ink-faint);">${ev.time?ev.time+' · ':''}${(ev.branchId && ev.branchId!=='all') ? branchById(ev.branchId).name+' · ' : 'All branches · '}${ev.notes?escapeHtml(ev.notes):''}</div>
          </div>
          <span class="badge ${t.badge}">${t.label}</span>
        </div>`;
      }).join('') : `<div style="padding:14px 0;color:var(--ink-faint);font-size:13px;">No events yet on this date.</div>`}
      <button class="btn primary" style="width:100%;margin-top:16px;" id="calAddForDayBtn">${plusIcon()}Add event on this day</button>
    </div>`;
  document.getElementById('calAddForDayBtn').addEventListener('click',()=>openEventForm(iso));
  drawer.querySelectorAll('[data-cal-edit]').forEach(row=>row.addEventListener('click',()=>{
    const ev=list.find(e=>e.id===row.dataset.calEdit);
    if(ev) openEventForm(ev.date, ev.id);
  }));
  openDrawer();
}
function openEventForm(dateIso, eventId){
  const existing = eventId ? calendarEvents.find(e=>e.id===eventId) : null;
  const drawer=document.getElementById('drawer');
  drawer.innerHTML=`
    <div class="drawer-head">
      <div>
        <div style="font-family:'Source Serif 4',serif;font-size:19px;font-weight:600;">${existing?'Edit event':'Add event'}</div>
        <div style="font-size:12.5px;color:var(--ink-faint);margin-top:2px;">Saved to this browser's local storage</div>
      </div>
      <button class="drawer-close" id="drawerClose">${closeIcon()}</button>
    </div>
    <div class="drawer-body">
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">Title</label>
      <input id="calEvTitle" class="filter-select" style="width:100%;margin-bottom:14px;" placeholder="e.g. Storytime for kids" value="${existing?escapeHtml(existing.title):''}">
      <div style="display:flex;gap:10px;">
        <div style="flex:1;">
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">Date</label>
          <input id="calEvDate" type="date" class="filter-select" style="width:100%;margin-bottom:14px;" value="${existing?existing.date:dateIso}">
        </div>
        <div style="flex:1;">
          <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">Time (optional)</label>
          <input id="calEvTime" type="time" class="filter-select" style="width:100%;margin-bottom:14px;" value="${existing?(existing.time||''):''}">
        </div>
      </div>
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">Type</label>
      <select id="calEvType" class="filter-select" style="width:100%;margin-bottom:14px;">
        ${CAL_TYPES.map(t=>`<option value="${t.id}" ${existing&&existing.type===t.id?'selected':''}>${t.label}</option>`).join('')}
      </select>
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">Branch</label>
      <select id="calEvBranch" class="filter-select" style="width:100%;margin-bottom:14px;">
        <option value="all" ${(!existing||existing.branchId==='all')?'selected':''}>All branches</option>
        ${BRANCHES.map(b=>`<option value="${b.id}" ${existing&&existing.branchId===b.id?'selected':''}>${b.name}</option>`).join('')}
      </select>
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">Notes (optional)</label>
      <textarea id="calEvNotes" class="filter-select" style="width:100%;margin-bottom:14px;min-height:70px;font-family:inherit;resize:vertical;">${existing?escapeHtml(existing.notes||''):''}</textarea>
      <button class="btn primary" style="width:100%;" id="calEvSave">Save event</button>
      ${existing?`<button class="btn" style="width:100%;margin-top:8px;color:var(--danger);" id="calEvDelete">Delete event</button>`:''}
    </div>`;
  document.getElementById('calEvSave').addEventListener('click',()=>{
    const title=document.getElementById('calEvTitle').value.trim();
    const date=document.getElementById('calEvDate').value;
    if(!title || !date){ toast('Title and date are required.'); return; }
    const time=document.getElementById('calEvTime').value;
    const type=document.getElementById('calEvType').value;
    const branchId=document.getElementById('calEvBranch').value;
    const notes=document.getElementById('calEvNotes').value.trim();
    if(existing){
      Object.assign(existing,{title,date,time,type,branchId,notes});
    }else{
      calendarEvents.push({id:'ev'+Date.now()+Math.random().toString(36).slice(2,6), title,date,time,type,branchId,notes});
    }
    CalendarDB.save(calendarEvents);
    const d=new Date(date+'T00:00:00');
    calendarState.year=d.getFullYear(); calendarState.month=d.getMonth();
    toast(existing?'Event updated':'Event added');
    closeDrawer();
    render();
  });
  if(existing){
    document.getElementById('calEvDelete').addEventListener('click',()=>{
      if(!confirm('Delete this event? This cannot be undone.')) return;
      calendarEvents = calendarEvents.filter(e=>e.id!==existing.id);
      CalendarDB.save(calendarEvents);
      toast('Event deleted');
      closeDrawer();
      render();
    });
  }
  openDrawer();
}

const ICONS = {
  dashboard:'<path d="M3 12l9-9 9 9M5 10v10h14V10"/>',
  circulation:'<path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>',
  catalogue:'<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  members:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  branches:'<path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
  inventory:'<path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12l8.73-5.04M12 22.08V12"/>',
  reservations:'<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>',
  fines:'<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>',
  events:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  staff:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  reports:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1"/>',
  analytics:'<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.32.22.66.24 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`;}

/* =========================================================
   DATA — loaded entirely from data/*.js under ./data/
   Each file just assigns its slice onto window.LUNA_DATA;
   plain <script> tags load them (see index.html), so this works
   straight from file:// with no server and no fetch()/CORS.
   No branch, book, member, or trend data is hardcoded here.
   ========================================================= */

// Populated by loadData() below. Declared here so every function in this
// file can close over them regardless of definition order.
let BRANCHES_SEED, BRANCHES, MEMBERS_SEED, members, catalogue, allCopies,
    CATEGORIES, MEMBERSHIP_TYPES, monthLabels, circulationTrend, overdueTrend,
    recentActivity, KPIS, totalMembers, activeMembers, reservationsCount;

async function loadData(){
  const store = window.LUNA_DATA;
  const need = ['branches','catalogue','copies','members','circulation','config'];
  const missing = need.filter(k => !store || store[k]===undefined);
  if(missing.length){
    throw new Error(`Missing data for: ${missing.join(', ')}. Make sure data/branches.js, data/catalogue.js, data/copies.js, data/members.js, data/circulation.js and data/config.js are all loaded via <script> tags in index.html before script.js.`);
  }

  BRANCHES_SEED = store.branches;
  catalogue = store.catalogue;
  allCopies = store.copies;
  MEMBERS_SEED = store.members;
  monthLabels = store.circulation.monthLabels;
  circulationTrend = store.circulation.circulationTrend;
  overdueTrend = store.circulation.overdueTrend;
  CATEGORIES = store.config.categories;
  MEMBERSHIP_TYPES = store.config.membershipTypes;
  reservationsCount = store.config.reservationsCount;

  // Branches and members are the two entities the app lets you edit, so
  // they're mirrored into the local JSON DB (localStorage). First run
  // seeds it from the fetched JSON; later runs load whatever was saved.
  BRANCHES = LocalDB.getOrSeedBranches(BRANCHES_SEED);
  members = LocalDB.getOrSeedMembers(MEMBERS_SEED);

  // Per-branch flavor stats not tracked in the JSON DB (loans90d, fines,
  // growth) — deterministic pseudo-random, seeded the same way the
  // original in-file generator was, then merged onto whatever branch
  // records came out of the local DB / import.
  BRANCHES.forEach((br,i)=>{
    if(br.loans90d===undefined) br.loans90d = 2200 + i*310 + R(-150,220);
    if(br.finesCollected===undefined) br.finesCollected = R(380,1450);
    if(br.circGrowth===undefined) br.circGrowth = round1((rnd()*16)-4);
  });
  refreshBranchCounts();

  recentActivity = Array.from({length:8},()=>{
    const m = pick(members), b = pick(catalogue), br = pick(BRANCHES);
    const type = pick(['checkout','checkout','return','renewal','reservation']);
    return {member:m.name, book:b.title, branch:br.name, type, mins: R(2,240)};
  });

  totalMembers = members.length*11; // scale to represent org-wide (96 sample * ~11 => ~1050)
  activeMembers = Math.round(totalMembers*0.81);
  const totalItems = allCopies.length*4.6; // scaled to "hundreds/thousands"
  const itemsBorrowed = allCopies.filter(c=>c.status==='borrowed'||c.status==='overdue').length*4.6;
  const itemsOverdue = allCopies.filter(c=>c.status==='overdue').length*4.6;
  const finesCollected = BRANCHES.reduce((s,b)=>s+b.finesCollected,0);

  KPIS = [
    {label:'Total Members', value: Math.round(totalMembers), fmt:'int', prev: Math.round(totalMembers*0.947), spark:[6,7,6,8,9,8,10,9,11,10,12,13]},
    {label:'Active Members', value: Math.round(activeMembers), fmt:'int', prev: Math.round(activeMembers*0.965), spark:[8,7,9,8,10,9,10,11,10,12,11,13]},
    {label:'Catalogue Items', value: Math.round(totalItems), fmt:'int', prev: Math.round(totalItems*0.988), spark:[5,5,6,6,6,7,7,7,8,8,8,9]},
    {label:'Items Borrowed', value: Math.round(itemsBorrowed), fmt:'int', prev: Math.round(itemsBorrowed*0.923), spark:circulationTrend.slice(-8).map(v=>v/400)},
    {label:'Items Overdue', value: Math.round(itemsOverdue), fmt:'int', prev: Math.round(itemsOverdue*0.86), spark:overdueTrend.slice(-8), invert:true},
    {label:'Reservations', value: reservationsCount, fmt:'int', prev: Math.round(reservationsCount*1.04), spark:[9,10,8,9,11,10,12,11]},
    {label:'Fines Collected', value: finesCollected, fmt:'money', prev: Math.round(finesCollected*0.91), spark:[4,5,5,6,6,7,7,8]},
  ];
}

/* =========================================================
   NAV / ROUTER
   ========================================================= */
const NAV = [
  {id:'dashboard', label:'Dashboard', icon:'dashboard'},
  {id:'circulation', label:'Circulation', icon:'circulation'},
  {id:'catalogue', label:'Catalogue', icon:'catalogue'},
  {id:'members', label:'Members', icon:'members'},
  {id:'branches', label:'Branches', icon:'branches'},
  {id:'inventory', label:'Inventory', icon:'inventory'},
  {id:'reservations', label:'Reservations', icon:'reservations'},
  {id:'fines', label:'Fines & Payments', icon:'fines'},
  {id:'events', label:'Events & Activities', icon:'events'},
  {id:'staff', label:'Staff', icon:'staff'},
  {id:'analytics', label:'Analytics & Reports', icon:'analytics'},
  {id:'settings', label:'Settings', icon:'settings'},
];
let currentPage='dashboard';
let dashboardBranchId='all';
let catalogueState={search:'',category:'All',status:'All',page:1};
let membersState={search:'',status:'All',page:1};
let branchesState={search:''};
let checkoutState={step:1, member:null, book:null};

function renderNav(){
  const el=document.getElementById('navList');
  el.innerHTML = NAV.map(n=>`
    <button class="navitem ${n.id===currentPage?'active':''}" data-nav="${n.id}">
      ${icon(n.icon)}<span class="navlabel">${n.label}</span>
    </button>`).join('');
  el.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.nav)));
}
function goTo(page){
  currentPage=page;
  document.getElementById('pageTitle').textContent = NAV.find(n=>n.id===page).label;
  renderNav();
  renderPage();
  window.scrollTo(0,0);
}
document.getElementById('collapseBtn').addEventListener('click',()=>{
  document.getElementById('sidebar').classList.toggle('collapsed');
});

function renderBranchFilter(){
  const sel=document.getElementById('branchFilter');
  sel.innerHTML = `<option value="all">All branches</option>` + BRANCHES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  if(dashboardBranchId!=='all' && !BRANCHES.some(b=>b.id===dashboardBranchId)) dashboardBranchId='all';
  sel.value = dashboardBranchId;
}

/* =========================================================
   HELPERS
   ========================================================= */
function fmtVal(v,fmt){ if(fmt==='money') return '$'+v.toLocaleString(); return v.toLocaleString(); }
function trendBlock(cur,prev,invert){
  if(!prev) prev = cur || 1;
  const delta = ((cur-prev)/prev*100);
  const up = invert ? delta<0 : delta>0;
  const cls = Math.abs(delta)<0.5 ? 'flat' : (up?'up':'down');
  const arrow = cls==='flat'?'→':(up?'↑':'↓');
  return `<div class="kpi-trend ${cls}">${arrow} ${Math.abs(delta).toFixed(1)}% <span class="prev">vs previous period</span></div>`;
}
function miniSpark(canvasId, data, color){
  requestAnimationFrame(()=>{
    const ctx=document.getElementById(canvasId);
    if(!ctx) return;
    new Chart(ctx,{type:'line',data:{labels:data.map((_,i)=>i),datasets:[{data,borderColor:color,borderWidth:1.6,pointRadius:0,tension:.35,fill:true,backgroundColor:color+'18'}]},
      options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{x:{display:false},y:{display:false}},elements:{point:{radius:0}}}});
  });
}
function statusBadge(status){
  const map={
    available:['success','Available'],borrowed:['info','Borrowed'],overdue:['danger','Overdue'],
    reserved:['warning','Reserved'],repair:['neutral','Under repair'],lost:['danger','Lost'],
    active:['success','Active'],expiring:['warning','Expiring soon'],suspended:['danger','Suspended'],
  };
  const [cls,label]=map[status]||['neutral',status];
  return `<span class="badge ${cls}">${label}</span>`;
}
function toast(msg){
  const wrap=document.getElementById('toastWrap');
  const t=document.createElement('div');
  t.className='toast';
  t.innerHTML=`<span class="dotok"></span>${msg}`;
  wrap.appendChild(t);
  setTimeout(()=>t.remove(),3600);
}
function bookById(id){return catalogue.find(b=>b.id===id);}
function branchById(id){return BRANCHES.find(b=>b.id===id) || {id, code:'—', name:'Unknown branch', address:'', phone:'', hours:'', manager:''};}
function refreshBranchCounts(){
  BRANCHES.forEach(br=>{
    br.members = members.filter(m=>m.branchId===br.id).length;
    br.copies = allCopies.filter(c=>c.branchId===br.id).length;
    br.borrowed = allCopies.filter(c=>c.branchId===br.id && (c.status==='borrowed'||c.status==='overdue')).length;
    br.overdue = allCopies.filter(c=>c.branchId===br.id && c.status==='overdue').length;
    if(br.loans90d===undefined) br.loans90d = 0;
    if(br.finesCollected===undefined) br.finesCollected = 0;
    if(br.circGrowth===undefined) br.circGrowth = 0;
  });
}
function refreshMemberKPIs(){
  totalMembers = members.length*11;
  activeMembers = Math.round(totalMembers*0.81);
  const kTot = KPIS.find(k=>k.label==='Total Members');
  const kAct = KPIS.find(k=>k.label==='Active Members');
  if(kTot) kTot.value = Math.round(totalMembers);
  if(kAct) kAct.value = activeMembers;
}

/* =========================================================
   DASHBOARD — BRANCH SCOPING
   Everything below derives a branch-specific view from the same
   underlying data used for the network-wide dashboard, so
   picking a branch in the topbar re-scopes KPIs, charts and
   tables instead of just filtering a label.
   ========================================================= */
function branchScopedKPIs(branchId){
  if(branchId==='all') return KPIS;
  const br = branchById(branchId);
  const memberFactor = members.length ? members.filter(m=>m.branchId===branchId).length/members.length : 0;
  const copiesAtBranch = allCopies.filter(c=>c.branchId===branchId);
  const rawVals = [
    Math.round(totalMembers*memberFactor),
    Math.round(activeMembers*memberFactor),
    Math.round(copiesAtBranch.length*4.6),
    Math.round(copiesAtBranch.filter(c=>c.status==='borrowed'||c.status==='overdue').length*4.6),
    Math.round(copiesAtBranch.filter(c=>c.status==='overdue').length*4.6),
    Math.round(reservationsCount*memberFactor),
    br.finesCollected,
  ];
  return KPIS.map((k,i)=>{
    const factor = k.value ? rawVals[i]/k.value : 0;
    return {...k, value:rawVals[i], prev:Math.max(rawVals[i]?1:0, Math.round(k.prev*factor)), spark:k.spark.map(v=>+(v*factor).toFixed(2))};
  });
}
function mostBorrowedForScope(branchId, n){
  if(branchId==='all') return [...catalogue].sort((a,b)=>b.loans90d-a.loans90d).slice(0,n);
  return catalogue.map(b=>{
    const copiesHere = b.branchDist.filter(id=>id===branchId).length;
    if(!copiesHere) return null;
    return {...b, loans90d:Math.round(b.loans90d*(copiesHere/b.branchDist.length))};
  }).filter(Boolean).sort((a,b)=>b.loans90d-a.loans90d).slice(0,n);
}
let _catTotalsCache=null;
function computeCatTotals(branchId){
  if(branchId==='all'){
    if(_catTotalsCache) return _catTotalsCache;
    _catTotalsCache = CATEGORIES.map(c=>({cat:c,total:catalogue.filter(b=>b.category===c).reduce((s,b)=>s+b.loans90d,0)})).sort((a,b)=>b.total-a.total).slice(0,7);
    return _catTotalsCache;
  }
  return CATEGORIES.map(c=>{
    const total = catalogue.filter(b=>b.category===c).reduce((s,b)=>{
      const frac = b.branchDist.filter(id=>id===branchId).length/(b.branchDist.length||1);
      return s + b.loans90d*frac;
    },0);
    return {cat:c, total:Math.round(total)};
  }).sort((a,b)=>b.total-a.total).slice(0,7);
}
function branchCirculationSeries(branchId){
  if(branchId==='all') return {circ:circulationTrend, overdue:overdueTrend};
  const br = branchById(branchId);
  const networkLoans = BRANCHES.reduce((s,b)=>s+b.loans90d,0) || 1;
  const shareFactor = br.loans90d/networkLoans;
  const circ = circulationTrend.map(v=>Math.round(v*shareFactor));
  const branchRate = br.copies ? (br.overdue/br.copies*100) : overdueTrend[overdueTrend.length-1];
  const rateFactor = overdueTrend[overdueTrend.length-1] ? branchRate/overdueTrend[overdueTrend.length-1] : 1;
  const overdue = overdueTrend.map(v=>round1(v*rateFactor));
  return {circ, overdue};
}

/* =========================================================
   PAGE: DASHBOARD
   ========================================================= */
function pageDashboard(){
  const scopeId = dashboardBranchId;
  const scopedBranch = scopeId==='all' ? null : branchById(scopeId);
  const kpis = branchScopedKPIs(scopeId);
  const mostBorrowed = mostBorrowedForScope(scopeId, 6);
  const overdueByBranch = scopedBranch ? [{name:scopedBranch.name, overdue:scopedBranch.overdue}] : BRANCHES.map(b=>({name:b.name, overdue:b.overdue}));
  const overdueByAge = [{label:'1–7 days',v:38},{label:'8–14 days',v:24},{label:'15–30 days',v:17},{label:'30+ days',v:9}];
  const scopeSuffix = scopedBranch ? ` — ${scopedBranch.name}` : '';

  return `
  <div class="story-label">How are we doing${scopeSuffix}</div>
  ${scopedBranch ? `<div style="margin:-4px 0 14px;"><span class="badge info">Showing ${scopedBranch.name} only</span></div>` : ''}
  <div class="kpi-row">
    ${kpis.map((k,i)=>`
      <div class="kpi-card">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value tnum">${fmtVal(k.value,k.fmt)}</div>
        ${trendBlock(k.value,k.prev,k.invert)}
        <div class="spark"><canvas id="spark${i}"></canvas></div>
      </div>`).join('')}
  </div>

  <div class="story-label">What is changing</div>
  <div class="grid-2">
    <div class="card">
      <div class="card-head"><div><div class="card-title">Circulation trend</div><div class="card-sub">Items borrowed vs. overdue rate, last 12 months${scopeSuffix}</div></div>
        <div style="display:flex;gap:14px;font-size:11.5px;color:var(--ink-faint);">
          <span style="display:flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:#145C52;display:inline-block;"></span>Borrowed</span>
          <span style="display:flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:#B7791F;display:inline-block;"></span>Overdue %</span>
        </div>
      </div>
      <div style="height:230px;"><canvas id="circTrendChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><div><div class="card-title">Popular categories</div><div class="card-sub">Share of loans, last 90 days${scopeSuffix}</div></div></div>
      <div style="position:relative;height:230px;">
        <canvas id="catDonut"></canvas>
        <div id="catDonutCenter" style="position:absolute;top:50%;left:31%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
          <div class="tnum" style="font-size:20px;font-weight:600;line-height:1;"></div>
          <div style="font-size:10.5px;color:var(--ink-faint);margin-top:4px;">loans</div>
        </div>
      </div>
    </div>
  </div>

  <div class="story-label">Where is it happening</div>
  <div class="grid-2">
    <div class="card">
      <div class="card-head"><div><div class="card-title">Branch performance</div><div class="card-sub">${scopedBranch ? `${scopedBranch.name} highlighted against the network` : 'Loans in the last 90 days, coloured by growth'}</div></div></div>
      <div style="height:${Math.max(140, BRANCHES.length*46)}px;"><canvas id="branchBar"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><div><div class="card-title">Most borrowed items</div><div class="card-sub">Ranked by loans this period${scopeSuffix}</div></div></div>
      <table><thead><tr><th>#</th><th>Title</th><th>Category</th><th>Loans</th></tr></thead><tbody>
      ${mostBorrowed.length ? mostBorrowed.map((b,i)=>`<tr>
        <td><span class="rank">${i+1}</span></td>
        <td><div class="title-cell">${b.title}</div><div class="sub-cell">${b.author}</div></td>
        <td>${b.category}</td>
        <td class="tnum">${b.loans90d}</td>
      </tr>`).join('') : `<tr><td colspan="4"><div style="padding:20px 0;text-align:center;color:var(--ink-faint);font-size:13px;">No copies of any title are held at this branch.</div></td></tr>`}
      </tbody></table>
    </div>
  </div>

  <div class="story-label">What needs attention</div>
  <div class="grid-3">
    <div class="card">
      <div class="card-title" style="margin-bottom:12px;">Overdue by branch</div>
      ${overdueByBranch.map(o=>`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-size:13px;">${o.name}</span>
          <span class="badge ${o.overdue>10?'danger':'warning'}">${o.overdue} items</span>
        </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:12px;">Overdue by age</div>
      ${overdueByAge.map(o=>`
        <div style="margin-bottom:11px;">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;"><span>${o.label}</span><span class="tnum">${o.v}%</span></div>
          <div style="height:6px;background:var(--paper);border-radius:4px;overflow:hidden;"><div style="width:${o.v*2.6}%;height:100%;background:var(--warning);"></div></div>
        </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:12px;">Membership trend</div>
      <div style="height:70px;"><canvas id="memberSpark"></canvas></div>
      <div style="display:flex;justify-content:space-between;margin-top:14px;font-size:12px;">
        <div><div class="tnum" style="font-weight:600;font-size:15px;">+${R(38,64)}</div><div style="color:var(--ink-faint);">New this month</div></div>
        <div><div class="tnum" style="font-weight:600;font-size:15px;color:var(--danger);">${R(6,14)}</div><div style="color:var(--ink-faint);">Expired</div></div>
      </div>
    </div>
  </div>

  <div class="story-label">What management should know</div>
  <div class="card" style="border-left:3px solid var(--teal);">
    <div class="card-title" style="margin-bottom:10px;">Key insight</div>
    <p style="margin:0 0 8px;font-size:13.5px;line-height:1.6;color:var(--ink);">
      ${scopedBranch ? dashboardBranchInsight(scopedBranch, kpis) : dashboardNetworkInsight(kpis)}
    </p>
    <button class="btn primary" data-nav="analytics" onclick="goTo('analytics')">Generate monthly report</button>
  </div>

  <div class="story-label">Activity heatmap</div>
  <div class="card">
    <div class="card-head"><div><div class="card-title">Borrowing activity</div><div class="card-sub">By day and hour, last 30 days</div></div></div>
    <div id="heatmapWrap"></div>
  </div>

  <div class="story-label">Library calendar${scopeSuffix}</div>
  ${pageCalendarCard()}
  `;
}
function trendPct(cur,prev){ if(!prev) return '0.0'; return Math.abs(((cur-prev)/prev*100)).toFixed(1); }
function dashboardNetworkInsight(kpis){
  const top=[...BRANCHES].sort((a,b)=>b.circGrowth-a.circGrowth)[0];
  return `Circulation is up <strong class="tnum">${trendPct(kpis[3].value,kpis[3].prev)}%</strong> versus the previous period, led by
    ${top.name}, where loans grew fastest.
    Fiction and Fantasy account for the largest share of the increase. At the same time, the overdue rate has
    risen alongside circulation growth — worth a look before it becomes a trend, particularly at branches with
    overdue counts above 10 items.`;
}
function dashboardBranchInsight(br, kpis){
  const networkLoans = BRANCHES.reduce((s,b)=>s+b.loans90d,0) || 1;
  const share = (br.loans90d/networkLoans*100).toFixed(1);
  const networkAvgOverdue = BRANCHES.reduce((s,b)=>s+b.overdue,0)/BRANCHES.length;
  const overdueVsAvg = br.overdue - networkAvgOverdue;
  return `<strong>${br.name}</strong> logged ${br.loans90d.toLocaleString()} loans in the last 90 days —
    <strong class="tnum">${share}%</strong> of network-wide volume — with circulation
    ${br.circGrowth>=0?'up':'down'} <strong class="tnum">${Math.abs(br.circGrowth)}%</strong> versus the previous period.
    It currently has ${br.overdue} overdue item${br.overdue===1?'':'s'}, which is
    ${Math.abs(overdueVsAvg)<0.5?'in line with':(overdueVsAvg>0?'above':'below')} the network average of ${networkAvgOverdue.toFixed(1)} per branch.
    Fines collected here total <strong class="tnum">$${br.finesCollected.toLocaleString()}</strong> this period.`;
}

function mountDashboardCharts(){
  if(typeof Chart==='undefined'){
    console.error('LUNa: Chart.js did not load (vendor/chart.umd.min.js missing or blocked).');
    document.querySelectorAll('#content canvas').forEach(cv=>{
      const box=cv.closest('.card, .kpi-card, .spark');
      if(box) box.insertAdjacentHTML('beforeend','<div style="font-size:11.5px;color:var(--warning);margin-top:6px;">Chart library not found — see vendor/README.txt</div>');
    });
    return;
  }
  const scopeId = dashboardBranchId;
  const kpis = branchScopedKPIs(scopeId);
  kpis.forEach((k,i)=>miniSpark('spark'+i, k.spark, k.invert?'#B7791F':'#145C52'));
  miniSpark('memberSpark',[820,845,860,880,905,918,940,955,970,990,1005,1020],'#145C52');

  const tooltipTheme = {
    backgroundColor:'#16232E', titleColor:'#fff', bodyColor:'#C9D3DA',
    padding:10, cornerRadius:7, displayColors:false,
    titleFont:{family:'Inter', size:12, weight:'600'}, bodyFont:{family:'IBM Plex Mono', size:12},
  };

  const {circ:circSeries, overdue:overdueSeries} = branchCirculationSeries(scopeId);
  const circCtx = document.getElementById('circTrendChart').getContext('2d');
  const circGradient = circCtx.createLinearGradient(0,0,0,220);
  circGradient.addColorStop(0,'#145C5240');
  circGradient.addColorStop(1,'#145C5203');
  new Chart(circCtx,{
    type:'line',
    data:{labels:monthLabels, datasets:[
      {label:'Items borrowed', data:circSeries, borderColor:'#145C52', backgroundColor:circGradient, fill:true, tension:.35, pointRadius:0, pointHoverRadius:5, pointHoverBackgroundColor:'#145C52', pointHitRadius:12, borderWidth:2.4, yAxisID:'y'},
      {label:'Overdue %', data:overdueSeries, borderColor:'#B7791F', backgroundColor:'#B7791F', borderDash:[4,3], fill:false, tension:.35, pointRadius:0, pointHoverRadius:4, pointHoverBackgroundColor:'#B7791F', pointHitRadius:12, borderWidth:1.8, yAxisID:'y1'},
    ]},
    options:{responsive:true, maintainAspectRatio:false, interaction:{mode:'index', intersect:false},
      plugins:{legend:{display:false}, tooltip:{...tooltipTheme,
        callbacks:{ label:(ctx)=> ctx.dataset.label==='Overdue %' ? `Overdue: ${ctx.parsed.y}%` : `Borrowed: ${ctx.parsed.y.toLocaleString()}` }
      }},
      scales:{
        y:{position:'left', grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10.5}, callback:v=>v.toLocaleString()}},
        y1:{position:'right', grid:{display:false}, ticks:{font:{family:'IBM Plex Mono',size:10.5}, callback:v=>v+'%'}, suggestedMin:0},
        x:{grid:{display:false}, ticks:{font:{size:11}}}
      }}
  });

  const catColors=['#145C52','#2864B0','#B7791F','#1E8A5D','#8B5CF6','#C0362C','#5B6167'];
  const catStats = computeCatTotals(scopeId);
  const catLabels = catStats.map(c=>c.cat);
  const catData = catStats.map(c=>c.total);
  const catTotalSum = catData.reduce((s,v)=>s+v,0);
  document.querySelector('#catDonutCenter .tnum').textContent = catTotalSum.toLocaleString();
  new Chart(document.getElementById('catDonut'),{
    type:'doughnut',
    data:{labels:catLabels, datasets:[{data:catData, backgroundColor:catColors, borderWidth:2, borderColor:'#fff', hoverOffset:6}]},
    options:{responsive:true, maintainAspectRatio:false, cutout:'68%',
      plugins:{
        legend:{position:'right', labels:{boxWidth:9, font:{size:11}, usePointStyle:true, pointStyle:'circle'}},
        tooltip:{...tooltipTheme, callbacks:{label:(ctx)=>{
          const pct = catTotalSum ? ((ctx.parsed/catTotalSum)*100).toFixed(1) : '0.0';
          return `${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
        }}}
      }}
  });

  const branchGrowthColor = gr => gr>3 ? '#1E8A5D' : gr<0 ? '#C0362C' : '#B7791F';
  const branchBarColors = BRANCHES.map(b => scopeId==='all' ? branchGrowthColor(b.circGrowth) : (b.id===scopeId ? '#145C52' : '#DEDEDA'));
  new Chart(document.getElementById('branchBar'),{
    type:'bar',
    data:{labels:BRANCHES.map(b=>b.name), datasets:[{
      data:BRANCHES.map(b=>b.loans90d),
      backgroundColor:branchBarColors,
      borderRadius:6, maxBarThickness:26,
    }]},
    options:{indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{...tooltipTheme,
        callbacks:{
          label:(ctx)=>`${ctx.parsed.x.toLocaleString()} loans`,
          afterLabel:(ctx)=>{ const g=BRANCHES[ctx.dataIndex].circGrowth; return `${g>0?'+':''}${g}% vs previous period`; }
        }
      }},
      scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10.5}}}, y:{grid:{display:false}, ticks:{font:{size:12}}}}}
  });

  // heatmap
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let html='';
  html += `<div class="hlabel"></div>`+Array.from({length:24},(_,h)=> h%3===0 ? `<div style="font-size:9px;text-align:center;">${h}</div>` : `<div></div>`).join('');
  const teal=[20,92,82];
  days.forEach((d,di)=>{
    html+=`<div class="heatmap-row" style="display:contents;">`;
    html+=`<div class="hlabel">${d}</div>`;
    for(let h=0; h<24; h++){
      let intensity = 0;
      if(h>=9 && h<=19){
        intensity = Math.max(0, Math.sin((h-9)/10*Math.PI)) * (di<5?1:0.7) * (0.5+rnd()*0.6);
      }
      const alpha = Math.min(1, intensity);
      const bg = alpha<0.06 ? 'var(--paper)' : `rgba(${teal[0]},${teal[1]},${teal[2]},${0.12+alpha*0.75})`;
      html+=`<div class="hcell" style="background:${bg}" title="${d} ${h}:00 — ${Math.round(alpha*140)} loans"></div>`;
    }
    html+=`</div>`;
  });
  document.getElementById('heatmapWrap').innerHTML = `<div class="heatmap">${html}</div>`;
}

/* =========================================================
   PAGE: CATALOGUE
   ========================================================= */
function pageCatalogue(){
  const s=catalogueState;
  let rows = catalogue.filter(b=>{
    const matchSearch = !s.search || (b.title.toLowerCase().includes(s.search.toLowerCase()) || b.author.toLowerCase().includes(s.search.toLowerCase()));
    const matchCat = s.category==='All' || b.category===s.category;
    return matchSearch && matchCat;
  });
  const pageSize=10, totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
  s.page=Math.min(s.page,totalPages);
  const pageRows=rows.slice((s.page-1)*pageSize, s.page*pageSize);

  return `
  <div class="page-head">
    <div><h2>Catalogue</h2><p>${catalogue.length} titles · ${allCopies.length} copies across ${BRANCHES.length} branches</p></div>
    <button class="btn primary">${plusIcon()}Add item</button>
  </div>
  <div class="toolbar">
    <div class="search-box">${searchIcon()}<input id="catSearch" placeholder="Search title or author…" value="${s.search}"></div>
    <select class="filter-select" id="catCategory">
      <option ${s.category==='All'?'selected':''}>All</option>
      ${CATEGORIES.map(c=>`<option ${s.category===c?'selected':''}>${c}</option>`).join('')}
    </select>
    <div class="toolbar-spacer"></div>
    <span style="font-size:12.5px;color:var(--ink-faint);">${rows.length} results</span>
  </div>
  <div class="card" style="padding:0;">
    <table>
      <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Year</th><th>Copies</th><th>90d loans</th><th>Status</th></tr></thead>
      <tbody>
      ${pageRows.length ? pageRows.map(b=>{
        const copies = allCopies.filter(c=>c.bookId===b.id);
        const avail = copies.filter(c=>c.status==='available').length;
        const status = avail>0 ? 'available' : (copies.some(c=>c.status==='overdue')?'overdue':'borrowed');
        return `<tr>
          <td class="title-cell">${b.title}</td>
          <td class="sub-cell">${b.author}</td>
          <td>${b.category}</td>
          <td class="tnum">${b.year}</td>
          <td class="tnum">${avail}/${b.copies}</td>
          <td class="tnum">${b.loans90d}</td>
          <td>${statusBadge(status)}</td>
        </tr>`;
      }).join('') : `<tr><td colspan="7"><div style="padding:26px 0;text-align:center;color:var(--ink-faint);font-size:13px;">No titles match your search. Try a different keyword or clear filters.</div></td></tr>`}
      </tbody>
    </table>
    ${pageRows.length ? `<div class="pagerow" style="padding:14px 20px;">
      <span>Page ${s.page} of ${totalPages}</span>
      <div class="pager">
        ${Array.from({length:totalPages},(_,i)=>`<button class="${s.page===i+1?'active':''}" data-page="${i+1}">${i+1}</button>`).join('')}
      </div>
    </div>` : ''}
  </div>
  `;
}
function bindCataloguePage(){
  document.getElementById('catSearch').addEventListener('input',e=>{catalogueState.search=e.target.value; catalogueState.page=1; render();});
  document.getElementById('catCategory').addEventListener('change',e=>{catalogueState.category=e.target.value; catalogueState.page=1; render();});
  document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{catalogueState.page=+b.dataset.page; render();}));
}

/* =========================================================
   PAGE: MEMBERS
   ========================================================= */
function pageMembers(){
  const s=membersState;
  let rows = members.filter(m=>{
    const matchSearch = !s.search || m.name.toLowerCase().includes(s.search.toLowerCase()) || m.memberNo.toLowerCase().includes(s.search.toLowerCase());
    const matchStatus = s.status==='All' || m.status===s.status;
    return matchSearch && matchStatus;
  });
  const pageSize=10, totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
  s.page=Math.min(s.page,totalPages);
  const pageRows=rows.slice((s.page-1)*pageSize, s.page*pageSize);

  return `
  <div class="page-head">
    <div><h2>Members</h2><p>${members.length} member records shown (sample of ${Math.round(totalMembers)} org-wide)</p></div>
    <button class="btn primary" id="registerMemberBtn">${plusIcon()}Register member</button>
  </div>
  <div class="toolbar">
    <div class="search-box">${searchIcon()}<input id="memSearch" placeholder="Search name or member no…" value="${s.search}"></div>
    <select class="filter-select" id="memStatus">
      ${['All','active','expiring','suspended'].map(v=>`<option ${s.status===v?'selected':''}>${v}</option>`).join('')}
    </select>
    <div class="toolbar-spacer"></div>
    <span style="font-size:12.5px;color:var(--ink-faint);">${rows.length} results</span>
  </div>
  <div class="card" style="padding:0;">
    <table>
      <thead><tr><th>Member</th><th>Type</th><th>Home branch</th><th>Active loans</th><th>Outstanding fines</th><th>Status</th></tr></thead>
      <tbody>
      ${pageRows.length ? pageRows.map(m=>`
        <tr style="cursor:pointer;" data-member="${m.id}">
          <td><div class="title-cell">${m.name}</div><div class="sub-cell">${m.memberNo}</div></td>
          <td>${m.type}</td>
          <td>${branchById(m.branchId).code}</td>
          <td class="tnum">${m.activeLoans}</td>
          <td class="tnum">${m.outstandingFines? '$'+m.outstandingFines : '—'}</td>
          <td>${statusBadge(m.status)}</td>
        </tr>`).join('') : `<tr><td colspan="6"><div style="padding:26px 0;text-align:center;color:var(--ink-faint);font-size:13px;">No members match your search.</div></td></tr>`}
      </tbody>
    </table>
    ${pageRows.length ? `<div class="pagerow" style="padding:14px 20px;">
      <span>Page ${s.page} of ${totalPages}</span>
      <div class="pager">${Array.from({length:totalPages},(_,i)=>`<button class="${s.page===i+1?'active':''}" data-page="${i+1}">${i+1}</button>`).join('')}</div>
    </div>` : ''}
  </div>
  `;
}
function bindMembersPage(){
  document.getElementById('memSearch').addEventListener('input',e=>{membersState.search=e.target.value; membersState.page=1; render();});
  document.getElementById('memStatus').addEventListener('change',e=>{membersState.status=e.target.value; membersState.page=1; render();});
  document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{membersState.page=+b.dataset.page; render();}));
  document.querySelectorAll('[data-member]').forEach(tr=>tr.addEventListener('click',()=>openMemberDrawer(tr.dataset.member)));
  const regBtn=document.getElementById('registerMemberBtn');
  if(regBtn) regBtn.addEventListener('click', openRegisterMemberDrawer);
}
function openMemberDrawer(id){
  const m=members.find(x=>x.id===id);
  if(!m) return;
  const drawer=document.getElementById('drawer');
  const nextStatus = m.status==='suspended' ? 'active' : 'suspended';
  drawer.innerHTML=`
    <div class="drawer-head">
      <div>
        <div style="font-family:'Source Serif 4',serif;font-size:19px;font-weight:600;">${m.name}</div>
        <div style="font-size:12.5px;color:var(--ink-faint);margin-top:2px;">${m.memberNo} · ${m.type} member</div>
      </div>
      <button class="drawer-close" id="drawerClose">${closeIcon()}</button>
    </div>
    <div class="drawer-body">
      <div style="margin-bottom:8px;">${statusBadge(m.status)}</div>
      <div class="field-row"><span class="k">Email</span><span class="v">${m.email}</span></div>
      <div class="field-row"><span class="k">Home branch</span><span class="v">${branchById(m.branchId).name}</span></div>
      <div class="field-row"><span class="k">Registered</span><span class="v">${m.registered}</span></div>
      <div class="field-row"><span class="k">Active loans</span><span class="v tnum">${m.activeLoans}</span></div>
      <div class="field-row"><span class="k">Lifetime loans</span><span class="v tnum">${m.lifetimeLoans}</span></div>
      <div class="field-row"><span class="k">Outstanding fines</span><span class="v tnum" style="color:${m.outstandingFines?'var(--danger)':'inherit'}">${m.outstandingFines? '$'+m.outstandingFines : '$0'}</span></div>
      <div style="display:flex;gap:8px;margin-top:20px;">
        <button class="btn primary" style="flex:1;">View loans</button>
        <button class="btn" style="flex:1;">Record payment</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn" style="flex:1;" id="memToggleStatus">${nextStatus==='suspended'?'Suspend member':'Reactivate member'}</button>
        <button class="btn" style="flex:1;color:var(--danger);" id="memDelete">Delete member</button>
      </div>
    </div>`;
  document.getElementById('memToggleStatus').addEventListener('click',()=>{
    m.status = nextStatus;
    LocalDB.saveMembers(members);
    toast(`${m.name} marked as ${nextStatus}`);
    closeDrawer();
    render();
  });
  document.getElementById('memDelete').addEventListener('click',()=>{
    if(!confirm(`Remove ${m.name} from the local database? This cannot be undone.`)) return;
    members = members.filter(x=>x.id!==id);
    LocalDB.saveMembers(members);
    refreshBranchCounts();
    refreshMemberKPIs();
    toast(`${m.name} removed`);
    closeDrawer();
    render();
  });
  openDrawer();
}
function openRegisterMemberDrawer(){
  const drawer=document.getElementById('drawer');
  drawer.innerHTML=`
    <div class="drawer-head">
      <div>
        <div style="font-family:'Source Serif 4',serif;font-size:19px;font-weight:600;">Register member</div>
        <div style="font-size:12.5px;color:var(--ink-faint);margin-top:2px;">Saved to the local JSON database</div>
      </div>
      <button class="drawer-close" id="drawerClose">${closeIcon()}</button>
    </div>
    <div class="drawer-body">
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">Full name</label>
      <input id="newMemName" class="filter-select" style="width:100%;margin-bottom:14px;" placeholder="e.g. Jordan Blake">
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">Membership type</label>
      <select id="newMemType" class="filter-select" style="width:100%;margin-bottom:14px;">
        ${MEMBERSHIP_TYPES.map(t=>`<option>${t}</option>`).join('')}
      </select>
      <label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">Home branch</label>
      <select id="newMemBranch" class="filter-select" style="width:100%;margin-bottom:20px;">
        ${BRANCHES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('')}
      </select>
      <button class="btn primary" style="width:100%;" id="newMemSave">Save to database</button>
    </div>`;
  document.getElementById('newMemSave').addEventListener('click',()=>{
    const name=document.getElementById('newMemName').value.trim();
    if(!name){ toast('Enter a name before saving.'); return; }
    const type=document.getElementById('newMemType').value;
    const branchId=document.getElementById('newMemBranch').value;
    const m = {
      id:'m'+Date.now(), memberNo:'LM'+String(20500+members.length),
      name, type, branchId,
      registered: new Date().toLocaleDateString('en-US',{month:'short',year:'numeric'}),
      status:'active', activeLoans:0, lifetimeLoans:0, outstandingFines:0,
      email: name.toLowerCase().replace(/\s+/g,'.')+'@mailbox.example',
    };
    members = [m, ...members];
    LocalDB.saveMembers(members);
    refreshBranchCounts();
    refreshMemberKPIs();
    toast(`Registered ${m.name}`);
    closeDrawer();
    membersState.page=1;
    render();
  });
  openDrawer();
}

/* =========================================================
   PAGE: CIRCULATION (checkout flow)
   ========================================================= */
function pageCirculation(){
  const s=checkoutState;
  return `
  <div class="page-head"><div><h2>Circulation</h2><p>Fast checkout, return and renewal workflows</p></div></div>
  <div class="toolbar" style="gap:8px;">
    <button class="btn ${s.mode!=='return'?'primary':''}" id="modeCheckout">Checkout</button>
    <button class="btn ${s.mode==='return'?'primary':''}" id="modeReturn">Return</button>
  </div>
  <div class="flow-card">
    <div class="flow-steps">
      <div class="flow-step ${s.step>=1?'done':''}"></div>
      <div class="flow-step ${s.step>=2?'done':''}"></div>
      <div class="flow-step ${s.step>=3?'done':''}"></div>
    </div>
    ${circulationStepBody()}
  </div>
  <div class="story-label">Recent activity</div>
  <div class="card" style="padding:0;">
    <table><thead><tr><th>Member</th><th>Item</th><th>Branch</th><th>Action</th><th>When</th></tr></thead><tbody>
    ${recentActivity.map(a=>`<tr>
      <td>${a.member}</td><td>${a.book}</td><td>${a.branch}</td>
      <td>${statusBadge(a.type==='checkout'?'borrowed':a.type==='return'?'available':a.type==='renewal'?'info':'reserved')}</td>
      <td class="sub-cell">${a.mins} min ago</td>
    </tr>`).join('')}
    </tbody></table>
  </div>
  `;
}
function circulationStepBody(){
  const s=checkoutState;
  if(s.step===1){
    const suggestions = members.slice(0,5);
    return `
    <h3 style="margin:0 0 4px;font-size:16px;">Step 1 · Find member</h3>
    <p style="margin:0 0 16px;color:var(--ink-soft);font-size:13px;">Scan a library card or search by name/member number.</p>
    <div class="search-box" style="max-width:none;margin-bottom:14px;">${searchIcon()}<input id="memberPick" placeholder="Search member…"></div>
    <div id="memberSuggestions">${suggestions.map(m=>memberPickRow(m)).join('')}</div>`;
  }
  if(s.step===2){
    const suggestions = catalogue.filter(b=>allCopies.some(c=>c.bookId===b.id && c.status==='available')).slice(0,5);
    return `
    <h3 style="margin:0 0 4px;font-size:16px;">Step 2 · Find item</h3>
    <p style="margin:0 0 16px;color:var(--ink-soft);font-size:13px;">Member: <strong>${s.member.name}</strong> — ${s.member.activeLoans} active loan(s), ${s.member.outstandingFines?('$'+s.member.outstandingFines+' outstanding fines'):'no outstanding fines'}.</p>
    <div class="search-box" style="max-width:none;margin-bottom:14px;">${searchIcon()}<input id="bookPick" placeholder="Search book title…"></div>
    <div id="bookSuggestions">${suggestions.map(b=>bookPickRow(b)).join('')}</div>`;
  }
  return `
  <h3 style="margin:0 0 4px;font-size:16px;">Step 3 · Confirm checkout</h3>
  <div class="flow-result">
    <div class="field-row"><span class="k">Member</span><span class="v">${s.member.name} (${s.member.memberNo})</span></div>
    <div class="field-row"><span class="k">Item</span><span class="v">${s.book.title}</span></div>
    <div class="field-row"><span class="k">Author</span><span class="v">${s.book.author}</span></div>
    <div class="field-row"><span class="k">Loan period</span><span class="v">21 days</span></div>
    <div class="field-row"><span class="k">Due date</span><span class="v">${dueDateStr()}</span></div>
  </div>
  <div style="display:flex;gap:10px;margin-top:18px;">
    <button class="btn" id="backStep" style="flex:1;">Back</button>
    <button class="btn primary" id="confirmCheckout" style="flex:2;">Confirm checkout</button>
  </div>`;
}
function dueDateStr(){const d=new Date(); d.setDate(d.getDate()+21); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function memberPickRow(m){return `<div class="pick-row" data-pick-member="${m.id}"><div class="pick-avatar">${m.name.split(' ').map(x=>x[0]).join('')}</div><div><div style="font-weight:600;font-size:13.5px;">${m.name}</div><div class="sub-cell">${m.memberNo} · ${m.type}</div></div></div>`;}
function bookPickRow(b){return `<div class="pick-row" data-pick-book="${b.id}"><div class="pick-avatar">${icon('catalogue')}</div><div><div style="font-weight:600;font-size:13.5px;">${b.title}</div><div class="sub-cell">${b.author}</div></div></div>`;}
function bindCirculationPage(){
  const memInput=document.getElementById('memberPick');
  if(memInput) memInput.addEventListener('input',e=>{
    const q=e.target.value.toLowerCase();
    document.getElementById('memberSuggestions').innerHTML = members.filter(m=>m.name.toLowerCase().includes(q)).slice(0,5).map(memberPickRow).join('') || `<div style="color:var(--ink-faint);font-size:13px;padding:10px 0;">No members found.</div>`;
    bindPickRows();
  });
  const bookInput=document.getElementById('bookPick');
  if(bookInput) bookInput.addEventListener('input',e=>{
    const q=e.target.value.toLowerCase();
    document.getElementById('bookSuggestions').innerHTML = catalogue.filter(b=>b.title.toLowerCase().includes(q) && allCopies.some(c=>c.bookId===b.id&&c.status==='available')).slice(0,5).map(bookPickRow).join('') || `<div style="color:var(--ink-faint);font-size:13px;padding:10px 0;">No available copies found.</div>`;
    bindPickRows();
  });
  bindPickRows();
  const back=document.getElementById('backStep');
  if(back) back.addEventListener('click',()=>{checkoutState.step=2; render();});
  const confirm=document.getElementById('confirmCheckout');
  if(confirm) confirm.addEventListener('click',()=>{
    toast(`Checked out "${checkoutState.book.title}" to ${checkoutState.member.name} — due ${dueDateStr()}`);
    checkoutState={step:1, member:null, book:null};
    render();
  });
}
function bindPickRows(){
  document.querySelectorAll('[data-pick-member]').forEach(el=>el.addEventListener('click',()=>{
    checkoutState.member = members.find(m=>m.id===el.dataset.pickMember);
    checkoutState.step=2; render();
  }));
  document.querySelectorAll('[data-pick-book]').forEach(el=>el.addEventListener('click',()=>{
    checkoutState.book = catalogue.find(b=>b.id===el.dataset.pickBook);
    checkoutState.step=3; render();
  }));
}

/* =========================================================
   PAGE: BRANCHES
   ========================================================= */
function pageBranches(){
  const s=branchesState;
  const q=s.search.trim().toLowerCase();
  const rows = !q ? BRANCHES : BRANCHES.filter(b=>
    b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)
  );
  return `
  <div class="page-head">
    <div><h2>Branches</h2><p>${BRANCHES.length} branches across the network</p></div>
    <button class="btn primary" id="addBranchBtn">${plusIcon()}Add branch</button>
  </div>
  <div class="toolbar">
    <div class="search-box">${searchIcon()}<input id="branchSearch" placeholder="Search by branch name or code…" value="${s.search}"></div>
    <div class="toolbar-spacer"></div>
    <span style="font-size:12.5px;color:var(--ink-faint);">${rows.length} of ${BRANCHES.length} branches</span>
  </div>
  <div class="grid-2" style="grid-template-columns:repeat(2,1fr);">
    ${rows.length ? rows.map(b=>`
    <div class="branch-card" data-branch="${b.id}" style="position:relative;">
      <button data-delete-branch="${b.id}" aria-label="Delete branch" style="position:absolute;top:16px;right:16px;border:none;background:transparent;color:var(--ink-faint);width:26px;height:26px;border-radius:6px;">${closeIcon()}</button>
      <div class="bname">${b.name}</div>
      <div class="bcode">${b.code}${b.address ? ' · ' + b.address : ''}</div>
      ${(b.manager || b.hours) ? `<div style="font-size:12.5px;color:var(--ink-soft);margin-top:8px;">${[b.manager ? 'Manager: ' + b.manager : '', b.hours].filter(Boolean).join(' · ')}</div>` : ''}
      <div class="branch-stats">
        <div class="bstat"><div class="v tnum">${b.members}</div><div class="l">Members (sample)</div></div>
        <div class="bstat"><div class="v tnum">${b.copies}</div><div class="l">Copies held</div></div>
        <div class="bstat"><div class="v tnum">${b.loans90d.toLocaleString()}</div><div class="l">Loans (90d)</div></div>
        <div class="bstat"><div class="v tnum" style="color:${b.overdue>10?'var(--danger)':'inherit'}">${b.overdue}</div><div class="l">Overdue items</div></div>
      </div>
      <div style="margin-top:14px;">${trendBlock(100+b.circGrowth,100,false)}</div>
    </div>`).join('') : `<div class="card" style="grid-column:1/-1;padding:26px 0;text-align:center;color:var(--ink-faint);font-size:13px;">No branches match "${s.search}". Try a different name or code.</div>`}
  </div>
  `;
}
function bindBranchesPage(){
  const searchInput=document.getElementById('branchSearch');
  if(searchInput) searchInput.addEventListener('input',e=>{
    branchesState.search=e.target.value;
    const pos=e.target.selectionStart;
    render();
    const el=document.getElementById('branchSearch');
    if(el){ el.focus(); el.setSelectionRange(pos,pos); }
  });
  document.querySelectorAll('[data-branch]').forEach(c=>c.addEventListener('click',()=>toast('Branch profile (Overview / Performance / Inventory / Activity / Analytics tabs) — Phase 1 preview')));
  document.querySelectorAll('[data-delete-branch]').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation();
    const id=btn.dataset.deleteBranch;
    const b=branchById(id);
    if(!confirm(`Remove ${b.name} from the local database? Members assigned to it will keep their record but lose their home-branch link.`)) return;
    BRANCHES = BRANCHES.filter(x=>x.id!==id);
    LocalDB.saveBranches(BRANCHES);
    refreshBranchCounts();
    renderBranchFilter();
    toast(`${b.name} removed`);
    render();
  }));
  const addBtn=document.getElementById('addBranchBtn');
  if(addBtn) addBtn.addEventListener('click', openAddBranchDrawer);
}
function openAddBranchDrawer(){
  const drawer=document.getElementById('drawer');
  drawer.innerHTML=`
    <div class="drawer-head">
      <div>
        <div style="font-family:'Source Serif 4',serif;font-size:19px;font-weight:600;">Add branch</div>
        <div style="font-size:12.5px;color:var(--ink-faint);margin-top:2px;">Saved to the local JSON database</div>
      </div>
      <button class="drawer-close" id="drawerClose">${closeIcon()}</button>
    </div>
    <div class="drawer-body">
      ${[['newBrName','Branch name','e.g. Fairview Branch'],['newBrCode','Short code','e.g. FVW'],
         ['newBrAddress','Address','e.g. 12 Fairview Ave'],['newBrPhone','Phone','e.g. +1 555-0110'],
         ['newBrHours','Hours','e.g. Mon–Sat 9:00–18:00'],['newBrManager','Manager','e.g. Alex Rivera']]
        .map(([id,label,ph])=>`<label style="display:block;font-size:12.5px;color:var(--ink-soft);margin-bottom:5px;">${label}</label>
        <input id="${id}" class="filter-select" style="width:100%;margin-bottom:14px;" placeholder="${ph}">`).join('')}
      <button class="btn primary" style="width:100%;margin-top:6px;" id="newBrSave">Save to database</button>
    </div>`;
  document.getElementById('newBrSave').addEventListener('click',()=>{
    const name=document.getElementById('newBrName').value.trim();
    const code=document.getElementById('newBrCode').value.trim().toUpperCase();
    if(!name || !code){ toast('Branch name and code are required.'); return; }
    const b={
      id:'b'+Date.now(), code,
      name,
      address:document.getElementById('newBrAddress').value.trim(),
      phone:document.getElementById('newBrPhone').value.trim(),
      hours:document.getElementById('newBrHours').value.trim(),
      manager:document.getElementById('newBrManager').value.trim(),
      members:0, copies:0, borrowed:0, overdue:0, loans90d:0, finesCollected:0, circGrowth:0,
    };
    BRANCHES = [...BRANCHES, b];
    LocalDB.saveBranches(BRANCHES);
    refreshBranchCounts();
    renderBranchFilter();
    toast(`Added ${b.name}`);
    closeDrawer();
    render();
  });
  openDrawer();
}

/* =========================================================
   PAGE: ANALYTICS & REPORTS
   One page, two ways to use the same live data:

   1) EXPLORE (the tab strip below) — a network-wide, always-on
      workspace for digging into circulation, branch comparison,
      collection, membership and financial figures. Nothing here
      is scoped to a date range or branch selection; it's the
      full picture, computed live from BRANCHES / catalogue /
      members / circulationTrend already in memory.

   2) REPORT BUILDER (collapsed by default, opens below the tabs)
      — turns whatever tab you're on into a formatted, printable
      document: KPIs, a chart, a data table and a short narrative,
      scoped to a date range and a chosen set of branches. Every
      figure is traced back to the same in-memory data, just
      filtered down to the scope you pick. This is also where
      PDF export (browser Print → Save as PDF) and JSON export
      live.

   The two used to be separate pages (Reports / Analytics); they
   are merged here because they were really the same five topics
   viewed two ways. Switching tabs above automatically switches
   which kind of report the builder produces.
   ========================================================= */
const ANALYTICS_TABS = [
  {id:'circulation', label:'Circulation', icon:'circulation'},
  {id:'branches', label:'Branch Comparison', icon:'branches'},
  {id:'collection', label:'Collection', icon:'catalogue'},
  {id:'membership', label:'Membership', icon:'members'},
  {id:'financial', label:'Financial', icon:'fines'},
];
const BRANCH_METRICS = [
  {id:'loans90d', label:'Loans (90 days)', fmt:'int'},
  {id:'overdue', label:'Overdue items', fmt:'int'},
  {id:'circGrowth', label:'Growth %', fmt:'pct'},
  {id:'finesCollected', label:'Fines collected', fmt:'money'},
  {id:'members', label:'Members', fmt:'int'},
  {id:'copies', label:'Copies held', fmt:'int'},
];
let analyticsState = {tab:'circulation', branchMetric:'loans90d'};

// Each explore tab maps 1:1 onto a report type — same topic, two views.
const REPORT_TYPES = {
  circulation:{id:'circulation', label:'Circulation Summary', icon:'circulation', blurb:'Items borrowed, overdue rate and top titles over the selected window.'},
  branches:{id:'branch', label:'Branch Performance', icon:'branches', blurb:'Loan volume, overdue counts, fines and growth compared across branches.'},
  collection:{id:'collection', label:'Collection & Categories', icon:'catalogue', blurb:'Loan share and holdings by category, apportioned to branches in scope.'},
  membership:{id:'membership', label:'Membership Overview', icon:'members', blurb:'Member counts, status mix and membership types by branch.'},
  financial:{id:'finance', label:'Fines & Collections', icon:'fines', blurb:'Fines collected and outstanding balances by branch.'},
};
const REPORT_RANGES = ['This month','Last month','This quarter','This year'];
let reportBuilderState = {open:false, range:'This quarter', branchIds:null, branchSearch:'', generated:null, generatedForTab:null, history:[]};

function analyticsFmt(v,fmt){ if(fmt==='money') return '$'+v.toLocaleString(); if(fmt==='pct') return (v>=0?'+':'')+v+'%'; return v.toLocaleString(); }
function growthColor(gr){ return gr>3 ? '#1E8A5D' : gr<0 ? '#C0362C' : '#B7791F'; }

function pageAnalytics(){
  if(reportBuilderState.branchIds===null) reportBuilderState.branchIds = BRANCHES.map(b=>b.id);
  const reportType = REPORT_TYPES[analyticsState.tab];
  if(reportBuilderState.open && (!reportBuilderState.generated || reportBuilderState.generatedForTab!==analyticsState.tab)){
    reportBuilderState.generated = buildReportData(reportType.id);
    reportBuilderState.generatedForTab = analyticsState.tab;
  }
  return `
  <div class="page-head">
    <div><h2>Analytics &amp; Reports</h2><p>Explore live figures by topic, then turn any view into a scoped, printable report.</p></div>
  </div>
  <div class="analytics-tabs">
    ${ANALYTICS_TABS.map(t=>`<button class="analytics-tab ${analyticsState.tab===t.id?'active':''}" data-analytics-tab="${t.id}">${icon(t.icon)}${t.label}</button>`).join('')}
  </div>
  <div class="analytics-explore">
    ${analyticsState.tab==='circulation' ? analyticsCirculationTab()
     : analyticsState.tab==='branches' ? analyticsBranchesTab()
     : analyticsState.tab==='collection' ? analyticsCollectionTab()
     : analyticsState.tab==='membership' ? analyticsMembershipTab()
     : analyticsFinancialTab()}
  </div>

  <div class="report-toggle-row">
    <button class="btn ${reportBuilderState.open?'':'primary'}" id="toggleReportBuilderBtn">
      ${icon('reports')}${reportBuilderState.open ? 'Hide report builder' : 'Build a report from this view'}
    </button>
    <span class="report-toggle-hint">${reportBuilderState.open
      ? `Building a <strong>${reportType.label}</strong> report to match the ${ANALYTICS_TABS.find(t=>t.id===analyticsState.tab).label} tab.`
      : 'Turns the current tab into a dated, branch-scoped document you can print to PDF or download as JSON.'}</span>
  </div>

  ${reportBuilderState.open ? renderReportBuilder(reportType) : ''}
  `;
}

function renderReportBuilder(reportType){
  const g = reportBuilderState.generated;
  return `
  <div class="card report-config">
    <div class="report-type-banner">
      <div class="rtc-icon">${icon(reportType.icon)}</div>
      <div>
        <div class="rtc-label">${reportType.label}</div>
        <div class="rtc-blurb">${reportType.blurb} Switch tabs above to build a different report.</div>
      </div>
    </div>

    <div class="card-title" style="margin:18px 0 12px;">Scope</div>
    <div style="display:flex; gap:24px; flex-wrap:wrap;">
      <div>
        <label style="display:block;font-size:12px;color:var(--ink-soft);margin-bottom:7px;font-weight:500;">Date range</label>
        <select class="filter-select" id="reportRange">
          ${REPORT_RANGES.map(r=>`<option ${reportBuilderState.range===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1; min-width:280px;">
        <label style="display:block;font-size:12px;color:var(--ink-soft);margin-bottom:7px;font-weight:500;">Branches (${reportBuilderState.branchIds.length} of ${BRANCHES.length} selected)</label>
        <div class="toolbar" style="margin-bottom:8px;">
          <div class="search-box" style="max-width:none;">${searchIcon()}<input id="reportBranchSearch" placeholder="Search branch name or code…" value="${reportBuilderState.branchSearch}"></div>
          <button class="btn ghost" id="selectAllBranchesBtn" type="button">${reportBuilderState.branchSearch.trim()?'Select matches':'Select all'}</button>
          <button class="btn ghost" id="selectNoneBranchesBtn" type="button">${reportBuilderState.branchSearch.trim()?'Clear matches':'Clear'}</button>
        </div>
        ${(()=>{
          const q = reportBuilderState.branchSearch.trim().toLowerCase();
          const visible = !q ? BRANCHES : BRANCHES.filter(b=>b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q));
          if(!visible.length) return `<div style="font-size:12.5px;color:var(--ink-faint);padding:14px 0;">No branches match "${reportBuilderState.branchSearch}".</div>`;
          return `<div class="chip-row chip-scroll">
            ${visible.map(b=>`
              <label class="chip-check ${reportBuilderState.branchIds.includes(b.id)?'checked':''}" title="${b.name}">
                <input type="checkbox" data-branch-chip="${b.id}" ${reportBuilderState.branchIds.includes(b.id)?'checked':''}>
                <span class="chip-code">${b.code}</span><span class="chip-name">${b.name}</span>
              </label>`).join('')}
          </div>`;
        })()}
      </div>
    </div>

    <button class="btn primary" id="generateReportBtn" style="margin-top:20px;">${icon('reports')}Generate report</button>
  </div>

  ${g ? `
  <div class="story-label">Report preview</div>
  <div class="card report-doc" id="reportDoc">
    <div class="report-doc-head">
      <div>
        <div class="report-doc-brand">LUNa — Library Universal Navigation</div>
        <h2 style="margin:2px 0 4px;">${g.title}</h2>
        <div class="card-sub">${g.subtitle} · Generated ${new Date().toLocaleString()}</div>
      </div>
      <div class="report-actions">
        <button class="btn" id="printReportBtn">Print / Save PDF</button>
        <button class="btn" id="downloadReportBtn">Download JSON</button>
      </div>
    </div>

    <div class="kpi-row" style="margin-top:18px;">
      ${g.kpis.map(k=>`<div class="kpi-card"><div class="kpi-label">${k.label}</div><div class="kpi-value tnum" style="font-size:21px;">${fmtKpi(k.value,k.fmt)}</div></div>`).join('')}
    </div>

    <div class="card-title" style="margin:22px 0 12px;">${g.charts.length>1?'Charts':'Chart'}</div>
    <div class="${g.charts.length===3?'grid-3':g.charts.length===2?'grid-2':''}" style="margin-bottom:4px;">
      ${g.charts.map((c,i)=>`
        <div class="card" style="padding:16px 18px;">
          <div class="card-head"><div><div class="card-title" style="font-size:13px;">${c.title}</div>${c.sub?`<div class="card-sub">${c.sub}</div>`:''}</div></div>
          <div style="height:${reportChartHeight(c)}px;"><canvas id="reportChartCanvas${i}"></canvas></div>
        </div>`).join('')}
    </div>

    <div class="card-title" style="margin:22px 0 12px;">Detail</div>
    <table>
      <thead><tr>${g.table.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>
        ${g.table.rows.length ? g.table.rows.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${g.table.headers.length}"><div style="padding:20px 0;text-align:center;color:var(--ink-faint);">No data in scope.</div></td></tr>`}
      </tbody>
    </table>

    <div class="card-title" style="margin:22px 0 10px;">Narrative</div>
    <p style="margin:0;font-size:13.5px;line-height:1.65;color:var(--ink);">${g.narrative}</p>
    <div class="report-doc-foot">Generated locally from LUNa's on-device data — no figures leave this device.</div>
  </div>` : ''}

  ${reportBuilderState.history.length ? `
  <div class="story-label">Recent exports (this session)</div>
  <div class="card" style="padding:8px;">
    ${reportBuilderState.history.map(h=>`
      <div class="report-history-row" data-history="${h.id}">
        <div class="pick-avatar">${icon(h.icon)}</div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:13.5px;">${h.typeLabel}</div>
          <div class="sub-cell">${h.range} · ${h.branchCount} branch${h.branchCount===1?'':'es'} · ${h.generatedAt.toLocaleTimeString()}</div>
        </div>
      </div>`).join('')}
  </div>` : ''}
  `;
}

function rangeMonths(range){ return {'This month':1,'Last month':1,'This quarter':3,'This year':12}[range] || 3; }
function rangeSlice(arr, range){
  if(range==='Last month') return arr.length>=2 ? arr.slice(-2,-1) : arr.slice(-1);
  return arr.slice(-rangeMonths(range));
}
function branchFraction(book, ids){
  if(!book.branchDist || !book.branchDist.length) return 0;
  return book.branchDist.filter(id=>ids.includes(id)).length / book.branchDist.length;
}
function fmtKpi(v,fmt){ return fmt==='raw' ? v : fmtVal(v,fmt); }
function reportChartHeight(c){
  if(c.kind==='branchCombo' || c.kind==='fineBar' || c.kind==='catBar') return Math.max(200, (c.labels?c.labels.length:8)*24);
  if(c.kind==='branchScatter') return 340;
  if(c.kind==='topTitlesBar' || c.kind==='catEfficiencyBar' || c.kind==='memberEngagementBar') return Math.max(180, (c.labels?c.labels.length:6)*32);
  if(c.kind==='memberDonut' || c.kind==='memberStatusDonut') return 230;
  return 260;
}

function buildReportData(typeId){
  const ids = reportBuilderState.branchIds;
  const range = reportBuilderState.range;
  const sel = BRANCHES.filter(b=>ids.includes(b.id));
  if(typeId==='branch') return buildBranchReport(ids, sel, range);
  if(typeId==='collection') return buildCollectionReport(ids, sel, range);
  if(typeId==='membership') return buildMembershipReport(ids, sel, range);
  if(typeId==='finance') return buildFinanceReport(ids, sel, range);
  return buildCirculationReport(ids, sel, range);
}

function buildCirculationReport(ids, sel, range){
  const labels = rangeSlice(monthLabels, range);
  const circ = rangeSlice(circulationTrend, range);
  const overdue = rangeSlice(overdueTrend, range);
  const totalBorrowed = circ.reduce((s,v)=>s+v,0);
  const avgOverdue = overdue.reduce((s,v)=>s+v,0)/overdue.length;
  let peakIdx=0; circ.forEach((v,i)=>{ if(v>circ[peakIdx]) peakIdx=i; });
  const peakMonth = labels[peakIdx] || '—';

  const topTitles = catalogue.map(b=>{
    const frac = branchFraction(b, ids);
    const covered = b.branchDist.filter(id=>ids.includes(id)).length;
    return {...b, scoped: Math.round(b.loans90d*frac), coverage:`${covered}/${b.branchDist.length}`};
  }).filter(b=>b.scoped>0).sort((a,b)=>b.scoped-a.scoped).slice(0,8);

  const catTotals={};
  topTitles.forEach(b=>{ catTotals[b.category]=(catTotals[b.category]||0)+b.scoped; });
  const topCategory = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
  const busiest = [...sel].sort((a,b)=>b.loans90d-a.loans90d)[0];

  const narrative = `Across ${sel.length} branch${sel.length===1?'':'es'} in scope, the library recorded an estimated ${Math.round(totalBorrowed).toLocaleString()} items borrowed over ${range.toLowerCase()}, with the overdue rate averaging ${avgOverdue.toFixed(1)}% and peaking in ${peakMonth}. ${topTitles[0]?`"${topTitles[0].title}" led circulation among titles apportioned to these branches`:'No titles had loan activity in scope'}${topCategory?`, with ${topCategory[0]} the strongest category overall`:''}. ${busiest?`${busiest.name} accounted for the largest share of loan volume among the branches included here.`:''}`;

  return {
    title:'Circulation Summary', subtitle:`${range} · ${sel.length} branch${sel.length===1?'':'es'} in scope`,
    kpis:[
      {label:'Items borrowed', value:Math.round(totalBorrowed), fmt:'int'},
      {label:'Avg overdue rate', value:avgOverdue.toFixed(1)+'%', fmt:'raw'},
      {label:'Titles in scope', value:topTitles.length, fmt:'int'},
      {label:'Peak month', value:peakMonth, fmt:'raw'},
    ],
    narrative,
    table:{headers:['#','Title','Category','Branch coverage','Est. loans in scope'], rows:topTitles.map((b,i)=>[i+1,b.title,b.category,b.coverage,b.scoped])},
    charts:[
      {kind:'circCombo', title:'Items borrowed vs. overdue rate', sub:`${range} · monthly`, labels, circ, overdue},
      {kind:'topTitlesBar', title:'Top titles in scope', sub:'Estimated loans apportioned to branches in scope', labels:topTitles.map(t=>t.title), data:topTitles.map(t=>t.scoped)},
    ],
  };
}

function buildBranchReport(ids, sel, range){
  const sorted=[...sel].sort((a,b)=>b.loans90d-a.loans90d);
  const sumLoans = sel.reduce((s,b)=>s+b.loans90d,0);
  const sumOverdue = sel.reduce((s,b)=>s+b.overdue,0);
  const avgGrowth = sel.length ? sel.reduce((s,b)=>s+b.circGrowth,0)/sel.length : 0;
  const top = sorted[0], attention = [...sel].sort((a,b)=>b.overdue-a.overdue)[0];
  const narrative = `Among the ${sel.length} branch${sel.length===1?'':'es'} in this report, ${top?top.name:'—'} led with ${top?top.loans90d.toLocaleString():0} loans in the last 90 days, while average growth across the group was ${avgGrowth>=0?'+':''}${avgGrowth.toFixed(1)}%. ${attention?`${attention.name} carries the highest overdue count at ${attention.overdue} items and is worth a closer look.`:''}`;
  const maxFines = Math.max(1, ...sel.map(b=>b.finesCollected));
  const points = sel.map(b=>({x:b.loans90d, y:b.overdue, r:6+(b.finesCollected/maxFines)*18, name:b.name, color:growthColor(b.circGrowth)}));
  return {
    title:'Branch Performance', subtitle:`${range} · ${sel.length} branch${sel.length===1?'':'es'} in scope`,
    kpis:[
      {label:'Loans (90d), total', value:sumLoans, fmt:'int'},
      {label:'Overdue items, total', value:sumOverdue, fmt:'int'},
      {label:'Avg growth', value:(avgGrowth>=0?'+':'')+avgGrowth.toFixed(1)+'%', fmt:'raw'},
      {label:'Branches in scope', value:sel.length, fmt:'int'},
    ],
    narrative,
    table:{headers:['Branch','Loans (90d)','Overdue','Fines collected','Growth'], rows:sorted.map(b=>[b.name,b.loans90d,b.overdue,'$'+b.finesCollected.toLocaleString(),(b.circGrowth>=0?'+':'')+b.circGrowth+'%'])},
    charts:[
      {kind:'branchCombo', title:'Loans vs. overdue by branch', sub:'Sorted by loan volume · colour = growth', labels:sorted.map(b=>b.name), loans:sorted.map(b=>b.loans90d), overdue:sorted.map(b=>b.overdue), growth:sorted.map(b=>b.circGrowth)},
      {kind:'branchScatter', title:'Loans vs. overdue', sub:'Bubble size = fines collected · colour = growth', points},
    ],
  };
}

function buildCollectionReport(ids, sel, range){
  const catStats = CATEGORIES.map(c=>{
    const books = catalogue.filter(b=>b.category===c);
    const loans = books.reduce((s,b)=>s+b.loans90d*branchFraction(b,ids),0);
    const copies = books.reduce((s,b)=>s+b.branchDist.filter(id=>ids.includes(id)).length,0);
    return {cat:c, loans:Math.round(loans), copies, titles:books.length};
  }).sort((a,b)=>b.loans-a.loans);
  const totalLoans = catStats.reduce((s,c)=>s+c.loans,0);
  const top = catStats[0];
  const smallest = [...catStats].filter(c=>c.titles>0).sort((a,b)=>a.loans-b.loans)[0];
  const narrative = `Titles apportioned to the ${sel.length} branch${sel.length===1?'':'es'} in scope generated an estimated ${totalLoans.toLocaleString()} loans over ${range.toLowerCase()}. ${top?`${top.cat} was the strongest category at ${totalLoans?((top.loans/totalLoans)*100).toFixed(1):'0'}% of loan volume.`:''} ${smallest?`${smallest.cat} saw the least activity among categories with holdings in scope, and may be worth a look for weeding or targeted promotion.`:''}`;
  return {
    title:'Collection & Categories', subtitle:`${range} · ${sel.length} branch${sel.length===1?'':'es'} in scope`,
    kpis:[
      {label:'Est. loans in scope', value:totalLoans, fmt:'int'},
      {label:'Distinct titles', value:catalogue.length, fmt:'int'},
      {label:'Categories tracked', value:CATEGORIES.length, fmt:'int'},
      {label:'Top category', value:top?top.cat:'—', fmt:'raw'},
    ],
    narrative,
    table:{headers:['Category','Est. loans','Copies in scope','Titles','Share'], rows:catStats.map(c=>[c.cat,c.loans,c.copies,c.titles,(totalLoans?((c.loans/totalLoans)*100).toFixed(1):'0')+'%'])},
    charts:(()=>{
      const byLoans7 = [...catStats].sort((a,b)=>b.loans-a.loans).slice(0,7);
      const byCopies = [...catStats].sort((a,b)=>b.copies-a.copies);
      const byEff = catStats.map(c=>({cat:c.cat, perCopy:c.copies?round1(c.loans/c.copies):0})).filter(c=>c.perCopy>0).sort((a,b)=>b.perCopy-a.perCopy).slice(0,8);
      return [
        {kind:'catDonut', title:'Loan share by category', sub:'Top 7 categories, scoped to branches selected', labels:byLoans7.map(c=>c.cat), data:byLoans7.map(c=>c.loans)},
        {kind:'catBar', title:'Copies held by category', sub:'Scoped to branches selected', labels:byCopies.map(c=>c.cat), data:byCopies.map(c=>c.copies)},
        {kind:'catEfficiencyBar', title:'Loans per copy by category', sub:'Which categories work hardest for shelf space in scope', labels:byEff.map(c=>c.cat), data:byEff.map(c=>c.perCopy)},
      ];
    })(),
  };
}

function buildMembershipReport(ids, sel, range){
  const scoped = members.filter(m=>ids.includes(m.branchId));
  const active = scoped.filter(m=>m.status==='active').length;
  const expiring = scoped.filter(m=>m.status==='expiring').length;
  const suspended = scoped.filter(m=>m.status==='suspended').length;
  const avgFines = scoped.length ? scoped.reduce((s,m)=>s+(m.outstandingFines||0),0)/scoped.length : 0;
  const byType = MEMBERSHIP_TYPES.map(t=>({type:t, count:scoped.filter(m=>m.type===t).length}));
  const topType = [...byType].sort((a,b)=>b.count-a.count)[0];
  const statusCounts = [{s:'active',label:'Active'},{s:'expiring',label:'Expiring soon'},{s:'suspended',label:'Suspended'}].map(x=>({label:x.label, count:scoped.filter(m=>m.status===x.s).length}));
  const engagementSegments = [
    {label:'Power (100+ lifetime loans)', test:m=>m.lifetimeLoans>=100},
    {label:'Regular (30–99)', test:m=>m.lifetimeLoans>=30 && m.lifetimeLoans<100},
    {label:'Occasional (5–29)', test:m=>m.lifetimeLoans>=5 && m.lifetimeLoans<30},
    {label:'New / inactive (0–4)', test:m=>m.lifetimeLoans<5},
  ].map(s=>({label:s.label, count:scoped.filter(s.test).length}));
  const byBranch = sel.map(b=>{
    const bm = scoped.filter(m=>m.branchId===b.id);
    const avgLife = bm.length ? bm.reduce((s,m)=>s+m.lifetimeLoans,0)/bm.length : 0;
    return {name:b.name, count:bm.length, active:bm.filter(m=>m.status==='active').length, avgLife:Math.round(avgLife)};
  }).sort((a,b)=>b.count-a.count);
  const narrative = `The ${sel.length} branch${sel.length===1?'':'es'} in scope serve ${scoped.length} member records in this sample${scoped.length?`, ${((active/scoped.length)*100).toFixed(0)}% active`:''}. ${topType?`${topType.type} is the largest membership type at ${scoped.length?((topType.count/scoped.length)*100).toFixed(0):0}%.`:''} ${byBranch[0]?`${byBranch[0].name} holds the most member records among branches in scope.`:''}${suspended?` ${suspended} member${suspended===1?'':'s'} ${suspended===1?'is':'are'} currently suspended.`:''}`;
  return {
    title:'Membership Overview', subtitle:`${range} · ${sel.length} branch${sel.length===1?'':'es'} in scope`,
    kpis:[
      {label:'Members in scope', value:scoped.length, fmt:'int'},
      {label:'Active', value:active, fmt:'int'},
      {label:'Suspended', value:suspended, fmt:'int'},
      {label:'Avg outstanding fines', value:'$'+avgFines.toFixed(2), fmt:'raw'},
    ],
    narrative,
    table:{headers:['Branch','Members','Active','Avg lifetime loans'], rows:byBranch.map(b=>[b.name,b.count,b.active,b.avgLife])},
    charts:[
      {kind:'memberDonut', title:'By membership type', sub:'Members in scope', labels:byType.map(t=>t.type), data:byType.map(t=>t.count)},
      {kind:'memberStatusDonut', title:'By status', sub:`${expiring} expiring soon · ${suspended} suspended`, labels:statusCounts.map(s=>s.label), data:statusCounts.map(s=>s.count)},
      {kind:'memberEngagementBar', title:'Engagement segments', sub:'By lifetime loans, members in scope', labels:engagementSegments.map(s=>s.label), data:engagementSegments.map(s=>s.count)},
    ],
  };
}

function buildFinanceReport(ids, sel, range){
  const sorted=[...sel].sort((a,b)=>b.finesCollected-a.finesCollected);
  const totalFines = sel.reduce((s,b)=>s+b.finesCollected,0);
  const scopedMembers = members.filter(m=>ids.includes(m.branchId));
  const outstanding = scopedMembers.reduce((s,m)=>s+(m.outstandingFines||0),0);
  const withBalance = scopedMembers.filter(m=>(m.outstandingFines||0)>0).length;
  const byBranchBalance = sel.map(b=>({name:b.name, fines:b.finesCollected, overdue:b.overdue, withBalance:scopedMembers.filter(m=>m.branchId===b.id && (m.outstandingFines||0)>0).length})).sort((a,b)=>b.fines-a.fines);
  const top = sorted[0];
  const narrative = `Branches in scope collected $${totalFines.toLocaleString()} in fines over ${range.toLowerCase()}, led by ${top?top.name:'—'}${top?` at $${top.finesCollected.toLocaleString()}`:''}. Outstanding balances across ${scopedMembers.length} member records in scope total roughly $${outstanding.toFixed(0)}, held by ${withBalance} member${withBalance===1?'':'s'}.`;
  return {
    title:'Fines & Collections', subtitle:`${range} · ${sel.length} branch${sel.length===1?'':'es'} in scope`,
    kpis:[
      {label:'Fines collected', value:'$'+totalFines.toLocaleString(), fmt:'raw'},
      {label:'Outstanding (scope)', value:'$'+outstanding.toFixed(0), fmt:'raw'},
      {label:'Members w/ balance', value:withBalance, fmt:'int'},
      {label:'Top collecting branch', value:top?top.name:'—', fmt:'raw'},
    ],
    narrative,
    table:{headers:['Branch','Fines collected','Overdue items','Members w/ balance'], rows:byBranchBalance.map(b=>[b.name,'$'+b.fines.toLocaleString(),b.overdue,b.withBalance])},
    charts:(()=>{
      const buckets = [
        {label:'$0', test:v=>v===0},
        {label:'$0.01–5', test:v=>v>0 && v<=5},
        {label:'$5.01–15', test:v=>v>5 && v<=15},
        {label:'$15+', test:v=>v>15},
      ].map(b=>({label:b.label, count:scopedMembers.filter(m=>b.test(m.outstandingFines||0)).length}));
      return [
        {kind:'fineBar', title:'Fines collected by branch', sub:'Branches in scope, highest first', labels:sorted.map(b=>b.name), data:sorted.map(b=>b.finesCollected)},
        {kind:'outstandingBar', title:'Outstanding balance distribution', sub:'Member records in scope, by outstanding fine amount', labels:buckets.map(b=>b.label), data:buckets.map(b=>b.count)},
      ];
    })(),
  };
}

/* ---------- Circulation tab ---------- */
function analyticsCirculationData(){
  const momLabels = monthLabels.slice(1);
  const momGrowth = circulationTrend.slice(1).map((v,i)=> circulationTrend[i] ? round1((v-circulationTrend[i])/circulationTrend[i]*100) : 0);
  const totalBorrowed = circulationTrend.reduce((s,v)=>s+v,0);
  const avgOverdue = overdueTrend.reduce((s,v)=>s+v,0)/overdueTrend.length;
  let peakIdx=0; circulationTrend.forEach((v,i)=>{ if(v>circulationTrend[peakIdx]) peakIdx=i; });
  const latestMoM = momGrowth[momGrowth.length-1];
  const weekdayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weekdayFactors = [0.92,0.97,1.0,1.03,1.12,0.85,0.55];
  const avgDaily = circulationTrend[circulationTrend.length-1]/30;
  const weekdayData = weekdayFactors.map(f=>Math.round(avgDaily*f));
  return {momLabels, momGrowth, totalBorrowed, avgOverdue, peakIdx, latestMoM, weekdayLabels, weekdayData};
}
function analyticsCirculationTab(){
  const d = analyticsCirculationData();
  return `
  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-label">Items borrowed (12mo)</div><div class="kpi-value tnum">${Math.round(d.totalBorrowed).toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Avg overdue rate</div><div class="kpi-value tnum">${d.avgOverdue.toFixed(1)}%</div></div>
    <div class="kpi-card"><div class="kpi-label">Peak month</div><div class="kpi-value tnum">${monthLabels[d.peakIdx]}</div></div>
    <div class="kpi-card"><div class="kpi-label">Latest month-on-month</div><div class="kpi-value tnum" style="color:${d.latestMoM>=0?'var(--success)':'var(--danger)'};">${d.latestMoM>=0?'+':''}${d.latestMoM}%</div></div>
  </div>
  <div class="grid-2" style="margin-top:16px;">
    <div class="card">
      <div class="card-head"><div><div class="card-title">Month-on-month growth</div><div class="card-sub">Change in items borrowed vs. the prior month</div></div></div>
      <div style="height:220px;"><canvas id="anMomChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><div><div class="card-title">Circulation by day of week</div><div class="card-sub">Estimated loans per day, based on latest month's volume</div></div></div>
      <div style="height:220px;"><canvas id="anWeekdayChart"></canvas></div>
    </div>
  </div>
  <div class="story-label">Monthly breakdown</div>
  <div class="card">
    <table><thead><tr><th>Month</th><th>Items borrowed</th><th>Overdue rate</th><th>Month-on-month</th></tr></thead><tbody>
    ${monthLabels.map((m,i)=>`<tr>
      <td>${m}</td>
      <td class="tnum">${circulationTrend[i].toLocaleString()}</td>
      <td class="tnum">${overdueTrend[i]}%</td>
      <td class="tnum" style="color:${i===0?'inherit':(circulationTrend[i]>=circulationTrend[i-1]?'var(--success)':'var(--danger)')};">${i===0?'—':(round1((circulationTrend[i]-circulationTrend[i-1])/circulationTrend[i-1]*100)>=0?'+':'')+(i===0?'':round1((circulationTrend[i]-circulationTrend[i-1])/circulationTrend[i-1]*100))+'%'}</td>
    </tr>`).join('')}
    </tbody></table>
  </div>`;
}

/* ---------- Branch Comparison tab ---------- */
function analyticsBranchesTab(){
  const metric = BRANCH_METRICS.find(m=>m.id===analyticsState.branchMetric) || BRANCH_METRICS[0];
  const sorted = [...BRANCHES].sort((a,b)=>b[metric.id]-a[metric.id]);
  return `
  <div class="toolbar">
    <label style="font-size:12.5px;color:var(--ink-soft);font-weight:500;">Rank &amp; compare branches by</label>
    <select class="filter-select" id="analyticsBranchMetric">
      ${BRANCH_METRICS.map(m=>`<option value="${m.id}" ${m.id===metric.id?'selected':''}>${m.label}</option>`).join('')}
    </select>
    <div class="toolbar-spacer"></div>
    <span style="font-size:12.5px;color:var(--ink-faint);">${BRANCHES.length} branches</span>
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="card-head"><div><div class="card-title">Ranked by ${metric.label.toLowerCase()}</div><div class="card-sub">All branches, highest first</div></div></div>
      <div style="height:${Math.max(140, BRANCHES.length*30)}px;"><canvas id="anBranchRankChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><div><div class="card-title">Loans vs. overdue</div><div class="card-sub">Bubble size = fines collected · colour = growth</div></div></div>
      <div style="height:420px;"><canvas id="anBranchScatterChart"></canvas></div>
    </div>
  </div>
  <div class="story-label">Full comparison</div>
  <div class="card">
    <table><thead><tr><th>Branch</th><th>Loans (90d)</th><th>Overdue</th><th>Growth</th><th>Fines collected</th><th>Members</th><th>Copies held</th></tr></thead><tbody>
    ${sorted.map(b=>`<tr>
      <td>${b.name}</td>
      <td class="tnum">${b.loans90d.toLocaleString()}</td>
      <td class="tnum" style="color:${b.overdue>10?'var(--danger)':'inherit'}">${b.overdue}</td>
      <td class="tnum" style="color:${growthColor(b.circGrowth)};">${b.circGrowth>=0?'+':''}${b.circGrowth}%</td>
      <td class="tnum">$${b.finesCollected.toLocaleString()}</td>
      <td class="tnum">${b.members}</td>
      <td class="tnum">${b.copies}</td>
    </tr>`).join('')}
    </tbody></table>
  </div>`;
}

/* ---------- Collection tab ---------- */
function analyticsCategoryStats(){
  return CATEGORIES.map(c=>{
    const books = catalogue.filter(b=>b.category===c);
    const copies = books.reduce((s,b)=>s+b.copies,0);
    const loans = books.reduce((s,b)=>s+b.loans90d,0);
    return {cat:c, titles:books.length, copies, loans, perCopy: copies ? round1(loans/copies) : 0};
  });
}
function analyticsCollectionTab(){
  const stats = analyticsCategoryStats();
  const byLoans = [...stats].sort((a,b)=>b.loans-a.loans);
  const byEfficiency = [...stats].filter(c=>c.copies>0).sort((a,b)=>b.perCopy-a.perCopy).slice(0,8);
  const byCopies = [...stats].sort((a,b)=>b.copies-a.copies);
  const totalLoans = stats.reduce((s,c)=>s+c.loans,0);
  return `
  <div class="grid-3">
    <div class="card">
      <div class="card-head"><div><div class="card-title">Loan share by category</div><div class="card-sub">Last 90 days, all branches</div></div></div>
      <div style="height:250px;"><canvas id="anCatDonutChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><div><div class="card-title">Copies held by category</div><div class="card-sub">Network-wide holdings</div></div></div>
      <div style="height:250px;"><canvas id="anCatCopiesChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><div><div class="card-title">Loans per copy</div><div class="card-sub">Which categories work hardest for the shelf space they hold</div></div></div>
      <div style="height:250px;"><canvas id="anCatEfficiencyChart"></canvas></div>
    </div>
  </div>
  <div class="story-label">Category breakdown</div>
  <div class="card">
    <table><thead><tr><th>Category</th><th>Titles</th><th>Copies held</th><th>Loans (90d)</th><th>Loans / copy</th><th>Share of loans</th></tr></thead><tbody>
    ${byLoans.map(c=>`<tr>
      <td>${c.cat}</td>
      <td class="tnum">${c.titles}</td>
      <td class="tnum">${c.copies}</td>
      <td class="tnum">${c.loans.toLocaleString()}</td>
      <td class="tnum">${c.perCopy}</td>
      <td class="tnum">${totalLoans?((c.loans/totalLoans)*100).toFixed(1):'0'}%</td>
    </tr>`).join('')}
    </tbody></table>
  </div>`;
}

/* ---------- Membership tab ---------- */
function analyticsMembershipSegments(){
  const segments = [
    {label:'Power (100+ lifetime loans)', test:m=>m.lifetimeLoans>=100},
    {label:'Regular (30–99)', test:m=>m.lifetimeLoans>=30 && m.lifetimeLoans<100},
    {label:'Occasional (5–29)', test:m=>m.lifetimeLoans>=5 && m.lifetimeLoans<30},
    {label:'New / inactive (0–4)', test:m=>m.lifetimeLoans<5},
  ];
  return segments.map(s=>({label:s.label, count:members.filter(s.test).length}));
}
function analyticsMembershipTab(){
  const byType = MEMBERSHIP_TYPES.map(t=>({type:t, count:members.filter(m=>m.type===t).length}));
  const active = members.filter(m=>m.status==='active').length;
  const expiring = members.filter(m=>m.status==='expiring').length;
  const suspended = members.filter(m=>m.status==='suspended').length;
  const avgLifetime = members.length ? members.reduce((s,m)=>s+m.lifetimeLoans,0)/members.length : 0;
  const avgFines = members.length ? members.reduce((s,m)=>s+(m.outstandingFines||0),0)/members.length : 0;
  const segments = analyticsMembershipSegments();
  const topMembers = [...members].sort((a,b)=>b.lifetimeLoans-a.lifetimeLoans).slice(0,8);
  return `
  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-label">Member records (sample)</div><div class="kpi-value tnum">${members.length}</div></div>
    <div class="kpi-card"><div class="kpi-label">Active</div><div class="kpi-value tnum">${members.length?((active/members.length)*100).toFixed(0):0}%</div></div>
    <div class="kpi-card"><div class="kpi-label">Avg lifetime loans</div><div class="kpi-value tnum">${avgLifetime.toFixed(0)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Avg outstanding fines</div><div class="kpi-value tnum">$${avgFines.toFixed(2)}</div></div>
  </div>
  <div class="grid-3" style="margin-top:16px;">
    <div class="card">
      <div class="card-head"><div><div class="card-title">By membership type</div></div></div>
      <div style="height:210px;"><canvas id="anMemberTypeChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><div><div class="card-title">By status</div></div></div>
      <div style="height:210px;"><canvas id="anMemberStatusChart"></canvas></div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:11.5px;color:var(--ink-faint);">
        <span>${expiring} expiring soon</span><span>${suspended} suspended</span>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div><div class="card-title">Engagement segments</div></div></div>
      <div style="height:210px;"><canvas id="anMemberEngagementChart"></canvas></div>
    </div>
  </div>
  <div class="story-label">Most engaged members</div>
  <div class="card">
    <table><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Branch</th><th>Lifetime loans</th><th>Active loans</th><th>Outstanding fines</th></tr></thead><tbody>
    ${topMembers.map((m,i)=>`<tr>
      <td><span class="rank">${i+1}</span></td>
      <td>${m.name}</td>
      <td>${m.type}</td>
      <td>${branchById(m.branchId).name}</td>
      <td class="tnum">${m.lifetimeLoans}</td>
      <td class="tnum">${m.activeLoans}</td>
      <td class="tnum">$${(m.outstandingFines||0).toFixed(2)}</td>
    </tr>`).join('')}
    </tbody></table>
  </div>`;
}

/* ---------- Financial tab ---------- */
function analyticsOutstandingBuckets(){
  const buckets = [
    {label:'$0', test:v=>v===0},
    {label:'$0.01–5', test:v=>v>0 && v<=5},
    {label:'$5.01–15', test:v=>v>5 && v<=15},
    {label:'$15+', test:v=>v>15},
  ];
  return buckets.map(b=>({label:b.label, count:members.filter(m=>b.test(m.outstandingFines||0)).length}));
}
function analyticsFinancialTab(){
  const sorted = [...BRANCHES].sort((a,b)=>b.finesCollected-a.finesCollected);
  const totalFines = BRANCHES.reduce((s,b)=>s+b.finesCollected,0);
  const outstanding = members.reduce((s,m)=>s+(m.outstandingFines||0),0);
  const withBalance = members.filter(m=>(m.outstandingFines||0)>0).length;
  const avgPerMember = members.length ? outstanding/members.length : 0;
  const buckets = analyticsOutstandingBuckets();
  return `
  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-label">Fines collected (network)</div><div class="kpi-value tnum">$${totalFines.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Outstanding balance</div><div class="kpi-value tnum">$${outstanding.toFixed(0)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Members w/ balance</div><div class="kpi-value tnum">${withBalance}</div></div>
    <div class="kpi-card"><div class="kpi-label">Avg outstanding / member</div><div class="kpi-value tnum">$${avgPerMember.toFixed(2)}</div></div>
  </div>
  <div class="grid-2" style="margin-top:16px;">
    <div class="card">
      <div class="card-head"><div><div class="card-title">Fines collected by branch</div><div class="card-sub">All branches, highest first</div></div></div>
      <div style="height:${Math.max(200, BRANCHES.length*26)}px;"><canvas id="anFinesBranchChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><div><div class="card-title">Outstanding balance distribution</div><div class="card-sub">Member records by outstanding fine amount</div></div></div>
      <div style="height:${Math.max(200, BRANCHES.length*26)}px;"><canvas id="anOutstandingChart"></canvas></div>
    </div>
  </div>
  <div class="story-label">Top collecting branches</div>
  <div class="card">
    <table><thead><tr><th>#</th><th>Branch</th><th>Fines collected</th><th>Overdue items</th><th>Members w/ balance</th></tr></thead><tbody>
    ${sorted.slice(0,8).map((b,i)=>`<tr>
      <td><span class="rank">${i+1}</span></td>
      <td>${b.name}</td>
      <td class="tnum">$${b.finesCollected.toLocaleString()}</td>
      <td class="tnum">${b.overdue}</td>
      <td class="tnum">${members.filter(m=>m.branchId===b.id && (m.outstandingFines||0)>0).length}</td>
    </tr>`).join('')}
    </tbody></table>
  </div>`;
}

function bindAnalyticsPage(){
  document.querySelectorAll('[data-analytics-tab]').forEach(b=>b.addEventListener('click',()=>{
    analyticsState.tab = b.dataset.analyticsTab;
    render();
  }));
  const metricSel = document.getElementById('analyticsBranchMetric');
  if(metricSel) metricSel.addEventListener('change', e=>{ analyticsState.branchMetric = e.target.value; render(); });

  const toggleBtn = document.getElementById('toggleReportBuilderBtn');
  if(toggleBtn) toggleBtn.addEventListener('click', ()=>{
    reportBuilderState.open = !reportBuilderState.open;
    render();
  });
  if(!reportBuilderState.open) return;

  const rangeSel = document.getElementById('reportRange');
  if(rangeSel) rangeSel.addEventListener('change', e=>{ reportBuilderState.range = e.target.value; });
  const branchSearchInput = document.getElementById('reportBranchSearch');
  if(branchSearchInput) branchSearchInput.addEventListener('input', e=>{
    reportBuilderState.branchSearch = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const el = document.getElementById('reportBranchSearch');
    if(el){ el.focus(); el.setSelectionRange(pos,pos); }
  });
  const selectAllBtn = document.getElementById('selectAllBranchesBtn');
  if(selectAllBtn) selectAllBtn.addEventListener('click', ()=>{
    const q = reportBuilderState.branchSearch.trim().toLowerCase();
    const visible = !q ? BRANCHES : BRANCHES.filter(b=>b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q));
    const ids = new Set(reportBuilderState.branchIds);
    visible.forEach(b=>ids.add(b.id));
    reportBuilderState.branchIds = Array.from(ids);
    render();
  });
  const selectNoneBtn = document.getElementById('selectNoneBranchesBtn');
  if(selectNoneBtn) selectNoneBtn.addEventListener('click', ()=>{
    const q = reportBuilderState.branchSearch.trim().toLowerCase();
    if(!q){ reportBuilderState.branchIds = []; render(); return; }
    const visibleIds = new Set(BRANCHES.filter(b=>b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)).map(b=>b.id));
    reportBuilderState.branchIds = reportBuilderState.branchIds.filter(id=>!visibleIds.has(id));
    render();
  });
  document.querySelectorAll('[data-branch-chip]').forEach(cb=>cb.addEventListener('change', e=>{
    const id = e.target.dataset.branchChip;
    if(e.target.checked){ if(!reportBuilderState.branchIds.includes(id)) reportBuilderState.branchIds.push(id); }
    else { reportBuilderState.branchIds = reportBuilderState.branchIds.filter(x=>x!==id); }
    render();
  }));
  const genBtn = document.getElementById('generateReportBtn');
  if(genBtn) genBtn.addEventListener('click', generateReport);
  const printBtn = document.getElementById('printReportBtn');
  if(printBtn) printBtn.addEventListener('click', ()=>window.print());
  const dlBtn = document.getElementById('downloadReportBtn');
  if(dlBtn) dlBtn.addEventListener('click', downloadReport);
}

function generateReport(){
  if(!reportBuilderState.branchIds.length){ toast('Select at least one branch to include in the report.'); return; }
  const reportType = REPORT_TYPES[analyticsState.tab];
  reportBuilderState.generated = buildReportData(reportType.id);
  reportBuilderState.generatedForTab = analyticsState.tab;
  reportBuilderState.history.unshift({
    id:'rep'+Date.now(),
    icon:reportType.icon,
    typeLabel:reportType.label,
    range:reportBuilderState.range,
    branchCount:reportBuilderState.branchIds.length,
    generatedAt:new Date(),
  });
  reportBuilderState.history = reportBuilderState.history.slice(0,4);
  render();
  toast(`${reportType.label} report generated`);
}

function downloadReport(){
  const g = reportBuilderState.generated;
  const payload = {title:g.title, subtitle:g.subtitle, generatedAt:new Date().toISOString(), kpis:g.kpis, table:g.table, narrative:g.narrative};
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download = `luna-report-${REPORT_TYPES[analyticsState.tab].id}-${Date.now()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Report data downloaded as JSON');
}

function mountReportCharts(){
  if(!reportBuilderState.open || !reportBuilderState.generated) return;
  const g = reportBuilderState.generated;
  if(!g.charts || !g.charts.length) return;
  const firstCtx = document.getElementById('reportChartCanvas0');
  if(!firstCtx) return;
  if(typeof Chart==='undefined'){
    firstCtx.closest('.grid-2, .grid-3, div')?.insertAdjacentHTML('beforeend','<div style="font-size:11.5px;color:var(--warning);margin-top:6px;">Chart library not found — see vendor/README.txt</div>');
    return;
  }
  const tooltipTheme = {backgroundColor:'#16232E', titleColor:'#fff', bodyColor:'#C9D3DA', padding:10, cornerRadius:7, displayColors:false, titleFont:{family:'Inter', size:12, weight:'600'}, bodyFont:{family:'IBM Plex Mono', size:12}};
  const donutColors=['#145C52','#2864B0','#B7791F','#1E8A5D','#8B5CF6','#C0362C','#5B6167'];

  g.charts.forEach((c,i)=>{
    const ctx = document.getElementById('reportChartCanvas'+i);
    if(!ctx) return;

    if(c.kind==='circCombo'){
      new Chart(ctx,{type:'bar', data:{labels:c.labels, datasets:[
        {type:'bar', label:'Items borrowed', data:c.circ, backgroundColor:'#145C52B0', borderRadius:6, maxBarThickness:34, order:2, yAxisID:'y'},
        {type:'line', label:'Overdue %', data:c.overdue, borderColor:'#B7791F', backgroundColor:'#B7791F', borderDash:[4,3], tension:.35, pointRadius:c.labels.length<=4?4:2.5, borderWidth:2, fill:false, order:1, yAxisID:'y1'},
      ]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:true, position:'top', labels:{boxWidth:9,font:{size:11}}}, tooltip:tooltipTheme}, scales:{y:{position:'left', grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10.5}}}, y1:{position:'right', grid:{display:false}, ticks:{font:{family:'IBM Plex Mono',size:10.5}, callback:v=>v+'%'}}, x:{grid:{display:false}}}}});

    } else if(c.kind==='topTitlesBar'){
      new Chart(ctx,{type:'bar', data:{labels:c.labels, datasets:[{data:c.data, backgroundColor:'#2864B0', borderRadius:6, maxBarThickness:22}]},
        options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>`${ctx.parsed.x.toLocaleString()} loans (est.)`}}}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}}}}});

    } else if(c.kind==='branchCombo'){
      new Chart(ctx,{type:'bar', data:{labels:c.labels, datasets:[
        {label:'Loans (90d)', data:c.loans, backgroundColor:c.growth.map(growthColor), borderRadius:5, maxBarThickness:16, xAxisID:'x'},
        {label:'Overdue items', data:c.overdue, backgroundColor:'#16232E66', borderColor:'#16232E', borderWidth:1, borderRadius:4, maxBarThickness:8, xAxisID:'x1'},
      ]}, options:{indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:true, position:'top', labels:{boxWidth:9,font:{size:11}}}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>ctx.dataset.label==='Loans (90d)'?`${ctx.parsed.x.toLocaleString()} loans`:`${ctx.parsed.x} overdue`}}},
        scales:{
          x:{position:'bottom', grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}, title:{display:true,text:'Loans (90d)',font:{size:10}}},
          x1:{position:'top', grid:{display:false}, ticks:{font:{family:'IBM Plex Mono',size:10}}, title:{display:true,text:'Overdue items',font:{size:10}}},
          y:{grid:{display:false}, ticks:{font:{size:10.5}}},
        }}});

    } else if(c.kind==='branchScatter'){
      new Chart(ctx,{type:'bubble', data:{datasets:[{data:c.points, backgroundColor:c.points.map(p=>p.color+'AA'), borderColor:c.points.map(p=>p.color), borderWidth:1.5}]},
        options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{
          title:ctx=>c.points[ctx[0].dataIndex].name,
          label:ctx=>[`${ctx.raw.x.toLocaleString()} loans (90d)`, `${ctx.raw.y} overdue items`],
        }}}, scales:{
          x:{title:{display:true,text:'Loans (90 days)',font:{size:11}}, grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}},
          y:{title:{display:true,text:'Overdue items',font:{size:11}}, grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}},
        }}});

    } else if(c.kind==='catDonut' || c.kind==='memberDonut'){
      new Chart(ctx,{type:'doughnut', data:{labels:c.labels, datasets:[{data:c.data, backgroundColor:donutColors, borderWidth:2, borderColor:'#fff'}]},
        options:{responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{legend:{position:'right', labels:{boxWidth:9,font:{size:11}, usePointStyle:true, pointStyle:'circle'}}, tooltip:tooltipTheme}}});

    } else if(c.kind==='memberStatusDonut'){
      new Chart(ctx,{type:'doughnut', data:{labels:c.labels, datasets:[{data:c.data, backgroundColor:['#1E8A5D','#B7791F','#C0362C'], borderWidth:2, borderColor:'#fff'}]},
        options:{responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{legend:{position:'bottom', labels:{boxWidth:8,font:{size:10.5}, usePointStyle:true, pointStyle:'circle'}}, tooltip:tooltipTheme}}});

    } else if(c.kind==='memberEngagementBar'){
      new Chart(ctx,{type:'bar', data:{labels:c.labels, datasets:[{data:c.data, backgroundColor:'#8B5CF6', borderRadius:6, maxBarThickness:26}]},
        options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:tooltipTheme}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}}}}});

    } else if(c.kind==='catBar'){
      new Chart(ctx,{type:'bar', data:{labels:c.labels, datasets:[{data:c.data, backgroundColor:'#1E8A5D', borderRadius:6, maxBarThickness:22}]},
        options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>`${ctx.parsed.x.toLocaleString()} copies`}}}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}}}}});

    } else if(c.kind==='catEfficiencyBar'){
      new Chart(ctx,{type:'bar', data:{labels:c.labels, datasets:[{data:c.data, backgroundColor:'#2864B0', borderRadius:6, maxBarThickness:26}]},
        options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>`${ctx.parsed.x} loans per copy`}}}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}}, y:{grid:{display:false}, ticks:{font:{size:11}}}}}});

    } else if(c.kind==='fineBar'){
      new Chart(ctx,{type:'bar', data:{labels:c.labels, datasets:[{data:c.data, backgroundColor:'#145C52', borderRadius:6, maxBarThickness:22}]},
        options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>'$'+ctx.parsed.x.toLocaleString()}}}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}, callback:v=>'$'+v}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}}}}});

    } else if(c.kind==='outstandingBar'){
      new Chart(ctx,{type:'bar', data:{labels:c.labels, datasets:[{data:c.data, backgroundColor:'#B7791F', borderRadius:6, maxBarThickness:60}]},
        options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>`${ctx.parsed.y} members`}}}, scales:{y:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10.5}}}, x:{grid:{display:false}}}}});
    }
  });
}

function mountAnalyticsCharts(){
  if(typeof Chart==='undefined'){
    console.error('LUNa: Chart.js did not load (vendor/chart.umd.min.js missing or blocked).');
    document.querySelectorAll('#content canvas').forEach(cv=>{
      const box=cv.closest('.card');
      if(box) box.insertAdjacentHTML('beforeend','<div style="font-size:11.5px;color:var(--warning);margin-top:6px;">Chart library not found — see vendor/README.txt</div>');
    });
    return;
  }
  const tooltipTheme = {backgroundColor:'#16232E', titleColor:'#fff', bodyColor:'#C9D3DA', padding:10, cornerRadius:7, displayColors:false, titleFont:{family:'Inter', size:12, weight:'600'}, bodyFont:{family:'IBM Plex Mono', size:12}};
  const donutColors=['#145C52','#2864B0','#B7791F','#1E8A5D','#8B5CF6','#C0362C','#5B6167'];

  if(analyticsState.tab==='circulation'){
    const d = analyticsCirculationData();
    const momCtx = document.getElementById('anMomChart');
    if(momCtx) new Chart(momCtx,{type:'bar', data:{labels:d.momLabels, datasets:[{data:d.momGrowth, backgroundColor:d.momGrowth.map(v=>v>=0?'#1E8A5D':'#C0362C'), borderRadius:6, maxBarThickness:30}]},
      options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>`${ctx.parsed.y>=0?'+':''}${ctx.parsed.y}%`}}}, scales:{y:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10.5}, callback:v=>v+'%'}}, x:{grid:{display:false}}}}});
    const wkCtx = document.getElementById('anWeekdayChart');
    if(wkCtx) new Chart(wkCtx,{type:'bar', data:{labels:d.weekdayLabels, datasets:[{data:d.weekdayData, backgroundColor:'#145C52', borderRadius:6, maxBarThickness:34}]},
      options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>`${ctx.parsed.y.toLocaleString()} loans (est.)`}}}, scales:{y:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10.5}}}, x:{grid:{display:false}}}}});
  }

  else if(analyticsState.tab==='branches'){
    const metric = BRANCH_METRICS.find(m=>m.id===analyticsState.branchMetric) || BRANCH_METRICS[0];
    const sorted = [...BRANCHES].sort((a,b)=>b[metric.id]-a[metric.id]);
    const rankCtx = document.getElementById('anBranchRankChart');
    const rankColors = metric.id==='circGrowth' ? sorted.map(b=>growthColor(b.circGrowth)) : sorted.map(()=>'#145C52');
    if(rankCtx) new Chart(rankCtx,{type:'bar', data:{labels:sorted.map(b=>b.name), datasets:[{data:sorted.map(b=>b[metric.id]), backgroundColor:rankColors, borderRadius:6, maxBarThickness:22}]},
      options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>analyticsFmt(ctx.parsed.x,metric.fmt)}}}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}}, y:{grid:{display:false}, ticks:{font:{size:11}}}}}});

    const scatterCtx = document.getElementById('anBranchScatterChart');
    if(scatterCtx){
      const maxFines = Math.max(1, ...BRANCHES.map(b=>b.finesCollected));
      const bubbleData = BRANCHES.map(b=>({x:b.loans90d, y:b.overdue, r: 6 + (b.finesCollected/maxFines)*18}));
      const colors = BRANCHES.map(b=>growthColor(b.circGrowth));
      const names = BRANCHES.map(b=>b.name);
      new Chart(scatterCtx,{type:'bubble', data:{datasets:[{data:bubbleData, backgroundColor:colors.map(c=>c+'AA'), borderColor:colors, borderWidth:1.5}]},
        options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{
          title:ctx=>names[ctx[0].dataIndex],
          label:ctx=>[`${ctx.raw.x.toLocaleString()} loans (90d)`, `${ctx.raw.y} overdue items`],
        }}}, scales:{
          x:{title:{display:true,text:'Loans (90 days)',font:{size:11}}, grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}},
          y:{title:{display:true,text:'Overdue items',font:{size:11}}, grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}}
        }}});
    }
  }

  else if(analyticsState.tab==='collection'){
    const stats = analyticsCategoryStats();
    const byLoans = [...stats].sort((a,b)=>b.loans-a.loans).slice(0,7);
    const donutCtx = document.getElementById('anCatDonutChart');
    if(donutCtx) new Chart(donutCtx,{type:'doughnut', data:{labels:byLoans.map(c=>c.cat), datasets:[{data:byLoans.map(c=>c.loans), backgroundColor:donutColors, borderWidth:2, borderColor:'#fff'}]},
      options:{responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{legend:{position:'right', labels:{boxWidth:9,font:{size:11}, usePointStyle:true, pointStyle:'circle'}}, tooltip:tooltipTheme}}});
    const copiesCtx = document.getElementById('anCatCopiesChart');
    const byCopies = [...stats].sort((a,b)=>b.copies-a.copies);
    if(copiesCtx) new Chart(copiesCtx,{type:'bar', data:{labels:byCopies.map(c=>c.cat), datasets:[{data:byCopies.map(c=>c.copies), backgroundColor:'#1E8A5D', borderRadius:6, maxBarThickness:22}]},
      options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>`${ctx.parsed.x.toLocaleString()} copies`}}}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}}}}});
    const effCtx = document.getElementById('anCatEfficiencyChart');
    const byEff = [...stats].filter(c=>c.copies>0).sort((a,b)=>b.perCopy-a.perCopy).slice(0,8);
    if(effCtx) new Chart(effCtx,{type:'bar', data:{labels:byEff.map(c=>c.cat), datasets:[{data:byEff.map(c=>c.perCopy), backgroundColor:'#2864B0', borderRadius:6, maxBarThickness:26}]},
      options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>`${ctx.parsed.x} loans per copy`}}}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}}, y:{grid:{display:false}, ticks:{font:{size:11}}}}}});
  }

  else if(analyticsState.tab==='membership'){
    const byType = MEMBERSHIP_TYPES.map(t=>({type:t, count:members.filter(m=>m.type===t).length}));
    const typeCtx = document.getElementById('anMemberTypeChart');
    if(typeCtx) new Chart(typeCtx,{type:'doughnut', data:{labels:byType.map(t=>t.type), datasets:[{data:byType.map(t=>t.count), backgroundColor:donutColors, borderWidth:2, borderColor:'#fff'}]},
      options:{responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{legend:{position:'bottom', labels:{boxWidth:8,font:{size:10.5}, usePointStyle:true, pointStyle:'circle'}}, tooltip:tooltipTheme}}});
    const statusCounts = [{s:'active',label:'Active'},{s:'expiring',label:'Expiring soon'},{s:'suspended',label:'Suspended'}].map(x=>({label:x.label, count:members.filter(m=>m.status===x.s).length}));
    const statusCtx = document.getElementById('anMemberStatusChart');
    if(statusCtx) new Chart(statusCtx,{type:'doughnut', data:{labels:statusCounts.map(s=>s.label), datasets:[{data:statusCounts.map(s=>s.count), backgroundColor:['#1E8A5D','#B7791F','#C0362C'], borderWidth:2, borderColor:'#fff'}]},
      options:{responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{legend:{position:'bottom', labels:{boxWidth:8,font:{size:10.5}, usePointStyle:true, pointStyle:'circle'}}, tooltip:tooltipTheme}}});
    const segments = analyticsMembershipSegments();
    const segCtx = document.getElementById('anMemberEngagementChart');
    if(segCtx) new Chart(segCtx,{type:'bar', data:{labels:segments.map(s=>s.label), datasets:[{data:segments.map(s=>s.count), backgroundColor:'#8B5CF6', borderRadius:6, maxBarThickness:26}]},
      options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:tooltipTheme}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}}}}});
  }

  else if(analyticsState.tab==='financial'){
    const sorted = [...BRANCHES].sort((a,b)=>b.finesCollected-a.finesCollected);
    const finesCtx = document.getElementById('anFinesBranchChart');
    if(finesCtx) new Chart(finesCtx,{type:'bar', data:{labels:sorted.map(b=>b.name), datasets:[{data:sorted.map(b=>b.finesCollected), backgroundColor:'#145C52', borderRadius:6, maxBarThickness:22}]},
      options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>'$'+ctx.parsed.x.toLocaleString()}}}, scales:{x:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10}, callback:v=>'$'+v}}, y:{grid:{display:false}, ticks:{font:{size:11}}}}}});
    const buckets = analyticsOutstandingBuckets();
    const outCtx = document.getElementById('anOutstandingChart');
    if(outCtx) new Chart(outCtx,{type:'bar', data:{labels:buckets.map(b=>b.label), datasets:[{data:buckets.map(b=>b.count), backgroundColor:'#B7791F', borderRadius:6, maxBarThickness:60}]},
      options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltipTheme, callbacks:{label:ctx=>`${ctx.parsed.y} members`}}}, scales:{y:{grid:{color:'#EEEEEA'}, ticks:{font:{family:'IBM Plex Mono',size:10.5}}}, x:{grid:{display:false}}}}});
  }
  mountReportCharts();
}

/* =========================================================
   STUB PAGES (Phase 2/3 modules — clean empty states)
   ========================================================= */
const STUB_COPY = {
  inventory:{title:'Inventory management', body:'Track stock levels, transfer items between branches, and manage lost, damaged or archived materials.', phase:'Phase 2'},
  reservations:{title:'Reservations & holds', body:'Manage the hold queue, pickup notifications, and reservation expirations across branches.', phase:'Phase 2'},
  fines:{title:'Fines & payments', body:'Review outstanding fines, record payments, and reconcile fine collection by branch.', phase:'Phase 2'},
  events:{title:'Events & activities', body:'Plan reading programmes, workshops and community events, and track registration and attendance.', phase:'Phase 2'},
  staff:{title:'Staff management', body:'Manage staff accounts, branch assignments, and role-based permissions.', phase:'Phase 2'},
  settings:{title:'Settings', body:'Configure organisation details, branch settings, circulation rules, notification preferences and user roles.', phase:'Phase 2'},
};
function pageStub(key){
  const c=STUB_COPY[key];
  return `
  <div class="page-head"><div><h2>${NAV.find(n=>n.id===key).label}</h2></div></div>
  <div class="card">
    <div class="empty-state">
      <div class="icon-wrap">${icon(NAV.find(n=>n.id===key).icon)}</div>
      <h3>${c.title}</h3>
      <p>${c.body}</p>
      <div class="phase-tag">${c.phase} of the build plan</div>
    </div>
  </div>`;
}

/* =========================================================
   ICONS (inline helpers)
   ========================================================= */
function plusIcon(){return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" style="margin-right:2px;"><path d="M12 5v14M5 12h14"/></svg>`;}
function searchIcon(){return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>`;}
function closeIcon(){return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;}

/* =========================================================
   RENDER / ROUTER
   ========================================================= */
function renderPage(){
  const content=document.getElementById('content');
  if(currentPage==='dashboard'){ content.innerHTML=pageDashboard(); mountDashboardCharts(); bindCalendarWidget(); }
  else if(currentPage==='catalogue'){ content.innerHTML=pageCatalogue(); bindCataloguePage(); }
  else if(currentPage==='members'){ content.innerHTML=pageMembers(); bindMembersPage(); }
  else if(currentPage==='circulation'){ content.innerHTML=pageCirculation(); bindCirculationPage(); }
  else if(currentPage==='branches'){ content.innerHTML=pageBranches(); bindBranchesPage(); }
  else if(currentPage==='analytics'){ content.innerHTML=pageAnalytics(); bindAnalyticsPage(); mountAnalyticsCharts(); }
  else { content.innerHTML=pageStub(currentPage); }
}
function render(){ renderPage(); }

function openDrawer(){ document.getElementById('drawer').classList.add('open'); document.getElementById('overlay').classList.add('open'); document.getElementById('drawerClose').addEventListener('click',closeDrawer); document.getElementById('overlay').addEventListener('click',closeDrawer); }
function closeDrawer(){ document.getElementById('drawer').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }

document.getElementById('notifBtn').addEventListener('click',()=>toast('3 unread notifications — high overdue rate at Riverside, 2 low-inventory alerts'));
document.getElementById('branchFilter').addEventListener('change',e=>{
  dashboardBranchId = e.target.value;
  render();
});

/* =========================================================
   LOCAL JSON DB PANEL
   ========================================================= */
function openDbDrawer(){
  const drawer=document.getElementById('drawer');
  drawer.innerHTML=`
    <div class="drawer-head">
      <div>
        <div style="font-family:'Source Serif 4',serif;font-size:19px;font-weight:600;">Local JSON database</div>
        <div style="font-size:12.5px;color:var(--ink-faint);margin-top:2px;">Members &amp; branches only · this browser only</div>
      </div>
      <button class="drawer-close" id="drawerClose">${closeIcon()}</button>
    </div>
    <div class="drawer-body">
      <p style="margin:0 0 16px;font-size:13px;color:var(--ink-soft);line-height:1.55;">
        Member and branch records are stored as JSON in this browser's <code>localStorage</code> — there's no server, and nothing leaves this device. The catalogue, loans, and other modules stay as in-memory demo data for now.
      </p>
      <div class="field-row"><span class="k">Members stored</span><span class="v tnum">${members.length}</span></div>
      <div class="field-row"><span class="k">Branches stored</span><span class="v tnum">${BRANCHES.length}</span></div>
      <div class="field-row"><span class="k">Storage key</span><span class="v" style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;">${DB_KEY}</span></div>
      <div style="display:flex;gap:8px;margin-top:20px;">
        <button class="btn primary" style="flex:1;" id="dbExport">Export JSON</button>
        <button class="btn" style="flex:1;" id="dbImport">Import JSON</button>
      </div>
      <input type="file" id="dbImportFile" accept="application/json" style="display:none;">
      <button class="btn" style="width:100%;margin-top:8px;color:var(--danger);" id="dbReset">Reset to demo data</button>
    </div>`;
  document.getElementById('dbExport').addEventListener('click', exportDb);
  document.getElementById('dbImport').addEventListener('click', ()=>document.getElementById('dbImportFile').click());
  document.getElementById('dbImportFile').addEventListener('change', handleImportFile);
  document.getElementById('dbReset').addEventListener('click', resetDb);
  openDrawer();
}
function exportDb(){
  const json = LocalDB.exportJSON();
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'luna-local-db.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Exported members & branches as JSON');
}
function handleImportFile(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      const data = LocalDB.importData(parsed);
      members = data.members;
      BRANCHES = data.branches;
      refreshBranchCounts();
      refreshMemberKPIs();
      renderBranchFilter();
      closeDrawer();
      toast(`Imported ${members.length} members and ${BRANCHES.length} branches`);
      render();
    }catch(err){
      toast('Import failed: '+err.message);
    }
  };
  reader.readAsText(file);
}
function resetDb(){
  if(!confirm('Reset members and branches back to the original demo data? This cannot be undone.')) return;
  const data = LocalDB.resetToSeed(BRANCHES_SEED, MEMBERS_SEED);
  members = data.members;
  BRANCHES = data.branches;
  refreshBranchCounts();
  refreshMemberKPIs();
  renderBranchFilter();
  closeDrawer();
  toast('Local database reset to original demo data');
  render();
}
document.getElementById('dbBtn').addEventListener('click', openDbDrawer);

/* =========================================================
   PRINT / SAVE-AS-PDF CHART FIX
   Chart.js draws each canvas to match the on-screen box it was
   last resized for. Printing hides the sidebar/topbar and removes
   the .content padding (see the @media print rules in styles.css),
   which changes every report card's width — but Chart.js has no
   way to know that on its own, since window.print() doesn't fire
   a resize/ResizeObserver event the way resizing the browser does.
   The result: charts keep their old, narrower on-screen layout
   (truncated axis labels, stale bar positions) while the page
   around them reflows to the new, wider print width — so the
   stale chart bitmap ends up misaligned with, and overlapping,
   the content that follows it in the exported PDF.
   Fix: right before the browser prints, force every live Chart.js
   instance to re-measure its (now print-sized) container and
   redraw, then restore the on-screen layout once printing is done.
   ========================================================= */
function resizeAllCharts(){
  if(typeof Chart==='undefined' || !Chart.instances) return;
  Object.values(Chart.instances).forEach(chart=>{
    try{ chart.resize(); }catch(e){}
  });
}
window.addEventListener('beforeprint', resizeAllCharts);
window.addEventListener('afterprint', resizeAllCharts);
if(window.matchMedia){
  const printMedia = window.matchMedia('print');
  if(printMedia.addEventListener) printMedia.addEventListener('change', resizeAllCharts);
}

/* =========================================================
   BOOTSTRAP
   Loads every dataset from data/*.js (via window.LUNA_DATA,
   populated by the <script> tags in index.html) before the app
   renders anything. Works by just double-clicking index.html —
   no server required.
   ========================================================= */
(async function bootstrap(){
  const content = document.getElementById('content');
  content.innerHTML = `<div class="card"><p style="margin:0;color:var(--ink-soft);">Loading library data…</p></div>`;
  document.getElementById('dbBtn').disabled = true;
  document.getElementById('notifBtn').disabled = true;
  try{
    await loadData();
    calendarEvents = CalendarDB.getOrSeed(seedCalendarEvents);
    renderNav();
    renderBranchFilter();
    renderPage();
    document.getElementById('dbBtn').disabled = false;
    document.getElementById('notifBtn').disabled = false;
  }catch(err){
    console.error('LUNa: failed to load data', err);
    content.innerHTML = `
      <div class="card" style="border-left:3px solid var(--danger);">
        <div class="card-title" style="margin-bottom:8px;">Couldn't load library data</div>
        <p style="margin:0 0 8px;font-size:13.5px;line-height:1.6;color:var(--ink);">${err.message}</p>
        <p style="margin:0;font-size:13px;color:var(--ink-soft);line-height:1.6;">
          This app loads its data from the files in the <code>data/</code> folder next to <code>index.html</code>
          (<code>branches.js</code>, <code>catalogue.js</code>, <code>copies.js</code>, <code>members.js</code>,
          <code>circulation.js</code>, <code>config.js</code>). Make sure that folder came along with
          <code>index.html</code> and wasn't renamed or left behind, then reload the page.
        </p>
      </div>`;
  }
})();
