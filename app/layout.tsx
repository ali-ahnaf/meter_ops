import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { spaceMono, ibmPlexMono } from '@/lib/fonts';
import Navbar from '@/components/navbar';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: {
    default: 'Meter Ops',
    template: '%s | meter_ops',
  },
  description: 'Simple meter capture sessions with OCR-assisted readings.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.variable} ${ibmPlexMono.variable} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
