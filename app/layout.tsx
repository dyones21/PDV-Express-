import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDV Express - Controle de Vendas & Fiado',
  description: 'App PWA offline-first para controle de vendas, estoque, clientes e fiado para autônomos e MEI.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PDV Express',
  },
  openGraph: {
    title: 'PDV Express - Controle de Vendas & Fiado',
    description: 'App PWA offline-first para controle de vendas, estoque, clientes e fiado para autônomos e MEI.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDV Express - Controle de Vendas & Fiado',
    description: 'App PWA offline-first para controle de vendas, estoque, clientes e fiado para autônomos e MEI.',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  if (typeof Element !== 'undefined' && Element.prototype.releasePointerCapture) {
                    var originalRelease = Element.prototype.releasePointerCapture;
                    Element.prototype.releasePointerCapture = function(pointerId) {
                      try {
                        if (typeof this.hasPointerCapture === 'function' && !this.hasPointerCapture(pointerId)) {
                          return;
                        }
                        originalRelease.call(this, pointerId);
                      } catch (err) {
                        if (err && (err.name === 'NotFoundError' || (err.message && err.message.indexOf('releasePointerCapture') !== -1))) {
                          return;
                        }
                        throw err;
                      }
                    };
                  }
                  window.addEventListener('error', function(event) {
                    if (event && (
                      (event.message && event.message.indexOf('releasePointerCapture') !== -1) ||
                      (event.error && (event.error.name === 'NotFoundError' || (event.error.message && event.error.message.indexOf('releasePointerCapture') !== -1)))
                    )) {
                      event.preventDefault();
                      if (event.stopImmediatePropagation) {
                        event.stopImmediatePropagation();
                      }
                    }
                  }, true);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="h-full antialiased font-sans text-neutral-900 bg-amber-50/40 select-none touch-manipulation" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

