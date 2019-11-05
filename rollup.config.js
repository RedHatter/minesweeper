import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'

export default {
  input: 'src/index.js',
  output: {
    file: 'public/bundle.js',
    format: 'iife'
  },
  plugins: [
    svelte({
      dev: true,
      css: css => css.write('public/bundle.css')
    }),
    resolve()
  ]
}
