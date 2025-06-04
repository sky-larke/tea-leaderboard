import type { EmailOtpType } from '@supabase/supabase-js'
import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  try {
    const token_hash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type') as EmailOtpType | null
    const next = url.searchParams.get('next') ?? '/'

    if (!token_hash || !type) {
      throw new Error('Missing token_hash or type')
    }

    const { error } = await supabase.auth.verifyOtp({ 
      type, 
      token_hash,
      options: {
        redirectTo: `${url.origin}/auth/callback`
      }
    })

    if (error) {
      console.error('Error verifying OTP:', error)
      throw error
    }

    // Success - redirect to the next page or home
    return redirect(303, next)
  } catch (error) {
    console.error('Auth confirmation error:', error)
    // Redirect to error page with error message
    const errorUrl = new URL('/auth/error', url.origin)
    errorUrl.searchParams.set('message', error instanceof Error ? error.message : 'Authentication failed')
    return redirect(303, errorUrl.toString())
  }
}