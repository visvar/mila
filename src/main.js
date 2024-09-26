import './app.css'
import App from './App.svelte'
import '@fontsource/noto-sans'
import '@fontsource/noto-music'
import '@fontsource/noto-sans-symbols'
import '@fontsource/noto-sans-symbols-2'

const app = new App({
  target: document.getElementById('app')
})

export default app
