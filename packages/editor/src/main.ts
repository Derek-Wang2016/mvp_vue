import '@fontsource/share-tech-mono'
import '@fontsource/dseg7-classic/latin-400.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
