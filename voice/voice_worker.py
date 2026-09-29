async def play(chat_id, title, url):
    tmp = tempfile.mktemp(suffix=".m4a")
    cmd = ["yt-dlp", "-f", "bestaudio/best", "-o", tmp, "--no-playlist"]
    if "youtube.com" in url or "youtu.be" in url:
        cmd += ["--extractor-args", "youtube:player_client=tv,web_safari"]
        secret = "/etc/secrets/youtube_cookies.txt"
        jar = "/tmp/youtube_cookies.txt"
        if not os.path.exists(jar) and os.path.exists(secret):
            with open(secret, encoding="utf8") as f:
                text = f.read().replace("\r\n", "\n").replace("\r", "\n")
            if not text.startswith(("# HTTP Cookie File", "# Netscape HTTP Cookie File")):
                text = "# Netscape HTTP Cookie File\n" + text
            with open(jar, "w", encoding="utf8") as f:
                f.write(text)
        if os.path.exists(jar):
            cmd += ["--cookies", jar]
    cmd.append(url)
    await asyncio.to_thread(subprocess.run, cmd, check=True)

    await calls.play(
        chat_id,
        MediaStream(tmp)
    )
    print(json.dumps({"event":"playing","chatId":chat_id,"title":title}), flush=True)
