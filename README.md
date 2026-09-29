# Telegram Music Voice Bot — TypeScript + 1 User Account

## Architecture

Telegram Bot Token
        |
        v
 TypeScript controller
        |
        +---- Neon PostgreSQL
        |
        v
 Python tgcalls voice engine
        |
        v
 ONE Telegram USER ACCOUNT
        |
        v
 Telegram group voice chat

The bot account handles commands. The single user account joins and publishes
audio into the voice chat.

## Commands

/play <song or YouTube URL>   Everyone
/queue                         Everyone
/skip                           Admin only
/stop                           Admin only

Only the group IDs in ALLOWED_GROUP_IDS are accepted.

## Why the user account is required

Telegram's official `phone.joinGroupCall` method is user-only. A normal bot
token cannot perform the actual voice-chat join. The user session is therefore
used only for the voice connection.

## One-time user-session setup

1. Create Telegram API credentials at https://my.telegram.org.
2. Put API_ID and API_HASH into the environment or local shell.
3. Run:
   python3 voice/generate_session.py
4. Log in with the ONE Telegram account you want the music player to use.
5. Copy the generated USER_SESSION_STRING.
6. Put it in Render as a secret environment variable.

Never publish the session string. Anyone with it can potentially operate the
Telegram user session.

## Telegram permissions

Add the user account to each target supergroup. For reliable voice-chat
operation, make it an administrator with the permissions necessary to join
and speak in the call.

Add the bot to the same groups and give it normal command/message permissions.

## Render

Use a Background Worker with the included Dockerfile.

Set:
BOT_TOKEN
DATABASE_URL
API_ID
API_HASH
USER_SESSION_STRING
ALLOWED_GROUP_IDS

ALLOWED_GROUP_IDS must contain one or two numeric group IDs, for example:
-1001234567890,-1009876543210

## Neon

The app creates `music_history` automatically.

## Important

This project uses a Python/native voice engine under the TypeScript command
controller. That is intentional: the Telegram tgcalls media engine is not a
stable pure-TypeScript equivalent of the native/Python stack.

Do not expose USER_SESSION_STRING in GitHub, Render logs, screenshots, or chat.
