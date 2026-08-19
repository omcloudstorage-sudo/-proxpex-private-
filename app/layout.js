import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const display = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' })
const body = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' })

export const metadata = {
  title: 'Proxpex',
  description: 'A shared roadmap for your client projects.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
