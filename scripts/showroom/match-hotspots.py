import cv2, numpy as np, json, os, time
ROOT='/home/claude/nicholasghareeb99/gfs-website/public'
raw=json.load(open('hotspots_raw.json'))
# merge vertically stacked pieces with same x-span (hero photos split at a flat row)
hs={}
for k,rs in raw.items():
    rs=[r for r in rs if r[2]*r[3]>=0.018]
    changed=True
    while changed:
        changed=False
        for i in range(len(rs)):
            for j in range(len(rs)):
                if i==j: continue
                a,b=rs[i],rs[j]
                if abs(a[0]-b[0])<.012 and abs(a[2]-b[2])<.02 and 0<=b[1]-(a[1]+a[3])<.02:
                    rs[i]=[a[0],a[1],max(a[2],b[2]),round(b[1]+b[3]-a[1],4)];rs.pop(j);changed=True;break
            if changed:break
    hs[k]=rs
photos=json.load(open('photos.json'))
lib=json.load(open(ROOT+'/assets/data/site-photo-library.json'))
cands=[]
for p in photos:
    if p['th'] and os.path.exists(ROOT+p['th']): cands.append(dict(kind='archive',id=p['id'],src=p['th'],full=p['full'],m=p['m'],tag=p['tag'],alt=p['alt']))
for i,p in enumerate(lib):
    s=p.get('thumbnail') or p['src']
    if os.path.exists(ROOT+s): cands.append(dict(kind='library',id='lib%d'%i,src=s,full=p['src'],tag=p.get('categoryLabel'),cat=p.get('category'),alt=p['alt']))
print('cands',len(cands))
sift=cv2.SIFT_create(nfeatures=600)
def feats(img):
    g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    s=480/max(g.shape);g=cv2.resize(g,None,fx=s,fy=s) if s<1 else g
    k,d=sift.detectAndCompute(g,None);return k,d,s
t=time.time()
CF=[]
for c in cands:
    im=cv2.imread(ROOT+c['src'])
    if im is None: CF.append(None);continue
    CF.append(feats(im))
print('cand feats',time.time()-t)
flann=cv2.FlannBasedMatcher(dict(algorithm=1,trees=4),dict(checks=40))
out={}
for k,rs in hs.items():
    page=cv2.imread(f'{ROOT}/assets/brochure/pages/{k}.webp');H,W=page.shape[:2]
    res=[]
    for r in rs:
        x,y,w,h=int(r[0]*W),int(r[1]*H),int(r[2]*W),int(r[3]*H)
        crop=page[y:y+h,x:x+w];kq,dq,_=feats(crop)
        best=(0,None)
        if dq is not None and len(kq)>=12:
            for ci,f in enumerate(CF):
                if f is None or f[1] is None or len(f[0])<12: continue
                m=flann.knnMatch(dq,f[1],k=2)
                good=[a for a,*b in m if b and a.distance<.72*b[0].distance]
                if len(good)<14 or len(good)<=best[0]: continue
                src=np.float32([kq[a.queryIdx].pt for a in good]);dst=np.float32([f[0][a.trainIdx].pt for a in good])
                M,mask=cv2.findHomography(src,dst,cv2.RANSAC,6.0)
                inl=int(mask.sum()) if mask is not None else 0
                if inl>best[0] and inl>=14: best=(inl,ci)
        res.append(dict(r=r,match=cands[best[1]]['id'] if best[1] is not None else None,score=best[0]))
    out[k]=res
    print(k,[(x['match'],x['score']) for x in res],flush=True)
json.dump(dict(hotspots=out,cands=cands),open('matched.json','w'))
print('done',time.time()-t)
