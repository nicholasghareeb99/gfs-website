/* User-controlled exploration; no timers, tracking or network requests. */
(function () {
 'use strict';
 function chooser(controlSelector, panelSelector) {
  var controls=document.querySelector(controlSelector),panels=Array.from(document.querySelectorAll(panelSelector));
  if(!controls||!panels.length)return;
  var buttons=Array.from(controls.querySelectorAll('button')),selected=0;
  function render(index,focus){
   selected=index;var editing=document.body.classList.contains('editing');
   buttons.forEach(function(button,i){button.setAttribute('aria-pressed',String(i===index));});
   panels.forEach(function(panel,i){panel.hidden=!editing&&i!==index;});
   if(controlSelector==='.style-controls'){
    var plan=document.querySelector('[data-style-plan]');
    if(plan){var keys=['cedar','vinyl','aluminum','wood','chainlink','split-rail'];plan.href='/quote/ballpark/?project='+keys[index];plan.textContent='Plan with '+buttons[index].textContent.toLowerCase()+' →';}
   }
   if(focus)buttons[index].focus();
  }
  buttons.forEach(function(button,i){
   button.addEventListener('click',function(){render(i,false);});
   button.addEventListener('keydown',function(event){
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    var next=event.key==='ArrowRight'?(i+1)%buttons.length:event.key==='ArrowLeft'?(i+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:null;
    if(next!==null){event.preventDefault();render(next,true);}
   });
  });
  controls.hidden=false;render(0,false);
  new MutationObserver(function(){render(selected,false);}).observe(document.body,{attributes:true,attributeFilter:['class']});
 }
 var grid=document.querySelector('#style-explorer');
 if(grid){grid.classList.add('interactive-styles');var hint=document.querySelector('.style-hint');if(hint)hint.hidden=false;}
 chooser('.style-controls','#style-explorer > .fence-card');
 chooser('.tour-controls','[data-tour-panel]');
 var heroActions=document.querySelector('.hero2__cta');
 if(heroActions&&'IntersectionObserver' in window){
  new IntersectionObserver(function(entries){document.body.classList.toggle('hero-actions-visible',entries[0].intersectionRatio>.5);},{threshold:[0,.5,1]}).observe(heroActions);
 }
 // Native modal focus management; original image links remain the no-JS fallback.
 var viewer=document.createElement('dialog');
 if(typeof viewer.showModal==='function'){
  viewer.className='portal-image-viewer';viewer.setAttribute('aria-label','Customer portal screenshot');viewer.setAttribute('data-gfs-protected','');
  viewer.innerHTML='<div class="portal-image-toolbar"><strong>Customer portal · Sample project</strong><button type="button" data-zoom aria-pressed="false">Zoom in</button><button type="button" data-close autofocus>Close</button></div><div class="portal-image-canvas" tabindex="0" role="region" aria-label="Screenshot; scroll to explore when zoomed"><img alt=""></div><p class="portal-image-help">Select Zoom in for readable details, then scroll across the screenshot. Sample project shown.</p>';
  document.body.appendChild(viewer);
  var canvas=viewer.querySelector('.portal-image-canvas'),picture=viewer.querySelector('img'),zoom=viewer.querySelector('[data-zoom]'),opener;
  viewer.querySelector('[data-close]').addEventListener('click',function(){viewer.close();});
  zoom.addEventListener('click',function(){var enlarged=canvas.classList.toggle('is-zoomed');zoom.textContent=enlarged?'Fit to screen':'Zoom in';zoom.setAttribute('aria-pressed',String(enlarged));});
  viewer.addEventListener('close',function(){if(opener)opener.focus({preventScroll:true});});
  document.querySelectorAll('.portal-screen>a:not([data-portal-shot])').forEach(function(link){link.addEventListener('click',function(event){
   if(document.body.classList.contains('editing')||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   event.preventDefault();opener=link;picture.src=link.href;picture.alt=link.querySelector('img').alt;canvas.classList.remove('is-zoomed');zoom.textContent='Zoom in';zoom.setAttribute('aria-pressed','false');viewer.showModal();canvas.scrollTop=0;canvas.scrollLeft=0;
  });});
 }
})();
