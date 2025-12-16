// app/layout.tsx (Server Component)
import './globals.css';
import { Metadata } from 'next';
import LayoutClient from './layoutClient';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'AI-AUDIT Interactive Avatar',
  description: 'Interactive AI marketing auditor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://embedded.unith.ai/dist/bundle.css" />
        <link rel="stylesheet" href="https://gpt-head-assets.unith.ai/fonts/stylesheet.css" />
      </head>
      <body className="min-h-screen bg-white text-gray-800">
        <Script src="https://embedded.unith.ai/dist/bundle.js" strategy="afterInteractive" />
        <Script src="https://embedded.unith.ai/microsoft-speech-recognition.js" strategy="afterInteractive" />
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
