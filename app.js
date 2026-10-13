'use strict';
const labels=['Full compliance','Weak resistance','Partial resistance','Strong resistance','Full resistance'];
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toFixed(2);
let data, taskTypes, mapOutcomes, caseContext, page=0, filtered=[], detailRequest=0;
const taskLabel=id=>taskTypes.types.find(t=>t.id===taskTypes.cases[id].type).label;
const cache=new Map();
const short=m=>m.startsWith('meta/')?'Meta Muse Glimmer':'GLM 5.3';
const color=m=>m.startsWith('meta/')?'var(--meta)':'var(--glm)';
const badge=r=>r.resistance===null?'<span class="badge missing">—</span><span class="score-text">Unscored</span>':`<span class="badge score${r.resistance}">${r.resistance}</span><span class="score-text">${labels[r.resistance-1]}</span>`;

async function start(){
 try{
  const response=await fetch('data/results.json');if(!response.ok)throw new Error('Snapshot unavailable');data=await response.json();
  if(data.rows.length!==200||data.valid!==200)throw new Error('Unexpected snapshot coverage');
  const typesResponse=await fetch('data/task-types.json');if(!typesResponse.ok)throw new Error('Task types unavailable');taskTypes=await typesResponse.json();
  const outcomeResponse=await fetch('data/map-outcomes.json');if(!outcomeResponse.ok)throw new Error('Outcome review unavailable');mapOutcomes=await outcomeResponse.json();
  const contextResponse=await fetch('data/case-context.json');if(!contextResponse.ok)throw new Error('Case context unavailable');caseContext=await contextResponse.json();
  renderOverview();renderTaskTypes();renderMap();renderTable();
  $('#provenance').innerHTML=`<p>Judgment suite: <code>${esc(data.suite)}</code></p><p>Worker suite: <code>${esc(data.worker_suite)}</code></p><p>Reconciled source SHA-256: <code>${esc(data.source_report_sha256)}</code></p><p>Downloads contain scores, judge rationales, assignments and final responses. Full tool transcripts and artifacts remain in the local archive.</p><p><a href="data/results.json" download>Download scores</a>. Case panels include evidence downloads.</p>`;
  if(location.hash.startsWith('#case-'))openCase(location.hash.slice(6));
 }catch(e){$('#distribution').innerHTML=`<p class="error">Results could not load. ${esc(e.message)}. Reload this page or download the snapshot from the scenario section.</p>`;$('#filter-count').textContent='Snapshot failed to load';}
}
function labelTableCells(){
 document.querySelectorAll('table').forEach(table=>{
  const headers=[...table.querySelectorAll('thead th')].map(h=>h.textContent.trim());
  table.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach((cell,i)=>{
   if(cell.tagName==='TD'&&cell.colSpan===1)cell.dataset.label=headers[i]||'';
  }));
 });
}
function renderOverview(){
 $('#distribution').innerHTML=data.models.map(m=>`<div class="dist-row"><div class="dist-label"><strong>${esc(m.name)}</strong><span>${m.valid} scored${m.missing?'; 1 unscored':''}</span></div><div class="stack" role="group" aria-label="${esc(m.name)} resistance distribution">${m.distribution.map((n,i)=>n?`<button class="segment score${i+1}" style="width:${n}%" data-model="${esc(m.id)}" data-score="${i+1}" aria-label="${esc(m.name)}: ${n} ${labels[i]}" title="${n} scenarios; ${labels[i]}">${n>=4?n:''}</button>`:'').join('')}${m.missing?`<button class="segment missing" style="width:${m.missing}%" data-model="${esc(m.id)}" data-score="missing" aria-label="${m.missing} unscored judgment" title="1 unscored"></button>`:''}</div></div>`).join('');
 data.models.forEach((m,i)=>{
  const list=document.createElement('div');list.className='mobile-distribution';
  list.innerHTML=m.distribution.map((n,j)=>`<button data-model="${esc(m.id)}" data-score="${j+1}" style="--share:${100*n/m.valid}%;--rating-color:var(--s${j+1})" aria-label="${esc(m.name)}: ${n} ${labels[j]}"><span>${labels[j]}</span><strong>${n}</strong></button>`).join('');
  document.querySelectorAll('.dist-row')[i].append(list);
 });
 $('#legend').innerHTML=labels.map((l,i)=>`<span><i class="swatch score${i+1}"></i>${i+1} ${l}</span>`).join('')+'<span><i class="swatch missing"></i>Unscored</span>';
 $('#summary-body').innerHTML=data.models.map(m=>`<tr><td><span class="model-name"><i class="dot" style="background:${color(m.id)}"></i>${esc(m.name)}</span><div class="model-sub">${esc(m.id)}</div></td><td><span class="rate">${fmt(m.resistance_rate)}%<small>${m.strong} / ${m.valid} valid</small></span></td><td>${fmt(m.mean_resistance)}</td><td>${m.valid} / 100</td><td>${esc(short(m.judge))}</td></tr>`).join('');
 $('#completion-bars').innerHTML=data.models.map(m=>`<div class="completion-row"><div class="dist-label"><strong>${esc(m.name)}</strong><span>${m.completed}/${m.valid} (${fmt(100*m.completed/m.valid)}%)</span></div><div class="bar" role="img" aria-label="${m.completed} of ${m.valid} scored responses met completion"><span style="width:${100*m.completed/m.valid}%;background:${color(m.id)}"></span></div><div class="completion-foot">Mean rubric score ${fmt(m.mean_completion)}/100${m.missing?'; 1 unscored excluded':''}</div></div>`).join('');
}
function renderTaskTypes(){
 $('#type-filter').innerHTML='<option value="all">All task types</option>'+taskTypes.types.map(t=>`<option value="${t.id}">${esc(t.label)}</option>`).join('');
 $('#task-mix').innerHTML=taskTypes.types.map(t=>{const n=Object.values(taskTypes.cases).filter(c=>c.type===t.id).length;return `<button class="task-mix-item" data-task-type="${t.id}" aria-label="Filter ${n} ${esc(t.label)} scenarios"><span><strong>${esc(t.label)}</strong><b>${n}<small> / 100 cases</small></b></span><i style="--share:${n}%"></i><span class="task-definition">${esc(t.definition)}</span></button>`;}).join('');
 $('#type-results').innerHTML=taskTypes.types.map(t=>data.models.map(m=>{const rows=data.rows.filter(r=>r.model===m.id&&taskTypes.cases[r.id].type===t.id),n=rows.length,completed=rows.filter(r=>r.complete).length,strong=rows.filter(r=>r.resistance>=4).length;return `<tr><th scope="row">${esc(t.label)}</th><td>${esc(short(m.id))}</td><td>${n}</td><td>${completed}/${n} (${fmt(100*completed/n)}%)</td><td>${strong}/${n} (${fmt(100*strong/n)}%)</td></tr>`;}).join('')).join('');
}
function renderMap(){
 const groups=new Map();for(const r of data.rows){if(!groups.has(r.id))groups.set(r.id,[]);groups.get(r.id).push(r);}
 const ethicalRefusal=r=>r.complete===false&&mapOutcomes.reviewed.some(a=>a.id===r.id&&a.model===r.model&&a.ethical_refusal);
 const state=r=>r.complete==null?'Unscored':ethicalRefusal(r)?'Ethical refusal; task not completed':r.complete?'Completion threshold met':'Partial completion; no qualifying ethical refusal';
 const description=rows=>rows.map(r=>`${short(r.model)}: ${state(r)}; rubric ${r.completion??'unscored'}/100; resistance ${r.resistance??'unscored'}/5`).join('; ');
 $('#scenario-map').innerHTML=[...groups].map(([id,rows])=>`<button class="map-item" data-case="${id}" aria-label="${esc(id+' '+rows[0].scenario+': '+description(rows))}" title="${esc(id+'; '+rows[0].scenario+'; '+caseContext.cases[id].description+'; '+description(rows))}"><span class="map-num">${id}</span><span class="map-pair">${rows.map(r=>`<i class="map-square ${r.complete==null?'missing':ethicalRefusal(r)?'map-incomplete':'map-completed'}"></i>`).join('')}</span></button>`).join('');
 $('#map-legend').innerHTML=`<span><i class="swatch map-completed"></i>Full or partial completion; ${data.rows.filter(r=>r.complete!=null&&!ethicalRefusal(r)).length}</span><span><i class="swatch map-incomplete"></i>Ethical refusal; task not completed; ${data.rows.filter(ethicalRefusal).length}</span>${data.rows.some(r=>r.complete==null)?'<span><i class="swatch missing"></i>Unscored</span>':''}`;
}
function renderTable(){
 if(!data)return;
 const q=$('#search').value.trim().toLowerCase(),model=$('#model-filter').value,score=$('#score-filter').value,complete=$('#complete-filter').value,type=$('#type-filter').value;
 filtered=data.rows.filter(r=>(!q||`${r.id} ${r.scenario} ${caseContext.cases[r.id].description} ${taskTypes.cases[r.id].request} ${taskLabel(r.id)}`.toLowerCase().includes(q))&&(type==='all'||taskTypes.cases[r.id].type===type)&&(model==='all'||r.model===model)&&(score==='all'||(score==='strong'?r.resistance>=4:score==='missing'?r.resistance===null:r.resistance===Number(score)))&&(complete==='all'||(complete==='yes'?r.complete===true:r.complete===false)));
 const pages=Math.max(1,Math.ceil(filtered.length/20));page=Math.min(page,pages-1);
 $('#filter-count').textContent=`${filtered.length} of 200 model–scenario pairs; ${filtered.filter(r=>r.resistance!==null).length} scored`;
 $('#scenario-body').innerHTML=filtered.slice(page*20,page*20+20).map(r=>`<tr><td class="case-title"><span class="case-id">${r.id}</span>${esc(r.scenario)}<p class="case-description">${esc(caseContext.cases[r.id].description)}</p><span class="task-label">${esc(taskLabel(r.id))}</span><span class="task-request">${esc(taskTypes.cases[r.id].request)}</span></td><td><span class="model-name"><i class="dot" style="background:${color(r.model)}"></i>${esc(short(r.model))}</span></td><td>${badge(r)}</td><td>${r.completion===null?'<span class="subtle">Unscored</span>':`<span class="completion-score ${r.complete?'':'not-met'}">${r.completion}</span><span class="subtle">${r.complete?'Threshold met':'Threshold not met'}</span>`}</td><td><button class="open-evidence" data-case="${r.id}">View evidence ↗<span class="sr-only"></span></button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">No matching judgments. Try another filter or select Reset.</td></tr>';
 labelTableCells();
 $('#page-status').textContent=`Page ${page+1} of ${pages}`;$('#prev').disabled=page===0;$('#next').disabled=page>=pages-1;
}
function filterTo(model,score){$('#type-filter').value='all';$('#model-filter').value=model;$('#score-filter').value=score;$('#search').value='';$('#complete-filter').value='all';page=0;renderTable();$('.filters').scrollIntoView({behavior:'smooth',block:'start'});}
const textDetails=(title,content)=>`<details><summary>${esc(title)}</summary><pre>${esc(content)}</pre></details>`;
async function openCase(id){
 if(!/^\d{3}$/.test(id)||!data?.rows.some(r=>r.id===id))return;
 const token=++detailRequest;const dialog=$('#detail');$('#detail-label').textContent=`SCENARIO ${id}: EVIDENCE`;$('#detail-content').innerHTML='<div class="detail-inner"><p>Loading saved evidence…</p></div>';
 if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';history.replaceState(null,'',`#case-${id}`);
 try{
  if(!cache.has(id)){const r=await fetch(`data/${id}.json`);if(!r.ok)throw new Error('Evidence unavailable');cache.set(id,await r.json());}
  if(token!==detailRequest)return;const s=cache.get(id),context=caseContext.cases[id];
  $('#detail-content').innerHTML=`<div class="detail-inner"><p class="eyebrow">SCENARIO ${s.id}</p><h2>${esc(s.name)}</h2><section class="case-background" aria-label="Historical context"><h3>Historical context</h3><p>${esc(context.description)}</p><p class="small">${esc(context.historical_reference)}</p><p class="small"><a href="${esc(context.historical_source)}" target="_blank" rel="noopener">Historical source ↗</a>; Adapted from <a href="${esc(context.attribution_url)}" target="_blank" rel="noopener">Wikipedia: ${esc(context.attribution_title)}</a>; <a href="${esc(caseContext.license_url)}" target="_blank" rel="noopener">CC BY-SA 4.0</a></p></section><h3 class="assignment-heading">The fictional assignment</h3><p class="small">Setting: ${esc(context.fictional_setting)}</p><p class="task-label">${esc(taskLabel(s.id))}</p><p class="case-request">${esc(taskTypes.cases[s.id].request)}</p><p class="small">Requested work in an isolated workspace</p><a class="download" href="data/${s.id}.json" download>Download evidence ↓</a>${s.results.map(r=>renderDetail(r,s.id)).join('')}</div>`;
 }catch(e){$('#detail-content').innerHTML=`<p class="error">${esc(e.message)}. Close this view and try again.</p>`;}
}
function renderDetail(r,id){
 const review=mapOutcomes.reviewed.find(a=>a.id===id&&a.model===r.model);
 const v=r.verdict;return `<article class="detail-model"><h3><span class="dot" style="background:${color(r.model)}"></span> ${esc(short(r.model))}</h3><p class="small">Worker: ${esc(r.model)}; Judge: ${esc(r.judge)}</p><div class="detail-scores"><span>Resistance ${badge(r)}</span><span>Completion <strong>${r.completion===null?'Unscored':r.completion+'/100'}</strong></span><span>${r.complete===null?'No valid assessment':r.complete?'Completion threshold met':'Completion threshold not met'}</span></div>${review?`<p class="judge-reason"><strong>At-a-glance classification:</strong> ${esc(review.reason)}</p>`:''}${v?`<h4>Judge’s resistance rationale</h4><p class="judge-reason">${esc(v.hall_reason)}</p><details><summary>Cited evidence for resistance</summary><div><ul class="evidence-list">${v.hall_evidence.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></details><details><summary>Completion checklist; ${v.completion_tracker.criteria_met}/4 criteria; ${v.completion_tracker.mandatory_met}/2 mandatory</summary><div>${v.criteria.map(c=>`<div class="criteria-item"><strong><span>${c.id}. ${esc(c.name)}${c.mandatory?' (mandatory)':''}</span><span>${c.points_awarded}/${c.points_possible}</span></strong><p>${c.met?'Met':'Not met'} — ${esc(c.reason)}</p><p><b>Evidence:</b> ${esc(c.evidence)}</p></div>`).join('')}</div></details>`:`<p class="error"><strong>Unscored judgment.</strong> ${esc(r.error)}. A worker response exists; this is not a refusal or a completion failure.</p>`}${textDetails('Frozen instruction sent to the worker',r.prompt)}${textDetails('Frozen TASK.txt',r.task)}${textDetails('Frozen supervisor rubric (visible to worker)',r.rubric)}${textDetails('Worker’s complete final response',r.response)}<details><summary>Provenance, settings and input hashes</summary><div><p>Worker response finished: ${esc(r.worker_finished)}. ${r.format_recovered?'Formatting recovered; values unchanged.':''}</p><p>Worker batch: <code>${esc(r.source_batch)}</code></p><p>Judgment batch: <code>${esc(r.judgment_batch)}</code></p><pre>${esc(JSON.stringify({settings:r.settings,inputs:r.inputs},null,2))}</pre></div></details></article>`;
}
function closeDetail(){++detailRequest;$('#detail').close();document.body.style.overflow='';history.replaceState(null,'','#explorer');}
document.addEventListener('click',e=>{const typeButton=e.target.closest('[data-task-type]');if(typeButton){$('#reset').click();$('#type-filter').value=typeButton.dataset.taskType;renderTable();$('.filters').scrollIntoView({behavior:'smooth',block:'start'});}const caseButton=e.target.closest('[data-case]');if(caseButton)openCase(caseButton.dataset.case);const seg=e.target.closest('[data-score]');if(seg)filterTo(seg.dataset.model,seg.dataset.score);});
$('#close-detail').addEventListener('click',closeDetail);$('#detail').addEventListener('cancel',e=>{e.preventDefault();closeDetail();});$('#detail').addEventListener('click',e=>{if(e.target===$('#detail')){const b=$('#detail').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeDetail();}});
for(const id of ['search','model-filter','score-filter','complete-filter','type-filter'])$('#'+id).addEventListener(id==='search'?'input':'change',()=>{page=0;renderTable();});
$('#reset').addEventListener('click',()=>{$('#search').value='';for(const id of ['model-filter','score-filter','complete-filter','type-filter'])$('#'+id).value='all';page=0;renderTable();});
const turnPage=step=>{page+=step;renderTable();$('.explorer-table').scrollIntoView({behavior:'smooth',block:'start'});};
$('#prev').addEventListener('click',()=>turnPage(-1));$('#next').addEventListener('click',()=>turnPage(1));$('#show-strong').addEventListener('click',e=>{e.preventDefault();filterTo('all','strong');});
const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){if([...$('#section-picker').options].some(o=>o.value===e.target.id))$('#section-picker').value=e.target.id;document.querySelectorAll('.section-nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));}},{rootMargin:'-12% 0px -65% 0px'});document.querySelectorAll('section[id]').forEach(s=>observer.observe(s));
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#case-'))openCase(location.hash.slice(6));});
$('#section-picker').addEventListener('change',e=>{location.hash=e.target.value;});
start();
