/* GFS Admin Panel Loader - loads from inline */
(function(){
if(window.__gfsAdmin)return;window.__gfsAdmin=true;
var SP='gfs_admin_';
var pk=function(){return location.pathname.replace(/\//g,'_')||'_home';};

/* Analytics tracker */
(function(){
var n=new Date(),t=n.toISOString().split('T')[0],h=n.getHours();
var v=JSON.parse(localStorage.getItem(SP+'visits')||'{}');
var p=JSON.parse(localStorage.getItem(SP+'pages')||'{}');
var s=JSON.parse(localStorage.getItem(SP+'sources')||'{}');
var d=JSON.parse(localStorage.getItem(SP+'devices')||'{}');
var g=JSON.parse(localStorage.getItem(SP+'geo')||'{}');
var hr=JSON.parse(localStorage.getItem(SP+'hourly')||'{}');
v[t]=(v[t]||0)+1;localStorage.setItem(SP+'visits',JSON.stringify(v));
var pp=location.pathname;p[pp]=(p[pp]||0)+1;localStorage.setItem(SP+'pages',JSON.stringify(p));
var ref=document.referrer?new URL(document.referrer).hostname:'direct';
s[ref]=(s[ref]||0)+1;localStorage.setItem(SP+'sources',JSON.stringify(s));
var ua=navigator.userAgent;
var dev=/Mobile|Android/.test(ua)?'Mobile':/Tablet|iPad/.test(ua)?'Tablet':'Desktop';
d[dev]=(d[dev]||0)+1;localStorage.setItem(SP+'devices',JSON.stringify(d));
var hk=t+':'+h;hr[hk]=(hr[hk]||0)+1;localStorage.setItem(SP+'hourly',JSON.stringify(hr));
var tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'Unknown';
var rg=tz.split('/')[0]||'Unknown';g[rg]=(g[rg]||0)+1;localStorage.setItem(SP+'geo',JSON.stringify(g));
if(!sessionStorage.getItem(SP+'session')){
sessionStorage.setItem(SP+'session','1');
var ss=JSON.parse(localStorage.getItem(SP+'sessions')||'{}');
ss[t]=(ss[t]||0)+1;localStorage.setItem(SP+'sessions',JSON.stringify(ss));
}
})();
})();