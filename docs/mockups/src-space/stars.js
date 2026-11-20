(function(){const c=document.createElement('canvas');c.id='stars';document.body.prepend(c);const n=document.createElement('div');n.className='neb';document.body.prepend(n);
const W=1600,H=1000,d=window.devicePixelRatio||1;c.width=W*d;c.height=H*d;c.style.width=W+'px';c.style.height=H+'px';const x=c.getContext('2d');x.scale(d,d);
let s=1337;const r=()=>(s=(s*16807)%2147483647)/2147483647;
const cols=['#ffffff','#ffffff','#ffffff','#cfe8ff','#ffe2c9','#d9d2ff'];
for(let i=0;i<700;i++){const px=r()*W,py=r()*H,z=r();const rad=z<.9?.35+r()*.6:.9+r()*1.1;x.globalAlpha=.15+r()*.6;x.fillStyle=cols[(r()*cols.length)|0];x.beginPath();x.arc(px,py,rad,0,7);x.fill();
 if(z>.985){x.globalAlpha=.25;const g=x.createRadialGradient(px,py,0,px,py,7);g.addColorStop(0,'#fff');g.addColorStop(1,'transparent');x.fillStyle=g;x.beginPath();x.arc(px,py,7,0,7);x.fill();}}
})();
