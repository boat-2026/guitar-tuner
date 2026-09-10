import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Guitar Tuner',
  description: 'A fast, simple standard guitar tuner.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
