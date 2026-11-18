import { useEffect, useState } from 'react'
import { fetchPlanCatalog, savePlanCatalog, PLAN_IDS, type PlanCatalog, type PlanColumn, type PlanGroup } from './planCatalog.ts'
import { defaultPlanCatalog } from './planCatalogData.ts'
import { useI18n } from './i18n/LocaleContext.tsx'
import { messages, readLocale } from './i18n/index.ts'

const groups: PlanGroup[] = ['bank', 'travel', 'brand']

function blankRow() {
  const empty = { tr: '—', en: '—' }
  return {
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    group: 'bank' as PlanGroup,
    labelTr: '',
    labelEn: '',
    values: { account: empty, standard: { ...empty }, plus: { ...empty }, premium: { ...empty } },
  }
}

export default function PlanCatalogPanel() {
  const { t } = useI18n()
  const [catalog, setCatalog] = useState<PlanCatalog>(() => defaultPlanCatalog())
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const names: Record<PlanColumn, string> = {
    account: t.plans.basicName,
    standard: t.pkg.standard,
    plus: t.pkg.plus,
    premium: t.pkg.premium,
  }
  const groupName: Record<PlanGroup, string> = {
    bank: t.waitlist.planGroupBank,
    travel: t.waitlist.planGroupTravel,
    brand: t.waitlist.planGroupBrand,
  }

  useEffect(() => {
    let live = true
    void fetchPlanCatalog().then((next) => {
      if (live && next) setCatalog(next)
    })
    return () => {
      live = false
    }
  }, [])

  function patch(next: PlanCatalog) {
    setCatalog(next)
    setNote('')
  }

  async function onSave() {
    const ready: PlanCatalog = {
      showPrices: catalog.showPrices,
      prices: catalog.prices,
      rows: catalog.rows.map((row) => ({
        ...row,
        labelTr: row.labelTr.trim(),
        labelEn: row.labelEn.trim(),
        values: {
          account: { tr: row.values.account.tr.trim() || '—', en: row.values.account.en.trim() || '—' },
          standard: { tr: row.values.standard.tr.trim() || '—', en: row.values.standard.en.trim() || '—' },
          plus: { tr: row.values.plus.tr.trim() || '—', en: row.values.plus.en.trim() || '—' },
          premium: { tr: row.values.premium.tr.trim() || '—', en: row.values.premium.en.trim() || '—' },
        },
      })),
    }
    setBusy(true)
    setError('')
    setNote('')
    try {
      const saved = await savePlanCatalog(ready)
      setCatalog(saved)
      setNote(t.waitlist.planSaved)
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      setError(messages(readLocale()).errors[code] || code || t.errors.invalid)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {t.waitlist.tabPlans}
          </div>
          <h1>{t.waitlist.planTitle}</h1>
          <p className="lead">{t.waitlist.planLead}</p>
        </div>
        <button type="button" className="btn btn-solid" disabled={busy} onClick={() => void onSave()}>
          {t.waitlist.planSave}
        </button>
      </div>
      {note && <p className="plan-editor-note">{note}</p>}
      {error && <p className="waitlist-action-error">{error}</p>}

      <label className="plan-show-prices">
        <input
          type="checkbox"
          checked={catalog.showPrices}
          onChange={(event) => patch({ ...catalog, showPrices: event.target.checked })}
        />
        <span>
          <strong>{t.waitlist.planShowPrices}</strong>
          <em>{t.waitlist.planShowPricesLead}</em>
        </span>
      </label>

      <h2 className="plan-editor-title">{t.waitlist.planPrice}</h2>
      <div className="plan-price-grid">
        {PLAN_IDS.map((id) => (
          <label key={id}>
            {names[id]}
            <input
              value={catalog.prices[id].tr}
              maxLength={24}
              onChange={(event) => {
                const value = event.target.value
                patch({
                  ...catalog,
                  prices: { ...catalog.prices, [id]: { tr: value, en: value } },
                })
              }}
            />
          </label>
        ))}
      </div>

      <div className="plan-editor-head">
        <h2 className="plan-editor-title">{t.waitlist.planRows}</h2>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => patch({ ...catalog, rows: [...catalog.rows, blankRow()] })}
        >
          {t.waitlist.planAdd}
        </button>
      </div>
      <div className="plan-row-list">
        {catalog.rows.map((row, index) => (
          <article key={row.id} className="plan-row-card">
            <div className="plan-row-top">
              <label>
                {t.waitlist.planGroup}
                <select
                  value={row.group}
                  onChange={(event) => {
                    const group = event.target.value as PlanGroup
                    const rows = catalog.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, group } : item))
                    patch({ ...catalog, rows })
                  }}
                >
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {groupName[group]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.waitlist.planLabelTr}
                <input
                  value={row.labelTr}
                  maxLength={80}
                  onChange={(event) => {
                    const labelTr = event.target.value
                    const rows = catalog.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, labelTr } : item))
                    patch({ ...catalog, rows })
                  }}
                />
              </label>
              <label>
                {t.waitlist.planLabelEn}
                <input
                  value={row.labelEn}
                  maxLength={80}
                  onChange={(event) => {
                    const labelEn = event.target.value
                    const rows = catalog.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, labelEn } : item))
                    patch({ ...catalog, rows })
                  }}
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={catalog.rows.length < 2}
                onClick={() => patch({ ...catalog, rows: catalog.rows.filter((_, itemIndex) => itemIndex !== index) })}
              >
                {t.waitlist.planDelete}
              </button>
            </div>
            <div className="plan-value-grid">
              {PLAN_IDS.map((id) => (
                <label key={id}>
                  {names[id]}
                  <input
                    value={row.values[id].tr}
                    maxLength={80}
                    onChange={(event) => {
                      const tr = event.target.value
                      const values = { ...row.values, [id]: { ...row.values[id], tr } }
                      const rows = catalog.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, values } : item))
                      patch({ ...catalog, rows })
                    }}
                  />
                  <span>EN</span>
                  <input
                    value={row.values[id].en}
                    maxLength={80}
                    aria-label={`${names[id]} EN`}
                    onChange={(event) => {
                      const en = event.target.value
                      const values = { ...row.values, [id]: { ...row.values[id], en } }
                      const rows = catalog.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, values } : item))
                      patch({ ...catalog, rows })
                    }}
                  />
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
