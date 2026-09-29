"""
Voice engine for the TypeScript controller.

This component uses one Telegram USER account (not the bot account) to join
group voice chats. It is intentionally separate from the TypeScript bot
controller because Telegram's low-level tgcalls media engine is implemented
in native/Python bindings rather than as a stable pure-TypeScript API.

The controller communicates with this process over JSON lines on stdin/stdout.
"""

import asyncio, json, os, sys, tempfile, subprocess

# Dependencies are installed by the Dockerfile.
from pyrogram import Client
from pytgcalls import PyTgCalls
from pytgcalls.types import MediaStream

API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
SESSION = os.environ["USER_SESSION_STRING"]

app = Client(
    "voice_user",
    api_id=API_ID,
    api_hash=API_HASH,
    session_string=SESSION
)
calls = PyTgCalls(app)

async def play(chat_id, title, url):
    # Download/extract a playable audio stream.
    tmp = tempfile.mktemp(suffix=".m4a")
    subprocess.run([
        "yt-dlp", "-f", "bestaudio/best",
        "-o", tmp, "--no-playlist", url
    ], check=True)

    await calls.play(
        chat_id,
        MediaStream(tmp)
    )
    print(json.dumps({"event":"playing","chatId":chat_id,"title":title}), flush=True)

async def command_loop():
    while True:
        line = await asyncio.to_thread(sys.stdin.readline)
        if not line:
            break
        try:
            c=json.loads(line)
            op=c.get("op")
            if op=="play":
                await play(c["chatId"],c["title"],c["url"])
            elif op=="skip":
                await calls.leave_call(c["chatId"])
                # The TS controller can enqueue/start the next item.
            elif op=="stop":
                await calls.leave_call(c["chatId"])
        except Exception as e:
            print(json.dumps({"event":"error","error":str(e)}), flush=True)

async def main():
    await app.start()
    await calls.start()
    print(json.dumps({"event":"user_session_ready"}), flush=True)
    await command_loop()

asyncio.run(main())
