import { useTheme } from './theme-context.tsx'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const toLight = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={toLight ? 'Açık moda geç' : 'Koyu moda geç'}
      title={toLight ? 'Açık mod' : 'Koyu mod'}
    >
      {toLight ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path
            d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15.2 3.1A8.6 8.6 0 1 1 3.1 15.4 7.2 7.2 0 0 0 15.2 3.1Z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  )
}
