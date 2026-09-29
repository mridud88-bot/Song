import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export type YouTubeResult = {
  title: string;
  url: string;
};

function runYtDlp(args: string[]): any {
  try {
    const output = execFileSync("yt-dlp", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return JSON.parse(output);
  } catch (error: any) {
    const stderr =
      error?.stderr?.toString?.() ||
      error?.message ||
      "Unknown media error";

    console.error("[media]", stderr);

    if (/sign in to confirm|not a bot|captcha/i.test(stderr)) {
      const blocked: any = new Error(
        "YouTube is temporarily blocking playback. Please try again later."
      );
      blocked.blocked = true;
      throw blocked;
    }

    if (/could not find|no video|unable to extract/i.test(stderr)) {
      throw new Error("I couldn't find a playable YouTube result.");
    }

    throw new Error("YouTube playback failed. Please try another song.");
  }
}

const SECRET_COOKIES = "/etc/secrets/youtube_cookies.txt";
const COOKIE_JAR = "/tmp/youtube_cookies.txt";

function youtubeCookieArgs(): string[] {
  try {
    if (!existsSync(COOKIE_JAR) && existsSync(SECRET_COOKIES)) {
      let text = readFileSync(SECRET_COOKIES, "utf8").replace(/\r\n?/g, "\n");
      if (!/^# (Netscape )?HTTP Cookie File/.test(text)) {
        text = "# Netscape HTTP Cookie File\n" + text;
      }
      writeFileSync(COOKIE_JAR, text);
    }
  } catch (e) {
    console.error("[cookies] could not prepare cookie file:", e);
  }
  return existsSync(COOKIE_JAR) ? ["--cookies", COOKIE_JAR] : [];
}

function lookup(target: string, youtube: boolean): YouTubeResult {
  const args = ["--dump-single-json", "--no-playlist", "--skip-download"];

  if (youtube) {
    args.push(
      "--extractor-args",
      "youtube:player_client=tv,web_safari",
      ...youtubeCookieArgs()
    );
  }

  args.push(target);

  const data = runYtDlp(args);

  const result =
    Array.isArray(data?.entries) && data.entries.length > 0
      ? data.entries[0]
      : data;

  const url = result?.webpage_url || result?.original_url || result?.url;

  if (!url) {
    throw new Error("I couldn't find a playable result.");
  }

  return { title: result?.title || "Unknown title", url };
}

export function resolveYouTube(input: string): YouTubeResult {
  const value = input.trim();

  if (!value) {
    throw new Error("Please provide a song name or YouTube URL.");
  }

  const isYouTubeUrl =
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value);

  try {
    return lookup(isYouTubeUrl ? value : `ytsearch1:${value}`, true);
  } catch (e: any) {
    if (e?.blocked && !isYouTubeUrl) {
      console.warn("[fallback] primary source blocked, trying alternate");
      return lookup(`scsearch1:${value}`, false);
    }
    throw e;
  }
}
