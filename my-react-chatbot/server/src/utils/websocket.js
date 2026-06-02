const WS_URL = "ws://localhost:8888"; // Change this to your server's IP if needed

export function connectWebSocket(onMessage) {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
        console.log("📩 Received:", event.data);
        onMessage(event.data);
    };

    ws.onerror = (err) => console.error("⚠️ WebSocket Error:", err);

    ws.onclose = () => console.log("❌ Disconnected from WebSocket");

    return ws;
}
