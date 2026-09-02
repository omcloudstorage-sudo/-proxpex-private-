'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export const ACCENTS = [
  { key: 'blue', label: 'Blue', rgb: '47 90 240' },
  { key: 'emerald', label: 'Emerald', rgb: '16 185 129' },
  { key: 'violet', label: 'Violet', rgb: '124 58 237' },
  { key: 'amber', label: 'Amber', rgb: '217 119 6' },
  { key: 'rose', label: 'Rose', rgb: '225 29 72' },
  { key: 'cyan', label: 'Cyan', rgb: '8 145 178' },
]

const THEME_KEY = 'proxpex-theme'
const ACCENT_KEY = 'proxpex-accent'
const ACCENT_RGB_KEY = 'proxpex-accent-rgb'

// Public, signed-out pages — always the real brand blue, never a visitor's
// leftover personal accent from the in-app Appearance picker. See the
// matching guard in app/layout.js's pre-paint THEME_INIT_SCRIPT.
const MARKETING_PATHS = ['/', '/rex', '/access']

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  accent: 'blue',
  setAccent: () => {},
})

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function applyAccent(accentKey) {
  const accent = ACCENTS.find((a) => a.key === accentKey) || ACCENTS[0]
  document.documentElement.style.setProperty('--color-signal', accent.rgb)
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light')
  const [accent, setAccentState] = useState('blue')

  useEffect(() => {
    const isMarketingPage = MARKETING_PATHS.includes(window.location.pathname)
    const storedTheme = localStorage.getItem(THEME_KEY)
    const storedAccent = isMarketingPage ? null : localStorage.getItem(ACCENT_KEY)
    const theme = storedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    const accent = storedAccent || 'blue'
    setThemeState(theme)
    setAccentState(accent)
    applyTheme(theme)
    applyAccent(accent)
  }, [])

  function setTheme(next) {
    setThemeState(next)
    localStorage.setItem(THEME_KEY, next)
    applyTheme(next)
  }

  function setAccent(next) {
    setAccentState(next)
    localStorage.setItem(ACCENT_KEY, next)
    localStorage.setItem(ACCENT_RGB_KEY, (ACCENTS.find((a) => a.key === next) || ACCENTS[0]).rgb)
    applyAccent(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
