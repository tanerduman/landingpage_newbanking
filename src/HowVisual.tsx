type Names = {
  account: string
  standard: string
  plus: string
  premium: string
}

export default function HowVisual({
  index,
  names,
  tr,
  asks,
}: {
  index: number
  names: Names
  tr: boolean
  asks: { title: string }[]
}) {
  const pct = (value: string) => (tr ? `%${value}` : `${value}%`)
  if (index === 0) {
    return (
      <div className="viz viz-stack">
        <div className="slab slab-premium">{names.premium}</div>
        <div className="slab slab-plus">{names.plus}</div>
        <div className="slab slab-standard">{names.standard}</div>
        <div className="slab slab-account">{names.account}</div>
      </div>
    )
  }
  if (index === 1) {
    return (
      <div className="viz viz-spread">
        <svg viewBox="0 0 320 220" aria-hidden="true">
          <path d="M28 28 L286 102" />
          <path d="M28 192 L286 118" />
          <circle cx="286" cy="110" r="5" />
        </svg>
        <strong>{tr ? '2.000 €' : '2,000 €'}</strong>
        <span>
          {pct('4')}
          <i />
          {pct('2')}
          <i />
          {pct('1')}
          <i />
          {pct(tr ? '0,5' : '0.5')}
        </span>
      </div>
    )
  }
  if (index === 2) {
    const caps = [
      [names.standard, tr ? '1.500 €' : '1,500 €', '5 g', '42%'],
      [names.plus, tr ? '5.000 €' : '5,000 €', '10 g', '68%'],
      [names.premium, tr ? '10.000 €' : '10,000 €', '15 g', '90%'],
    ] as const
    return (
      <div className="viz viz-cap">
        <div className="viz-lid">{pct('4')}</div>
        <div className="viz-cols">
          {caps.map(([name, eur, gold, height]) => (
            <div key={name} className="viz-col" style={{ height }}>
              <b>{eur}</b>
              <small>{gold}</small>
              <em>{name}</em>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (index === 3) {
    const nights = [
      [names.account, pct('34'), '38%'],
      [names.standard, pct(tr ? '34,5' : '34.5'), '54%'],
      [names.plus, pct(tr ? '34,75' : '34.75'), '70%'],
      [names.premium, pct('35'), '86%'],
    ] as const
    return (
      <div className="viz viz-night">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M40 8a22 22 0 1 0 16 36 18 18 0 1 1-16-36z" />
        </svg>
        <div className="viz-steps">
          {nights.map(([name, rate, height]) => (
            <div key={name} style={{ height }}>
              <b>{rate}</b>
              <small>{name}</small>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (index === 4) {
    return (
      <div className="viz viz-shops">
        <article>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M10 18h28l-3 18H13L10 18z" />
            <path d="M18 18v-3a6 6 0 0 1 12 0v3" />
          </svg>
          <strong>Migros</strong>
        </article>
        <article>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M12 18h18v16a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6V18z" />
            <path d="M30 22h6a5 5 0 0 1 0 10h-6" />
          </svg>
          <strong>Divan</strong>
        </article>
        <article>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M6 24h18l8-8h6l-6 8h10l4 4H32l6 8h-6l-6-8H14l-4 6H6l3-6z" />
          </svg>
          <strong>Setur</strong>
        </article>
      </div>
    )
  }
  return (
    <div className="viz viz-send">
      <svg viewBox="0 0 220 140" aria-hidden="true">
        <rect x="18" y="28" width="120" height="84" rx="12" />
        <path d="M18 40 L78 78 L138 40" />
        <path d="M150 70 H198" />
        <path d="M184 56 L202 70 L184 84" />
      </svg>
      <strong>{asks[0]?.title}</strong>
    </div>
  )
}
