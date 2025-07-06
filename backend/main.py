from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Tuple
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番では適切に制限
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 接続ルームと保留メッセージの構造
rooms: Dict[str, List[Tuple[WebSocket, str]]] = {}
pending_messages: Dict[str, List[str]] = {}

async def broadcast_user_list(room_id: str):
    if room_id not in rooms:
        return

    user_list = [user for _, user in rooms[room_id]]
    message = json.dumps({ "type": "userList", "users": user_list })
    for conn, _ in rooms[room_id]:
        try:
            await conn.send_text(message)
        except:
            pass

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    try:
        init_data = await websocket.receive_text()
        data = json.loads(init_data)
        user_name = data.get("user", "anonymous") if data.get("type") == "join" else "anonymous"

        # ルーム登録
        if room_id not in rooms:
            rooms[room_id] = []
        if not any(ws == websocket for ws, _ in rooms[room_id]):
            rooms[room_id].append((websocket, user_name))

        await broadcast_user_list(room_id)

        # 保留メッセージ送信
        if room_id in pending_messages:
            for msg in pending_messages[room_id]:
                await websocket.send_text(msg)
            pending_messages[room_id] = []

        # 通信ループ
        while True:
            msg = await websocket.receive_text()
            data = json.loads(msg)

            if data.get("type") == "leave":
                # 通知を全員に送信
                leave_message = json.dumps({ "type": "left", "user": user_name })
                for conn, _ in rooms.get(room_id, []):
                    await conn.send_text(leave_message)
                break  # 接続終了

            alive_conns = rooms.get(room_id, [])
            if len(alive_conns) <= 1:
                pending_messages.setdefault(room_id, []).append(msg)
            else:
                for conn, _ in alive_conns:
                    await conn.send_text(msg)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ エラー: {e}")
    finally:
        # 切断後のクリーンアップ
        rooms[room_id] = [entry for entry in rooms[room_id] if entry[0] != websocket]
        if rooms[room_id]:
            await broadcast_user_list(room_id)
        else:
            rooms.pop(room_id, None)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"status": "ok"}
