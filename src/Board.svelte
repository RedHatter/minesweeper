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

  let time = 0
  const timer = setInterval(() => time++, 1000)
  $: state !== PLAYING && clearInterval(timer)

  const board = createBoard(
    width,
    height,
    mines,
    () => (state = WON),
    () => (state = LOST)
  )

  let marked = 0
  function handleClick(x, y) {
    if (mark) marked = board.mark(x, y)
    else board.reveal(x, y)

    board = board
  }

  function tickSolve() {
    const _marked = solve(board)
    if (_marked > 0) marked = _marked
    board = board
    if (state === PLAYING) setTimeout(tickSolve, 200)
  }

  let hover = { x: 0, y: 0 }
  let cheat = false
  $: probability = cheat ? getProbability(board, hover.x, hover.y) : 0
</script>

<style>
  .info {
    display: flex;
    justify-content: space-evenly;
    margin: 0 auto;
    width: 500px;
    font-size: 1rem;
  }

  .board {
    margin-top: 12px;
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
  <span>{marked} of {mines}</span>
  <span class="state-{state}">
    {Math.floor(time / 60)} : {(time % 60).toString().padStart(2, '0')}
  </span>
  {#if cheat}
    <span>{Math.round(probability * 100)}% chance of a mine</span>
  {/if}
</div>
<div class="board">
  {#each range(width) as x}
    <div class="row">
      {#each range(height) as y}
        <Cell
          value={board.get(x, y)}
          flag={board.flags[x][y]}
          on:mouseenter={() => (hover = { x, y })}
          on:click={() => handleClick(x, y)} />
      {/each}
    </div>
  {/each}
</div>
