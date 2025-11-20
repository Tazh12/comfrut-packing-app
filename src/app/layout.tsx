import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import ToastUI from '@/components/ToastUI'
import { ChecklistProvider } from '@/context/ChecklistContext'
import { ThemeProvider } from '@/context/ThemeContext'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sistema de Gestión de Calidad',
  description: 'Sistema de gestión de calidad para empresas',
}

// No revalidar la página en cada request
export const revalidate = 0

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const themePreference = localStorage.getItem('theme-preference');
                  let resolvedTheme;
                  if (themePreference === 'light' || themePreference === 'dark') {
                    resolvedTheme = themePreference;
                  } else {
                    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', resolvedTheme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              })();
            `,
          }}
        />
        <ThemeProvider>
          <SupabaseProvider>
            <AuthProvider>
              <ToastProvider>
                <ChecklistProvider>
                  <div className="min-h-screen flex flex-col">
                    {children}
                    <Footer />
                  </div>
                </ChecklistProvider>
                <ToastUI />
              </ToastProvider>
            </AuthProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
