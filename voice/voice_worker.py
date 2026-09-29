import asyncio

# Create ONE event loop before pyrogram/pytgcalls are imported, and reuse it.
# Otherwise they bind to a different loop than asyncio.run() creates
# ("attached to a different loop" error).
LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(LOOP)

import json
import os
import subprocess
import sys
import tempfile

from pyrogram import Client
from pytgcalls import PyTgCalls
from pytgcalls.types import MediaStream


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def emit(obj):
    print(json.dumps(obj), flush=True)


API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
SESSION = os.environ["USER_SESSION_STRING"]

app = Client(
    "voice_user",
    api_id=API_ID,
    api_hash=API_HASH,
    session_string=SESSION,
    in_memory=True,
)
calls = PyTgCalls(app)

current_files = {}  # chat_id -> temp file path


def cleanup(chat_id):
    path = current_files.pop(chat_id, None)
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


def build_cmd(tmp, target, youtube):
    cmd = ["yt-dlp", "-f", "bestaudio/best", "-o", tmp, "--no-playlist"]
    if youtube:
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
    cmd.append(target)
    return cmd


def download(title, url):
    """Try the given URL; if YouTube blocks it, fall back to SoundCloud."""
    is_yt = "youtube.com" in url or "youtu.be" in url
    tmp = tempfile.mktemp(suffix=".m4a")
    try:
        subprocess.run(build_cmd(tmp, url, is_yt), check=True, capture_output=True, text=True)
        return tmp
    except subprocess.CalledProcessError as e:
        err = (e.stderr or "")[-500:]
        log(f"worker: download failed: {err}")
        if not is_yt:
            raise
    log(f"worker: YouTube blocked, trying SoundCloud for: {title}")
    tmp = tempfile.mktemp(suffix=".m4a")
    try:
        subprocess.run(
            build_cmd(tmp, f"scsearch1:{title}", False),
            check=True, capture_output=True, text=True,
        )
    except subprocess.CalledProcessError as e:
        log(f"worker: SoundCloud fallback failed: {(e.stderr or '')[-500:]}")
        raise RuntimeError("Could not download this song from YouTube or SoundCloud")
    return tmp


async def play(chat_id, title, url):
    log(f"worker: downloading {title}")
    tmp = await asyncio.to_thread(download, title, url)

    old = current_files.get(chat_id)
    await calls.play(chat_id, MediaStream(tmp))
    current_files[chat_id] = tmp
    if old and old != tmp and os.path.exists(old):
        try:
            os.remove(old)
        except OSError:
            pass
    emit({"event": "playing", "chatId": chat_id, "title": title})


async def leave(chat_id):
    try:
        await calls.leave_call(chat_id)
    except Exception as e:
        log(f"worker: leave_call error: {e!r}")
    cleanup(chat_id)


async def handle(cmd):
    op = cmd.get("op")
    chat_id = cmd.get("chatId")
    try:
        if op == "play":
            await play(chat_id, cmd.get("title", ""), cmd["url"])
        elif op in ("skip", "stop"):
            await leave(chat_id)
            emit({"event": "stopped" if op == "stop" else "skipped", "chatId": chat_id})
        else:
            log(f"worker: unknown op {op!r}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.stderr.flush()
        emit({"event": "error", "chatId": chat_id, "op": op, "message": str(e)})


async def command_loop():
    loop = asyncio.get_running_loop()
    reader = asyncio.StreamReader()
    await loop.connect_read_pipe(
        lambda: asyncio.StreamReaderProtocol(reader), sys.stdin
    )
    while True:
        line = await reader.readline()
        if not line:
            break  # stdin closed
        line = line.decode("utf8").strip()
        if not line:
            continue
        try:
            cmd = json.loads(line)
        except json.JSONDecodeError:
            log(f"worker: bad json: {line!r}")
            continue
        asyncio.create_task(handle(cmd))


async def main():
    log("worker: starting telegram client")
    await app.start()
    log("worker: telegram client started")
    await calls.start()
    log("worker: voice engine started")
    print(json.dumps({"event": "user_session_ready"}), flush=True)
    await command_loop()
    log("worker: command loop ended (stdin closed)")


try:
    LOOP.run_until_complete(main())
except BaseException:
    import traceback
    traceback.print_exc()
    sys.stderr.flush()
    sys.exit(1)
    
