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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in:', error)
      alert('Error signing in: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /* Discord auth temporarily disabled
  async function handleDiscordSignIn() {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      console.log('Redirecting to:', redirectTo)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'consent'
          }
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Discord:', error)
      alert('Error signing in with Discord: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }
  */

  async function handleSignUp() {
    try {
      // Check if username is available
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username->en', username)
        .single()

      if (existingUser) {
        alert('Username is already taken. Please choose another one.')
        return
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
      alert('Please check your email for the confirmation link!')
    } catch (error) {
      console.error('Error signing up:', error)
      alert('Error signing up: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
          {#if user}
          <a href="/" class="text-xl font-bold">You are logged in as {user?.email}</a>

            <a href="/history" class="ml-6 text-gray-600 hover:text-gray-900">History</a>
          {:else}
            <a href="/" class="ml-6 text-gray-600 hover:text-gray-900">Tea Leaderboard</a>
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
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
          <button on:click={() => showAuthForm = false} class="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <!-- Discord auth temporarily disabled
          <button
            on:click={handleDiscordSignIn}
            class="w-full flex items-center justify-center gap-2 bg-[#5865F2] text-white px-4 py-2 rounded hover:bg-[#4752C4] transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Continue with Discord
          </button>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>
          -->

          {#if isSignUp}
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                id="username"
                bind:value={username}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          {/if}

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              bind:value={email}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              bind:value={password}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <button
            on:click={isSignUp ? handleSignUp : handleSignIn}
            class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>

          <p class="text-sm text-gray-500 text-center">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              on:click={() => isSignUp = !isSignUp}
              class="text-blue-500 hover:text-blue-600"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  {/if}

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <slot />
  </main>
</div>