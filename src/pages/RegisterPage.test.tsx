import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '../features/auth/AuthContext'
import { RegisterPage } from './RegisterPage'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function ManageDestination() {
  const location = useLocation()

  return (
    <main>
      <h1>Manage</h1>
      <output data-testid="navigation-state">{JSON.stringify(location.state)}</output>
    </main>
  )
}

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'anonymous',
    session: null,
    user: null,
    error: null,
    pendingOperation: null,
    operationError: null,
    signInWithPassword: vi.fn(async () => undefined),
    signUp: vi.fn(async () => null),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  }
}

function renderPage(auth: AuthContextValue, initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/register']) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/manage" element={<ManageDestination />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function fillValidRegistration() {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'person@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'valid-password' },
  })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
    target: { value: 'valid-password' },
  })
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the registration fields and sign-in navigation', () => {
    renderPage(authValue())

    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/manage')
  })

  it.each([
    ['required fields', '', '', '', 'Ingresa tu correo electrónico.'],
    ['short password', 'person@example.com', 'short', 'short', 'La contraseña debe tener al menos 8 caracteres.'],
    ['mismatched passwords', 'person@example.com', 'valid-password', 'other-password', 'Las contraseñas no coinciden.'],
  ])('validates %s without calling AuthProvider', (_case, email, password, confirmation, message) => {
    const signUp = vi.fn(async () => 'session' as const)
    renderPage(authValue({ signUp }))

    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: confirmation } })
    fireEvent.submit(screen.getByRole('button', { name: 'Crear cuenta' }).closest('form')!)

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(signUp).not.toHaveBeenCalled()
  })

  it('sends only email and password, never confirmation password', async () => {
    const signUp = vi.fn(async () => 'session' as const)
    renderPage(authValue({ signUp }))
    fillValidRegistration()

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => expect(signUp).toHaveBeenCalledOnce())
    expect(signUp).toHaveBeenCalledWith('person@example.com', 'valid-password')
    expect(signUp.mock.calls[0]).toHaveLength(2)
  })

  it('clears both password fields immediately after a valid submission', async () => {
    const signup = deferred<'session' | 'confirmation-required' | null>()
    const signUp = vi.fn(() => signup.promise)
    renderPage(authValue({ signUp }))
    fillValidRegistration()

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(screen.getByLabelText('Contraseña')).toHaveValue('')
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('')
    expect(document.body).not.toHaveTextContent('valid-password')

    await act(async () => {
      signup.resolve('session')
      await signup.promise
    })
  })

  it('navigates to Manage for an immediate session outcome', async () => {
    const signUp = vi.fn(async () => 'session' as const)
    renderPage(authValue({ signUp }))
    fillValidRegistration()

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('heading', { name: 'Manage' })).toBeInTheDocument()
    expect(screen.getByTestId('navigation-state')).toHaveTextContent('null')
  })

  it('navigates to Manage with only confirmation state when confirmation is required', async () => {
    const signUp = vi.fn(async () => 'confirmation-required' as const)
    renderPage(authValue({ signUp }))
    fillValidRegistration()

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('heading', { name: 'Manage' })).toBeInTheDocument()
    expect(screen.getByTestId('navigation-state')).toHaveTextContent('{"signup":"confirmation-required"}')
  })

  it('stays on Register and shows only the sanitized operation error for a failed signup', async () => {
    const signUp = vi.fn(async () => null)
    renderPage(authValue({ signUp, operationError: 'Unable to create account' }))
    fillValidRegistration()

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to create account')
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Manage' })).not.toBeInTheDocument()
  })

  it('disables the form while any auth operation is pending', () => {
    renderPage(authValue({ pendingOperation: 'signing-up' }))

    expect(screen.getByRole('button', { name: 'Creando cuenta...' })).toBeDisabled()
    expect(screen.getByLabelText('Correo electrónico')).toBeDisabled()
    expect(screen.getByLabelText('Contraseña')).toBeDisabled()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeDisabled()
  })

  it('redirects authenticated users away from the public registration page', async () => {
    renderPage(authValue({ status: 'authenticated' }))

    expect(await screen.findByRole('heading', { name: 'Manage' })).toBeInTheDocument()
  })

  it('shows the unavailable state without rendering a registration form', () => {
    renderPage(authValue({ error: 'Authentication unavailable' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Authentication unavailable')
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
  })
})
