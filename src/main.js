import { createApp } from 'vue'
import { Quasar, Notify, Dialog, Loading, Dark } from 'quasar'
import { createPinia } from 'pinia'
import VueApexCharts from 'vue3-apexcharts'

import router from './router'
import App from './App.vue'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './styles/global.css'

const app = createApp(App)

app.use(Quasar, {
  plugins: { Notify, Dialog, Loading },
  config: {
    notify: {
      position: 'top-right',
      timeout: 3000
    }
  }
})


app.use(createPinia())
app.use(router)
app.use(VueApexCharts)
app.mount('#app')

if (localStorage.getItem('darkMode') === 'true') {
  Dark.set(true)
}
