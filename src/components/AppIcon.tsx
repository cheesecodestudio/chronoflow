import {
  faArrowLeft,
  faArrowRight,
  faBolt,
  faBookOpen,
  faBullseye,
  faCheck,
  faClock,
  faCompress,
  faDumbbell,
  faExpand,
  faGear,
  faLeaf,
  faPause,
  faPlay,
  faPlus,
  faRotateRight,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon, type FontAwesomeIconProps } from '@fortawesome/react-fontawesome'

const icons = {
  arrowLeft: faArrowLeft,
  arrowRight: faArrowRight,
  bolt: faBolt,
  book: faBookOpen,
  check: faCheck,
  clock: faClock,
  compress: faCompress,
  dumbbell: faDumbbell,
  expand: faExpand,
  focus: faBullseye,
  gear: faGear,
  leaf: faLeaf,
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
