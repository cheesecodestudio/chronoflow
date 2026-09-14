export type Database = {
  public: {
    Tables: {
      timers: {
        Row: {
          accent: string | null
          created_at: string
          icon: string | null
          id: string
          position: number
          start_at: string | null
          target_at: string | null
          time_zone: string
          title: string
          type: Database['public']['Enums']['timer_type']
          updated_at: string
          user_id: string
        }
        Insert: {
          accent?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          position: number
          start_at?: string | null
          target_at?: string | null
          time_zone: string
          title: string
          type: Database['public']['Enums']['timer_type']
          updated_at?: string
          user_id?: string
        }
        Update: {
          accent?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          position?: number
          start_at?: string | null
          target_at?: string | null
          time_zone?: string
          title?: string
          type?: Database['public']['Enums']['timer_type']
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'timers_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      timer_type: 'counter' | 'countdown'
    }
    CompositeTypes: Record<string, never>
  }
}

export type TimerRow = Database['public']['Tables']['timers']['Row']
export type TimerInsert = Database['public']['Tables']['timers']['Insert']
export type TimerUpdate = Database['public']['Tables']['timers']['Update']
