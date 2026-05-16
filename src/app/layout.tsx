import type { Metadata } from 'next';
import './globals.css';
import WaChooser from '@/components/WaChooser';

export const metadata: Metadata = {
  title: 'KidiMeet',
  description: 'מפגשים לילדים — קל, חכם, הוגן',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <div className="h-full max-w-md mx-auto">
          {children}
          <WaChooser />
        </div>
      </body>
    </html>
  );
}
