import { Temporal } from 'temporal-polyfill'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { TimerRepository } from '../../features/timers/timer.repository'
import type { Timer, TimerCustomization } from '../../features/timers/timer.types'
import { isValidTimerCustomization } from '../../features/timers/timer.customization'
import type { Database, TimerUpdate } from './database.types'
import { timerFromRow, timerToInsert } from './timerRow'

const TIMER_COLUMNS = 'id,user_id,type,title,time_zone,position,start_at,target_at,accent,icon,created_at,updated_at'

export class SupabaseTimerRepository implements TimerRepository {
  private readonly client: SupabaseClient<Database>
  public readonly userId: string
  private readonly now: () => Temporal.Instant

  constructor(
    client: SupabaseClient<Database>,
    userId: string,
    now: () => Temporal.Instant = () => Temporal.Now.instant(),
  ) {
    this.client = client
    this.userId = userId
    this.now = now
  }

  async getAll(): Promise<Timer[]> {
    const { data, error } = await this.client
      .from('timers')
      .select(TIMER_COLUMNS)
      .eq('user_id', this.userId)
      .order('position', { ascending: true })

    if (error) throw error
    return data.map(timerFromRow)
  }

  async getById(id: string): Promise<Timer | null> {
    const { data, error } = await this.client
      .from('timers')
      .select(TIMER_COLUMNS)
      .eq('id', id)
      .eq('user_id', this.userId)
      .maybeSingle()

    if (error) throw error
    return data === null ? null : timerFromRow(data)
  }

  async create(timer: Timer): Promise<Timer> {
    const { data, error } = await this.client
      .from('timers')
      .insert(timerToInsert(timer, this.userId))
      .select(TIMER_COLUMNS)
      .single()

    if (error) throw error
    return timerFromRow(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('timers')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId)

    if (error) throw error
  }

  async restart(id: string): Promise<Timer> {
    const timestamp = this.now().toString()
    return this.updateAndReturn(
      id,
      {
        start_at: timestamp,
        updated_at: timestamp,
      },
      'counter',
    )
  }

  async updateCustomization(
    id: string,
    customization: Required<TimerCustomization>,
  ): Promise<Timer> {
    if (!isValidTimerCustomization(customization)) {
      throw new Error('La personalización del timer no es válida.')
    }

    return this.updateAndReturn(id, {
      accent: customization.accent,
      icon: customization.icon,
      updated_at: this.now().toString(),
    })
  }

  private async updateAndReturn(
    id: string,
    changes: TimerUpdate,
    requiredType?: Database['public']['Enums']['timer_type'],
  ): Promise<Timer> {
    let query = this.client
      .from('timers')
      .update(changes)
      .eq('id', id)
      .eq('user_id', this.userId)

    if (requiredType) query = query.eq('type', requiredType)

    const { data, error } = await query
      .select(TIMER_COLUMNS)
      .single()

    if (error) throw error
    return timerFromRow(data)
  }
}
