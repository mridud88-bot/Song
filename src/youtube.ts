import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

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
    const stderr = error?.stderr?.toString?.() || error?.message || "yt-dlp failed";
    throw new Error(`yt-dlp failed: ${stderr}`);
  }
}

export function resolveYouTube(input: string): YouTubeResult {
  const value = input.trim();

  if (!value) {
    throw new Error("Please provide a song name or YouTube URL.");
  }

  const isYouTubeUrl =
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value);

  const target = isYouTubeUrl ? value : `ytsearch1:${value}`;

  const args = [
    "--dump-single-json",
    "--no-playlist",
    "--skip-download",

    // YouTube extraction
    "--extractor-args",
    "youtube:player_client=tv,web_safari",
  ];

  // Use Render's secret cookie file when it exists.
  const cookieFile = "/etc/secrets/youtube_cookies.txt";

  if (existsSync(cookieFile)) {
    args.push("--cookies", cookieFile);
  }

  args.push(target);

  const data = runYtDlp(args);

  // yt-dlp can return a search result inside "entries".
  const result =
    Array.isArray(data?.entries) && data.entries.length > 0
      ? data.entries[0]
      : data;

  const url =
    result?.webpage_url ||
    result?.original_url ||
    result?.url;

  if (!url) {
    throw new Error("Could not find a playable YouTube result.");
  }

  return {
    title: result?.title || "Unknown title",
    url,
  };
}
