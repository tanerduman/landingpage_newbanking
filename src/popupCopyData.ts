export type PopupText = { tr: string; en: string }

export type SitePopup = {
  id: string
  active: boolean
  kicker: PopupText
  tag: PopupText
  question: PopupText
  yes: PopupText
  no: PopupText
}

export type PopupStat = {
  id: string
  shown: number
  yes: number
  no: number
}

export const POPUP_LIMIT = 8
export const DEFAULT_POPUP_ID = 'weekend-rates'

export function defaultPopups(): SitePopup[] {
  return [
    {
      id: DEFAULT_POPUP_ID,
      active: true,
      kicker: { tr: 'Hafta sonu', en: 'Weekend' },
      tag: { tr: 'Cmt · Paz', en: 'Sat · Sun' },
      question: {
        tr: 'Döviz işlemlerinizde hafta sonu da avantajlı kurlara erişmek ister misiniz?',
        en: 'Would you like access to advantageous rates on your FX trades over the weekend as well?',
      },
      yes: { tr: 'Evet, isterim', en: 'Yes, I would' },
      no: { tr: 'Hayır', en: 'No' },
    },
  ]
}

export function blankPopup(id: string): SitePopup {
  return {
    id,
    active: true,
    kicker: { tr: '', en: '' },
    tag: { tr: '', en: '' },
    question: { tr: '', en: '' },
    yes: { tr: 'Evet, isterim', en: 'Yes, I would' },
    no: { tr: 'Hayır', en: 'No' },
  }
}
