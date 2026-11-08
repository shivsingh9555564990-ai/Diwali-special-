export type CrackerType = 'anar' | 'chakri' | 'rocket' | 'bomb' | 'phuljhadi' | 'diya';

export interface CrackerMeta {
  id: CrackerType;
  name: string;
  hindiName: string;
  emoji: string;
  description: string;
}

export const CRACKER_LIST: CrackerMeta[] = [
  { id: 'anar', name: 'Anar (Flowerpot)', hindiName: 'अनार (फाउंटेन)', emoji: '🌋', description: 'ऊंचाई तक उड़ने वाली सुनहरी चमकती चिंगारियां' },
  { id: 'chakri', name: 'Ground Chakri', hindiName: 'जमीन चकरी', emoji: '🌀', description: 'तेज़ गति से गोल घूमती सतरंगी रोशनी' },
  { id: 'rocket', name: 'Sky Rocket', hindiName: 'आसमानी रॉकेट', emoji: '🚀', description: 'आसमान में जाकर जोरदार धमाका और रंगों की बारिश' },
  { id: 'bomb', name: 'Sutli Bomb', hindiName: 'सुतली बम', emoji: '🧨', description: 'दहला देने वाला जोरदार क्लासिक दिवाली धमाका' },
  { id: 'phuljhadi', name: 'Phuljhadi Sparkler', hindiName: 'फुलझड़ी', emoji: '✨', description: 'सफेद-सुनहरी चटकती हुई सुंदर लपटें' },
  { id: 'diya', name: 'Shahi Diya', hindiName: 'शाही दीया', emoji: '🪔', description: 'शुभ दीपावली का पावन जगमगाता दीया' },
];

export interface GreetingData {
  from: string;
  to: string;
  shayari: string;
  vibe: 'dhamakedar' | 'royal' | 'pyari' | 'dosti' | 'traditional';
  theme: 'gold' | 'crimson' | 'emerald' | 'cosmic';
  cracker?: CrackerType;
  createdDate?: string;
  id?: string;
}

export const VIBE_LABELS: Record<GreetingData['vibe'], { name: string; emoji: string; desc: string }> = {
  dhamakedar: { name: 'धमाकेदार (Dhamakedar)', emoji: '💥', desc: 'Full high-voltage festive energy & patakha rhymes' },
  royal: { name: 'शाही / रॉयल (Royal)', emoji: '👑', desc: 'Grand, elegant and majestic blessings' },
  pyari: { name: 'प्यारी / दिल से (Heartfelt)', emoji: '✨', desc: 'Sweet, loving prayers for happiness & prosperity' },
  dosti: { name: 'याराना / दोस्ती (Friends)', emoji: '🤝', desc: 'Fun banter, friendship and celebration' },
  traditional: { name: 'पारंपरिक (Traditional)', emoji: '🪔', desc: 'Subh Deepavali, Lakshmi-Ganesh traditional blessings' },
};

export const DEFAULT_SHAYARIS = [
  "दीप जलते रहें, जगमगाता रहे आपका संसार,\nरोशनी के इस पावन पर्व पर मिले खुशियों का अंबार!\nशुभ दीपावली! 🪔✨",
  "पटाखों की गूँज, दीयों की बहार,\nमुबारक हो आपको और आपके पूरे परिवार को दिवाली का यह त्यौहार! 💥🎇",
  "सोने का रथ, चांदी की पालकी पर बैठकर आई माँ लक्ष्मी,\nदेने आपको और आपके अपनों को सुख, शांति और समृद्धि! 🌟💰",
  "आसमान में छूटे जैसे सतरंगी फुलझड़ी और अनार,\nवैसे ही महकता रहे आपका सारा जीवन और परिवार! 🎆🪔",
  "हर अंधेरा मिटे, हर शिकवा दूर हो जाए,\nइस दिवाली आपके घर में सिर्फ खुशियों की ही बहार आए! ✨🔥"
];

/**
 * Encodes greeting parameters into a URL-safe Base64 string for sharing
 */
export function encodeGreetingToUrl(data: GreetingData, baseUrl: string = ''): string {
  try {
    const jsonStr = JSON.stringify({
      f: data.from || '',
      t: data.to || '',
      s: data.shayari || '',
      v: data.vibe || 'dhamakedar',
      th: data.theme || 'gold',
      c: data.cracker || 'anar',
    });
    
    let base64 = '';
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(jsonStr, 'utf-8').toString('base64');
    } else {
      const bytes = new TextEncoder().encode(jsonStr);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(bin);
    }
    
    const encoded = encodeURIComponent(base64);
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}?card=${encoded}` : `?card=${encoded}`;
  } catch {
    return baseUrl || '';
  }
}

/**
 * Decodes greeting parameters from URL-safe string
 */
export function decodeGreetingFromUrl(cardParam: string): Partial<GreetingData> | null {
  if (!cardParam) return null;
  try {
    const base64 = decodeURIComponent(cardParam);
    let jsonStr = '';
    
    if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    } else {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      jsonStr = new TextDecoder('utf-8').decode(bytes);
    }

    const parsed = JSON.parse(jsonStr);
    return {
      from: parsed.f || '',
      to: parsed.t || '',
      shayari: parsed.s || '',
      vibe: parsed.v || 'dhamakedar',
      theme: parsed.th || 'gold',
      cracker: parsed.c || 'anar',
    };
  } catch {
    return null;
  }
}

/**
 * Cleans markdown and extracts pure poetic lines
 */
export function cleanShayariText(raw: string): string {
  if (!raw) return '';
  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*>\s*/, '').trim())
    .join('\n')
    .replace(/^["'\s]+|["'\s]+$/g, '') // remove outer quotes
    .replace(/\*\*/g, '') // remove markdown bold
    .replace(/###/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Format counter badge string
 */
export function formatAiCounter(count: number): string {
  if (count <= 0) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toLocaleString();
}

/**
 * Generates a clean WhatsApp share message with sender name, link, and CTA (no raw shayari dump)
 */
export function generateWhatsAppShareMessage(senderName: string, url: string): string {
  const name = senderName.trim() || 'आपके किसी खास';
  return `✨ *${name}* ने आपके लिए एक खास 3D दिवाली कार्ड भेजा है! 🪔💥\n\n👇 देखने के लिए नीचे दिए गए लिंक पर टच करके ओपन करें:\n${url}\n\n🎇 टच करके अभी खोलें!`;
}

