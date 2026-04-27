<script>
import chatStore from '@/store/chat'
import notificationService from '@/services/notification'
import { clearSession, getSavedSession } from '@/services/storage'

function applyStatusBarHeightVar() {
	// #ifdef APP-PLUS
	try {
		const info = uni.getSystemInfoSync ? uni.getSystemInfoSync() : null
		const statusBarHeight = Number(info && info.statusBarHeight) || 0
		if (typeof document !== 'undefined' && document.documentElement) {
			document.documentElement.style.setProperty('--status-bar-height', `${statusBarHeight}px`)
		}
		if (typeof document !== 'undefined' && document.body) {
			document.body.style.setProperty('--status-bar-height', `${statusBarHeight}px`)
		}
	} catch (error) {}
	// #endif

	// #ifndef APP-PLUS
	try {
		if (typeof document !== 'undefined' && document.documentElement) {
			document.documentElement.style.setProperty('--status-bar-height', '0px')
		}
		if (typeof document !== 'undefined' && document.body) {
			document.body.style.setProperty('--status-bar-height', '0px')
		}
	} catch (error) {}
	// #endif
}

export default {
	async onLaunch() {
		applyStatusBarHeightVar()
		notificationService.initialize()
		const session = getSavedSession()
		const hasValidToken = !!session.token && (!session.tokenExpiresAt || session.tokenExpiresAt > Date.now())
		if (!hasValidToken) {
			clearSession({ clearCredentials: false })
			uni.reLaunch({
				url: '/pages/login/index'
			})
			return
		}
		chatStore.bootstrapSession()
	},
	onShow() {
		applyStatusBarHeightVar()
		if (chatStore.state.auth.token && chatStore.state.status !== 'connected' && chatStore.state.status !== 'connecting') {
			chatStore.connectSocket(true).catch(() => {})
		}
		if (chatStore.state.auth.token && chatStore.state.status === 'connected') {
			chatStore.requestAgents().catch(() => {})
		}
		if (chatStore.state.auth.token) {
			chatStore.refreshDownloadTokenIfNeeded().catch(() => {})
		}
	},
	onHide() {}
}
</script>

<style lang="scss">
page,
body,
uni-page-body {
	overscroll-behavior: none;
	overscroll-behavior-y: none;
	background: #f4f8fc;
	color: #0f172a;
}

view,
scroll-view,
swiper,
button,
input,
textarea,
text {
	box-sizing: border-box;
}

button::after {
	border: none;
}

image {
	display: block;
}

::-webkit-scrollbar {
	display: none;
	width: 0;
	height: 0;
}

.app-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 80rpx;
	padding: 0 24rpx;
	border-radius: 22rpx;
	background: linear-gradient(135deg, #60a5fa, #2563eb);
	color: #ffffff;
	font-size: 26rpx;
	font-weight: 700;
}

.app-btn--secondary {
	background: #eef6ff;
	color: #2563eb;
	box-shadow: none;
}

.app-btn--danger {
	background: #fee2e2;
	color: #dc2626;
	box-shadow: none;
}

.app-btn--disabled {
	opacity: 0.45;
	pointer-events: none;
}
</style>
