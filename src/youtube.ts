import { spawn } from "node:child_process";

function run(args:string[]):Promise<string>{
  return new Promise((resolve,reject)=>{
    const p=spawn("yt-dlp",args,{stdio:["ignore","pipe","pipe"]});
    let out="",err="";
    p.stdout.on("data",d=>out+=d);
    p.stderr.on("data",d=>err+=d);
    p.on("error",reject);
    p.on("close",c=>c===0?resolve(out.trim()):reject(new Error(err.slice(-2000))));
  });
}

export async function resolve(query:string){
  const url=/^https?:\\/\\/(www\\.)?(youtube\\.com|youtu\\.be)\\//i.test(query)
    ? query : `ytsearch1:${query}`;
  const raw=await run(["--dump-single-json","--no-playlist",url]);
  const x=JSON.parse(raw);
  return {
    title:String(x.title ?? "Unknown"),
    url:String(x.webpage_url ?? x.original_url ?? x.url)
  };
}
