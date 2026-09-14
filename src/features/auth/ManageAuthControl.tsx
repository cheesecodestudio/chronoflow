import type { FormEvent } from 'react'

import { Button } from '../../components/ui/Button'
import { useAuth } from './AuthContext'
import './manage-auth-control.css'

const AUTHENTICATION_UNAVAILABLE_MESSAGE = 'Authentication unavailable'

export function ManageAuthControl() {
  const {
    status,
    user,
    error,
    pendingOperation,
    operationError,
    signInWithPassword,
    signOut,
  } = useAuth()
  const isPending = pendingOperation !== null

  function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const email = formData.get('email')
    const password = formData.get('password')

    if (typeof email !== 'string' || typeof password !== 'string') return

    void signInWithPassword(email, password)

    const passwordInput = form.elements.namedItem('password')
    if (passwordInput instanceof HTMLInputElement) passwordInput.value = ''
  }

  if (status === 'initializing') {
    return (
      <section className="cf-auth-control" aria-label="Autenticación">
        <p className="cf-auth-status" role="status">Inicializando autenticación...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="cf-auth-control" aria-label="Autenticación">
        <p className="cf-auth-error" role="alert">{AUTHENTICATION_UNAVAILABLE_MESSAGE}</p>
      </section>
    )
  }

  if (status === 'authenticated') {
    return (
      <section className="cf-auth-control" aria-label="Autenticación">
        <span className="cf-auth-identity">{user?.email ?? 'Usuario autenticado'}</span>
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() => {
            if (!isPending) void signOut()
          }}
        >
          {pendingOperation === 'signing-out' ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </Button>
        {operationError ? <p className="cf-auth-error" role="alert">{operationError}</p> : null}
      </section>
    )
  }

  return (
    <section className="cf-auth-control" aria-label="Autenticación">
      <form className="cf-auth-form" onSubmit={handleSignIn}>
        <label>
          <span className="cf-sr-only">Correo electrónico</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className="cf-auth-field"
            placeholder="Correo electrónico"
            disabled={isPending}
          />
        </label>
        <label>
          <span className="cf-sr-only">Contraseña</span>
          <input
            required
            type="password"
            name="password"
            autoComplete="current-password"
            className="cf-auth-field"
            placeholder="Contraseña"
            disabled={isPending}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={isPending}>
          {pendingOperation === 'signing-in' ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </Button>
      </form>
      {operationError ? <p className="cf-auth-error" role="alert">{operationError}</p> : null}
    </section>
  )
}
