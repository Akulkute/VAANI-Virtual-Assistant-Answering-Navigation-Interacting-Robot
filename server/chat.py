from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from gtts import gTTS
import os
import uuid
import requests


app = Flask(__name__)
CORS(app)

# Rule-based chatbot with Hindi inputs and Hindi responses
def rule_based_response(text):
    text = text.lower()

    responses = {
        "आपका नाम क्या है":"मेरा नाम वाणी है। मेरा नाम 'वाणी' इसलिए रखा गया है क्योंकि मैं आपकी आवाज़ से बात करती हूँ।",
        "केला":"नमस्ते! मेरा नाम वाणी है। मैं एक वॉइस असिस्टेंट हूँ, जो आपकी बातों को सुनकर जवाब देती हूँ। आप मुझसे सवाल पूछ सकते हैं, मैं मदद करने के लिए यहाँ हूँ।",
        "आम": "आम एक मीठा और रसीला फल है, जो विटामिन A और C से भरपूर होता है।",
        "सेब": "सेब एक पौष्टिक फल है जो दिल और पाचन के लिए फायदेमंद होता है।",
        "केला": "केला पोटैशियम से भरपूर होता है और तुरंत ऊर्जा देता है।",
        "संतरा": "संतरा एक खट्टा-मीठा फल है जो विटामिन C से भरपूर होता है।",
        "अंगूर": "अंगूर छोटे और मीठे फल होते हैं जो गुच्छों में उगते हैं।",
        "कुत्ता": "कुत्ता एक वफादार और समझदार पालतू जानवर है, जिसे मनुष्य का सबसे अच्छा मित्र माना जाता है। यह विभिन्न नस्लों और आकारों में पाया जाता है, जैसे जर्मन शेफर्ड, लैब्राडोर, पग आदि। कुत्तों की सूंघने और सुनने की शक्ति बहुत तेज होती है, जिस कारण उन्हें पुलिस, सेना और खोज-बचाव कार्यों में भी उपयोग किया जाता है। वे अपने मालिक के प्रति निष्ठावान रहते हैं और उसकी रक्षा के लिए हमेशा तैयार रहते हैं। कुत्ते इंसानों की भावनाओं को समझने में भी सक्षम होते हैं, इसलिए वे अकेलेपन का अच्छा साथी साबित होते हैं।",
        "बिल्ली": "बिल्ली एक चंचल और स्वतंत्र स्वभाव वाला जानवर है।",
        "हाथी,आती,हाथी": "हाथी एक बड़ा और बुद्धिमान जानवर होता है।",
        "शेर": "शेर जंगल का राजा कहलाता है।",
        "गाय": "गाय एक पालतू और उपयोगी पशु है, जिसे भारत में माँ का दर्जा दिया गया है और गौमाता कहा जाता है। यह शांत स्वभाव की होती है और इसका दूध अत्यंत पौष्टिक होता है, जिससे दही, घी, मक्खन और पनीर जैसे उत्पाद बनाए जाते हैं। गाय के गोबर और मूत्र का उपयोग जैविक खाद, ईंधन और आयुर्वेदिक औषधियों में किया जाता है। यह खेती और पर्यावरण के लिए भी लाभदायक है, क्योंकि इसका गोबर खेतों की उर्वरता बढ़ाता है। धार्मिक दृष्टि से भी गाय का विशेष महत्व है और अनेक पर्वों पर इसकी पूजा की जाती है। हमें गाय की सेवा और संरक्षण करना चाहिए क्योंकि यह मानव जीवन के लिए अत्यंत उपयोगी प्राणी है।",
        "भारत": "भारत दक्षिण एशिया में स्थित एक विविधताओं से भरा देश है।",
        "पाइथन": "पाइथन एक प्रसिद्ध प्रोग्रामिंग भाषा है जो सरल और पढ़ने में आसान होती है।",
        "वर्णमाला": "चलो बच्चों, हम हिंदी वर्णमाला सीखते हैं। पहले स्वर: अ, आ, इ, ई, उ, ऊ, ए, ऐ, ओ, औ, अं, अः। अब व्यंजन: क, ख, ग, घ, ङ, च, छ, ज, झ, ञ, ट, ठ, ड, ढ, ण, त, थ, द, ध, न, प, फ, ब, भ, म, य, र, ल, व, श, ष, स, ह, क्ष, त्र, ज्ञ।",
        "अक्सर": "अ  अनार, आ  आम, इ  इमली, ई  ईख, उ  उल्लू, ऊ  ऊन, ए  एड़ी, ऐ  ऐनक, ओ  ओखली, औ  औरत, अं  अंगूर, अः  अहः।",
        "गिनती": "आइए गिनती सीखते हैं। एक, दो, तीन, चार, पाँच, छह, सात, आठ, नौ, दस, ग्यारह, बारह, तेरह, चौदह, पंद्रह, सोलह, सत्रह, अठारह, उन्नीस, बीस।",
        "counting": "Let's learn counting. One, Two, Three, Four, Five, Six, Seven, Eight, Nine, Ten.",
        "alphabet,अल्फाबेट": "Let's learn the English alphabet. A for Apple, B for Ball, C for Cat, D for Dog, E for Elephant, F for Fish, G for Goat, H for Hen, I for Ice-cream, J for Jug, K for Kite, L for Lion, M for Monkey, N for Nest, O for Owl, P for Parrot, Q for Queen, R for Rabbit, S for Sun, T for Tiger, U for Umbrella, V for Van, W for Watch, X for Xylophone, Y for Yak, Z for Zebra.",
        "रंग": "चलो रंगों के नाम सीखते हैं। लाल, पीला, नीला, हरा, काला, सफेद, नारंगी, गुलाबी।",
        "आकार": "आइए आकृतियाँ पहचानते हैं। वृत्त यानी गोल, वर्ग यानी चौकोर, त्रिकोण यानी तिकोना, आयत यानी लम्बा चौकोर।"
    }

    for keyword, reply in responses.items():
        if keyword in text:
            return reply

    # Fallback to Gemini if not matched
    return call_gemini_api(text)

def call_gemini_api(prompt):
    api_key = "AIzaSyAyRvcB1icEZzM9jP4aDnZZAdTEKT_0d3U"
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {
        "Content-Type": "application/json"
    }
    params = {
        "key": api_key
    }
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "maxOutputTokens": 120,   # approx 20 words
            "temperature": 0.7,
            "topP": 1
        }
    }

    try:
        response = requests.post(url, headers=headers, params=params, json=data)
        response.raise_for_status()
        result = response.json()
        return result["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print("Gemini API error:", e)
        return "माफ़ कीजिए, मैं अभी जवाब नहीं दे पाई।"


@app.route('/process-text', methods=['POST'])
def process_text():
    data = request.json
    user_text = data.get("text", "")

    response_text = rule_based_response(user_text)

    # Generate audio using gTTS
    tts = gTTS(text=response_text, lang='hi')
    os.makedirs("responses", exist_ok=True)
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join("responses", filename)
    tts.save(filepath)

    return jsonify({
        "transcription": user_text,
        "response": response_text,
        "audio_url": f"/play-audio/{filename}"
    })

@app.route('/play-audio/<filename>', methods=['GET'])
def play_audio(filename):
    filepath = os.path.join("responses", filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='audio/mpeg')
    return "File not found", 404

if __name__ == '__main__':  # <- ✅ Fixed this line from '_main_'
    app.run(debug=True, port=5000)
