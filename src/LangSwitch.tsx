import { useI18n } from './i18n/LocaleContext.tsx'

export default function LangSwitch() {
  const { locale, setLocale, t } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label={t.nav.language}>
      <button type="button" className={locale === 'tr' ? 'active' : ''} onClick={() => setLocale('tr')}>
        TR
      </button>
      <button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>
        EN
      </button>
    </div>
  )
}
