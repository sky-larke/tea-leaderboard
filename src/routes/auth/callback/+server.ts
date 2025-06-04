import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  try {
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    console.log('Auth callback received:', { code, error, errorDescription })

    if (error) {
      console.error('OAuth error:', error, errorDescription)
      throw redirect(303, `/?error=${encodeURIComponent(errorDescription || error)}`)
    }

    if (code) {
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        throw redirect(303, `/?error=${encodeURIComponent(sessionError.message)}`)
      }
      console.log('Session exchanged successfully:', data)
    }

    throw redirect(303, '/')
  } catch (err) {
    console.error('Auth callback error:', err)
    throw redirect(303, '/?error=Authentication failed')
  }
} 