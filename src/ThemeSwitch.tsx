import { useI18n } from './i18n/LocaleContext.tsx'
import { useTheme } from './ThemeContext.tsx'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16.5 13.2A6.2 6.2 0 0 1 10.8 5 6.4 6.4 0 1 0 19 15.2a6.2 6.2 0 0 1-2.5-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'light' ? t.nav.toLight : t.nav.toDark

  return (
    <button type="button" className="theme-switch" aria-label={label} title={label} onClick={() => setTheme(next)}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
