import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { config } from "./config";

export class VoiceEngine {
  private worker?: ChildProcessWithoutNullStreams;
  private alive = false;

  start() {
    if (this.alive) return;
    const w = spawn("python3", [config.voiceWorker], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.worker = w;
    this.alive = true;

    w.stdout.on("data", d => process.stdout.write(`[VOICE] ${d}`));
    w.stderr.on("data", d => process.stderr.write(`[VOICE ERR] ${d}`));
    w.stdin.on("error", e => console.error("[VOICE] stdin error:", e.message));
    w.on("error", e => {
      console.error("[VOICE] spawn error:", e.message);
      this.alive = false;
    });
    w.on("exit", (code, signal) => {
      console.error(`[VOICE] worker exited code=${code} signal=${signal}, restarting in 5s`);
      this.alive = false;
      setTimeout(() => this.start(), 5000);
    });
  }

  command(cmd: object): boolean {
    const w = this.worker;
    if (!this.alive || !w || !w.stdin.writable || w.stdin.destroyed) return false;
    w.stdin.write(JSON.stringify(cmd) + "\n");
    return true;
  }

  play(chatId: number, title: string, url: string): boolean {
    return this.command({ op: "play", chatId, title, url });
  }

  skip(chatId: number): boolean {
    return this.command({ op: "skip", chatId });
  }

  stop(chatId: number): boolean {
    return this.command({ op: "stop", chatId });
  }
}
