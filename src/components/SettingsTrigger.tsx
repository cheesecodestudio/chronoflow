import { forwardRef } from 'react'

import { AppIcon } from './AppIcon'

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
      <AppIcon name="gear" className="size-5" />
    </button>
  )
})
