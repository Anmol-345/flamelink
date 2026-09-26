import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "🔥 FlameLink - Secure One-Time Text Secrets on BotChain",
  description: "Zero-knowledge, end-to-end encrypted one-time text secrets using BotChain smart contracts. When it burns, it's wiped from the blockchain forever.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      
        <footer style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid #eaeaea', textAlign: 'center', fontSize: '0.875rem', zIndex: 10, position: 'relative', backgroundColor: 'inherit', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span>Ecosystem Partner Botchain</span>
            <img src="https://botchain.ai/favicon.ico" alt="Botchain Logo" width={20} height={20} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <a href="https://botchain.ai" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>BOT Chain Official Website</a>
            <a href="https://scan.botchain.ai" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>BOT Chain Explorer</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
