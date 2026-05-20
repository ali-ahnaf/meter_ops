import type { Metadata } from 'next';
import './globals.css';
import { openSans, lora } from '@/lib/fonts';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: {
    default: 'Template Next.js',
    template: '%s | Template Next.js',
  },
  description:
    'Reusable Next.js template with TypeORM.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${openSans.variable} ${lora.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
