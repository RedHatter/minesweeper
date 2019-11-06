<script>
  import Button from './Button.svelte'
  import Cell from './Cell.svelte'
  import { createBoard } from './board.js'
  import { solve, getProbability } from './solver.js'
  import { range } from './util.js'

  export let width = 10
  export let height = 10
  export let mines = 10

  let mark = false

  const PLAYING = 'p'
  const LOST = 'l'
  const WON = 'w'
  let state = PLAYING

  let _time = performance.now()
  let time = 0
  const timer = setInterval(
    () => (time = Math.floor((performance.now() - _time) / 1000)),
    1000
  )
  $: state !== PLAYING && clearInterval(timer)

  const board = createBoard(
    width,
    height,
    mines,
    () => (state = WON),
    () => (state = LOST)
  )

  function handleClick(i) {
    if (mark) board.mark(i)
    else board.reveal(i)

    board = board
  }

  let solveTime = {
    count: 0,
    total: 0,
    max: 0
  }

  let solver
  function tickSolve() {
    if (!solver) solver = solve(board)

    const t0 = performance.now()
    solver.tick()
    const t1 = performance.now()
    const delta = t1 - t0
    solveTime.count++
    solveTime.total += delta
    if (delta > solveTime.max) solveTime.max = delta

    board = board
    if (state === PLAYING) setTimeout(tickSolve, 200 - delta)
  }

  let hover = 0
  let cheat = false
  $: probability = cheat ? getProbability(board, hover) : 0
</script>

<style>
  .info {
    display: flex;
    justify-content: space-evenly;
    margin: 10px auto;
    max-width: 100%;
    width: 500px;
    font-size: 1rem;
  }

  .row {
    display: flex;
    justify-content: center;
  }

  .row:last-child :global(button) {
    border-bottom: 1px solid lightgrey;
  }

  .state-l {
    color: red;
  }

  .state-w {
    color: green;
  }
</style>

<svelte:window
  on:keydown={e => ['Alt', 'Control', 'Shift'].includes(e.key) && (mark = true)}
  on:keyup={e => ['Alt', 'Control', 'Shift'].includes(e.key) && (mark = false)} />

<Button type="checkbox" bind:checked={mark}>Mark</Button>
<Button on:click={tickSolve}>Solve</Button>
<Button type="checkbox" bind:checked={cheat}>Cheat</Button>
<div class="info">
  <span>{board.marked} of {mines}</span>
  <span class="state-{state}">
    {Math.floor(time / 60)} : {(time % 60).toString().padStart(2, '0')}
  </span>
  {#if cheat}
    <span>{Math.round(probability * 100)}% chance of a mine</span>
  {/if}
</div>
<div class="board">
  {#each range(height) as y}
    <div class="row">
      {#each range(width) as x}
        <Cell
          value={board.get(width * y + x)}
          flag={board.flags[width * y + x]}
          on:mouseenter={() => (hover = width * y + x)}
          on:click={() => handleClick(width * y + x)} />
      {/each}
    </div>
  {/each}
</div>
{#if solveTime.count > 0}
  Avg: {Math.round(solveTime.total / solveTime.count)}, Max: {Math.round(solveTime.max)}
{/if}
