import ffmpeg from 'ffmpeg-static';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

const names=['rain-window','forest','coast','night-train','stream'];
fs.mkdirSync('app/assets/video',{recursive:true});
for(const name of names){
  const args=['-y','-loop','1','-i',`app/assets/images/${name}.webp`,'-vf',"zoompan=z='1+0.03*(1-cos(2*PI*on/192))/2':d=192:s=960x600:fps=24,format=yuv420p",'-t','8','-r','24','-an','-c:v','libx264','-profile:v','baseline','-level','3.0','-preset','slow','-crf','25','-movflags','+faststart',`app/assets/video/${name}.mp4`];
  const result=spawnSync(ffmpeg,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);console.log(`app/assets/video/${name}.mp4`);
  const webmArgs=['-y','-loop','1','-i',`app/assets/images/${name}.webp`,'-vf',"zoompan=z='1+0.03*(1-cos(2*PI*on/192))/2':d=192:s=960x600:fps=24,format=yuv420p",'-t','8','-r','24','-an','-c:v','libvpx-vp9','-b:v','0','-crf','34','-deadline','good','-cpu-used','2',`app/assets/video/${name}.webm`];
  const webmResult=spawnSync(ffmpeg,webmArgs,{stdio:'inherit'});if(webmResult.status!==0)process.exit(webmResult.status||1);console.log(`app/assets/video/${name}.webm`);
}
