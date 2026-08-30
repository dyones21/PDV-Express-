import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Controle de Vendas de Queijo',
  description: 'App PWA offline-first para controle de vendas porta a porta, fiado e recebimentos de queijos.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vendas Queijo',
  },
  openGraph: {
    title: 'Controle de Vendas de Queijo',
    description: 'App PWA offline-first para controle de vendas porta a porta, fiado e recebimentos de queijos.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Controle de Vendas de Queijo',
    description: 'App PWA offline-first para controle de vendas porta a porta, fiado e recebimentos de queijos.',
  },
};

export const viewport: Viewport = {
  themeColor: '#D97706',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full bg-amber-50/40">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="h-full antialiased font-sans text-neutral-900 bg-amber-50/40 select-none touch-manipulation" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

