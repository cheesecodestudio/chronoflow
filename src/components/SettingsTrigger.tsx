import { forwardRef } from 'react'

import { AppIcon } from './AppIcon'
import { Button } from './ui/Button'

interface SettingsTriggerProps {
  onClick: () => void
}

export const SettingsTrigger = forwardRef<HTMLButtonElement, SettingsTriggerProps>(function SettingsTrigger({ onClick }, ref) {
  return (
    <Button
      ref={ref}
      variant="ghost"
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <AppIcon name="gear" />
      Ajustes
    </Button>
  )
})
