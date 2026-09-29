import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { config } from "./config";

export class VoiceEngine {
  private worker?: ChildProcessWithoutNullStreams;
  private started=false;

  start() {
    if (this.started) return;
    this.worker=spawn("python3",[config.voiceWorker],{stdio:["pipe","pipe","pipe"]});
    this.worker.stdout.on("data",d=>process.stdout.write(`[VOICE] ${d}`));
    this.worker.stderr.on("data",d=>process.stderr.write(`[VOICE ERR] ${d}`));
    this.worker.on("exit",()=>{this.started=false;});
    this.started=true;
  }

  command(cmd:object) {
    this.start();
    this.worker!.stdin.write(JSON.stringify(cmd)+"\n");
  }

  play(chatId:number,title:string,url:string) {
    this.command({op:"play",chatId,title,url});
  }

  skip(chatId:number) {
    this.command({op:"skip",chatId});
  }

  stop(chatId:number) {
    this.command({op:"stop",chatId});
  }
}
