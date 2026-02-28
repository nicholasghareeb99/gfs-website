(function(){
if(window.__gap)return;window.__gap=true;
var S='gfs_admin_',PK=function(){return location.pathname.replace(/\//g,'_')||'_home'};
/* Analytics */
!function(){var n=new Date,t=n.toISOString().split('T')[0];
var v=JSON.parse(localStorage.getItem(S+'visits')||'{}'),p=JSON.parse(localStorage.getItem(S+'pages')||'{}'),
s=JSON.parse(localStorage.getItem(S+'sources')||'{}'),d=JSON.parse(localStorage.getItem(S+'devices')||'{}'),
g=JSON.parse(localStorage.getItem(S+'geo')||'{}');
v[t]=(v[t]||0)+1;localStorage.setItem(S+'visits',JSON.stringify(v));
p[location.pathname]=(p[location.pathname]||0)+1;localStorage.setItem(S+'pages',JSON.stringify(p));
try{var r=document.referrer?new URL(document.referrer).hostname:'direct';s[r]=(s[r]||0)+1;localStorage.setItem(S+'sources',JSON.stringify(s))}catch(e){}
var ua=navigator.userAgent,dv=/Mobile|Android/.test(ua)?'Mobile':/Tablet|iPad/.test(ua)?'Tablet':'Desktop';
d[dv]=(d[dv]||0)+1;localStorage.setItem(S+'devices',JSON.stringify(d));
var tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'Unknown',rg=tz.split('/')[0]||'Unknown';
g[rg]=(g[rg]||0)+1;localStorage.setItem(S+'geo',JSON.stringify(g));
if(!sessionStorage.getItem(S+'ses')){sessionStorage.setItem(S+'ses','1');
var ss=JSON.parse(localStorage.getItem(S+'sessions')||'{}');ss[t]=(ss[t]||0)+1;localStorage.setItem(S+'sessions',JSON.stringify(ss))}}();

/* CSS */
var st=document.createElement('style');st.textContent=`
#gap{display:none;position:fixed;inset:0;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
#gap.open{display:flex}.gap-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(2px)}
.gap-p{position:fixed;top:0;right:0;width:520px;max-width:95vw;height:100vh;background:#0f1117;color:#e0e0e0;display:flex;flex-direction:column;box-shadow:-4px 0 32px rgba(0,0,0,.4);animation:gSlide .25s ease}
@keyframes gSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}
.gap-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #1e2030;background:#0a0c14}
.gap-logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:.92rem;color:#d4af37}
.gap-x{background:none;border:none;color:#888;font-size:22px;cursor:pointer;padding:4px 8px;border-radius:4px}
.gap-x:hover{color:#fff;background:rgba(255,255,255,.1)}
.gap-tabs{display:flex;border-bottom:1px solid #1e2030;background:#0a0c14;padding:0 12px}
.gap-tab{background:none;border:none;color:#888;font-size:.8rem;font-weight:600;padding:11px 14px;cursor:pointer;border-bottom:2px solid transparent;transition:.2s}
.gap-tab:hover{color:#ccc}.gap-tab.on{color:#d4af37;border-bottom-color:#d4af37}
.gap-bd{flex:1;overflow-y:auto;padding:18px}.gap-bd::-webkit-scrollbar{width:5px}.gap-bd::-webkit-scrollbar-thumb{background:#2a2d3a;border-radius:3px}
.gap-pn{display:none}.gap-pn.on{display:block}
.gap-st{font-size:.75rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8b8fa3;margin:0 0 12px;padding-bottom:7px;border-bottom:1px solid #1e2030}
.gap-f{margin-bottom:14px}.gap-f label{display:block;font-size:.75rem;font-weight:600;color:#a0a4b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.gap-f input,.gap-f textarea,.gap-f select{width:100%;padding:9px 11px;background:#1a1d2b;border:1px solid #2a2d3a;border-radius:6px;color:#e0e0e0;font-size:.85rem;font-family:inherit;outline:none;box-sizing:border-box}
.gap-f input:focus,.gap-f textarea:focus{border-color:#d4af37}
.gap-h{font-size:.7rem;color:#5a5e72;margin-top:2px;display:block}
.gap-div{height:1px;background:#1e2030;margin:18px 0}
.gap-row{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px}
.gap-chk{display:flex;align-items:center;gap:5px;font-size:.82rem;color:#a0a4b8;cursor:pointer}
.gap-chk input{width:auto;accent-color:#d4af37}
.gap-btn{display:inline-block;padding:9px 18px;border:none;border-radius:6px;font-size:.82rem;font-weight:600;cursor:pointer;margin-right:6px;margin-bottom:6px;transition:.2s}
.gap-btn1{background:#d4af37;color:#0a0c14}.gap-btn1:hover{background:#c9a230}
.gap-btn2{background:#1e2030;color:#a0a4b8;border:1px solid #2a2d3a}.gap-btn2:hover{background:#2a2d3a;color:#e0e0e0}
.gap-sg{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.gap-sc{background:#1a1d2b;border-radius:8px;padding:14px 10px;text-align:center;border:1px solid #2a2d3a}
.gap-sv{font-size:1.4rem;font-weight:700;color:#d4af37}.gap-sl{font-size:.7rem;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-top:3px}
.gap-ch{height:110px;display:flex;align-items:flex-end;gap:3px;padding:10px 0}
.gap-cb{flex:1;background:#d4af37;border-radius:3px 3px 0 0;min-height:2px;position:relative;cursor:pointer;transition:.3s}
.gap-cb:hover{background:#e8c84a}
.gap-cb .gap-tt{display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#0a0c14;color:#e0e0e0;padding:3px 7px;border-radius:3px;font-size:.68rem;white-space:nowrap;margin-bottom:3px;border:1px solid #2a2d3a}
.gap-cb:hover .gap-tt{display:block}
.gap-tr{display:flex;justify-content:space-between;padding:7px 10px;border-radius:4px;font-size:.82rem}
.gap-tr:nth-child(odd){background:rgba(255,255,255,.02)}.gap-tr:hover{background:rgba(212,175,55,.08)}
.gap-tk{color:#a0a4b8}.gap-tv{color:#d4af37;font-weight:600}
.gap-br{display:flex;align-items:center;gap:10px;margin-bottom:7px}
.gap-bl{width:60px;font-size:.8rem;color:#a0a4b8;text-align:right}
.gap-bt{flex:1;height:22px;background:#1a1d2b;border-radius:4px;overflow:hidden}
.gap-bf{height:100%;background:linear-gradient(90deg,#d4af37,#e8c84a);border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:7px;font-size:.7rem;font-weight:700;color:#0a0c14;min-width:28px}
.gap-ag{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px}
.gap-ab{background:#1a1d2b;border:1px solid #2a2d3a;color:#a0a4b8;padding:12px 8px;border-radius:7px;font-size:.76rem;font-weight:600;cursor:pointer;text-align:center;transition:.2s}
.gap-ab:hover{background:#252838;color:#d4af37;border-color:#d4af37}
.gap-sp{margin-top:14px;background:#fff;border-radius:8px;padding:14px;max-width:480px}
.gap-sp-u{font-size:.8rem;color:#202124}.gap-sp-t{font-size:1.05rem;color:#1a0dab;margin:3px 0 2px;cursor:pointer}.gap-sp-t:hover{text-decoration:underline}.gap-sp-d{font-size:.82rem;color:#4d5156;line-height:1.4}
.gap-cr{display:flex;align-items:center;gap:8px}.gap-cr input[type=color]{width:36px;height:32px;padding:1px;cursor:pointer;border:1px solid #2a2d3a;border-radius:4px;background:#1a1d2b}
#et-btn-admin{background:linear-gradient(135deg,#d4af37,#c9a230)!important;color:#0a0c14!important;font-weight:700!important;border:none!important;padding:6px 13px!important;border-radius:6px!important;cursor:pointer!important;font-size:.8rem!important;transition:.2s!important}
#et-btn-admin:hover{background:linear-gradient(135deg,#e8c84a,#d4af37)!important;transform:translateY(-1px)!important}
@media(max-width:600px){.gap-p{width:100vw}.gap-sg{grid-template-columns:repeat(2,1fr)}.gap-ag{grid-template-columns:repeat(2,1fr)}}
`;document.head.appendChild(st);

/* HTML */
var el=document.createElement('div');el.id='gap';
el.innerHTML='<div class="gap-ov" id="gap-ov"></div><div class="gap-p"><div class="gap-hd"><div class="gap-logo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><span>GFS Admin</span></div><button class="gap-x" id="gap-x">&times;</button></div><div class="gap-tabs"><button class="gap-tab on" data-t="seo">SEO</button><button class="gap-tab" data-t="analytics">Analytics</button><button class="gap-tab" data-t="content">Content</button><button class="gap-tab" data-t="settings">Settings</button></div><div class="gap-bd"><div class="gap-pn on" id="gp-seo"><div class="gap-st">Page SEO</div><div class="gap-f"><label>Page Title</label><input id="gs-title" placeholder="50-60 chars recommended"/><span class="gap-h" id="gs-title-ct"></span></div><div class="gap-f"><label>Meta Description</label><textarea id="gs-desc" rows="3" placeholder="150-160 chars"></textarea><span class="gap-h" id="gs-desc-ct"></span></div><div class="gap-f"><label>Keywords</label><input id="gs-kw" placeholder="keyword1, keyword2"/></div><div class="gap-f"><label>Canonical URL</label><input id="gs-canon"/></div><div class="gap-div"></div><div class="gap-st">Open Graph</div><div class="gap-f"><label>OG Title</label><input id="gs-ogt"/></div><div class="gap-f"><label>OG Description</label><textarea id="gs-ogd" rows="2"></textarea></div><div class="gap-f"><label>OG Image URL</label><input id="gs-ogi" placeholder="/images/og.jpg"/></div><div class="gap-f"><label>OG Type</label><select id="gs-ogtp"><option value="website">Website</option><option value="article">Article</option><option value="local_business">Local Business</option></select></div><div class="gap-div"></div><div class="gap-st">Robots & Indexing</div><div class="gap-row"><label class="gap-chk"><input type="checkbox" id="gs-idx" checked/> Index</label><label class="gap-chk"><input type="checkbox" id="gs-fol" checked/> Follow</label></div><div class="gap-div"></div><div class="gap-st">Schema / Structured Data</div><div class="gap-f"><label>Business Name</label><input id="gs-sn" value="Ghareeb Fencing Solutions"/></div><div class="gap-f"><label>Service Area</label><input id="gs-sa" value="Toledo OH, Perrysburg OH, Monroe MI"/></div><div class="gap-f"><label>Phone</label><input id="gs-sp" value="(419) 902-8257"/></div><div class="gap-f"><label>Rating / Reviews</label><div class="gap-row"><input id="gs-sr" value="4.9" style="width:80px"/><input id="gs-srev" value="127" style="width:80px"/></div></div><button class="gap-btn gap-btn1" id="gs-save">Save SEO</button><button class="gap-btn gap-btn2" id="gs-prev">Preview in Search</button><div id="gs-sp-box" class="gap-sp" style="display:none"><div class="gap-sp-u">ghareebfencing.com<span id="gs-sp-path"></span></div><div class="gap-sp-t" id="gs-sp-t"></div><div class="gap-sp-d" id="gs-sp-d"></div></div></div><div class="gap-pn" id="gp-analytics"><div class="gap-st">Traffic Overview</div><div class="gap-sg"><div class="gap-sc"><div class="gap-sv" id="ga-today">0</div><div class="gap-sl">Today</div></div><div class="gap-sc"><div class="gap-sv" id="ga-week">0</div><div class="gap-sl">This Week</div></div><div class="gap-sc"><div class="gap-sv" id="ga-month">0</div><div class="gap-sl">This Month</div></div><div class="gap-sc"><div class="gap-sv" id="ga-total">0</div><div class="gap-sl">All Time</div></div></div><div class="gap-div"></div><div class="gap-st">Daily Views (14 days)</div><div class="gap-ch" id="ga-chart"></div><div class="gap-div"></div><div class="gap-st">Top Pages</div><div id="ga-pages"></div><div class="gap-div"></div><div class="gap-st">Traffic Sources</div><div id="ga-src"></div><div class="gap-div"></div><div class="gap-st">Devices</div><div id="ga-dev"></div><div class="gap-div"></div><div class="gap-st">Regions</div><div id="ga-geo"></div><div class="gap-div"></div><div class="gap-st">Sessions</div><div class="gap-sg" style="grid-template-columns:repeat(2,1fr)"><div class="gap-sc"><div class="gap-sv" id="ga-ses-t">0</div><div class="gap-sl">Sessions Today</div></div><div class="gap-sc"><div class="gap-sv" id="ga-ses-w">0</div><div class="gap-sl">This Week</div></div></div><div class="gap-div"></div><div class="gap-f"><label>GA4 Measurement ID</label><input id="ga-id" placeholder="G-XXXXXXXXXX"/><span class="gap-h">For advanced analytics</span></div><button class="gap-btn gap-btn1" id="ga-save">Save GA4 ID</button><button class="gap-btn gap-btn2" id="ga-reset">Reset Analytics</button></div><div class="gap-pn" id="gp-content"><div class="gap-st">Editable Elements</div><div id="gc-list" style="max-height:280px;overflow-y:auto"></div><div class="gap-div"></div><div class="gap-st">Quick Actions</div><div class="gap-ag"><button class="gap-ab" id="gc-edit">\u270F\uFE0F Edit Mode</button><button class="gap-ab" id="gc-nav">\uD83E\uDDED Navigation</button><button class="gap-ab" id="gc-pages">\uD83D\uDCC4 Pages</button><button class="gap-ab" id="gc-colors">\uD83C\uDFA8 Colors</button><button class="gap-ab" id="gc-seo">\uD83D\uDD0D SEO Editor</button><button class="gap-ab" id="gc-export">\uD83D\uDCE6 Export</button></div><div class="gap-div"></div><div class="gap-st">Saved Changes</div><div id="gc-changes" style="max-height:180px;overflow-y:auto"></div><button class="gap-btn gap-btn2" id="gc-clear">Clear Page Changes</button></div><div class="gap-pn" id="gp-settings"><div class="gap-st">Company</div><div class="gap-f"><label>Name</label><input id="gset-co" value="Ghareeb Fencing Solutions"/></div><div class="gap-f"><label>Phone</label><input id="gset-ph" value="(419) 902-8257"/></div><div class="gap-f"><label>Email</label><input id="gset-em" placeholder="info@ghareebfencing.com"/></div><div class="gap-div"></div><div class="gap-st">Colors</div><div class="gap-f"><label>Primary</label><div class="gap-cr"><input type="color" id="gset-c1" value="#1e3a5f"/><input id="gset-c1h" value="#1e3a5f" style="width:90px;font-family:monospace"/></div></div><div class="gap-f"><label>Accent (Gold)</label><div class="gap-cr"><input type="color" id="gset-c2" value="#d4af37"/><input id="gset-c2h" value="#d4af37" style="width:90px;font-family:monospace"/></div></div><div class="gap-div"></div><div class="gap-st">Advanced</div><div class="gap-f"><label>Custom CSS</label><textarea id="gset-css" rows="4" placeholder="body { ... }"></textarea></div><button class="gap-btn gap-btn1" id="gset-save">Save Settings</button></div></div></div>';
document.body.appendChild(el);

/* Logic */
function $(id){return document.getElementById(id)}
function tabs(){el.querySelectorAll('.gap-tab').forEach(function(t){t.addEventListener('click',function(){
el.querySelectorAll('.gap-tab').forEach(function(x){x.classList.remove('on')});
el.querySelectorAll('.gap-pn').forEach(function(x){x.classList.remove('on')});
t.classList.add('on');$('gp-'+t.dataset.t).classList.add('on');
if(t.dataset.t==='analytics')renderA();if(t.dataset.t==='seo')loadSEO();if(t.dataset.t==='content')renderC();if(t.dataset.t==='settings')loadSet();})})}
$('gap-x').onclick=function(){el.classList.remove('open')};
$('gap-ov').onclick=function(){el.classList.remove('open')};
tabs();

/* SEO */
function loadSEO(){var k=PK(),o=JSON.parse(localStorage.getItem(S+'seo_'+k)||'{}');
$('gs-title').value=o.title||document.title||'';$('gs-desc').value=o.desc||(document.querySelector('meta[name=description]')||{}).content||'';
$('gs-kw').value=o.kw||(document.querySelector('meta[name=keywords]')||{}).content||'';
$('gs-canon').value=o.canon||location.href;$('gs-ogt').value=o.ogt||'';$('gs-ogd').value=o.ogd||'';
$('gs-ogi').value=o.ogi||'';$('gs-ogtp').value=o.ogtp||'website';$('gs-idx').checked=o.idx!==false;$('gs-fol').checked=o.fol!==false;
$('gs-sn').value=o.sn||'Ghareeb Fencing Solutions';$('gs-sa').value=o.sa||'Toledo OH, Perrysburg OH, Monroe MI';
$('gs-sp').value=o.sp||'(419) 902-8257';$('gs-sr').value=o.sr||'4.9';$('gs-srev').value=o.srev||'127';
$('gs-title').oninput=function(){$('gs-title-ct').textContent=this.value.length+'/60'};
$('gs-desc').oninput=function(){$('gs-desc-ct').textContent=this.value.length+'/160'};
$('gs-title').oninput();$('gs-desc').oninput();}
$('gs-save').onclick=function(){var k=PK(),o={title:$('gs-title').value,desc:$('gs-desc').value,kw:$('gs-kw').value,
canon:$('gs-canon').value,ogt:$('gs-ogt').value,ogd:$('gs-ogd').value,ogi:$('gs-ogi').value,ogtp:$('gs-ogtp').value,
idx:$('gs-idx').checked,fol:$('gs-fol').checked,sn:$('gs-sn').value,sa:$('gs-sa').value,sp:$('gs-sp').value,
sr:$('gs-sr').value,srev:$('gs-srev').value};localStorage.setItem(S+'seo_'+k,JSON.stringify(o));
document.title=o.title;var m=document.querySelector('meta[name=description]');if(!m){m=document.createElement('meta');m.name='description';document.head.appendChild(m)}m.content=o.desc;alert('SEO saved for '+location.pathname)};
$('gs-prev').onclick=function(){var b=$('gs-sp-box');b.style.display=b.style.display==='none'?'block':'none';
$('gs-sp-path').textContent=location.pathname;$('gs-sp-t').textContent=$('gs-title').value||document.title;$('gs-sp-d').textContent=$('gs-desc').value};

/* Analytics */
function renderA(){var v=JSON.parse(localStorage.getItem(S+'visits')||'{}'),p=JSON.parse(localStorage.getItem(S+'pages')||'{}'),
s=JSON.parse(localStorage.getItem(S+'sources')||'{}'),d=JSON.parse(localStorage.getItem(S+'devices')||'{}'),
g=JSON.parse(localStorage.getItem(S+'geo')||'{}'),ss=JSON.parse(localStorage.getItem(S+'sessions')||'{}');
var n=new Date,t=n.toISOString().split('T')[0],tc=v[t]||0,wc=0,mc=0,tot=0;
Object.entries(v).forEach(function(e){tot+=e[1];var df=(n-new Date(e[0]))/864e5;if(df<=7)wc+=e[1];if(df<=30)mc+=e[1]});
$('ga-today').textContent=tc;$('ga-week').textContent=wc;$('ga-month').textContent=mc;$('ga-total').textContent=tot;
var st=ss[t]||0,sw=0;Object.entries(ss).forEach(function(e){if((n-new Date(e[0]))/864e5<=7)sw+=e[1]});
$('ga-ses-t').textContent=st;$('ga-ses-w').textContent=sw;
var ch=$('ga-chart');ch.innerHTML='';var days=[];
for(var i=13;i>=0;i--){var dd=new Date(n);dd.setDate(dd.getDate()-i);var dk=dd.toISOString().split('T')[0];days.push({d:dk,c:v[dk]||0})}
var mx=Math.max.apply(null,days.map(function(x){return x.c}).concat([1]));
days.forEach(function(x){var b=document.createElement('div');b.className='gap-cb';b.style.height=Math.max(x.c/mx*100,2)+'%';
b.innerHTML='<div class="gap-tt">'+x.d.slice(5)+': '+x.c+'</div>';ch.appendChild(b)});
var pe=$('ga-pages');var sp=Object.entries(p).sort(function(a,b){return b[1]-a[1]}).slice(0,8);
pe.innerHTML=sp.map(function(x){return'<div class="gap-tr"><span class="gap-tk">'+x[0]+'</span><span class="gap-tv">'+x[1]+'</span></div>'}).join('')||'<div class="gap-tr"><span class="gap-tk">No data</span></div>';
var se=$('ga-src');var ss2=Object.entries(s).sort(function(a,b){return b[1]-a[1]}).slice(0,6);
se.innerHTML=ss2.map(function(x){return'<div class="gap-tr"><span class="gap-tk">'+x[0]+'</span><span class="gap-tv">'+x[1]+'</span></div>'}).join('')||'<div class="gap-tr"><span class="gap-tk">No data</span></div>';
var de=$('ga-dev');var td=Object.values(d).reduce(function(a,b){return a+b},0)||1;
de.innerHTML=Object.entries(d).map(function(x){var pc=Math.round(x[1]/td*100);return'<div class="gap-br"><div class="gap-bl">'+x[0]+'</div><div class="gap-bt"><div class="gap-bf" style="width:'+pc+'%">'+pc+'%</div></div></div>'}).join('')||'<div class="gap-tr"><span class="gap-tk">No data</span></div>';
var ge=$('ga-geo');var sg=Object.entries(g).sort(function(a,b){return b[1]-a[1]});
ge.innerHTML=sg.map(function(x){return'<div class="gap-tr"><span class="gap-tk">'+x[0]+'</span><span class="gap-tv">'+x[1]+'</span></div>'}).join('')||'<div class="gap-tr"><span class="gap-tk">No data</span></div>';
$('ga-id').value=localStorage.getItem(S+'ga4')||''}
$('ga-save').onclick=function(){localStorage.setItem(S+'ga4',$('ga-id').value);alert('GA4 ID saved!')};
$('ga-reset').onclick=function(){if(confirm('Reset all analytics?')){['visits','pages','sources','devices','geo','hourly','sessions'].forEach(function(k){localStorage.removeItem(S+k)});renderA()}};

/* Content */
function renderC(){var ls=$('gc-list'),eds=document.querySelectorAll('[data-et-editable]'),imgs=document.querySelectorAll('[data-et-img]'),h='';
eds.forEach(function(e,i){var t=e.textContent.trim().substring(0,45);h+='<div class="gap-tr" style="cursor:pointer" data-si="'+i+'"><span class="gap-tk">'+t+(t.length>=45?'...':'')+'</span><span class="gap-tv" style="font-size:.68rem;background:#2a2d3a;padding:2px 6px;border-radius:8px">'+e.tagName.toLowerCase()+'</span></div>'});
imgs.forEach(function(m,i){h+='<div class="gap-tr"><span class="gap-tk">'+(m.alt||'Image '+(i+1)).substring(0,40)+'</span><span class="gap-tv" style="font-size:.68rem;background:#2a2d3a;padding:2px 6px;border-radius:8px">img</span></div>'});
ls.innerHTML=h||'<p style="color:#5a5e72;font-size:.82rem">Enter edit mode first</p>';
ls.querySelectorAll('[data-si]').forEach(function(x){x.onclick=function(){var idx=parseInt(x.dataset.si),e=eds[idx];if(e){e.scrollIntoView({behavior:'smooth',block:'center'});e.style.outline='2px solid #d4af37';setTimeout(function(){e.style.outline=''},2000)}}});
var ch=$('gc-changes'),keys=Object.keys(localStorage).filter(function(k){return k.startsWith('gfs_edit_')});
ch.innerHTML=keys.length?keys.map(function(k){return'<div style="font-size:.8rem;padding:5px 0;color:#a0a4b8;border-bottom:1px solid #1e2030">'+k.replace('gfs_edit_','')+'</div>'}).join(''):'<p style="color:#5a5e72;font-size:.82rem">No changes</p>'}
$('gc-edit').onclick=function(){el.classList.remove('open');var b=document.getElementById('et-btn-edit');if(b)b.click()};
$('gc-nav').onclick=function(){el.classList.remove('open');var b=document.getElementById('et-btn-nav');if(b)b.click()};
$('gc-pages').onclick=function(){el.classList.remove('open');var b=document.getElementById('et-btn-pages');if(b)b.click()};
$('gc-colors').onclick=function(){el.classList.remove('open');var b=document.getElementById('et-btn-colors');if(b)b.click()};
$('gc-seo').onclick=function(){el.querySelectorAll('.gap-tab').forEach(function(x){x.classList.remove('on')});el.querySelectorAll('.gap-pn').forEach(function(x){x.classList.remove('on')});el.querySelector('[data-t=seo]').classList.add('on');$('gp-seo').classList.add('on');loadSEO()};
$('gc-export').onclick=function(){var d={};Object.keys(localStorage).filter(function(k){return k.startsWith('gfs_')}).forEach(function(k){d[k]=localStorage.getItem(k)});
var b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='gfs-export-'+new Date().toISOString().split('T')[0]+'.json';a.click();URL.revokeObjectURL(u)};
$('gc-clear').onclick=function(){if(confirm('Clear all page changes?')){var k=PK();Object.keys(localStorage).filter(function(x){return x.includes(k)}).forEach(function(x){localStorage.removeItem(x)});location.reload()}};

/* Settings */
function loadSet(){var o=JSON.parse(localStorage.getItem(S+'settings')||'{}');
if(o.co)$('gset-co').value=o.co;if(o.ph)$('gset-ph').value=o.ph;if(o.em)$('gset-em').value=o.em;
if(o.c1){$('gset-c1').value=o.c1;$('gset-c1h').value=o.c1}if(o.c2){$('gset-c2').value=o.c2;$('gset-c2h').value=o.c2}
if(o.css)$('gset-css').value=o.css}
$('gset-c1').oninput=function(){$('gset-c1h').value=this.value};$('gset-c2').oninput=function(){$('gset-c2h').value=this.value};
$('gset-c1h').oninput=function(){if(/^#[0-9a-f]{6}$/i.test(this.value))$('gset-c1').value=this.value};
$('gset-c2h').oninput=function(){if(/^#[0-9a-f]{6}$/i.test(this.value))$('gset-c2').value=this.value};
$('gset-save').onclick=function(){var o={co:$('gset-co').value,ph:$('gset-ph').value,em:$('gset-em').value,
c1:$('gset-c1').value,c2:$('gset-c2').value,css:$('gset-css').value};localStorage.setItem(S+'settings',JSON.stringify(o));
document.documentElement.style.setProperty('--color-primary',o.c1);document.documentElement.style.setProperty('--color-secondary',o.c2);alert('Settings saved!')};

/* Toolbar button */
setTimeout(function(){var tb=document.getElementById('et-toolbar');if(tb){var b=document.createElement('button');b.id='et-btn-admin';b.textContent='\u26A1 Admin';
b.onclick=function(){el.classList.add('open');loadSEO()};tb.appendChild(b)}},600);

/* Keyboard: Cmd/Ctrl+Shift+A = admin panel */
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='a'||e.key==='A')){e.preventDefault();el.classList.toggle('open');if(el.classList.contains('open'))loadSEO()}});
loadSEO();
})();