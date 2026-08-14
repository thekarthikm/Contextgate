import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'ContextGate — Authorization before intelligence',
  description:
    'A live demonstration that an LLM cannot leak enterprise data it was never authorized to receive. Authorization happens before retrieval and before context construction.',
  applicationName: 'ContextGate',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0a0c11',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
