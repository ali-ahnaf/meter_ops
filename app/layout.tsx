import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { spaceMono, ibmPlexMono } from '@/lib/fonts';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: {
    default: 'meter_ops',
    template: '%s | meter_ops',
  },
  description:
    'Electricity meter session tracking, OCR capture, and neon-black consumption analysis.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.variable} ${ibmPlexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
