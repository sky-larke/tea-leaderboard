<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { Contest, Entry, User } from '$lib/supabase'
	import { beforeNavigate } from '$app/navigation';

  let contests: Contest[] = []
  let entries: Entry[] = []
  let users: User[] = []
  let faithActions: any[] = []
  let isLoading = true
  let error: string | null = null
  let faithAmounts: { [key: string]: number } = {}
  let userFaithActions: { [key: string]: boolean } = {}

  onMount(async () => {
    try {
      console.log('Starting data fetch...')
      
      // Fetch all data in parallel
      const [contestsResponse, entriesResponse, usersResponse, faithActionsResponse] = await Promise.all([
        supabase.from('contests').select('*').eq('ongoing', true),
        supabase.from('entries').select('*'),
        supabase.from('users').select('id, username, points'),
        supabase.from('faith_actions').select('*')
      ])

      // Check for errors in responses
      if (contestsResponse.error) throw new Error(`Contests error: ${contestsResponse.error.message}`)
      if (entriesResponse.error) throw new Error(`Entries error: ${entriesResponse.error.message}`)
      if (usersResponse.error) throw new Error(`Users error: ${usersResponse.error.message}`)
      if (faithActionsResponse.error) throw new Error(`Faith actions error: ${faithActionsResponse.error.message}`)

      console.log('Raw responses:', {
        contests: contestsResponse,
        entries: entriesResponse,
        users: usersResponse,
        faithActions: faithActionsResponse
      })

      contests = contestsResponse.data || []
      entries = entriesResponse.data || []
      users = usersResponse.data || []
      faithActions = faithActionsResponse.data || []

      if (contests.length === 0) {
        console.warn('No contests found')
      }

      // Initialize faith amounts for each contest
      contests.forEach(contest => {
        faithAmounts[contest.id] = 1
      })

      // Check faith actions for current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.warn('Error getting current user:', userError)
      }
      
      if (currentUser) {
        for (const contest of contests) {
          for (const entry of getContestEntries(contest.id)) {
            const key = `${contest.id}-${entry.player_id}`
            userFaithActions[key] = faithActions.some(fa => 
              fa.contest_id === contest.id && 
              fa.target_id === entry.player_id && 
              fa.user_id === currentUser.id
            )
          }
        }
      }

      console.log('Processed data:', {
        contestsCount: contests.length,
        entriesCount: entries.length,
        usersCount: users.length,
        faithActionsCount: faithActions.length,
        userFaithActions
      })
    } catch (err) {
      console.error('Error loading data:', err)
      error = err instanceof Error ? err.message : 'An unknown error occurred'
    } finally {
      isLoading = false
    }
  })

  function getContestEntries(contestId: string) {
    const filtered = entries.filter(e => e.contest === contestId)
    console.log('Filtering entries for contest', contestId, ':', filtered)
    return filtered
  }

  function getUserName(playerId: string) {
    const user = users.find(u => u.id === playerId)
    console.log('Looking up user for playerId', playerId, ':', user)
    return user?.username?.en || 'Anonymous'
  }

  function getFaithActionsForUser(contestId: string, targetId: string) {
    const actions = faithActions.filter(fa => 
      fa.contest_id === contestId && 
      fa.target_id === targetId
    )

    const totals = actions.reduce((acc, fa) => {
      if (fa.correctness) {
        acc.faith += fa.amount || 1
      } else {
        acc.noFaith += fa.amount || 1
      }
      return acc
    }, { faith: 0, noFaith: 0 })

    return totals
  }

  function hasPlacedFaithAction(contestId: string, targetId: string) {
    const key = `${contestId}-${targetId}`
    return userFaithActions[key] || false
  }

  async function placeFaithAction(contestId: string, targetId: string, prediction: boolean) {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      alert('Please sign in to place faith actions')
      return
    }

    const amount = faithAmounts[contestId] || 1

    // Check if user has enough points
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('points')
      .eq('auth_id', currentUser.id)
      .single()

    if (userError) {
      console.error('Error checking points:', userError)
      alert('Error checking points: ' + userError.message)
      return
    }

    if (!userData || typeof userData.points !== 'number' || userData.points < amount) {
      alert(`Not enough dayi neipiaos! You need ${amount} but only have ${userData?.points || 0}. Try having faith in the correct people for more dayi neipiaos.`)
      return
    }

    // Create faith action
    const { error: faithError } = await supabase
      .from('faith_actions')
      .insert([
        {
          user_id: currentUser.id,
          target_id: targetId,
          contest_id: contestId,
          correctness: prediction,
          amount: amount
        }
      ])

    if (faithError) {
      console.error('Error placing faith action:', faithError)
      alert('Error placing faith action: ' + faithError.message)
      return
    }

    // Deduct points
    const newPoints = Math.max(0, userData.points - amount)
    const { error: updateError } = await supabase
      .from('users')
      .update({ points: newPoints })
      .eq('auth_id', currentUser.id)

    if (updateError) {
      console.error('Error updating points:', updateError)
      alert('Error updating points: ' + updateError.message)
      return
    }

    // Refresh data
    const { data: faithActionsData } = await supabase
      .from('faith_actions')
      .select('*')
    faithActions = faithActionsData || []

    // Refresh the page to update points display
    window.location.reload()
  }
