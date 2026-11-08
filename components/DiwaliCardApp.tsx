'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  RefreshCw,
  Share2,
  X,
  User,
  Heart,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  GreetingData,
  DEFAULT_SHAYARIS,
  CRACKER_LIST,
  CrackerType,
  encodeGreetingToUrl,
  decodeGreetingFromUrl,
  generateWhatsAppShareMessage,
} from '@/lib/greeting-state';
import {
  initAudio,
  playCrackerSound,
  playTempleBell,
} from '@/lib/diwali-audio';

// Dynamically import Three.js scene to ensure client-only execution
const DiwaliScene = dynamic(() => import('@/components/DiwaliScene'), { ssr: false });

const DEFAULT_GREETING: GreetingData = {
  from: 'शिव',
  to: 'आप और आपका प्यारा परिवार',
  shayari: DEFAULT_SHAYARIS[0],
  vibe: 'dhamakedar',
  theme: 'gold',
  cracker: 'anar',
};

// Character-by-character advance 3D glowing color palette
const GLOW_COLORS = [
  '#ff2a6d',
  '#ff6200',
  '#ffb703',
  '#ffd166',
  '#06d6a0',
  '#118ab2',
  '#00f5d4',
  '#7b2cbf',
  '#b5179e',
  '#f72585',
  '#ff4d6d',
  '#4cc9f0',
  '#52b788',
  '#ffd700',
  '#ff0055',
  '#00f0ff',
  '#a855f7',
];

const CONSTRUCTED_BY_SHIV = [
  { char: 'C', color: '#ff2a6d' },
  { char: 'o', color: '#ff6200' },
  { char: 'n', color: '#ffb703' },
  { char: 's', color: '#ffd166' },
  { char: 't', color: '#06d6a0' },
  { char: 'r', color: '#118ab2' },
  { char: 'u', color: '#00f5d4' },
  { char: 'c', color: '#7b2cbf' },
  { char: 't', color: '#b5179e' },
  { char: 'e', color: '#f72585' },
  { char: 'd', color: '#ff4d6d' },
  { char: ' ', color: 'transparent' },
  { char: 'b', color: '#4cc9f0' },
  { char: 'y', color: '#52b788' },
  { char: ' ', color: 'transparent' },
  { char: 'S', color: '#ffd700' },
  { char: 'h', color: '#ff0055' },
  { char: 'i', color: '#00f0ff' },
  { char: 'v', color: '#a855f7' },
];

