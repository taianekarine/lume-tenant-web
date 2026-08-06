import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { tenantBranding } from '@/config/tenant-branding';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import { Toaster } from '@/shared/ui/toast';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: tenantBranding.productName,
  description: `Portal operacional ${tenantBranding.productName} para ${tenantBranding.tenantName}.`,
  icons: {
    icon: '/brand/lume-sunrise-spark.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className={geistSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