</script>

<div class="space-y-8">
  <h1 class="text-3xl font-bold">Active Contests</h1>

  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
      <p class="font-medium">Error loading data</p>
      <p class="text-sm">{error}</p>
    </div>
  {:else if isLoading}
    <div class="flex items-center justify-center p-8">
      <p class="text-gray-500">Loading contests...</p>
    </div>
  {:else if contests.length === 0}
    <div class="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
      <p>No active contests found</p>
    </div>
  {:else}
    {#each contests as contest}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">{contest.name?.en || 'Unnamed Contest'}</h2>
        
        <div class="mb-4">
          <label for="faith-amount-{contest.id}" class="block text-sm font-medium text-gray-700">Dayi Neipiaos to Bet</label>
          <input
            type="number"
            id="faith-amount-{contest.id}"
            bind:value={faithAmounts[contest.id]}
            min="1"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div class="space-y-6">
          {#each getContestEntries(contest.id) as entry}
            <div class="border rounded-lg p-4">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">{getUserName(entry.player_id)}</h3>
                <span class="text-sm text-gray-500">
                  {getFaithActionsForUser(contest.id, entry.player_id).faith + getFaithActionsForUser(contest.id, entry.player_id).noFaith} people have weighed in.
                </span>
              </div>

              {#if !hasPlacedFaithAction(contest.id, entry.player_id)}
                <div class="flex space-x-4">
                  <button
                    on:click={() => placeFaithAction(contest.id, entry.player_id, true)}
                    class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Have faith ({faithAmounts[contest.id]} dayi neipiaos)
                  </button>
                  <button
                    on:click={() => placeFaithAction(contest.id, entry.player_id, false)}
                    class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    No faith ({faithAmounts[contest.id]} dayi neipiaos)
                  </button>
                </div>
              {:else}
              <div class="text-sm text-gray-500">
                <p>You aren't allowed to change your mind. That would be boring.</p>

                {#if getFaithActionsForUser(contest.id, entry.player_id).faith > 0}
                  <p>You already have {getFaithActionsForUser(contest.id, entry.player_id).faith} dayi neipiaos worth of faith in this person.</p>
                {:else}
                  <p>You already have {getFaithActionsForUser(contest.id, entry.player_id).noFaith} dayi neipiaos worth of lack of faith in this person.</p>
                {/if}
              </div>
              {/if}

              <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">Public Opinion</h4>
                <div class="bg-gray-50 p-4 rounded space-y-2">
                  {#if true}
                    {@const faithTotal = getFaithActionsForUser(contest.id, entry.player_id).faith}
                    {@const noFaithTotal = getFaithActionsForUser(contest.id, entry.player_id).noFaith}
                    {@const isFaithWinning = faithTotal > noFaithTotal}
                    {@const isNoFaithWinning = noFaithTotal > faithTotal}
                    {@const isTied = faithTotal === noFaithTotal}
                    
                    <div class="flex items-center">
                      <span class="text-green-600 flex items-center">
                        Faith: {faithTotal} dayi neipiaos
                        {#if isFaithWinning}
                          <span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Winning</span>
                        {/if}
                      </span>
                    </div>
                    <div class="flex items-center">
                      <span class="text-red-600 flex items-center">
                        No Faith: {noFaithTotal} dayi neipiaos
                        {#if isNoFaithWinning}
                          <span class="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Winning</span>
                        {/if}
                      </span>
                    </div>
                    {#if isTied}
                      <div class="text-center text-gray-500 text-sm mt-1">
                        Currently tied
                      </div>
                    {/if}
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>