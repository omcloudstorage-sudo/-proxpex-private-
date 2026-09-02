import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { RexPreferencesProvider } from '@/contexts/RexPreferencesContext'
import EmberField from '@/components/EmberField'

const display = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' })
const body = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' })

export const metadata = {
  title: 'Proxpex',
  description: 'A shared roadmap for your client projects.',
}

// Applies the saved theme/accent before paint, so there's no flash of the
// wrong theme while ThemeProvider's effect runs on the client.
//
// The public marketing pages (/, /rex, /access) are excluded from the
// accent override on purpose: they're signed-out, public pages, and must
// always show the real brand blue — never a signed-in visitor's leftover
// personal accent choice from testing the in-app Appearance picker on the
// same browser. That's exactly what was causing the marketing site to
// render coral/red — this is the actual fix, not the token value (which
// was already correct).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var isMarketingPage = ['/', '/rex', '/access'].indexOf(window.location.pathname) !== -1;
    var theme = localStorage.getItem('proxpex-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (!isMarketingPage) {
      var accent = localStorage.getItem('proxpex-accent-rgb');
      if (accent) document.documentElement.style.setProperty('--color-signal', accent);
    }
  } catch (e) {}
})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-body">
        <EmberField />
        <AuthProvider>
          <ThemeProvider>
            <RexPreferencesProvider>{children}</RexPreferencesProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
