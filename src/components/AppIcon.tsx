import { faArrowLeft, faArrowRight, faCompress, faExpand, faGear, faPause, faPlay, faPlus, faRotateRight, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon, type FontAwesomeIconProps } from '@fortawesome/react-fontawesome'

const icons = {
  arrowLeft: faArrowLeft,
  arrowRight: faArrowRight,
  compress: faCompress,
  expand: faExpand,
  gear: faGear,
  pause: faPause,
  play: faPlay,
  plus: faPlus,
  rotateRight: faRotateRight,
  trash: faTrash,
  xmark: faXmark,
} as const

export type AppIconName = keyof typeof icons

interface AppIconProps extends Omit<FontAwesomeIconProps, 'icon'> {
  name: AppIconName
}

export function AppIcon({ name, ...props }: AppIconProps) {
  return <FontAwesomeIcon {...props} aria-hidden="true" icon={icons[name]} />
}