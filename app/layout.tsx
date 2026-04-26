import type { Metadata } from 'next';
import { BBH_Bartle, Caveat, Inter } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const bbhBartle = BBH_Bartle({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bbh-bartle',
  display: 'swap',
});

const caveat = Caveat({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Galavant',
  description: 'Conversational flight search.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bbhBartle.variable} ${caveat.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
