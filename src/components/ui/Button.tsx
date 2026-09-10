import type { ComponentProps } from 'react'

import { buttonClassName, type ButtonVariant } from './buttonVariants'
import './ui.css'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />
}
