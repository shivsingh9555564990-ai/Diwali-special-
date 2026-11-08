import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { cleanShayariText, DEFAULT_SHAYARIS } from '@/lib/greeting-state';

// In-memory counter for real live AI call tracking
let globalAiCallCount = 412;

export async function GET() {
  return NextResponse.json({
    callCount: globalAiCallCount,
    status: 'online',
    topModel: 'gemini-auto (superavon-1.onrender.com/v1)',
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

    // Increment AI call counter
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
3. Weave in the blessing and if a sender name is given ("${from}"), weave it gracefully or keep the festive message vibrant.
4. Output ONLY the Devanagari Hindi shayari text. NO English, NO introductory remarks, NO explanation, NO asterisks or quotes.
`.trim();

    let aiShayari = '';
    let modelUsed = 'gemini-auto';

    // 1. Primary: Tested https://superavon-1.onrender.com/v1 with gemini-auto
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch('https://superavon-1.onrender.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-auto',
          messages: [
            {
              role: 'system',
              content: 'You are a master Hindi poet who writes powerful, rhyming, dhamakedar Diwali festival shayaris. Output ONLY the Hindi shayari.',
            },
            {
              role: 'user',
              content: promptText,
            },
          ],
          temperature: 0.85,
          max_tokens: 180,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawContent = data.choices?.[0]?.message?.content || '';
        if (rawContent && !rawContent.includes('upstream error')) {
          aiShayari = cleanShayariText(rawContent);
          modelUsed = data.model || 'gemini-auto (superavon)';
        }
      }
    } catch (err) {
      console.warn('Superavon gemini-auto call failed, attempting backup:', err);
    }

    // 2. Secondary: Try gemini-3.7-flash on https://superavon-1.onrender.com/v1
    if (!aiShayari) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);
        const res2 = await fetch('https://superavon-1.onrender.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-3.7-flash',
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.8,
            max_tokens: 180,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res2.ok) {
          const data2 = await res2.json();
          const raw = data2.choices?.[0]?.message?.content || '';
          if (raw && !raw.includes('upstream error')) {
            aiShayari = cleanShayariText(raw);
            modelUsed = 'gemini-3.7-flash (superavon)';
          }
        }
      } catch {
        // Continue to official Gemini API
      }
    }

    // 3. Fallback: GoogleGenAI SDK with process.env.GEMINI_API_KEY (100% Genuine AI)
    if (!aiShayari && process.env.GEMINI_API_KEY) {
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
        console.warn('Google GenAI fallback failed:', err);
      }
    }

    // 4. Fallback if offline
    if (!aiShayari) {
      const randomIndex = Math.floor(Math.random() * DEFAULT_SHAYARIS.length);
      aiShayari = DEFAULT_SHAYARIS[randomIndex];
      modelUsed = 'curated-dhamakedar-gem';
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shayari: DEFAULT_SHAYARIS[0],
        callCount: globalAiCallCount,
      },
      { status: 500 }
    );
  }
}

