import { useCallback, useRef, useState, type RefObject } from 'react'

import { AppIcon } from './AppIcon'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { setSlideDurationMs } from '../features/timers/presentation.constants'
import {
  getSlideDurationErrorMessage,
  MAX_SLIDE_DURATION_MS,
  MIN_SLIDE_DURATION_MS,
  readPresentationSettings,
  slideDurationMsToSeconds,
  slideDurationSecondsToMs,
  writePresentationSettings,
} from '../features/timers/presentation.settings'
import { useSettings } from '../features/timers/SettingsContext'

interface SettingsModalProps {
  onClose: () => void
  returnFocusRef: RefObject<HTMLElement | null>
}

export function SettingsModal({ onClose, returnFocusRef }: SettingsModalProps) {
  const [slideDurationSeconds, setSlideDurationSeconds] = useState<number>(() => slideDurationMsToSeconds(readPresentationSettings().slideDurationMs))
  const slideDurationSecondsRef = useRef(slideDurationSeconds)
  const [slideDurationError, setSlideDurationError] = useState<string | null>(null)
  const { showSeconds, setShowSeconds } = useSettings()

  const persistSlideDuration = useCallback(() => {
    const slideDurationMs = slideDurationSecondsToMs(slideDurationSecondsRef.current)
    const error = getSlideDurationErrorMessage(slideDurationMs)
    if (error) {
      setSlideDurationError(error)
      return
    }

    writePresentationSettings({ slideDurationMs })
    setSlideDurationMs(slideDurationMs)
    setSlideDurationError(null)
  }, [])

  const close = useCallback(() => {
    persistSlideDuration()
    onClose()
  }, [onClose, persistSlideDuration])

  return (
    <Dialog labelledBy="settings-modal-title" describedBy="settings-description" onClose={close} returnFocusRef={returnFocusRef}>
      <header className="cf-dialog-header">
        <div>
          <h2 id="settings-modal-title" className="cf-dialog-title">Ajustes</h2>
          <p id="settings-description" className="cf-dialog-description">Configura cómo se muestra el tiempo.</p>
        </div>
        <Button variant="ghost" className="cf-button--icon" aria-label="Cerrar ajustes" onClick={close}>
          <AppIcon name="xmark" />
        </Button>
      </header>

      <section aria-labelledby="settings-presentation-title" className="cf-settings-section">
        <h3 id="settings-presentation-title">Presentación</h3>
        <label className="cf-setting-row">
          <span>{showSeconds ? 'Ocultar segundos' : 'Mostrar segundos'}</span>
          <input type="checkbox" role="switch" className="cf-switch" checked={showSeconds}
            aria-checked={showSeconds} onChange={(event) => setShowSeconds(event.currentTarget.checked)} />
        </label>
        <div className="cf-slider-field">
          <div className="cf-slider-label">
            <label htmlFor="slide-duration">Duración por timer</label>
            <output htmlFor="slide-duration">{slideDurationSeconds} s</output>
          </div>
          <input id="slide-duration" type="range" className="cf-slider"
            min={slideDurationMsToSeconds(MIN_SLIDE_DURATION_MS)}
            max={slideDurationMsToSeconds(MAX_SLIDE_DURATION_MS)} step={1} value={slideDurationSeconds}
            aria-valuetext={`${slideDurationSeconds} segundos`}
            aria-describedby={slideDurationError ? 'slide-duration-error' : 'slide-duration-help'}
            aria-invalid={slideDurationError ? 'true' : 'false'}
            onChange={(event) => {
              const value = Number(event.currentTarget.value)
              slideDurationSecondsRef.current = value
              setSlideDurationSeconds(value)
              setSlideDurationError(getSlideDurationErrorMessage(slideDurationSecondsToMs(value)))
            }}
            onBlur={persistSlideDuration} />
          <p id="slide-duration-help" className="cf-field-help">Tiempo que se muestra cada timer en la presentación automática.</p>
          {slideDurationError ? <p id="slide-duration-error" className="cf-error" role="alert">{slideDurationError}</p> : null}
        </div>
      </section>
    </Dialog>
  )
}
