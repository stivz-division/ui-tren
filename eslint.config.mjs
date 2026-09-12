import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['.agents/**', '.codex/**', '.worktrees/**'],
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)
