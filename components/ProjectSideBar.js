'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ClipboardList, FileText, NotebookText, Palette, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/Logo'
import AppearanceControls from '@/components/AppearanceControls'

const ROLE_HOME = { admin: '/admin', pm: '/pm', client: '/client', team_member: '/team' }
const ROLE_LABEL = { admin: 'Admin', pm: 'Project Manager', client: 'Client', team_member: 'Team Member' }

// Project-page-only replacement for the horizontal TopNav — icon-only
// vertical rail (see SIDEBAR_WIDTH_CLASS below, kept in sync with the
// project page's left offset). Also hosts the Resources/Documents/MOM
// triggers that used to be inline cards on the page.
export default function ProjectSideBar({ onOpenResources, onOpenDocuments, onOpenMom }) {
  const { profile, signOut } = useAuth()
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const appearanceRef = useRef(null)

  useEffect(() => {
    if (!appearanceOpen) return
    function onClickOutside(e) {
      if (appearanceRef.current && !appearanceRef.current.contains(e.target)) setAppearanceOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [appearanceOpen])

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-surface/90 backdrop-blur border-r border-line flex flex-col items-center py-4 gap-2 z-20">
      <Link href={profile ? ROLE_HOME[profile.role] : '/'} title="Proxpex" className="mb-2 flex-shrink-0">
        <Logo className="h-7 w-7" />
      </Link>

      <div className="w-8 border-t border-line flex-shrink-0" />

      <LabeledSideBarButton icon={ClipboardList} label="Res" title="Resources & Credentials" onClick={onOpenResources} />
      <LabeledSideBarButton icon={FileText} label="Docs" title="Documents" onClick={onOpenDocuments} />
      <LabeledSideBarButton icon={NotebookText} label="MOM" title="Minutes of Meeting" onClick={onOpenMom} />

      <div className="flex-1" />

      <div className="relative flex-shrink-0" ref={appearanceRef}>
        <SideBarButton icon={Palette} title="Appearance" onClick={() => setAppearanceOpen((v) => !v)} />
        {appearanceOpen && (
          <div className="absolute left-full bottom-0 ml-2 w-64 bg-surface/95 glass border border-line rounded-card shadow-card p-4 z-30">
            <AppearanceControls compact />
          </div>
        )}
      </div>

      {profile && (
        <div
          title={`${profile.name} — ${ROLE_LABEL[profile.role] || profile.role}`}
          className="w-8 h-8 rounded-full bg-signal text-white flex items-center justify-center text-[11px] font-display font-semibold flex-shrink-0"
        >
          {initials(profile.name)}
        </div>
      )}

      <SideBarButton icon={LogOut} title="Sign out" onClick={signOut} />
    </aside>
  )
}

function SideBarButton({ icon: Icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate border border-transparent hover:border-line hover:text-ink transition-colors flex-shrink-0"
    >
      <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
    </button>
  )
}

// Resources/Documents/MOM triggers — a visible bordered box with a small
// label under the icon, distinct from the plain icon-only buttons above.
function LabeledSideBarButton({ icon: Icon, label, title, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-11 flex flex-col items-center gap-0.5 py-1.5 rounded-lg border border-line text-slate hover:border-signal hover:text-ink transition-colors flex-shrink-0"
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      <span className="text-[9px] font-semibold uppercase tracking-wide leading-none">{label}</span>
    </button>
  )
}

function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}
