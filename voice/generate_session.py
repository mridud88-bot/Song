from pyrogram import Client

api_id=int(input("API ID: ").strip())
api_hash=input("API HASH: ").strip()

with Client("session_generator",api_id=api_id,api_hash=api_hash) as app:
    print("\\nUSER_SESSION_STRING=")
    print(app.export_session_string())
    print("\\nCopy the entire string into Render as USER_SESSION_STRING.")
