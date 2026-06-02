import { useEffect, useState } from "react";
import { connectWebSocket } from "../utils/websocket";

export default function Chatbot() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8888");

        ws.onmessage = (event) => {
            setMessages((prev) => [...prev, event.data]);
        };

        return () => ws.close();
    }, []);


    const sendMessage = () => {
        if (input.trim()) {
            setMessages([...messages, { sender: "user", text: input }]);
            connectWebSocket().send(input);
            setInput("");
        }
    };

    return (
        <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
            <h2>🗨️ ESP Chatbot</h2>
            <div style={{ border: "1px solid gray", padding: "10px", height: "300px", overflowY: "auto" }}>
                {messages.map((msg, i) => (
                    <p key={i}><strong>{msg.sender}:</strong> {msg.text}</p>
                ))}
            </div>
            <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Ask something..."
                style={{ width: "80%", padding: "5px" }}
            />
            <button onClick={sendMessage} style={{ padding: "5px", marginLeft: "5px" }}>Send</button>
        </div>
    );
}
