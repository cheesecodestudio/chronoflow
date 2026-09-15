import { fireEvent, render, screen } from '@testing-library/react'
import type { Session, User } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from './AuthContext'
import { ManageAuthControl } from './ManageAuthControl'

const signInWithPassword = vi.fn(async () => undefined)
const signOut = vi.fn(async () => undefined)

const anonymousAuth: AuthContextValue = {
  status: 'anonymous',
  session: null,
  user: null,
  error: null,
  pendingOperation: null,
  operationError: null,
  signInWithPassword,
  signOut,
}

function authenticatedAuth(email = 'person@example.com'): AuthContextValue {
  const user = { id: 'user-1', email } as User

  return {
    ...anonymousAuth,
    status: 'authenticated',
    session: { user } as Session,
    user,
  }
}

function renderControl(auth: AuthContextValue) {
  return render(
    <AuthContext.Provider value={auth}>
      <ManageAuthControl />
    </AuthContext.Provider>,
  )
}

describe('ManageAuthControl', () => {
  it('shows only a non-sensitive status while authentication initializes', () => {
    renderControl({ ...anonymousAuth, status: 'initializing' })

    expect(screen.getByRole('status')).toHaveTextContent('Inicializando autenticación...')
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument()
  })

  it('shows the exact unavailable state without a sign-in submission', () => {
    renderControl({ ...anonymousAuth, error: 'sensitive configuration detail' })

    expect(screen.getByRole('alert').textContent).toBe('Authentication unavailable')
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
  })

  it('provides an accessible anonymous email and password form without account links', () => {
    renderControl(anonymousAuth)

    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled()
    expect(screen.queryByText(/crear cuenta|registr|recuper|oauth|magic/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('submits entered credentials exactly once and immediately clears the password field', () => {
    const signIn = vi.fn(async () => undefined)
    const password = 'one-use-password'
    renderControl({ ...anonymousAuth, signInWithPassword: signIn })

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'person@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(signIn).toHaveBeenCalledTimes(1)
    expect(signIn).toHaveBeenCalledWith('person@example.com', password)
    expect(screen.getByLabelText('Contraseña')).toHaveValue('')
    expect(document.body).not.toHaveTextContent(password)
  })

  it('disables pending sign-in and rejects repeated form submission', () => {
    const signIn = vi.fn(async () => undefined)
    const { rerender } = renderControl({ ...anonymousAuth, signInWithPassword: signIn })

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'person@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'one-use-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    rerender(
      <AuthContext.Provider value={{
        ...anonymousAuth,
        pendingOperation: 'signing-in',
        signInWithPassword: signIn,
      }}>
        <ManageAuthControl />
      </AuthContext.Provider>,
    )

    const pendingButton = screen.getByRole('button', { name: 'Iniciando sesión...' })
    expect(pendingButton).toBeDisabled()
    expect(screen.getByLabelText('Correo electrónico')).toBeDisabled()
    expect(screen.getByLabelText('Contraseña')).toBeDisabled()
    fireEvent.submit(pendingButton.closest('form')!)
    expect(signIn).toHaveBeenCalledTimes(1)
  })

  it('shows only the safe sign-in operation error while remaining anonymous', () => {
    renderControl({ ...anonymousAuth, operationError: 'Unable to sign in' })

    expect(screen.getByRole('alert').textContent).toBe('Unable to sign in')
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Usuario autenticado')).not.toBeInTheDocument()
  })

  it('waits for a provider lifecycle change after sign-in resolves', () => {
    const signIn = vi.fn(async () => undefined)
    const { rerender } = renderControl({ ...anonymousAuth, signInWithPassword: signIn })

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'person@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('person@example.com')).not.toBeInTheDocument()

    rerender(
      <AuthContext.Provider value={{ ...authenticatedAuth(), signInWithPassword: signIn }}>
        <ManageAuthControl />
      </AuthContext.Provider>,
    )
    expect(screen.getByText('person@example.com')).toBeInTheDocument()
  })

  it('renders authenticated identity with a safe fallback', () => {
    const { rerender } = renderControl(authenticatedAuth())

    expect(screen.getByText('person@example.com')).toBeInTheDocument()

    const userWithoutEmail = { id: 'user-2' } as User
    rerender(
      <AuthContext.Provider value={{
        ...authenticatedAuth(),
        session: { user: userWithoutEmail } as Session,
        user: userWithoutEmail,
      }}>
        <ManageAuthControl />
      </AuthContext.Provider>,
    )
    expect(screen.getByText('Usuario autenticado')).toBeInTheDocument()
  })

  it('invokes sign-out once without assuming the lifecycle changed', () => {
    const localSignOut = vi.fn(async () => undefined)
    renderControl({ ...authenticatedAuth(), signOut: localSignOut })

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(localSignOut).toHaveBeenCalledTimes(1)
    expect(screen.getByText('person@example.com')).toBeInTheDocument()
  })

  it('disables pending sign-out and rejects repeated action', () => {
    const localSignOut = vi.fn(async () => undefined)
    const { rerender } = renderControl({ ...authenticatedAuth(), signOut: localSignOut })

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    rerender(
      <AuthContext.Provider value={{
        ...authenticatedAuth(),
        pendingOperation: 'signing-out',
        signOut: localSignOut,
      }}>
        <ManageAuthControl />
      </AuthContext.Provider>,
    )

    const pendingButton = screen.getByRole('button', { name: 'Cerrando sesión...' })
    expect(pendingButton).toBeDisabled()
    fireEvent.click(pendingButton)
    expect(localSignOut).toHaveBeenCalledTimes(1)
  })

  it('preserves authenticated identity and shows only a safe sign-out failure', () => {
    renderControl({ ...authenticatedAuth(), operationError: 'Unable to sign out' })

    expect(screen.getByText('person@example.com')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toBe('Unable to sign out')
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('keeps configuration and operation errors separate', () => {
    renderControl({
      ...anonymousAuth,
      error: 'sensitive configuration detail',
      operationError: 'Unable to sign in',
    })

    expect(screen.getByRole('alert').textContent).toBe('Authentication unavailable')
    expect(screen.queryByText('Unable to sign in')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('sensitive configuration detail')
  })
})
