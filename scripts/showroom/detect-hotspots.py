import cv2, numpy as np, json, sys
from pathlib import Path
SRC=Path('/home/claude/nicholasghareeb99/gfs-website/public/assets/brochure/pages')
def gutters(lum, axis, minrun=3):
    # rows (axis=0) or cols (axis=1) that are flat across the region
    rng = lum.max(axis=1-axis)-lum.min(axis=1-axis) if axis==0 else lum.max(axis=0)-lum.min(axis=0)
    flat = rng < 14
    runs=[];s=None
    for i,f in enumerate(flat):
        if f and s is None: s=i
        if (not f or i==len(flat)-1) and s is not None:
            e=i if not f else i+1
            if e-s>=minrun: runs.append((s,e))
            s=None
    return runs
def split(lum, x0,y0,x1,y1, depth=0):
    sub=lum[y0:y1,x0:x1]
    for axis in (0,1):
        runs=gutters(sub,axis)
        n=sub.shape[axis]
        cuts=[r for r in runs if r[0]>8 and r[1]<n-8]
        if cuts and depth<8:
            pieces=[];prev=0
            for s,e in cuts:
                pieces.append((prev,s));prev=e
            pieces.append((prev,n))
            out=[]
            for a,b in pieces:
                if b-a<20: continue
                if axis==0: out+=split(lum,x0,y0+a,x1,y0+b,depth+1)
                else: out+=split(lum,x0+a,y0,x0+b,y1,depth+1)
            return out
    # trim flat borders
    return [(x0,y0,x1,y1)]
def regions(path):
    im=cv2.imread(str(path)); h,w=im.shape[:2]
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
    mu=cv2.blur(g,(7,7)); var=cv2.blur(g*g,(7,7))-mu*mu
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV); sat=hsv[...,1].astype(np.float32)
    mask=((var>40)&(cv2.blur(sat,(7,7))>22)).astype(np.uint8)*255
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((21,21),np.uint8))
    n,lab,stats,_=cv2.connectedComponentsWithStats(mask)
    out=[]
    for i in range(1,n):
        x,y,bw,bh,a=stats[i]
        if bw*bh<0.02*w*h: continue
        for (a0,b0,a1,b1) in split(g,x,y,x+bw,y+bh):
            pw,ph=a1-a0,b1-b0
            if pw<80 or ph<60 or pw*ph<0.012*w*h: continue
            pv=var[b0:b1,a0:a1];ps=sat[b0:b1,a0:a1]
            texf=(pv>40).mean(); colf=(ps>30).mean()
            if texf<0.45 or colf<0.35: continue
            # reject very thin bars
            if pw/ph>5 or ph/pw>5: continue
            out.append([round(a0/w,4),round(b0/h,4),round(pw/w,4),round(ph/h,4)])
    out.sort(key=lambda r:(round(r[1],1),r[0]))
    return out,im
res={}
for p in sorted(SRC.glob('p*.webp')):
    r,im=regions(p); res[p.stem]=r
    if p.stem in sys.argv[1:]:
        h,w=im.shape[:2]
        for x,y,bw,bh in r: cv2.rectangle(im,(int(x*w)+2,int(y*h)+2),(int((x+bw)*w)-2,int((y+bh)*h)-2),(0,0,255),4)
        cv2.imwrite(f'hs/{p.stem}.jpg',cv2.resize(im,(450,582)))
json.dump(res,open('hotspots_raw.json','w'))
print(sum(len(v) for v in res.values()), {k:len(v) for k,v in res.items() if len(v)==0})
