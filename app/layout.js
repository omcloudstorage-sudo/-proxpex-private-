import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
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
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem('proxpex-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var accent = localStorage.getItem('proxpex-accent-rgb');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (accent) document.documentElement.style.setProperty('--color-signal', accent);
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
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
