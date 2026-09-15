import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Temporal } from 'temporal-polyfill'

import { AppIcon } from '../components/AppIcon'
import { CustomizeTimerModal } from '../components/CustomizeTimerModal'
import { TimerCard } from '../components/TimerCard'
import { TimerForm } from '../components/TimerForm'
import { SettingsModal } from '../components/SettingsModal'
import { SettingsTrigger } from '../components/SettingsTrigger'
import { Button } from '../components/ui/Button'
import { buttonClassName } from '../components/ui/buttonVariants'
import { AlertDialog, Dialog } from '../components/ui/Dialog'
import { ManageAuthControl } from '../features/auth/ManageAuthControl'
import type { Timer, TimerCustomization, TimerDraft } from '../features/timers/timer.types'
import type { TimerRepository } from '../features/timers/timer.repository'
import { useTimers } from '../features/timers/useTimers'

const SIGN_UP_CONFIRMATION_MESSAGE = 'Revisa tu correo para confirmar tu cuenta.'

function isSignUpConfirmationState(state: unknown): boolean {
  return typeof state === 'object'
    && state !== null
    && (state as { signup?: unknown }).signup === 'confirmation-required'
}

interface ManagePageProps {
  repository?: TimerRepository
}

export function ManagePage({ repository }: ManagePageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    timers,
    isLoading,
    error,
    repositoryIdentity,
    create,
    remove,
    restart,
    updateCustomization,
    reload,
  } = useTimers(repository)
  const [now, setNow] = useState(() => Temporal.Now.instant())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Timer | null>(null)
  const [restartConfirm, setRestartConfirm] = useState<Timer | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [customizeTarget, setCustomizeTarget] = useState<{
    timer: Timer
    trigger: HTMLButtonElement
  } | null>(null)
  const settingsTriggerRef = useRef<HTMLButtonElement>(null)
  const newTimerRef = useRef<HTMLButtonElement>(null)
  const formTriggerRef = useRef<HTMLButtonElement | null>(null)
  const closeCustomization = useCallback(() => setCustomizeTarget(null), [])
  const [authNotice] = useState<string | null>(() => (
    isSignUpConfirmationState(location.state) ? SIGN_UP_CONFIRMATION_MESSAGE : null
  ))
  const [renderedRepositoryIdentity, setRenderedRepositoryIdentity] = useState(repositoryIdentity)

  if (renderedRepositoryIdentity !== repositoryIdentity) {
    setRenderedRepositoryIdentity(repositoryIdentity)
    setIsFormOpen(false)
    setActionError(null)
    setDeleteConfirm(null)
    setRestartConfirm(null)
    setCustomizeTarget(null)
  }

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Temporal.Now.instant()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isSignUpConfirmationState(location.state)) return

    navigate('/manage', { replace: true, state: null })
  }, [location.state, navigate])

  async function handleCreate(draft: TimerDraft) {
    if (await create(draft)) setIsFormOpen(false)
  }

  async function confirmDelete() {
    const timer = deleteConfirm
    setDeleteConfirm(null)
    try {
      setActionError(null)
      const applied = await remove(timer!.id)
      // The deleted card's trigger no longer exists; keep focus on a useful action.
      if (applied) newTimerRef.current?.focus()
    } catch {
      setActionError('No se pudo eliminar el timer.')
    }
  }

  async function confirmRestart() {
    const timer = restartConfirm
    setRestartConfirm(null)
    try {
      setActionError(null)
      await restart(timer!.id)
    } catch {
      setActionError('No se pudo reiniciar el timer.')
    }
  }

  async function handleCustomizationSubmit(customization: Required<TimerCustomization>) {
    if (!customizeTarget) return false
    return updateCustomization(customizeTarget.timer.id, customization)
  }

  function openForm(trigger: HTMLButtonElement) {
    formTriggerRef.current = trigger
    setActionError(null)
    setIsFormOpen(true)
  }

  const counters = timers.filter((timer) => timer.type === 'counter').length

  return (
    <main className="cf-manage">
      <div className="cf-manage-inner">
        <header className="cf-header">
          <Link to="/manage" className="cf-brand" aria-label="Chronoflow, gestión de timers">Chronoflow</Link>
          <nav className="cf-header-actions" aria-label="Navegación principal">
            <ManageAuthControl />
            <Link className={buttonClassName('ghost')} to="/view">
              <AppIcon name="play" />Presentar
            </Link>
            <SettingsTrigger ref={settingsTriggerRef} onClick={() => setIsSettingsOpen(true)} />
          </nav>
        </header>

        <section className="cf-heading-row" aria-labelledby="manage-title">
          <div>
            <h1 id="manage-title">Mis timers</h1>
            <dl className="cf-totals" aria-label="Resumen de timers">
              <div><dt>en total</dt><dd>{timers.length}</dd></div>
              <div><dt>contadores</dt><dd>{counters}</dd></div>
              <div><dt>cuentas atrás</dt><dd>{timers.length - counters}</dd></div>
            </dl>
          </div>
          <Button ref={newTimerRef} aria-haspopup="dialog" onClick={(event) => openForm(event.currentTarget)}>
            <AppIcon name="plus" />Nuevo timer
          </Button>
        </section>

        {authNotice ? <p className="cf-success" role="status">{authNotice}</p> : null}

        {actionError ? <p className="cf-error" role="alert">{actionError}</p> : null}

        {isLoading ? (
          <p className="cf-loading" role="status">Cargando timers...</p>
        ) : error ? (
          <section className="cf-empty" role="alert">
            <h2>No pudimos cargar tus timers.</h2>
            <p>Inténtalo nuevamente para volver a tu colección.</p>
            <Button variant="secondary" onClick={() => { setActionError(null); void reload() }}>Reintentar</Button>
          </section>
        ) : timers.length === 0 ? (
          <section className="cf-empty">
            <h2>Aún no tienes timers.</h2>
            <p>Crea un contador para medir el tiempo transcurrido o una cuenta atrás para una fecha que viene.</p>
            <Button variant="secondary" aria-haspopup="dialog" onClick={(event) => openForm(event.currentTarget)}>Crear primer timer</Button>
          </section>
        ) : (
          <section className="cf-collection" aria-label="Timers guardados">
            {timers.map((timer) => (
              <TimerCard key={timer.id} timer={timer} now={now}
                onDelete={setDeleteConfirm} onRestart={setRestartConfirm}
                onCustomize={(timer, trigger) => setCustomizeTarget({ timer, trigger })} />
            ))}
          </section>
        )}
      </div>

      {isFormOpen ? (
        <Dialog labelledBy="new-timer-title" onClose={() => setIsFormOpen(false)} returnFocusRef={formTriggerRef} fallbackFocusRef={newTimerRef}>
          <TimerForm onSubmit={handleCreate} onCancel={() => setIsFormOpen(false)} />
        </Dialog>
      ) : null}

      {isSettingsOpen ? <SettingsModal onClose={() => setIsSettingsOpen(false)} returnFocusRef={settingsTriggerRef} /> : null}

      {customizeTarget ? (
        <CustomizeTimerModal timer={customizeTarget.timer} returnFocusTo={customizeTarget.trigger}
          onSubmit={handleCustomizationSubmit} onClose={closeCustomization} />
      ) : null}

      {deleteConfirm ? (
        <AlertDialog labelledBy="delete-title" describedBy="delete-description" onClose={() => setDeleteConfirm(null)}>
          <h2 id="delete-title" className="cf-dialog-title">Eliminar timer</h2>
          <p id="delete-description" className="cf-dialog-description">
            ¿Eliminar <strong>“{deleteConfirm.title}”</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="cf-dialog-actions">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
          </div>
        </AlertDialog>
      ) : null}

      {restartConfirm ? (
        <AlertDialog labelledBy="restart-title" describedBy="restart-description" onClose={() => setRestartConfirm(null)}>
          <h2 id="restart-title" className="cf-dialog-title">Reiniciar contador</h2>
          <p id="restart-description" className="cf-dialog-description">
            ¿Reiniciar <strong>“{restartConfirm.title}”</strong> ahora? El tiempo volverá a cero.
          </p>
          <div className="cf-dialog-actions">
            <Button variant="secondary" onClick={() => setRestartConfirm(null)}>Cancelar</Button>
            <Button onClick={confirmRestart}>Reiniciar</Button>
          </div>
        </AlertDialog>
      ) : null}
    </main>
  )
}
