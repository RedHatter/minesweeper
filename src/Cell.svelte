<script>
  import { MINE, FLAG } from './symbols.js'
  export let value
  export let flag
</script>

<style>
  button {
    position: relative;
    padding: 0;
    width: 30px;
    border: 1px solid lightgrey;
    border-right: none;
    border-bottom: none;
    background-color: rgb(245, 246, 247);
    font-weight: bold;
    cursor: pointer;
  }

  button::before {
    position: absolute;
    top: 50%;
    display: block;
    width: 100%;
    background-position: center;
    background-size: 60%;
    background-repeat: no-repeat;
    content: attr(data-value);
    transform: translateY(-50%);
  }

  button::after {
    display: block;
    padding-bottom: 100%;
    width: 100%;
    content: '';
  }

  button:hover {
    background-color: white;
  }

  button:last-child {
    border-right: 1px solid lightgrey;
  }

  button:disabled {
    border: 1px solid #afafaf;
    border-right: none;
    border-bottom: none;
    background-color: #bdbdbd;
    cursor: default;
  }

  button[data-value='1'] {
    color: #2233f5;
  }

  button[data-value='2'] {
    color: #047606;
  }

  button[data-value='3'] {
    color: #fc0411;
  }

  button[data-value='4'] {
    color: #000277;
  }

  button[data-value='5'] {
    color: #872f33;
  }

  button[data-value='6'] {
    color: #317261;
  }

  button[data-value='8'] {
    color: #777777;
  }

  button[data-value='\*']::before {
    height: 100%;
    background-image: url('data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4NC42IDg0LjYiIHg9IjBweCIgeT0iMHB4Ij48dGl0bGU+Ym9zcy1pY29ucy1saW55LWV4cG9ydDwvdGl0bGU+PHBhdGggZD0iTTgyLjEsMzkuOEg3MC44OGEyOC41MywyOC41MywwLDAsMC02LjYtMTZsMi41NC0yLjUzYTIuNSwyLjUsMCwxLDAtMy41NC0zLjUzbC0yLjUzLDIuNTNhMjguNTMsMjguNTMsMCwwLDAtMTYtNi42VjIuNWEyLjUsMi41LDAsMCwwLTUsMFYxMy43MWEyOC40NywyOC40NywwLDAsMC0xNS45NCw2LjYxbC0yLjUzLTIuNTNhMi41LDIuNSwwLDAsMC0zLjU0LDMuNTNsMi41NCwyLjU0QTI4LjQ3LDI4LjQ3LDAsMCwwLDEzLjcyLDM5LjhIMi41YTIuNSwyLjUsMCwwLDAsMCw1SDEzLjcyYTI4LjY4LDI4LjY4LDAsMCwwLDYuNiwxNS45NGwtMi41MywyLjUzYTIuNTIsMi41MiwwLDAsMCwwLDMuNTQsMi41MSwyLjUxLDAsMCwwLDMuNTQsMGwyLjUzLTIuNTNhMjguNjgsMjguNjgsMCwwLDAsMTUuOTQsNi42VjgyLjFhMi41LDIuNSwwLDAsMCw1LDBWNzAuODhhMjguNDcsMjguNDcsMCwwLDAsMTUuOTQtNi42MWwyLjU0LDIuNTRhMi40OSwyLjQ5LDAsMCwwLDEuNzcuNzMsMi40NSwyLjQ1LDAsMCwwLDEuNzYtLjczLDIuNSwyLjUsMCwwLDAsMC0zLjU0bC0yLjUzLTIuNTNBMjguNDcsMjguNDcsMCwwLDAsNzAuODksNDQuOEg4Mi4xYTIuNSwyLjUsMCwwLDAsMC01Wm0tNDIuNzUtNGE1LjkyLDUuOTIsMCwwLDEtMy41NywzLjUsNS44MSw1LjgxLDAsMCwxLTIsLjM3LDYsNiwwLDAsMS02LTYsNS44Myw1LjgzLDAsMCwxLC4zNy0yQTUuOTEsNS45MSwwLDAsMSwzMS41NywyOGE1Ljc2LDUuNzYsMCwwLDEsMi4xNi0uNDEsNiw2LDAsMCwxLDYsNkE1Ljc2LDUuNzYsMCwwLDEsMzkuMzUsMzUuODFaIj48L3BhdGg+PC9zdmc+');
    content: '';
  }

  button[data-value='!']::before {
    height: 100%;
    background-image: url('data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGc+PHBhdGggZD0iTTgxLjM0NywzMi4zNDljLTcuNjY4LDAtNDUuNTQ3LTE1LjI3Ny01Ni4yNC0yMi40NDhjLTAuMjAyLTEuMTY1LTEuMDMyLTIuMTEtMi4xMjgtMi40ODhWNy4wNjEgICBDMjIuOTc5LDUuOTIzLDIyLjA1Niw1LDIwLjkxOCw1Yy0xLjEzOCwwLTIuMDYxLDAuOTIzLTIuMDYxLDIuMDYxdjAuMzI2Yy0xLjMwNSwwLjQxMS0yLjI2NSwxLjYyMi0yLjI2NSwzLjA1OHYwICAgYzAsMS40MzcsMC45NiwyLjY0NywyLjI2NSwzLjA1OHY0Mi42OTVjLTEuMjYzLDAuNDM2LTIuMTgzLDEuNjI2LTIuMTgzLDMuMDMzYzAsMS40MDcsMC45MiwyLjU5NywyLjE4MywzLjAzM3YzMC42NzQgICBjMCwxLjEzOCwwLjkyMywyLjA2MSwyLjA2MSwyLjA2MWMxLjEzOCwwLDIuMDYxLTAuOTIzLDIuMDYxLTIuMDYxVjYyLjI5MWMxLjMwNS0wLjQxMSwyLjI2NS0xLjYyMiwyLjI2NS0zLjA1OCAgIGMwLTAuMTMtMC4wMjMtMC4yNTQtMC4wMzktMC4zOGMxMC44MjgtNy4xOTksNDguNDk3LTIyLjM4MSw1Ni4xNDItMjIuMzgxYzEuMTM4LDAsMi4wNjEtMC45MjMsMi4wNjEtMi4wNjEgICBTODIuNDg1LDMyLjM0OSw4MS4zNDcsMzIuMzQ5eiBNMjIuOTc5LDE0LjQ5OWMyLjI5Myw0LjA2OCwzLjczNiwxMS40NjcsMy43MzYsMTkuOTExcy0xLjQ0MywxNS44NDMtMy43MzYsMTkuOTExVjE0LjQ5OXoiPjwvcGF0aD48L2c+PC9zdmc+');
    content: '';
  }

  button.valid:disabled {
    background-color: lightgray;
  }

  button.invalid:disabled {
    background-color: lightpink;
  }
</style>

{#if value === false}
  <button data-value={flag} on:click on:mouseenter />
{:else}
  <button
    class={flag !== FLAG ? '' : value === MINE ? 'valid' : 'invalid'}
    data-value={flag || value}
    disabled />
{/if}
