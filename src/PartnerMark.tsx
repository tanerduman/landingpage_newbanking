import { withBase } from './base.ts'

const logos: Record<string, { src: string; alt: string }> = {
  migros: { src: 'partners/migros.svg', alt: 'Migros' },
  setur: { src: 'partners/setur.png', alt: 'Setur' },
  divan: { src: 'partners/divan.svg', alt: 'Divan Pastanesi' },
  koctas: { src: 'partners/koctas.png', alt: 'Koçtaş' },
  uber: { src: 'partners/uber-eats.svg', alt: 'Uber Eats' },
  trendyol: { src: 'partners/trendyol.svg', alt: 'Trendyol' },
}

export default function PartnerMark({ id }: { id: string }) {
  if (id === 'neo') {
    return (
      <span className="partner-logo-pair" role="img" aria-label="Neo Skola">
        <img src={withBase('partners/neo.png')} alt="" />
        <img src={withBase('partners/skola.png')} alt="" />
      </span>
    )
  }
  const logo = logos[id]
  if (!logo) return null
  return <img src={withBase(logo.src)} alt={logo.alt} />
}
