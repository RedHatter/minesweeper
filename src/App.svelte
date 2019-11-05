<script>
  import Button from './Button.svelte'
  import Board from './Board.svelte'

  let width = 16
  let height = 16
  let mines = 40
  let playing = false

  $: disabled = mines > width * height
</script>

<style>
  @import url('https://fonts.googleapis.com/css?family=Black+Ops+One|Bungee+Inline|Open+Sans&display=swap');

  :global(body) {
    font-family: 'Open Sans', sans-serif;
  }

  div {
    margin-top: 16px;
    text-align: center;
    font-size: 1.5rem;
  }

  h1 {
    margin-top: 60px;
    font-weight: normal;
    font-size: 4rem;
    font-family: 'Black Ops One';
  }

  input {
    margin: 5px 0 15px;
    width: 3rem;
    border: none;
    border-bottom: 1px solid lightgray;
    background: none;
    text-align: center;
    font-size: 2rem;
  }

  input:focus {
    border-color: gray;
  }
</style>

{#if playing}
  <div>
    <Button on:click={() => (playing = false)}>New game</Button>
    <Board {width} {height} {mines} />
  </div>
{:else}
  <div>
    <h1>Minesweeper</h1>
    Play
    <input bind:value={width} />
    by
    <input bind:value={height} />
    with
    <input bind:value={mines} />
    mines. &nbsp;&nbsp;
    <Button on:click={() => (playing = true)} {disabled}>Begin</Button>
    {#if disabled}
      <br />
      Too many mines.
    {/if}
  </div>
{/if}
