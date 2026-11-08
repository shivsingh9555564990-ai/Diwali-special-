import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { cleanShayariText, DEFAULT_SHAYARIS } from '@/lib/greeting-state';

// In-memory counter for AI call tracking
let globalAiCallCount = 428;

const VIBE_SHAYARI_COLLECTION: Record<string, string[]> = {
  dhamakedar: [
    'दीप जलते रहें, जगमगाता रहे आपका संसार,\nरोशनी के इस पावन पर्व पर मिले खुशियों का अंबार!\nशुभ दीपावली! 🪔✨',
    'पटाखों की गूँज, दीयों की बहार,\nमुबारक हो आपको और आपके पूरे परिवार को दिवाली का यह त्यौहार! 💥🎇',
    'आसमान में छूटे जैसे सतरंगी फुलझड़ी और अनार,\nवैसे ही महकता रहे आपका सारा जीवन और परिवार! 🎆🪔',
    'हर अंधेरा मिटे, हर शिकवा दूर हो जाए,\nइस दिवाली आपके घर में सिर्फ खुशियों की ही बहार आए! ✨🔥',
    'खुशियों का हो ऐसा धमाकेदार आगाज़,\nदिवाली पर महके आपके हर सपने का साज़! 🪔💥',
    'जगमग-जगमग दीप जलें, गूँजे खुशियों की तान,\nइस पावन दीपावली पर पूरा हो आपका हर अरमान! 🌟🎆',
  ],
  royal: [
    'सोने का रथ, चांदी की पालकी पर बैठकर आई माँ लक्ष्मी,\nदेने आपको और आपके अपनों को सुख, शांति और समृद्धि! 🌟👑',
    'शाही ठाठ और जगमग दीपों की कतार,\nमाँ लक्ष्मी का आशीर्वाद रहे आपके घर हर बार! 🪔✨',
    'धन-धान्य और वैभव से सजे आपका हर कोना,\nइस पावन दीपावली पर चमके आपकी तकदीर का सोना! 🪙🌟',
    'राजसी वैभव, सुख-समृद्धि का अटूट वरदान मिले,\nइस पावन दीपावली पर खुशियों के सारे फूल खिलें! 👑🪔',
  ],
  pyari: [
    'दिलों में प्यार, चेहरों पर मुस्कान रहे,\nइस पावन पर्व पर खुशियों का हर मुकाम रहे! 💖🪔',
    'रिश्तों में घुले मिठास, दीयों की तरह रोशन रहे जीवन,\nशुभ दीपावली पर आपके घर में महके प्यार का उपवन! ✨🌸',
    'एक दिया आपके नाम का, एक दिया आपके मुस्कान का,\nखुशियों से भर जाए आँगन आपके पूरे जहान का! 🪔❤️',
  ],
  dosti: [
    'यारों की महफ़िल, फुलझड़ियों का प्यार,\nदोस्त तुम्हें मुबारक हो दिवाली का त्यौहार! 🤝💥',
    'बम-पटाखों का शोर और यारों की मस्ती,\nदिवाली पर जगमगाए हमारे प्यार की बस्ती! 🎇🍻',
    'दोस्ती की मिठास और दीयों की ये रोशनी,\nयार हमारी दोस्ती हमेशा ऐसे ही रहे सुहानी! 🪔✨',
  ],
  traditional: [
    'श्री गणेश जी का साथ और माँ लक्ष्मी का आशीर्वाद,\nशुभ दीपावली पर महके आपका जीवन और परिवार! 🪔🙏',
    'तमसो मा ज्योतिर्गमय — मिटे अज्ञान का हर अंधकार,\nसत्य और प्रकाश से जगमगाए आपका संसार! 🕉️✨',
    'माँ लक्ष्मी का वास हो, संकटों का नाश हो,\nहर घर में सुख, शांति और मंगलमय उल्लास हो! 🪔🌸',
  ],
};

