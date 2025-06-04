<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { Contest, Entry, User, FaithAction } from '$lib/supabase'

  let contests: Contest[] = []
  let entries: Entry[] = []
  let users: User[] = []
  let faithActions: FaithAction[] = []
  let user: any = null
  let groupedFaithActions: [string, FaithAction[]][] = []

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user

    if (!user) return

    try {
      // Fetch all contests (including ended ones)
      const { data: contestsData } = await supabase
        .from('contests')
        .select('*')
      contests = contestsData || []

      // Fetch all entries
      const { data: entriesData } = await supabase
        .from('entries')
        .select('*')
      entries = entriesData || []

      // Fetch all users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
      users = usersData || []

      // Fetch user's faith actions
      const { data: faithActionsData, error: faithError } = await supabase
        .from('faith_actions')
        .select('*')
        .eq('user_id', user.id)

      console.log('Fetching faith actions for user:', {
        userId: user.id,
        faithActions: faithActionsData,
        error: faithError
      })

      faithActions = faithActionsData || []
    } catch (error) {
      console.error('Error in onMount:', error)
    }
  })

  $: {
    const groups = new Map<string, FaithAction[]>()
    faithActions.forEach(fa => {
      const contestId = fa.contest_id
      if (!groups.has(contestId)) {
        groups.set(contestId, [])
      }
      groups.get(contestId)?.push(fa)
    })
    groupedFaithActions = Array.from(groups.entries())
  }

  function getUserName(userId: string) {
    return users.find(u => u.id === userId)?.username?.en || 'Anonymous'
  }

  function getContestName(contestId: string) {
    return contests.find(c => c.id === contestId)?.name?.en || 'Unknown Contest'
  }

  function getEntryResult(contestId: string, targetId: string) {
    const entry = entries.find(e => 
      e.contest === contestId && 
      e.player_id === targetId
    )
    return entry?.correctness
  }

  function getFaithActionResult(faithAction: FaithAction) {
    const contest = contests.find(c => c.id === faithAction.contest_id)
    if (!contest?.ongoing) {
      const result = getEntryResult(faithAction.contest_id, faithAction.target_id)
      if (result === undefined) return 'Pending'
      return result === faithAction.correctness ? 'Correct' : 'Incorrect'
    }
    return 'Ongoing'
  }

  function getFaithActionPoints(faithAction: FaithAction) {
    const result = getFaithActionResult(faithAction)
    const betAmount = faithAction.amount || 1
    if (result === 'Ongoing' || result === 'Pending') return `-${betAmount} (pending)`
    return result === 'Correct' ? `+${betAmount}` : `-${betAmount}`
  }
</script>

<div class="space-y-8">
  <h1 class="text-3xl font-bold">Your Faith Action History</h1>

  {#if !user}
    <p class="text-gray-600">Please sign in to view your faith action history.</p>
  {:else if faithActions.length === 0}
    <p class="text-gray-600">You haven't placed any faith actions yet.</p>
  {:else}
    {#each groupedFaithActions as [contestId, actions]}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">{getContestName(contestId)}</h2>
        
        <div class="space-y-4">
          {#each actions as action}
            <div class="border rounded-lg p-4">
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="font-medium">Faith Action on {getUserName(action.target_id)}</h3>
                  <p class="text-sm text-gray-500">
                    Your faith: {action.correctness ? 'Yes' : 'No'} 
                  </p>
                </div>
                <div class="text-right">
                  <span class="inline-block px-3 py-1 rounded-full text-sm font-medium
                    {getFaithActionResult(action) === 'Correct' ? 'bg-green-100 text-green-800' :
                     getFaithActionResult(action) === 'Incorrect' ? 'bg-red-100 text-red-800' :
                     'bg-gray-100 text-gray-800'}">
                    {getFaithActionResult(action)}
                  </span>
                  <p class="text-sm font-medium mt-1">
                    Dayi neipiaos: {action.amount || 1}
                  </p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div> 