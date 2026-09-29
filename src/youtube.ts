import { execFileSync } from "node:child_process";

export type YouTubeResult = {
  title: string;
  url: string;
};

function runYtDlp(args: string[]): any {
  const output = execFileSync("yt-dlp", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return JSON.parse(output);
}

export function resolveYouTube(input: string): YouTubeResult {
  const value = input.trim();

  if (!value) {
    throw new Error("Please provide a song name or YouTube URL.");
  }

  const target =
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value)
      ? value
      : `ytsearch1:${value}`;

  const data = runYtDlp([
  "--dump-single-json",
  "--no-playlist",
  "--skip-download",
  "--extractor-args",
  "youtube:player_client=tv,web_safari",
  target,
]);
  if (!data?.url) {
    throw new Error("Could not find a playable YouTube result.");
  }

  return {
    title: data.title ?? "Unknown title",
    url: data.webpage_url ?? value,
  };
}
