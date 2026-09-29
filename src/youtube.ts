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
    const stderr =
      error?.stderr?.toString?.() ||
      error?.message ||
      "Unknown yt-dlp error";

    // Keep the detailed error in Render logs.
    console.error("[yt-dlp]", stderr);

    // Don't expose yt-dlp's long URLs/warnings to Telegram users.
    if (/sign in to confirm|not a bot|captcha/i.test(stderr)) {
      throw new Error(
        "YouTube is temporarily blocking playback. Please try again later."
      );
    }

    if (/could not find|no video|unable to extract/i.test(stderr)) {
      throw new Error("I couldn't find a playable YouTube result.");
    }

    throw new Error("YouTube playback failed. Please try another song.");
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

    "--extractor-args",
    "youtube:player_client=tv,web_safari",
  ];

  const cookieFile = "/etc/secrets/youtube_cookies.txt";

  if (existsSync(cookieFile)) {
    args.push("--cookies", cookieFile);
  }

  args.push(target);

  const data = runYtDlp(args);

  const result =
    Array.isArray(data?.entries) && data.entries.length > 0
      ? data.entries[0]
      : data;

  const url =
    result?.webpage_url ||
    result?.original_url ||
    result?.url;

  if (!url) {
    throw new Error("I couldn't find a playable YouTube result.");
  }

  return {
    title: result?.title || "Unknown title",
    url,
  };
}
