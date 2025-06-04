<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { Contest, Entry, User } from '$lib/supabase'

  let contests: Contest[] = []
  let entries: Entry[] = []
  let users: User[] = []
  let faithActions: any[] = []
  let isLoading = true
  let faithAmounts: { [key: string]: number } = {}
  let userFaithActions: { [key: string]: boolean } = {}

  onMount(async () => {
    try {
      // Fetch all data in parallel
      const [contestsResponse, entriesResponse, usersResponse, faithActionsResponse] = await Promise.all([
        supabase.from('contests').select('*').eq('ongoing', true),
        supabase.from('entries').select('*'),
        supabase.from('users').select('id, username, points'),
        supabase.from('faith_actions').select('*')
      ])

      console.log('Responses:', {
        contests: contestsResponse.data,
        entries: entriesResponse.data,
        users: usersResponse.data,
        faithActions: faithActionsResponse.data
      })

      contests = contestsResponse.data || []
      entries = entriesResponse.data || []
      users = usersResponse.data || []
      faithActions = faithActionsResponse.data || []

      // Initialize faith amounts for each contest
      contests.forEach(contest => {
        faithAmounts[contest.id] = 1
      })

      // Check faith actions for current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
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

      console.log('Data loaded:', {
        contests: contests,
        entries: entries,
        users: users,
        faithActions: faithActions,
        userFaithActions,
        contestsCount: contests.length,
        entriesCount: entries.length,
        usersCount: users.length,
        faithActionsCount: faithActions.length
      })
    } catch (error) {
      console.error('Error loading data:', error)
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
      alert(`Not enough dayi neipiaos! You need ${amount} but only have ${userData?.points || 0}`)
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

  {#if isLoading}
    <p>Loading...</p>
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
                  Current Faith Actions: {getFaithActionsForUser(contest.id, entry.player_id).faith + getFaithActionsForUser(contest.id, entry.player_id).noFaith}
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
                    I have no faith ({faithAmounts[contest.id]} dayi neipiaos)
                  </button>
                </div>
              {:else}
                {#if getFaithActionsForUser(contest.id, entry.player_id).faith > 0}
                  <p class="text-sm text-gray-500">You already have {getFaithActionsForUser(contest.id, entry.player_id).faith} dayi neipiaos worth of faith in this person.</p>
                {:else}
                  <p class="text-sm text-gray-500">You already have {getFaithActionsForUser(contest.id, entry.player_id).noFaith} dayi neipiaos worth of lack of faith in this person.</p>
                {/if}

              {/if}

              <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-2">Faith Actions</h4>
                <div class="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <div class="flex space-x-4">
                    <span class="text-green-600">
                      Faith: {getFaithActionsForUser(contest.id, entry.player_id).faith} dayi neipiaos
                    </span>
                    <span class="text-red-600">
                      No Faith: {getFaithActionsForUser(contest.id, entry.player_id).noFaith} dayi neipiaos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>