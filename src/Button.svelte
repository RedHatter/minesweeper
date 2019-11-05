<script>
  export let type = 'text'
  export let checked
  export let disabled
</script>

<style>
  label span,
  button {
    margin: 5px;
    padding: 2px 12px;
    border: 1px solid gray;
    border-radius: 2px;
    background: transparent;
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  button:hover,
  label:hover span,
  input:checked + span {
    background-color: lightgray;
  }

  button:disabled {
    border-color: currentColor;
    background: none;
    cursor: default;
  }

  input {
    display: none;
  }
</style>

{#if type == 'checkbox'}
  <label>
    <input type="checkbox" bind:checked {disabled} />
    <span>
      <slot />
    </span>
  </label>
{:else}
  <button on:click {disabled}>
    <slot />
  </button>
{/if}
