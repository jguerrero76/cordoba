import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Córdoba News — Noticias de Córdoba, España',
  description:
    'Las noticias más destacadas de Córdoba, España. Información local, deportes, cultura, economía y más, actualizada cada 5 minutos.',
  keywords: [
    'Córdoba',
    'noticias Córdoba',
    'Andalucía',
    'España',
    'Diario Córdoba',
    'El Día de Córdoba',
    'ABC Córdoba',
  ],
  openGraph: {
    title: 'Córdoba News — Noticias de Córdoba',
    description: 'Las noticias más destacadas de Córdoba, España',
    locale: 'es_ES',
    type: 'website',
  },
  themeColor: '#111111',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-white">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
