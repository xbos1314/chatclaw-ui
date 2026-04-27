import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
import chatStore from './store/chat'
Vue.config.productionTip = false
Vue.prototype.$chat = chatStore
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import chatStore from './store/chat'
export function createApp() {
	const app = createSSRApp(App)
	app.config.globalProperties.$chat = chatStore
	return {
		app
	}
}
// #endif
