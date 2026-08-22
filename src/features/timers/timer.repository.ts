import type { Timer, TimerColor, TimerIcon } from './timer.types'

export interface TimerRepository {
  getAll(): Promise<Timer[]>
  getById(id: string): Promise<Timer | null>
  create(timer: Timer): Promise<Timer>
  delete(id: string): Promise<void>
  restart(id: string): Promise<Timer>
  updateCustomization(id: string, color: TimerColor, icon: TimerIcon): Promise<Timer>
}