import fs from 'node:fs';
import vm from 'node:vm';

const encoderContext={};vm.createContext(encoderContext);vm.runInContext(fs.readFileSync('node_modules/lamejs/lame.min.js','utf8'),encoderContext);const {lamejs}=encoderContext;

const rate=44100,duration=60,count=rate*duration;
const profiles={
  'rain-soft':{color:.68,rumble:.015,sparkle:.26,waves:0},
  'forest-breeze':{color:.94,rumble:.035,sparkle:.06,waves:.12},
  'slow-waves':{color:.985,rumble:.08,sparkle:.035,waves:.72},
  'night-train':{color:.997,rumble:.17,sparkle:.02,waves:.22},
  'small-stream':{color:.82,rumble:.02,sparkle:.34,waves:.08},
  'warm-fireplace':{color:.9,rumble:.035,sparkle:.18,waves:.04}
};
fs.mkdirSync('assets/audio',{recursive:true});
let seed=260929;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return((seed>>>0)/4294967296)*2-1};
for(const [name,p] of Object.entries(profiles)){
  const samples=new Float32Array(count);let low=0,slow=0;
  for(let i=0;i<count;i++){
    const white=random();low=p.color*low+(1-p.color)*white;slow=.9996*slow+.0004*white;
    const t=i/rate;const swell=p.waves*(.45+.55*Math.sin(t*Math.PI/4)**2);
    let value=(low*.68+white*p.sparkle+slow*p.rumble*8)*(1-p.waves+swell);
    if(name==='warm-fireplace'&&random()>.9995)value+=random()*.65;
    if(name==='night-train')value+=Math.sin(2*Math.PI*42*t)*.018*(.5+.5*Math.sin(2*Math.PI*.62*t));
    samples[i]=Math.max(-.88,Math.min(.88,value*.42));
  }
  const fade=rate*2;for(let i=0;i<fade;i++){const a=i/fade;const mixed=samples[i]*(1-a)+samples[count-fade+i]*a;samples[i]=samples[count-fade+i]=mixed}
  const pcm=new Int16Array(count);for(let i=0;i<count;i++)pcm[i]=Math.round(samples[i]*32767);
  const encoder=new lamejs.Mp3Encoder(1,rate,160),chunks=[];
  for(let i=0;i<count;i+=1152){const part=encoder.encodeBuffer(pcm.subarray(i,Math.min(i+1152,count)));if(part.length)chunks.push(Buffer.from(part))}
  const tail=encoder.flush();if(tail.length)chunks.push(Buffer.from(tail));
  const out=`assets/audio/${name}.mp3`;fs.writeFileSync(out,Buffer.concat(chunks));console.log(out);
}
