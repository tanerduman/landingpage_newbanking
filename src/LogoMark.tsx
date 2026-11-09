export default function LogoMark({ className = 'logo-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#d8ff4a" />
      <path d="M6.4 25 L16 7.2 L25.6 25 H21.4 L16 14.8 L10.6 25 Z" fill="#0b0b0c" />
    </svg>
  )
}
