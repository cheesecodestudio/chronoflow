import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { buttonClassName } from '../components/ui/buttonVariants'
import { useAuth } from '../features/auth/AuthContext'
import { AUTHENTICATION_UNAVAILABLE_MESSAGE } from '../infrastructure/supabase/client'
import './register.css'

const MINIMUM_PASSWORD_LENGTH = 8

function getValidationMessage(
  form: HTMLFormElement,
  email: string,
  password: string,
  confirmPassword: string,
): string | null {
  const emailInput = form.elements.namedItem('email')

  if (!email.trim()) return 'Ingresa tu correo electrónico.'
  if (!(emailInput instanceof HTMLInputElement) || !emailInput.validity.valid) {
    return 'Ingresa un correo electrónico válido.'
  }
  if (!password) return 'Ingresa una contraseña.'
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }
  if (!confirmPassword) return 'Confirma tu contraseña.'
  if (password !== confirmPassword) return 'Las contraseñas no coinciden.'

  return null
}

export function RegisterPage() {
  const { status, error, pendingOperation, operationError, signUp } = useAuth()
  const navigate = useNavigate()
  const [validationError, setValidationError] = useState<string | null>(null)
  const isPending = pendingOperation !== null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const email = formData.get('email')
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if (typeof email !== 'string' || typeof password !== 'string' || typeof confirmPassword !== 'string') return

    const message = getValidationMessage(form, email, password, confirmPassword)
    if (message) {
      setValidationError(message)
      const invalidField = form.querySelector<HTMLInputElement>(':invalid')
      if (invalidField) invalidField.focus()
      return
    }

    setValidationError(null)

    const passwordInput = form.elements.namedItem('password')
    const confirmPasswordInput = form.elements.namedItem('confirmPassword')
    if (passwordInput instanceof HTMLInputElement) passwordInput.value = ''
    if (confirmPasswordInput instanceof HTMLInputElement) confirmPasswordInput.value = ''

    const outcome = await signUp(email.trim(), password)
    if (outcome === 'session') {
      navigate('/manage')
    } else if (outcome === 'confirmation-required') {
      navigate('/manage', { state: { signup: 'confirmation-required' } })
    }
  }

  if (status === 'initializing') {
    return (
      <main className="cf-manage">
        <p className="cf-loading" role="status">Inicializando autenticación...</p>
      </main>
    )
  }

  if (status === 'authenticated') return <Navigate to="/manage" replace />

  return (
    <main className="cf-manage">
      <div className="cf-manage-inner">
        <header className="cf-header">
          <Link to="/manage" className="cf-brand" aria-label="Chronoflow, gestión de timers">Chronoflow</Link>
          <Link className={buttonClassName('ghost')} to="/manage">Volver a iniciar sesión</Link>
        </header>

        <section className="cf-dialog cf-register-card" aria-labelledby="register-title">
          <header className="cf-dialog-header">
            <div>
              <h1 id="register-title" className="cf-dialog-title">Crear cuenta</h1>
              <p className="cf-dialog-description">Guarda tus timers y accede a ellos desde cualquier dispositivo.</p>
            </div>
          </header>

          {error ? (
            <p className="cf-error" role="alert">{AUTHENTICATION_UNAVAILABLE_MESSAGE}</p>
          ) : (
            <form className="cf-form" onSubmit={handleSubmit} noValidate>
              <label className="cf-label">
                <span>Correo electrónico</span>
                <input className="cf-field" required type="email" name="email" autoComplete="email" disabled={isPending} />
              </label>
              <label className="cf-label">
                <span>Contraseña</span>
                <input className="cf-field" required minLength={MINIMUM_PASSWORD_LENGTH} type="password" name="password" autoComplete="new-password" disabled={isPending} />
              </label>
              <label className="cf-label">
                <span>Confirmar contraseña</span>
                <input className="cf-field" required minLength={MINIMUM_PASSWORD_LENGTH} type="password" name="confirmPassword" autoComplete="new-password" disabled={isPending} />
              </label>

              {validationError ? <p className="cf-error" role="alert">{validationError}</p> : null}
              {operationError ? <p className="cf-error" role="alert">{operationError}</p> : null}
              <div className="cf-dialog-actions">
                <Link className={buttonClassName('ghost')} to="/manage">Cancelar</Link>
                <Button type="submit" disabled={isPending}>
                  {pendingOperation === 'signing-up' ? 'Creando cuenta...' : 'Crear cuenta'}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
