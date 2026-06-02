import sys
import wave
import json
import io
from vosk import Model, KaldiRecognizer

# Force stdout to UTF-8 encoding (handles Devanagari characters)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

model_path = "C:\\Users\\kutea\\Downloads\\vosk-model-hi-0.22\\vosk-model-hi-0.22"

def transcribe(wav_path):
    wf = wave.open(wav_path, "rb")
    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
        print("Audio file must be WAV format mono PCM 16bit 16kHz")
        return

    model = Model(model_path)
    rec = KaldiRecognizer(model, wf.getframerate())

    result_text = ""
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            res = json.loads(rec.Result())
            result_text += res.get('text', '') + " "
    final_res = json.loads(rec.FinalResult())
    result_text += final_res.get('text', '')
    return result_text.strip()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py audio.wav")
        sys.exit(1)
    transcript = transcribe(sys.argv[1])
    print("Transcription:", transcript)
