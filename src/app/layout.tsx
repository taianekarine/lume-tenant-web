import type { Metadata } from 'next';

import { tenantBranding } from '@/config/tenant-branding';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import { Toaster } from '@/shared/ui/toast';

import './globals.css';

export const metadata: Metadata = {
  title: tenantBranding.productName,
  description: `Portal operacional de ${tenantBranding.tenantName}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
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
