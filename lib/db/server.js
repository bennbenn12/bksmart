import { createServerCompatClient } from '@/lib/mysql/supabaseCompat'

export const createClient = () => createServerCompatClient()
