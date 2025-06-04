<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import '../app.css'

  let user: any = null
  let userPoints: number | null = null
  let email = ''
  let password = ''
  let username = ''
  let showAuthForm = false
  let isSignUp = false
  let errorMessage = ''

  onMount(async () => {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user ?? null
    if (user) {
      await checkUserPoints()
    }

    // Listen for auth changes
    const { data: { subscription } } = await supabase.auth.onAuthStateChange(async (_event, session) => {
      user = session?.user ?? null
      if (user) {
        await checkUserPoints()
      } else {
        userPoints = null
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  async function checkUserPoints() {
    if (!user) return

    const { data, error } = await supabase
      .from('users')
      .select('points')
      .eq('auth_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching points:', error)
      return
    }

    userPoints = data?.points ?? null
  }

  async function handleSignIn() {
    try {
      const { data: { user: signedInUser }, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          // If email is not confirmed, try to resend confirmation
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`
            }
          })
          if (resendError) {
            throw new Error('Email not confirmed. Please check your email for the confirmation link.')
          } else {
            throw new Error('Email not confirmed. A new confirmation link has been sent to your email.')
          }
        }
        throw error
      }
      
      // Check if user record exists
      if (signedInUser) {
        console.log('Checking for existing user record...')
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', signedInUser.id)
          .single()

        console.log('Existing user check:', { existingUser, checkError })

        // If no user record exists, create one
        if (!existingUser) {
          console.log('Creating new user record...')
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
              {
                auth_id: signedInUser.id,
                username: { en: signedInUser.email?.split('@')[0] || 'Anonymous' },
                points: 5
              }
            ])
            .select()
            .single()

          console.log('User creation result:', { newUser, insertError })

          if (insertError) {
            console.error('Error creating user record:', insertError)
            throw new Error('Failed to create user record: ' + insertError.message)
          }

          // Refresh user points after creation
          await checkUserPoints()
        }
      }
      
      showAuthForm = false
      errorMessage = ''
      // Clear form
      email = ''
      password = ''
      username = ''
    } catch (error: any) {
      errorMessage = error.message
      console.error('Sign in error:', error)
    }
  }

  async function handleSignUp() {
    try {
      if (!username.trim()) {
        errorMessage = 'Please enter a username'
        return
      }

      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username->en', username)
        .single()

      if (existingUser) {
        errorMessage = 'Username is already taken'
        return
      }

      // Sign up the user with email confirmation disabled
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (signUpError) throw signUpError

      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        errorMessage = 'This email is already registered. Please sign in instead.'
        return
      }
      
      errorMessage = 'Check your email for the confirmation link! After confirming, you can sign in to create your account.'
      // Switch to sign in view
      isSignUp = false
      // Clear form
      email = ''
      password = ''
      username = ''
    } catch (error: any) {
      errorMessage = error.message
      console.error('Sign up error:', error)
    }
  }

  function toggleAuthView() {
    isSignUp = !isSignUp
    errorMessage = ''
    // Clear form
    email = ''
    password = ''
    username = ''
  }
</script>

<div class="min-h-screen bg-gray-100">
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <a href="/" class="text-xl font-bold">Tea Leaderboard</a>
          {#if user}
            <a href="/history" class="ml-6 text-gray-600 hover:text-gray-900">History</a>
          {/if}
        </div>
        <div class="flex items-center">
          {#if user}
            <span class="mr-4">Dayi Neipiaos: {userPoints ?? 'Loading...'}</span>
            <button
              on:click={() => supabase.auth.signOut()}
              class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          {:else}
            <button
              on:click={() => showAuthForm = true}
              class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Sign In
            </button>
          {/if}
        </div>
      </div>
    </div>
  </nav>

  {#if showAuthForm}
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3 text-center">
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </h3>
          <div class="mt-2 px-7 py-3">
            <div class="mb-4">
              <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                id="email"
                bind:value={email}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div class="mb-4">
              <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                id="password"
                bind:value={password}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            {#if isSignUp}
              <div class="mb-4">
                <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  id="username"
                  bind:value={username}
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            {/if}
            {#if errorMessage}
              <p class="text-red-500 text-sm mb-4">{errorMessage}</p>
            {/if}
            <div class="flex justify-between">
              <button
                on:click={isSignUp ? handleSignUp : handleSignIn}
                class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
              <button
                on:click={toggleAuthView}
                class="text-blue-500 hover:text-blue-700"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
            </div>
          </div>
          <div class="mt-4">
            <button
              on:click={() => showAuthForm = false}
              class="text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <slot />
  </main>
</div>