function GlowingText({ text, className = '' }: { text: string; className?: string }) {
  // Use Intl.Segmenter so Indic/Hindi matras stay united with their consonants
  const chars = React.useMemo(() => {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
        return Array.from(segmenter.segment(text), (s) => s.segment);
      } catch {
        return Array.from(text);
      }
    }
    return Array.from(text);
  }, [text]);

  return (
    <span className={`inline-flex items-center flex-wrap justify-center font-extrabold tracking-wide ${className}`}>
      {chars.map((char, index) => {
        if (char === ' ') {
          return <span key={index} className="inline-block">&nbsp;</span>;
        }
        const color = GLOW_COLORS[index % GLOW_COLORS.length];
        return (
          <span
            key={index}
            style={{
              color,
              textShadow: `0 1px 0 #000, 0 2px 0 #111, 0 3px 0 #222, 0 4px 1px rgba(0,0,0,0.8), 0 0 10px ${color}, 0 0 20px ${color}`,
            }}
            className="inline-block transition-transform duration-200 hover:scale-125 hover:-translate-y-0.5"
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

export default function DiwaliCardApp() {
  const [greeting, setGreeting] = useState<GreetingData>(DEFAULT_GREETING);
  const [isSharedView, setIsSharedView] = useState<boolean>(false);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [senderNameInput, setSenderNameInput] = useState<string>('शिव');
  const [recipientNameInput, setRecipientNameInput] = useState<string>('आप और आपका प्यारा परिवार');
  const [nameError, setNameError] = useState<string>('');
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [burstCount, setBurstCount] = useState<number>(1); // starts > 0 for immediate animation!
  const [, startTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Cinematic Blast & Screen Shake States
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [isBlasted, setIsBlasted] = useState<boolean>(false);
  const blastResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate URL parameters on mount
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        const cardParam = params.get('card');
        if (cardParam) {
          const decoded = decodeGreetingFromUrl(cardParam);
          if (decoded) {
            const decodedFrom = decoded.from || 'शिव';
            const decodedTo = decoded.to || 'आप और आपका प्यारा परिवार';
            setGreeting({
              from: decodedFrom,
              to: decodedTo,
              shayari: decoded.shayari || DEFAULT_GREETING.shayari,
              vibe: (decoded.vibe as GreetingData['vibe']) || DEFAULT_GREETING.vibe,
              theme: (decoded.theme as GreetingData['theme']) || DEFAULT_GREETING.theme,
              cracker: (decoded.cracker as CrackerType) || 'anar',
            });
            setSenderNameInput(decodedFrom);
            setRecipientNameInput(decodedTo);
            setIsSharedView(true);
          }
        }
      } catch (err) {
        console.error('Failed to parse card from URL:', err);
      }
    });
  }, []);

  // Multi-color celebratory confetti burst
  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.65 },
        colors: ['#ffd700', '#ff4500', '#ff1493', '#00ff7f', '#00bfff'],
      });
    } catch {
      // Fallback
    }
  }, []);

  const triggerIgniteSequence = useCallback(() => {
    initAudio();
    setBurstCount((prev) => prev + 1);
    triggerConfetti();
  }, [triggerConfetti]);

  // Handler when Bomb or Cracker detonates: Trigger Screen Shake & Smooth Character Fall for 10s
  const handleBlastTrigger = useCallback(() => {
    // 1. Violent Screen Shake for ~850ms
    setIsScreenShaking(true);
    setTimeout(() => {
      setIsScreenShaking(false);
    }, 850);

    // 2. Smoothly drop all characters and buttons down off the screen!
    setIsBlasted(true);

    // 3. Keep scene in full 10-second fireworks spectacle, then smoothly restore characters to normal!
    if (blastResetTimeoutRef.current) {
      clearTimeout(blastResetTimeoutRef.current);
    }
    blastResetTimeoutRef.current = setTimeout(() => {
      setIsBlasted(false);
    }, 10000); // 10 seconds of full-screen celebratory animation!
  }, []);

  // AUTO IGNITE ON CRACKER SELECTION
  const handleSelectCracker = (cType: CrackerType) => {
    initAudio();
    setGreeting((prev) => ({ ...prev, cracker: cType }));
    setBurstCount((prev) => prev + 1);
    playCrackerSound(cType);
    triggerConfetti();

    // If Sutli Bomb is selected, also trigger the screen shake & character fall effect!
    if (cType === 'bomb') {
      setTimeout(() => {
        handleBlastTrigger();
      }, 1200); // sync with fuse burn
    }
  };

  // AI Shayari Generation
  const handleGenerateAiShayari = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    initAudio();
    playTempleBell(950);

    try {
      const res = await fetch('/api/shayari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: greeting.from,
          to: greeting.to,
          vibe: greeting.vibe,
        }),
      });

      const data = await res.json();
      if (data.shayari) {
        startTransition(() => {
          setGreeting((prev) => ({
            ...prev,
            shayari: data.shayari,
          }));
        });
      }

      triggerIgniteSequence();
    } catch (err) {
      console.error('Failed to generate AI shayari:', err);
      const randomFallback = DEFAULT_SHAYARIS[Math.floor(Math.random() * DEFAULT_SHAYARIS.length)];
      setGreeting((prev) => ({ ...prev, shayari: randomFallback }));
      triggerIgniteSequence();
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate share URL
  const getShareUrl = useCallback((customFrom?: string, customTo?: string) => {
    if (typeof window === 'undefined') return '';
    const shareData: GreetingData = {
      ...greeting,
      from: customFrom !== undefined ? customFrom : greeting.from,
      to: customTo !== undefined ? customTo : greeting.to,
    };
    return encodeGreetingToUrl(shareData, window.location.origin + window.location.pathname);
  }, [greeting]);

  // Open Share Modal
  const handleOpenShareModal = () => {
    initAudio();
    setNameError('');
    setShareSuccess(false);
    if (!senderNameInput && greeting.from) {
      setSenderNameInput(greeting.from);
    }
    if (!recipientNameInput && greeting.to) {
      setRecipientNameInput(greeting.to);
    }
    setIsShareModalOpen(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);
  };

  // BOOM SHARE via WhatsApp: Clean message with sender name + link + "open kare" CTA (NO raw shayari)
  const handleBoomShareWhatsApp = () => {
    const trimmedName = senderNameInput.trim();
    if (!trimmedName) {
      setNameError('कृपया अपना नाम दर्ज करें ताकि कार्ड पर आपका नाम जाए!');
      nameInputRef.current?.focus();
      return;
    }
    setNameError('');
    initAudio();

    const finalRecipient = recipientNameInput.trim() || 'आप और आपका प्यारा परिवार';
    setGreeting((prev) => ({
      ...prev,
      from: trimmedName,
      to: finalRecipient,
    }));

    const url = getShareUrl(trimmedName, finalRecipient);
    const message = generateWhatsAppShareMessage(trimmedName, url);
    const encoded = encodeURI(message);

    triggerIgniteSequence();
    playTempleBell(880);
    setShareSuccess(true);

    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Copy Link Action
  const handleCopyLink = async () => {
    const trimmedName = senderNameInput.trim() || greeting.from.trim();
    if (!trimmedName) {
      setNameError('कृपया अपना नाम दर्ज करें ताकि लिंक में आपका नाम जाए!');
      nameInputRef.current?.focus();
      return;
    }
    setNameError('');
    initAudio();

    const finalRecipient = recipientNameInput.trim() || greeting.to || 'आप और आपका प्यारा परिवार';
    setGreeting((prev) => ({ ...prev, from: trimmedName, to: finalRecipient }));

    const url = getShareUrl(trimmedName, finalRecipient);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      playTempleBell(880);
      triggerConfetti();
      setTimeout(() => setCopied(false), 2400);
    } catch {
      prompt('यहाँ से शेयर लिंक कॉपी करें:', url);
    }
  };

  // Native Web Share
  const handleNativeShare = async () => {
    const trimmedName = senderNameInput.trim() || greeting.from.trim();
    if (!trimmedName) {
      setNameError('कृपया पहले अपना नाम लिखें!');
      nameInputRef.current?.focus();
      return;
    }
    setNameError('');
    initAudio();

    const finalRecipient = recipientNameInput.trim() || greeting.to || 'आप और आपका प्यारा परिवार';
    setGreeting((prev) => ({ ...prev, from: trimmedName, to: finalRecipient }));

    const url = getShareUrl(trimmedName, finalRecipient);
    const shareText = `✨ ${trimmedName} ने आपके लिए एक खास 3D दिवाली कार्ड भेजा है! 🪔💥\nटच करके ओपन करें:\n${url}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `शुभ दीपावली - ${trimmedName} की तरफ से`,
          text: shareText,
          url,
        });
        triggerIgniteSequence();
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  // Sender display string
  const senderDisplayName = greeting.from?.trim() || 'शिव';
  const recipientDisplayName = greeting.to?.trim() || 'आप और आपका प्यारा परिवार';

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden bg-[#060312] text-amber-100 flex flex-col justify-between select-none ${
        isScreenShaking ? 'animate-screen-shake' : ''
      }`}
    >
      {/* 1. Full-Screen 3D Procedural Three.js Scene: Instant Auto-Play with 10s cracker animations */}
      <DiwaliScene
        cracker={greeting.cracker || 'anar'}
        burstTrigger={burstCount}
        onScreenShake={() => {
          setIsScreenShaking(true);
          setTimeout(() => setIsScreenShaking(false), 850);
        }}
        onBlastTrigger={handleBlastTrigger}
        onExploded={() => {
          playCrackerSound(greeting.cracker || 'anar');
        }}
      />

      {/* 2. Top Bar: Clean & Elegant "CONSTRUCTED BY SHIV" (No extra share button on top) */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-3 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-300 flex items-center justify-center shadow-[0_0_15px_rgba(255,200,0,0.8)] border border-yellow-200">
            <span className="text-sm sm:text-base">🪔</span>
          </div>

          {/* 3D Glowing "Constructed by Shiv" Header Title */}
          <div className="flex items-center tracking-wider font-extrabold font-['Cinzel',serif] text-sm sm:text-lg md:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            {CONSTRUCTED_BY_SHIV.map((item, idx) => (
              <span
                key={idx}
                style={{
                  color: item.color,
                  textShadow:
                    item.color === 'transparent'
                      ? 'none'
                      : `0 1px 0 #000, 0 2px 0 #111, 0 3px 0 #222, 0 4px 1px rgba(0,0,0,0.8), 0 0 10px ${item.color}, 0 0 20px ${item.color}`,
                }}
                className="inline-block transition-transform hover:scale-125 hover:-translate-y-0.5 cursor-default"
              >
                {item.char === ' ' ? '\u00A0' : item.char}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* 3. Upper Elegant Diwali Card: Displays sender & recipient with glowing 3D animated letters! */}
      {/* On Bomb blast, character and card elements smoothly drop down off screen for 10s */}
      <section
        className={`relative z-10 w-full max-w-3xl mx-auto px-4 pt-1 sm:pt-2 text-center pointer-events-none transition-all duration-700 ${
          isBlasted ? 'animate-blast-drop' : 'animate-rise-back'
        }`}
      >
        <div className="inline-block p-3.5 sm:p-5 rounded-3xl bg-black/60 backdrop-blur-md border border-amber-500/40 shadow-[0_4px_30px_rgba(0,0,0,0.85)] pointer-events-auto max-w-2xl mx-auto">
          {/* Top Festive Ribbon */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/25 to-amber-500/20 border border-amber-400/50 mb-1.5 shadow-[0_0_15px_rgba(255,200,0,0.3)]">
            <span className="text-amber-400 text-xs sm:text-sm">🪔</span>
            <span className="text-[11px] sm:text-xs md:text-sm font-black tracking-widest text-amber-200 uppercase font-['Cinzel',serif]">
              शुभ दीपावली की हार्दिक शुभकामनाएं
            </span>
            <span className="text-amber-400 text-xs sm:text-sm">🪔</span>
          </div>

          {/* Recipient Display */}
          <div className="text-xs sm:text-sm md:text-base font-bold text-amber-200/90 mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            सप्रेम भेंट:{' '}
            <span className="text-white font-extrabold underline decoration-amber-400 decoration-1 underline-offset-2">
              {recipientDisplayName}
            </span>
          </div>

          {/* The Hero Dhamakedar Shayari */}
          <div className="my-1.5 sm:my-2 px-2">
            <h2
              className="text-lg sm:text-2xl md:text-3xl font-black font-['Rozha_One',serif] leading-relaxed text-amber-50 tracking-wide whitespace-pre-line"
              style={{
                textShadow:
                  '0 2px 4px rgba(0,0,0,0.95), 0 0 20px rgba(255,200,0,0.6), 0 0 35px rgba(255,140,0,0.4)',
              }}
            >
              {greeting.shayari}
            </h2>
          </div>

          {/* Sender Signature: PROPER ANIMATED IN 3D MULTI-COLOR STYLE (LIKE CONSTRUCTED BY SHIV) */}
          <div className="mt-2.5 flex items-center justify-center">
            <button
              onClick={handleOpenShareModal}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/80 border border-amber-400/70 shadow-[0_0_20px_rgba(255,180,0,0.5)] hover:border-yellow-300 hover:scale-105 transition-all cursor-pointer group"
              title="नाम बदलें या कार्ड शेयर करें"
            >
              <span className="text-xs sm:text-sm text-amber-300 font-bold">शुभकामनाएं प्रेषक:</span>
              <GlowingText
                text={senderDisplayName}
                className="text-sm sm:text-base md:text-lg font-black"
              />
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin ml-0.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Center Area is clear for 3D Cracker view */}
      <div className="flex-1 pointer-events-none" />

      {/* 5. Lower Action Deck: Smoothly drops down on blast, then returns after 10s */}
      {/* 360 degree text removed! Three dot / sliders button removed! Clean and grand! */}
      <section
        className={`relative z-20 w-full max-w-3xl mx-auto px-3 pb-3 flex flex-col items-center gap-2 pointer-events-auto transition-all duration-700 ${
          isBlasted ? 'animate-blast-drop' : 'animate-rise-back'
        }`}
      >
        {/* Cracker Selection Bar */}
        <div className="w-full flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 px-2 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-amber-500/30 shadow-[0_0_20px_rgba(0,0,0,0.7)]">
          {CRACKER_LIST.map((item) => {
            const isSelected = (greeting.cracker || 'anar') === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectCracker(item.id)}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-[0_0_16px_rgba(255,200,0,0.8)] scale-105 border-2 border-white'
                    : 'bg-black/70 border border-amber-500/40 text-amber-200 hover:border-amber-300 hover:bg-black/90'
                }`}
                title={`${item.hindiName} जलाएं`}
              >
                <span>{item.emoji}</span>
                <span>{item.hindiName}</span>
              </button>
            );
          })}
        </div>

        {/* Action Row: Next Shayari & Big Card Share Button (Three dot / slider clutter removed) */}
        <div className="w-full flex items-center justify-center gap-2.5 sm:gap-3.5 max-w-md mx-auto">
          {/* Next AI Shayari Button */}
          <button
            onClick={handleGenerateAiShayari}
            disabled={isGenerating}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(255,180,0,0.6)] active:scale-95 transition-all disabled:opacity-60 cursor-pointer border border-yellow-200"
            title="अगली AI शायरी"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>तैयार हो रही है...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black fill-black" />
                <span>अगली AI शायरी ✨</span>
              </>
            )}
          </button>

          {/* Big Prominent Share Button */}
          <button
            onClick={handleOpenShareModal}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.6)] active:scale-95 transition-all cursor-pointer border border-emerald-300"
            title="कार्ड शेयर करें"
          >
            <Send className="w-4 h-4" />
            <span>कार्ड शेयर करें 🚀</span>
          </button>
        </div>
      </section>

      {/* 6. POPUP SHARE MODAL (Clean, user enters name -> BOOM SHARE via WhatsApp) */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#120a26] border-2 border-amber-400/80 p-5 sm:p-6 shadow-[0_0_40px_rgba(255,180,0,0.4)] text-center">
            {/* Close Button */}
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/60 text-amber-300 hover:text-white border border-amber-500/40 hover:bg-black/90 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 mb-2 shadow-[0_0_20px_rgba(255,200,0,0.8)] border border-yellow-200">
              <Sparkles className="w-6 h-6 text-black fill-black" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 font-['Cinzel',serif]">
              अपना नाम डालकर शेयर करें
            </h3>
            <p className="text-xs sm:text-sm text-amber-300/90 mt-1 mb-4">
              जिसे आप भेजेंगे, उसे कार्ड पर <strong className="underline text-yellow-300">आपका नाम 3D में जगमगाता हुआ</strong> दिखेगा!
            </p>

            {/* Name Input Field */}
            <div className="text-left mb-3">
              <label className="block text-xs sm:text-sm font-black text-amber-200 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-400" />
                <span>आपका नाम (Your Name) *</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={senderNameInput}
                onChange={(e) => {
                  setSenderNameInput(e.target.value);
                  if (e.target.value.trim()) setNameError('');
                }}
                placeholder="उदा. शिव सिंह, राहुल, प्रिया..."
                className={`w-full px-4 py-2.5 rounded-xl bg-black/80 border-2 ${
                  nameError ? 'border-red-500' : 'border-amber-400/80 focus:border-yellow-300'
                } focus:outline-none text-white text-base font-extrabold shadow-inner`}
              />
              {nameError && (
                <p className="text-xs text-red-400 font-bold mt-1.5 animate-bounce">
                  ⚠️ {nameError}
                </p>
              )}
            </div>

            {/* Recipient Input (Optional) */}
            <div className="text-left mb-4">
              <label className="block text-xs sm:text-sm font-black text-amber-200 mb-1.5 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-amber-400" />
                <span>किसके लिए है (Recipient Name / Family)</span>
              </label>
              <input
                type="text"
                value={recipientNameInput}
                onChange={(e) => setRecipientNameInput(e.target.value)}
                placeholder="उदा. आप और आपका प्यारा परिवार"
                className="w-full px-4 py-2 rounded-xl bg-black/80 border border-amber-500/50 focus:border-amber-400 focus:outline-none text-white text-sm font-bold shadow-inner"
              />
            </div>

            {/* Live Name Preview */}
            <div className="p-3 rounded-xl bg-black/60 border border-amber-500/40 mb-4 text-center">
              <span className="text-xs text-amber-300 block mb-0.5">कार्ड पर दिखने वाला प्रेषक:</span>
              <div className="text-base sm:text-lg font-black text-yellow-300">
                {senderNameInput.trim() ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span>शुभकामनाएं प्रेषक:</span>
                    <GlowingText text={senderNameInput.trim()} />
                  </span>
                ) : (
                  <span className="text-gray-400 italic">👉 यहाँ आपका नाम दिखेगा</span>
                )}
              </div>
            </div>

            {/* PRIMARY ACTION: BOOM SHARE (WhatsApp) */}
            <button
              onClick={handleBoomShareWhatsApp}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.7)] active:scale-95 transition-all cursor-pointer border-2 border-white mb-2.5"
            >
              <Send className="w-5 h-5 text-black fill-black" />
              <span>💥 BOOM SHARE (व्हाट्सएप) 🚀</span>
            </button>

            {/* Secondary Actions: Copy Link & Native Share */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-black/70 hover:bg-black/90 border border-amber-500/50 text-amber-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 font-black">कॉपी हो गया!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>लिंक कॉपी करें</span>
                  </>
                )}
              </button>

              <button
                onClick={handleNativeShare}
                className="py-2.5 px-3 rounded-xl bg-black/70 hover:bg-black/90 border border-amber-500/50 text-amber-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>अन्य ऐप्स 📲</span>
              </button>
            </div>

            {shareSuccess && (
              <p className="text-xs text-emerald-400 font-bold mt-2 animate-pulse">
                🎉 व्हाट्सएप खुल रहा है... हैप्पी दिवाली!
              </p>
            )}
          </div>
        </div>
      )}

      {/* 7. Top Sender Banner for Shared View */}
      {isSharedView && greeting.from && (
        <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black px-4 sm:px-6 py-2 rounded-full font-black text-xs sm:text-sm md:text-base shadow-[0_0_25px_rgba(255,200,0,0.8)] animate-pulse flex items-center justify-center gap-2 max-w-[95vw] text-center border-2 border-white">
          <span className="truncate">
            ✨ <strong className="font-black underline">{greeting.from}</strong> ने आपके लिए 3D दिवाली कार्ड भेजा है! 💥
          </span>
          <button
            onClick={handleOpenShareModal}
            className="underline font-black cursor-pointer whitespace-nowrap ml-1 text-black hover:text-red-950 bg-yellow-200 px-2.5 py-0.5 rounded-lg border border-black/20"
          >
            अपना बनाएं ➔
          </button>
        </div>
      )}
    </main>
  );
}
