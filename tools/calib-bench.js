// Test bench for the camera auto-calibration: renders synthetic dartboards under random camera angles and light
// and runs autoCalibrate() from the app on them. Usage: node tools/calib-bench.js src/app.html [runs per case]
// Prints ok/correct per case (correct = within 4 mm everywhere on the board). Synthetic only: no darts, glare or blur.
const fs=require("fs");
const src=fs.readFileSync(process.argv[2],"utf8");
function fn(name){const i=src.indexOf("function "+name+"(");if(i<0)throw name;let d=0,j=src.indexOf("{",i);for(let k=j;k<src.length;k++){if(src[k]=="{")d++;else if(src[k]=="}"){d--;if(!d)return src.slice(i,k+1);}}}
const names=["solve","homography","inv3","ap","colorOf","boardScore","homographyLS","fitScore","fitBoard","autoCalibrate"].filter(f=>src.includes("function "+f+"("));
const code=`
const ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
${src.includes("const FIT_PTS")?src.slice(src.indexOf("const FIT_PTS"),src.indexOf("})();",src.indexOf("const FIT_PTS"))+5):""}
const R={bi:6.35,bo:15.9,ti:99,to:107,di:162,do:170};
const CAL_BOARD=[[0,170],[170,0],[0,-170],[-170,0]];
const cam={W:480,H:360,src:{},rgba:null,Hm:null};
function status(){} function grab(){} function setH(H){cam.Hm=H;} const store={set(){}}; function renderPlacement(){} function calKey(){return "k"} function drawCam(){}
${names.map(fn).join("\n")}
return {cam,autoCalibrate,ap,homography,inv3};`;
const A=new Function("setTimeout",code)(()=>{});
// ---- scene
function rnd(a,b){return a+Math.random()*(b-a);}
function mat(a,b){const r=[];for(let i=0;i<3;i++)for(let j=0;j<3;j++){let s=0;for(let k=0;k<3;k++)s+=a[i*3+k]*b[k*3+j];r.push(s);}return r;}
function poseH(o){ // board mm -> image px; board plane z=0, camera looks at it from yaw/pitch at distance
  const W=480,H=360,f=o.f; const cy=Math.cos(o.yaw),sy=Math.sin(o.yaw),cp=Math.cos(o.pitch),sp=Math.sin(o.pitch),cr=Math.cos(o.roll),sr=Math.sin(o.roll);
  // rotation board->camera: R = Rroll * Rpitch * Ryaw ; board y up -> image y down handled by flip
  const Ry=[cy,0,sy, 0,1,0, -sy,0,cy], Rx=[1,0,0, 0,cp,-sp, 0,sp,cp], Rz=[cr,-sr,0, sr,cr,0, 0,0,1];
  const Rm=mat(Rz,mat(Rx,Ry)); const t=[o.tx,o.ty,o.dist];
  // x_img = K [r1 r2 t] [X, -Y, 1]
  const K=[f,0,W/2+o.cx, 0,f,H/2+o.cy, 0,0,1];
  const M=[Rm[0],-Rm[1],t[0], Rm[3],-Rm[4],t[1], Rm[6],-Rm[7],t[2]];
  return mat(K,M);
}
function scoreCol(x,y,o){
  const r=Math.hypot(x,y);
  if(r>225)return o.bg(x,y);
  if(r>170)return o.ring;                            // black number ring
  if(r<=6.35)return o.red; if(r<=15.9)return o.green;
  const a=((Math.atan2(x,y)*180/Math.PI)+9+360)%360,i=Math.floor(a/18)%20;
  const w=Math.abs(((a%18)-9))>8.6; if(w)return o.wire;
  const tr=(r>=99&&r<=107),db=r>=162;
  if(tr||db)return i%2?o.green:o.red;
  return i%2?o.cream:o.black;
}
function render(o){
  const W=480,H=360,Hm=poseH(o),Hi=A.inv3(Hm),d=new Uint8ClampedArray(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const [bx,by]=A.ap(Hi,x+.5,y+.5);let c=scoreCol(bx,by,o);
    const i=(y*W+x)*4,n=()=>(Math.random()-.5)*o.noise;
    const g=o.gain*(1-o.vig*((x-W/2)**2+(y-H/2)**2)/(W*W/4));
    d[i]=c[0]*o.tint[0]*g+n();d[i+1]=c[1]*o.tint[1]*g+n();d[i+2]=c[2]*o.tint[2]*g+n();d[i+3]=255;}
  return {d,Hm};
}
function err(Ht,Hf){ // max mm error on board (map true board points to image, back with found)
  const Hi=A.inv3(Hf);let m=0;
  for(let k=0;k<40;k++){const p=k*9*Math.PI/180;for(const r of [20,100,166]){const q=A.ap(Ht,r*Math.sin(p),r*Math.cos(p));const b=A.ap(Hi,q[0],q[1]);m=Math.max(m,Math.hypot(b[0]-r*Math.sin(p),b[1]-r*Math.cos(p)));}}
  return m;
}
const scen={
  front:()=>({yaw:rnd(-.15,.15),pitch:rnd(-.15,.15),roll:rnd(-.05,.05)}),
  side35:()=>({yaw:rnd(.5,.65)*(Math.random()<.5?-1:1),pitch:rnd(-.2,.2),roll:rnd(-.05,.05)}),
  side50:()=>({yaw:rnd(.8,.9)*(Math.random()<.5?-1:1),pitch:rnd(-.3,.3),roll:rnd(-.08,.08)}),
  roll10:()=>({yaw:rnd(-.4,.4),pitch:rnd(-.2,.2),roll:rnd(.12,.25)*(Math.random()<.5?-1:1)}),
  below:()=>({yaw:rnd(-.3,.3),pitch:rnd(.5,.8),roll:rnd(-.05,.05)}),
};
const light={
  normal:()=>({gain:1,tint:[1,1,1],noise:12,vig:.2}),
  dim:()=>({gain:.45,tint:[1,1,1],noise:10,vig:.4}),
  warm:()=>({gain:.8,tint:[1.15,.9,.6],noise:12,vig:.3}),
  cool:()=>({gain:.9,tint:[.85,1,1.2],noise:12,vig:.2}),
};
const N=+process.argv[3]||25;const out={};
for(const s in scen)for(const l in light){let ok=0,good=0;
  for(let k=0;k<N;k++){
    const o=Object.assign({f:rnd(380,450),dist:rnd(600,1100),tx:rnd(-60,60),ty:rnd(-50,50),cx:0,cy:0,
      red:[200,40,45],green:[30,140,70],cream:[225,210,170],black:[25,25,25],ring:[20,20,20],wire:[180,180,180],
      bg:process.env.GREY?()=>[160,160,160]:(x,y)=>((Math.floor(x/80)+Math.floor(y/80))%2?[150,110,70]:[170,165,155])},scen[s](),light[l](),JSON.parse(process.env.OV||"{}"));
    if(Math.random()<.3)o.green=[20,110,95]; // teal-ish green
    const {d,Hm}=render(o);A.cam.rgba=d;A.cam.Hm=null;
    let r;const t0=Date.now();try{r=A.autoCalibrate(true);}catch(e){console.log(e);r={ok:false};}global.T=(global.T||0)+Date.now()-t0;
    if(r.ok){ok++;const e=err(Hm,A.cam.Hm);if(process.env.V)console.log("err mm",e.toFixed(1));if(e<4)good++;}
  }
  out[s+"/"+l]=ok+"/"+good;}
console.log(JSON.stringify(out));
console.log("ms per autoCalibrate",(T/(N*Object.keys(out).length)).toFixed(0));const tot=Object.values(out).reduce((a,v)=>a+ +v.split("/")[1],0);console.log("korrekt (<4mm):",tot,"av",N*Object.keys(out).length);
