import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Temporal } from 'temporal-polyfill'

import { TimerCard } from '../components/TimerCard'
import { TimerForm } from '../components/TimerForm'
import type { Timer, TimerDraft } from '../features/timers/timer.types'
import type { TimerRepository } from '../features/timers/timer.repository'
import { useTimers } from '../features/timers/useTimers'

interface ManagePageProps {
  repository?: TimerRepository
}

export function ManagePage({ repository }: ManagePageProps) {
  const { timers, isLoading, error, create, remove, restart, reload } = useTimers(repository)
  const [now, setNow] = useState(() => Temporal.Now.instant())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ timer: Timer | null; open: boolean }>({ timer: null, open: false })
  const [restartConfirm, setRestartConfirm] = useState<{ timer: Timer | null; open: boolean }>({ timer: null, open: false })

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Temporal.Now.instant()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  async function handleCreate(draft: TimerDraft) {
    await create(draft)
    setIsFormOpen(false)
  }

  async function handleDelete(timer: Timer) {
    setDeleteConfirm({ timer, open: true })
  }

  async function confirmDelete() {
    const timer = deleteConfirm.timer
    setDeleteConfirm({ timer: null, open: false })
    try {
      setActionError(null)
      await remove(timer!.id)
    } catch {
      setActionError('No se pudo eliminar el timer.')
    }
  }

  async function handleRestart(timer: Timer) {
    setRestartConfirm({ timer, open: true })
  }

  async function confirmRestart() {
    const timer = restartConfirm.timer
    setRestartConfirm({ timer: null, open: false })
    try {
      setActionError(null)
      await restart(timer!.id)
    } catch {
      setActionError('No se pudo reiniciar el timer.')
    }
  }

  const counters = timers.filter((timer) => timer.type === 'counter').length

  return (
    <main className="min-h-screen overflow-hidden px-5 py-5 text-slate-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link to="/manage" className="flex items-center gap-3" aria-label="Chronoflow, Manage View">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/30 bg-cyan-200/10 font-mono text-sm text-cyan-100">cf</span>
            <span>
              <span className="block font-serif text-xl leading-none text-white">Chronoflow</span>
              <span className="mt-1 block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-slate-500">time observatory</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-xs font-semibold uppercase tracking-wider">
            <Link className="rounded-full bg-white/10 px-4 py-2 text-white" to="/manage">Manage</Link>
            <Link className="rounded-full px-4 py-2 text-slate-500 transition hover:text-white" to="/view">Present</Link>
          </nav>
        </header>

        <section className="relative grid gap-10 pb-14 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:pt-20">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">Manage View · 01</p>
            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[0.94] tracking-tight text-white sm:text-7xl lg:text-[6.5rem]">
              The moments<br /><span className="text-cyan-200">that matter.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              Una colección viva de instantes. Cada timer guarda un punto de partida y deja que el tiempo haga el resto.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:pb-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">Registrados</p>
              <p className="mt-4 font-serif text-5xl text-white">{timers.length.toString().padStart(2, '0')}</p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200/10 bg-amber-200/[0.04] p-5">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-amber-100/50">Counters</p>
              <p className="mt-4 font-serif text-5xl text-amber-100">{counters.toString().padStart(2, '0')}</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between gap-4 border-y border-white/10 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Your timeline</p>
            <p className="mt-1 text-sm text-slate-300">
              {error ? 'No se pudo cargar la colección.' : timers.length === 0 ? 'Aún no hay momentos guardados.' : `${timers.length} momentos en observación.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setActionError(null); setIsFormOpen(true) }}
            className="min-h-12 rounded-full bg-cyan-200 px-6 text-sm font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-white"
          >
            + Nuevo timer
          </button>
        </section>

        {actionError ? (
          <p className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">
            {actionError}
          </p>
        ) : null}

        {isLoading ? (
          <div className="grid min-h-64 place-items-center py-12 text-sm text-slate-500" role="status">Cargando timers...</div>
        ) : error ? (
          <section className="relative my-10 overflow-hidden rounded-[2rem] border border-red-300/20 bg-red-300/[0.04] px-6 py-20 text-center sm:px-12" role="alert">
            <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-300/10 blur-3xl" />
            <p className="relative font-mono text-xs uppercase tracking-[0.25em] text-red-200/80">Manage View · unavailable</p>
            <h2 className="relative mt-4 font-serif text-4xl text-white">No pudimos cargar tus timers.</h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">Inténtalo nuevamente para volver a tu colección.</p>
            <button
              type="button"
              onClick={() => { setActionError(null); void reload() }}
              className="relative mt-8 rounded-full bg-red-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-red-200"
            >
              Reintentar
            </button>
          </section>
        ) : timers.length === 0 ? (
          <section className="relative my-10 overflow-hidden rounded-[2rem] border border-dashed border-cyan-200/20 bg-cyan-200/[0.03] px-6 py-20 text-center sm:px-12">
            <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
            <p className="relative font-mono text-xs uppercase tracking-[0.25em] text-cyan-300/80">Observatory is quiet</p>
            <h2 className="relative mt-4 font-serif text-4xl text-white">Aún no tienes timers.</h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">Crea un counter para medir lo que ya empezó o un countdown para esperar lo que viene.</p>
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="relative mt-8 rounded-full border border-cyan-200/30 px-5 py-3 text-xs font-bold uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-200/10 focus-visible:outline-2 focus-visible:outline-cyan-200"
            >
              Crear primer timer
            </button>
          </section>
        ) : (
          <section className="grid gap-5 py-10 md:grid-cols-2 xl:grid-cols-3" aria-label="Timers guardados">
            {timers.map((timer) => (
              <TimerCard key={timer.id} timer={timer} now={now} onDelete={handleDelete} onRestart={handleRestart} />
            ))}
          </section>
        )}
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-[#020a12]/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFormOpen(false) }}>
          <section className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#0b1826] p-6 shadow-2xl shadow-black/50 sm:rounded-[2rem] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="new-timer-title">
            <h2 id="new-timer-title" className="sr-only">Crear nuevo timer</h2>
            <TimerForm onSubmit={handleCreate} onCancel={() => setIsFormOpen(false)} />
          </section>
        </div>
      ) : null}

      {/* Modal confirmar eliminación - estilo danger/rojo */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#020a12]/90 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteConfirm({ timer: null, open: false }) }}>
          <section className="w-full max-w-md rounded-[2rem] border border-red-300/30 bg-[#1a0b0d] p-6 shadow-2xl shadow-red-950/30" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-red-300/20 text-red-200 font-mono text-lg">✕</span>
              <h2 id="delete-title" className="font-serif text-xl text-white">Eliminar timer</h2>
            </div>
            <p className="text-sm text-slate-300 mb-6">¿Eliminar <span className="font-medium text-white">"{deleteConfirm.timer?.title}"</span>? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ timer: null, open: false })}
                className="min-h-10 rounded-full border border-white/10 px-5 text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="min-h-10 rounded-full bg-red-300 px-5 text-sm font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-red-200 focus-visible:outline-2 focus-visible:outline-red-200"
              >
                Eliminar
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Modal confirmar reinicio - estilo primary/cian */}
      {restartConfirm.open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#020a12]/90 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRestartConfirm({ timer: null, open: false }) }}>
          <section className="w-full max-w-md rounded-[2rem] border border-cyan-300/30 bg-[#0a1420] p-6 shadow-2xl shadow-cyan-950/30" role="alertdialog" aria-modal="true" aria-labelledby="restart-title">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-cyan-300/20 text-cyan-200 font-mono text-lg">↻</span>
              <h2 id="restart-title" className="font-serif text-xl text-white">Reiniciar counter</h2>
            </div>
            <p className="text-sm text-slate-300 mb-6">¿Reiniciar <span className="font-medium text-white">"{restartConfirm.timer?.title}"</span> ahora? El tiempo volverá a cero.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setRestartConfirm({ timer: null, open: false })}
                className="min-h-10 rounded-full border border-white/10 px-5 text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRestart}
                className="min-h-10 rounded-full bg-cyan-300 px-5 text-sm font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-200"
              >
                Reiniciar
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
