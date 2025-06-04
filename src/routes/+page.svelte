<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { Contest, Entry } from '$lib/supabase'

  let contests: Contest[] = []
  let entries: Entry[] = []
  let isLoading = true

  onMount(async () => {
    try {
      // Only fetch contests and entries, no auth
      const { data: contestsData, error: contestsError } = await supabase
        .from('contests')
        .select('*')
        .eq('ongoing', true)

      console.log('Contests response:', { data: contestsData, error: contestsError })

      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')

      console.log('Entries response:', { data: entriesData, error: entriesError })

      contests = contestsData || []
      entries = entriesData || []

      console.log('Data loaded:', {
        contests: contests,
        entries: entries,
        contestsCount: contests.length,
        entriesCount: entries.length
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
                <h3 class="text-lg font-medium">Entry {entry.player_id}</h3>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>