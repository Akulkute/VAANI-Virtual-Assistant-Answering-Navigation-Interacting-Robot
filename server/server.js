const WebSocket = require('ws');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const express = require('express');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, 'audio');
const AUDIO_RAW = path.join(AUDIO_DIR, 'received_audio.raw');
const AUDIO_WAV = path.join(AUDIO_DIR, 'received_audio.wav');
const TRANSCRIPT_FILE = path.join(AUDIO_DIR, 'transcription.txt');
const BOT_RESPONSE_AUDIO = path.join(AUDIO_DIR, 'bot_response.mp3');

const HTTP_PORT = 8081;

// 🖑 Clean old files
[AUDIO_RAW, AUDIO_WAV, TRANSCRIPT_FILE, BOT_RESPONSE_AUDIO].forEach(file => fs.existsSync(file) && fs.unlinkSync(file));
console.log("🖑 Old audio files deleted. Server ready!");

// 🌐 WebSocket Server
const wss = new WebSocket.Server({ port: 8888 });
console.log("🌐 WebSocket Server running on ws://localhost:8888");

let audioBuffer = Buffer.alloc(0);
let transcriptionTimeout = null;

wss.on('connection', (ws) => {
    console.log("✅ Client Connected!");
    synthesizeAndSendAudio("नमस्ते! मेरा नाम वाणी है।", ws);

    ws.on('message', (message) => {
        if (Buffer.isBuffer(message)) {
            if (message.length < 512) return;

            console.log(`📩 Received audio chunk: ${message.length} bytes`);
            audioBuffer = Buffer.concat([audioBuffer, message]);

            clearTimeout(transcriptionTimeout);
            transcriptionTimeout = setTimeout(() => processAudio(ws), 5000);

        } else {
            console.log("📝 Received Text:", message.toString());
            ws.send(`🤖 Echo: ${message.toString()}`);
        }
    });

    ws.on('close', () => console.log("❌ Client Disconnected!"));
    ws.on('error', (err) => console.error("⚠ WebSocket Error:", err));
});

// 🎤 Audio Processing
function processAudio(ws) {
    if (audioBuffer.length === 0) {
        console.error("❌ No audio received within 5 seconds!");
        return;
    }

    [AUDIO_RAW, AUDIO_WAV, BOT_RESPONSE_AUDIO].forEach(file => fs.existsSync(file) && fs.unlinkSync(file));

    synthesizeAndSendAudio("आपके प्रश्न पर विचार कर रही हूँ।", ws);

    console.log("🔄 Saving final audio file...");
    fs.writeFileSync(AUDIO_RAW, audioBuffer);
    audioBuffer = Buffer.alloc(0);

    console.log("🔄 Converting raw audio to WAV...");
    const ffmpegProcess = spawn('ffmpeg', [
        '-y', '-f', 's16le', '-ar', '16000', '-ac', '1', '-i', AUDIO_RAW,
        '-filter:a', 'volume=6.0',
        AUDIO_WAV
    ]);

    ffmpegProcess.stderr.on('data', (data) => console.error("⚠ FFmpeg Error:", data.toString()));

    ffmpegProcess.on('close', (code) => {
        if (code === 0) {
            console.log("✅ Audio converted successfully!");
            transcribeAudio(ws);
        } else {
            console.error("❌ FFmpeg failed with code", code);
        }
    });
}

// 🔊 Transcription via transcribe.py (Vosk)
function transcribeAudio(ws) {
    console.log("📝 Running transcribe.py for Hindi transcription...");

    const pythonProcess = spawn('python', ['transcribe.py', AUDIO_WAV]);

    let transcript = '';
    pythonProcess.stdout.on('data', (data) => {
        transcript += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error("⚠ Python Error:", data.toString());
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            const cleanedTranscription = transcript
                .replace(/Transcription:/i, '')
                .replace(/\s+/g, ' ')
                .trim();

            fs.writeFileSync(TRANSCRIPT_FILE, cleanedTranscription, { encoding: 'utf8' });

            console.log("\n🎧 RECEIVED AUDIO TEXT:");
            console.log("🗣️", cleanedTranscription);

            broadcastMessage(`📝 Transcription: ${cleanedTranscription}`);

            sendToFlaskBot(cleanedTranscription, (err, result) => {
                if (err) {
                    console.error("⚠ Error contacting Flask bot:", err);
                    broadcastMessage("⚠ Could not process the message.");
                } else {
                    const responseText = result.response.replace(/\*/g, '').trim();
                    console.log("\n🤖 BOT RESPONSE:");
                    console.log("💬", responseText);

                    broadcastMessage(`🤖 Bot: ${responseText}`);
                    synthesizeAndSendAudio(responseText, ws);
                }
            });
        } else {
            console.error("❌ Transcription failed with exit code", code);
            broadcastMessage("⚠ Transcription failed.");
        }
    });
}

function broadcastMessage(text) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(text);
        }
    });
}

function sendToFlaskBot(transcribedText, callback) {
    const data = JSON.stringify({ text: transcribedText });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/process-text',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
            try {
                const parsed = JSON.parse(responseData);
                console.log("📝 Transcription:", parsed.transcription);
                console.log("🤖 Bot Reply:", parsed.response);
                callback(null, parsed);
            } catch (err) {
                console.error("❌ Failed to parse JSON from Flask:", err);
                callback(err);
            }
        });
    });

    req.on('error', (e) => callback(e));
    req.write(data);
    req.end();
}

// 🔊 Synthesize TTS and provide HTTP URL to ESP32
function synthesizeAndSendAudio(text, ws) {
    console.log("🎙 Synthesizing audio using gTTS...");

    const tts = spawn('gtts-cli', [text, '--lang', 'hi', '--output', BOT_RESPONSE_AUDIO]);

    tts.stderr.on('data', (data) => console.error("⚠ gTTS Error:", data.toString()));

    tts.on('close', (code) => {
        if (code === 0) {
            console.log("✅ MP3 audio synthesized successfully!");

            const responseURL = `http://${getLocalIPAddress()}:${HTTP_PORT}/audio/bot_response.mp3`;
            console.log(`🔗 ESP32 can fetch the MP3 audio from: ${responseURL}`);

            if (ws.readyState === WebSocket.OPEN) {
                // 1️⃣ Send "START" first
                ws.send("START");

                // 2️⃣ Small delay, then send AUDIO_URL
                setTimeout(() => {
                    ws.send(`AUDIO_URL:${responseURL}`);
                }, 500);
            }
        } else {
            console.error("❌ gTTS failed with code", code);
        }
    });
}

// -------------------- HTTP Server --------------------
const app = express();
app.use('/audio', express.static(AUDIO_DIR));

app.listen(HTTP_PORT, () => {
    console.log(`📡 HTTP Server running at http://${getLocalIPAddress()}:${HTTP_PORT}/audio`);
});

// ✅ Hardcoded IP that ESP32 can access
function getLocalIPAddress() {
    return '10.30.114.117';
}
