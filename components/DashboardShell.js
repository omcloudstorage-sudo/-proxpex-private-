'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import Logo from '@/components/Logo'
import UserMenu from '@/components/UserMenu'
import RexWidget from '@/components/RexWidget'

export default function DashboardShell({ navItems, primaryAction, children }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="ambient-glow -top-32 -right-32 w-[32rem] h-[32rem]" />
      <div className="ambient-glow bottom-0 -left-32 w-[26rem] h-[26rem]" style={{ animationDelay: '-4.5s' }} />

      <aside className="w-64 flex-shrink-0 bg-surface/90 glass border-r border-line flex flex-col fixed inset-y-0 left-0 z-20">
        <div className="h-20 flex items-center gap-3 px-6 border-b border-line/70">
          <Link href={navItems[0]?.href || '/'} className="flex items-center gap-3">
            <Logo className="h-9" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold text-ink tracking-tight">Proxpex</span>
              <span className="text-[10px] font-medium text-slate-light uppercase tracking-wide mt-0.5">Enterprise Management</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-signal-light text-signal shadow-glow' : 'text-slate hover:text-ink hover:bg-paper',
                ].join(' ')}
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {primaryAction && (
          <div className="px-4 pt-4 pb-4 border-t border-line/70">
            <button
              onClick={primaryAction.onClick}
              className="flex items-center justify-center gap-2 w-full bg-signal text-white text-sm font-semibold px-4 py-3 rounded-lg shadow-card hover:bg-signal-dark hover:shadow-glow transition-all"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              {primaryAction.label}
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col ml-64">
        <header className="h-20 border-b border-line bg-surface/80 glass sticky top-0 z-10 flex items-center justify-end px-8">
          <UserMenu />
        </header>
        <main className="flex-1 px-10 py-10 max-w-6xl w-full mx-auto">{children}</main>
      </div>
      <RexWidget />
    </div>
  )
}
