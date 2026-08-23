import type { Timer, TimerCustomization } from './timer.types'

export interface TimerRepository {
  getAll(): Promise<Timer[]>
  getById(id: string): Promise<Timer | null>
  create(timer: Timer): Promise<Timer>
  delete(id: string): Promise<void>
  restart(id: string): Promise<Timer>
  updateCustomization(id: string, customization: Required<TimerCustomization>): Promise<Timer>
}
