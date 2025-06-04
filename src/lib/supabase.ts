import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)

export type User = {
  id: string
  auth_id?: string
  username: {
    en: string
    [key: string]: string
  }
  points: number
  instance_id: string
}

export type Contest = {
  id: string
  name: {
    en: string
    [key: string]: string
  }
  ongoing: boolean
}

export type Entry = {
  id: string
  player_id: string
  contest: string
  correctness: boolean
}

export type FaithAction = {
  id: string
  user_id: string
  target_id: string
  contest_id: string
  correctness: boolean
} 