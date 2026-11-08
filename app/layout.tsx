import type { Metadata } from 'next';
import { Cinzel, Poppins, Rozha_One, Yatra_One } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-cinzel',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-poppins',
});

const rozhaOne = Rozha_One({
  subsets: ['devanagari', 'latin'],
  weight: '400',
  variable: '--font-rozha',
});

const yatraOne = Yatra_One({
  subsets: ['devanagari', 'latin'],
  weight: '400',
  variable: '--font-yatra',
});

export const metadata: Metadata = {
  title: 'Constructed by Shiv | शुभ दीपावली - 3D Animated Card & AI Shayari',
  description: 'Constructed by Shiv - Pro-level 3D animated Diwali card with procedural Three.js diyas, fireworks VFX, AI-powered dhamakedar shayari, and personalized festive greetings.',
  openGraph: {
    title: 'Constructed by Shiv | शुभ दीपावली 3D Card & AI Shayari',
    description: 'Constructed by Shiv - 3D animated Diwali greeting card with procedural Three.js diyas, fireworks VFX and AI shayari.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Constructed by Shiv | शुभ दीपावली 3D Card & AI Shayari',
    description: 'Constructed by Shiv - 3D animated Diwali greeting card with procedural Three.js diyas, fireworks VFX and AI shayari.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" className={`${cinzel.variable} ${poppins.variable} ${rozhaOne.variable} ${yatraOne.variable}`}>
      <body suppressHydrationWarning className="bg-[#060312] text-amber-100 antialiased overflow-x-hidden selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
