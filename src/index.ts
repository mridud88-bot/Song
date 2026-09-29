import { Bot } from "grammy";
import { config } from "./config";
import { initDb, history } from "./db";
import { resolve } from "./youtube";
import { VoiceEngine } from "./voice";

const bot=new Bot(config.botToken);
const voice=new VoiceEngine();

const allowed=(id?:number)=>!!id && config.allowedGroups.includes(id);

async function admin(ctx:any){
  if(!ctx.chat || !ctx.from) return false;
  const m=await ctx.api.getChatMember(ctx.chat.id,ctx.from.id);
  return m.status==="administrator" || m.status==="creator";
}

bot.command("start",ctx=>ctx.reply(
  "🎵 Voice Music Bot\\n\\n/play <song>\\n/queue\\n/skip (admin)\\n/stop (admin)"
));

bot.command("play",async ctx=>{
  if(!allowed(ctx.chat?.id)) return;
  const q=ctx.match.trim();
  if(!q) return ctx.reply("Usage: /play <song or YouTube URL>");
  try{
    const t=await resolve(q);
    voice.play(ctx.chat!.id,t.title,t.url);
    await history(ctx.chat!.id,ctx.from!.id,t.title,t.url);
    await ctx.reply(`▶️ Joining/playing: ${t.title}`);
  }catch(e:any){
    await ctx.reply(`❌ ${String(e?.message??e).slice(0,800)}`);
  }
});

bot.command("skip",async ctx=>{
  if(!allowed(ctx.chat?.id)) return;
  if(!(await admin(ctx))) return ctx.reply("⛔ Admins only.");
  voice.skip(ctx.chat!.id);
  await ctx.reply("⏭️ Skipping.");
});

bot.command("stop",async ctx=>{
  if(!allowed(ctx.chat?.id)) return;
  if(!(await admin(ctx))) return ctx.reply("⛔ Admins only.");
  voice.stop(ctx.chat!.id);
  await ctx.reply("⏹️ Stopped.");
});

bot.command("queue",async ctx=>{
  if(!allowed(ctx.chat?.id)) return;
  await ctx.reply("Queue is managed by the voice engine.");
});

bot.catch(e=>console.error(e.error));

async function main(){
  if(config.allowedGroups.length<1 || config.allowedGroups.length>2)
    throw new Error("ALLOWED_GROUP_IDS must contain 1 or 2 groups.");
  await initDb();
  voice.start();
  await bot.start({onStart:i=>console.log(`Bot @${i.username} started`)});
}
main().catch(e=>{console.error(e);process.exit(1)});
