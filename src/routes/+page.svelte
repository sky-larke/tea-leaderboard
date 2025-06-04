<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { Contest, Entry, User } from '$lib/supabase'

  let contests: Contest[] = []
  let entries: Entry[] = []
  let users: User[] = []
  let isLoading = true

  onMount(async () => {
    try {
      // Fetch all data in parallel
      const [contestsResponse, entriesResponse, usersResponse] = await Promise.all([
        supabase.from('contests').select('*').eq('ongoing', true),
        supabase.from('entries').select('*'),
        supabase.from('users').select('id, username')
      ])

      console.log('Responses:', {
        contests: contestsResponse.data,
        entries: entriesResponse.data,
        users: usersResponse.data
      })

      contests = contestsResponse.data || []
      entries = entriesResponse.data || []
      users = usersResponse.data || []

      console.log('Data loaded:', {
        contests: contests,
        entries: entries,
        users: users,
        contestsCount: contests.length,
        entriesCount: entries.length,
        usersCount: users.length
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
</script>

<div class="space-y-8">
  <h1 class="text-3xl font-bold">Active Contests</h1>

  {#if isLoading}
    <p>Loading...</p>
  {:else}
    {#each contests as contest}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">{contest.name?.en || 'Unnamed Contest'}</h2>
        
        <div class="space-y-6">
          {#each getContestEntries(contest.id) as entry}
            <div class="border rounded-lg p-4">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">{getUserName(entry.player_id)}</h3>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>