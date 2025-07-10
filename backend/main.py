from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Tuple
from pydantic import BaseModel
import numpy as np
import tensorflow as tf
import os, json

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番は制限推奨
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------
# WebRTC通信用の構造
# --------------------------
rooms: Dict[str, List[Tuple[WebSocket, str]]] = {}
pending_messages: Dict[str, List[str]] = {}

async def broadcast_user_list(room_id: str):
    if room_id not in rooms:
        return
    user_list = [user for _, user in rooms[room_id]]
    message = json.dumps({"type": "userList", "users": user_list})
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

        if room_id not in rooms:
            rooms[room_id] = []
        if not any(ws == websocket for ws, _ in rooms[room_id]):
            rooms[room_id].append((websocket, user_name))

        await broadcast_user_list(room_id)

        if room_id in pending_messages:
            for msg in pending_messages[room_id]:
                await websocket.send_text(msg)
            pending_messages[room_id] = []

        while True:
            msg = await websocket.receive_text()
            data = json.loads(msg)

            if data.get("type") == "leave":
                leave_message = json.dumps({"type": "left", "user": user_name})
                for conn, _ in rooms.get(room_id, []):
                    await conn.send_text(leave_message)
                break

            alive_conns = rooms.get(room_id, [])
            if len(alive_conns) <= 1:
                pending_messages.setdefault(room_id, []).append(msg)
            else:
                for conn, _ in alive_conns:
                    await conn.send_text(msg)

    except WebSocketDisconnect:
        pass
    finally:
        rooms[room_id] = [entry for entry in rooms[room_id] if entry[0] != websocket]
        if rooms[room_id]:
            await broadcast_user_list(room_id)
        else:
            rooms.pop(room_id, None)

# --------------------------
# 手話推論エンドポイント
# --------------------------

# モデル・ラベル読み込み（グローバルで1回）
MODEL_PATH = os.path.join("model", "sign_lstm_model_126d.h5")
model = tf.keras.models.load_model(MODEL_PATH)

with open("WLASL_v0.3.json", "r") as f:
    data = json.load(f)
top_100 = sorted(data, key=lambda x: -len(x["instances"]))[:100]
label_names = [entry["gloss"] for entry in top_100]

SEQUENCE_LENGTH = 30
FEATURE_SIZE = 126

class KeypointSequence(BaseModel):
    sequence: list[list[float]]

@app.post("/predict")
def predict_sign(data: KeypointSequence):
    if len(data.sequence) != SEQUENCE_LENGTH:
        raise HTTPException(status_code=400, detail="Invalid sequence length")

    input_data = np.array(data.sequence).reshape(1, SEQUENCE_LENGTH, FEATURE_SIZE)
    prediction = model.predict(input_data)[0]
    predicted_class = int(np.argmax(prediction))
    confidence = float(np.max(prediction))

    return {
        "label": label_names[predicted_class],
        "confidence": confidence
    }

# --------------------------
# 簡易チェック用
# --------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"status": "ok"}
