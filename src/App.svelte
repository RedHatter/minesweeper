<script>
  import Prando from 'prando'
  import Button from './Button.svelte'
  import Board from './Board.svelte'

  let width = 16
  let height = 16
  let mines = 40
  let playing = false

  let rand = new Prando()
  let seed = rand.nextString(16)

  $: disabled = mines > width * height
</script>

<style>
  @import url('https://fonts.googleapis.com/css?family=Black+Ops+One|Bungee+Inline|Open+Sans&display=swap');

  :global(body) {
    font-family: 'Open Sans', sans-serif;
  }

  a {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 32px;
    height: 32px;
    background: center / contain
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='rgb(68, 68, 68)' stroke-width='2' d='M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22'%3E%3C/path%3E%3C/svg%3E");
    transition: opacity 0.3s;
  }

  a:hover {
    opacity: 0.6;
  }

  form,
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

  input[type='text'] {
    width: 22rem;
  }

  input {
    margin: 5px 0 15px;
    width: 3rem;
    border: none;
    border-bottom: 1px solid lightgray;
    background: none;
    text-align: center;
    font-size: 2rem;
    transition: border-color 0.3s;
    -moz-appearance: textfield;
  }

  input:hover,
  input:focus {
    border-color: gray;
  }

  input::-webkit-inner-spin-button,
  input::-webkit-outer-spin-button {
    display: none;
  }

  @media (max-width: 560px) {
    h1 {
      font-size: 10vw;
    }

    form,
    div {
      font-size: 5vw;
    }

    input {
      width: 10vw;
      font-size: 8vw;
    }

    input[type='text'] {
      width: 80vw;
    }
  }
</style>

{#if playing}
  <div>
    <Button
      on:click={() => {
        playing = false
        seed = rand.nextString(16)
      }}>
      New game
    </Button>
    <Board {width} {height} {mines} {seed} />
  </div>
{:else}
  <a href="https://github.com/RedHatter/minesweeper" target="_blank" />
  <form on:submit={() => (playing = true)}>
    <h1>Minesweeper</h1>
    Play
    <input type="number" bind:value={width} />
    by
    <input type="number" bind:value={height} />
    with
    <input type="number" bind:value={mines} />
    mines and a seed of
    <input type="text" bind:value={seed} />
    &nbsp;&nbsp;
    <Button type="submit" {disabled}>Begin</Button>
    {#if disabled}
      <br />
      Too many mines.
    {/if}
  </form>
{/if}
