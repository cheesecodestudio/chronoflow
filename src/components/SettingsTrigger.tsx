import { forwardRef } from 'react'

interface SettingsTriggerProps {
  onClick: () => void
}

export const SettingsTrigger = forwardRef<HTMLButtonElement, SettingsTriggerProps>(function SettingsTrigger({ onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Configuración"
      aria-haspopup="dialog"
      onClick={onClick}
      className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-cyan-200/40 hover:bg-cyan-200/10 hover:text-cyan-100 focus-visible:outline-2 focus-visible:outline-cyan-200 focus-visible:outline-offset-2"
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />
        <path d="m19.4 15 .1.1a2 2 0 1 1-2.83 2.83l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.15a2 2 0 1 1-4 0v-.15a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.83-2.83l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.15a2 2 0 1 1 0-4h.15a1.7 1.7 0 0 0 1.2-2.9l-.1-.1A2 2 0 1 1 6.67 2.27l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.15a2 2 0 1 1 4 0v.15a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.83 2.83l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.15a2 2 0 1 1 0 4h-.15a1.7 1.7 0 0 0-1.2 2.9Z" />
      </svg>
    </button>
  )
})
