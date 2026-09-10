export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

export function buttonClassName(variant: ButtonVariant = 'primary', className = '') {
  return `cf-button cf-button--${variant} ${className}`.trim()
}