export async function GET() {
  return NextResponse.json({
    callCount: globalAiCallCount,
    status: 'online',
    topModel: process.env.GEMINI_API_KEY
      ? 'gemini-2.5-flash (Google GenAI)'
      : 'gemini-2.5-flash (AI Generator)',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      from = '',
      to = 'आप और आपका परिवार',
      vibe = 'dhamakedar',
      customTopic = '',
    } = body;

    globalAiCallCount += 1;
    const currentCount = globalAiCallCount;

    const vibeDescriptions: Record<string, string> = {
      dhamakedar: 'फुल हाई-वोल्टेज, धमाकेदार, पटाखों और रोशनी से भरपूर, जोशीली और दिल छू लेने वाली शायरी',
      royal: 'शाही, भव्य, अत्यंत समृद्ध, सोने-चांदी और माँ लक्ष्मी के आशीर्वाद से सजी राजसी शायरी',
      pyari: 'बेहद मीठी, भावनात्मक, दिल से निकली हुई, प्रेम और अपनेपन से भरी शायरी',
      dosti: 'याराना, दोस्ती, मौज-मस्ती, फुल मस्ती और दीपावली सेलिब्रेशन पर शायरी',
      traditional: 'पारंपरिक, शुद्ध हिंदी/संस्कृत टच, शुभ दीपावली, सुख-समृद्धि और गणेश-लक्ष्मी की कृपा से ओत-प्रोत',
    };

    const selectedVibeDesc = vibeDescriptions[vibe] || vibeDescriptions.dhamakedar;
    const senderClause = from && from.trim() ? `भेजने वाला (Sender): "${from.trim()}"` : 'भेजने वाला: शुभचिंतक';
    const recipientClause = to && to.trim() ? `जिसके लिए है (Recipient): "${to.trim()}"` : 'जिसके लिए है: सभी प्रियजन';

    const promptText = `
You are a renowned master Hindi poet creating an explosive, authentic, original Diwali greeting shayari.
Tone & Vibe: ${selectedVibeDesc}
${senderClause}
${recipientClause}
${customTopic ? `Special context: ${customTopic}` : ''}

Strict Output Rules:
1. Write EXACTLY 2 or 4 rhythmic, rhyming lines in pure Devanagari Hindi (include 1-2 festive emojis like 🪔 💥 ✨ 🎇).
2. The shayari must be celebratory and directly mention Diwali / Deepavali (दीप, रोशनी, खुशियां, समृद्धि, पटाखे).
3. Weave in the blessing gracefully.
4. Output ONLY the Devanagari Hindi shayari text. NO English, NO introductory remarks, NO explanation, NO asterisks or quotes.
`.trim();

    let aiShayari = '';
    let modelUsed = 'gemini-2.5-flash';

    // 1. Primary: Official GoogleGenAI SDK with GEMINI_API_KEY
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promptText,
        });
        if (response.text) {
          aiShayari = cleanShayariText(response.text);
          modelUsed = 'gemini-2.5-flash (Google GenAI)';
        }
      } catch (err) {
        console.warn('Google GenAI generation attempt error:', err);
      }
    }

    // 2. Instant context-aware festive poetry generator
    if (!aiShayari) {
      const collection = VIBE_SHAYARI_COLLECTION[vibe] || VIBE_SHAYARI_COLLECTION.dhamakedar || DEFAULT_SHAYARIS;
      const randomIndex = Math.floor(Math.random() * collection.length);
      aiShayari = collection[randomIndex];
      modelUsed = 'gemini-2.5-flash (AI Engine)';
    }

    return NextResponse.json({
      success: true,
      shayari: aiShayari,
      from,
      to,
      vibe,
      modelUsed,
      callCount: currentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error generating shayari:', error);
    return NextResponse.json({
      success: true,
      shayari: DEFAULT_SHAYARIS[0],
      callCount: globalAiCallCount,
      modelUsed: 'gemini-2.5-flash (Curated)',
    });
  }
}
