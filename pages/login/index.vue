<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="login-page">
		<view class="hero-card">
			<text class="hero-title">ChatClaw</text>
			<text class="hero-subtitle">通过 ChatClaw 快速连接你的智能体助手。</text>
		</view>
		<view class="form-card">
			<text class="section-title">账号登录</text>
			<text class="section-subtitle">连接服务器后即可进入会话与聊天。</text>
			<view class="field">
				<text class="field-label">服务器 IP</text>
				<input class="field-input" type="text" v-model="form.serverUrl" placeholder="127.0.0.1" />
			</view>
			<view class="field">
				<text class="field-label">用户名</text>
				<input class="field-input" type="text" v-model="form.username" placeholder="请输入用户名" />
			</view>
			<view class="field">
				<text class="field-label">密码</text>
				<input class="field-input" password v-model="form.password" placeholder="请输入密码" />
			</view>
			<button class="login-button" :disabled="loading" @tap="submit">
				{{ loading ? '登录中...' : '登录' }}
			</button>
			<view v-if="errorMessage" class="error-card">
				<text class="error-text">{{ errorMessage }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import chatStore from '@/store/chat'

export default {
	data() {
		return {
			loading: false,
			errorMessage: '',
			form: {
				serverUrl: '127.0.0.1',
				username: '',
				password: ''
			}
		}
	},
	onLoad() {
		const saved = chatStore.getCredentials()
		this.form.serverUrl = saved.serverUrl || '127.0.0.1'
		this.form.username = saved.username || ''
		this.form.password = saved.password || ''
	},
	methods: {
		async submit() {
			if (!this.form.serverUrl || !this.form.username || !this.form.password) {
				this.errorMessage = '请填写服务器 IP、用户名和密码'
				return
			}
			this.loading = true
			this.errorMessage = ''
			try {
				await chatStore.login(this.form.serverUrl, this.form.username, this.form.password)
				uni.switchTab({
					url: '/pages/session/index'
				})
			} catch (error) {
				this.errorMessage = error.message || '登录失败，请稍后重试'
			} finally {
				this.loading = false
			}
		}
	}
}
</script>

<style lang="scss">
.login-page {
	position: fixed;
	inset: 0;
	overflow: hidden;
	padding: calc(32rpx + var(--status-bar-height)) 28rpx 40rpx;
	background: linear-gradient(180deg, #e0f2fe 0%, #f8fbff 72%);
}

.hero-card {
	padding: 40rpx;
	border-radius: 42rpx;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	box-shadow: 0 32rpx 60rpx rgba(96, 165, 250, 0.24);
}

.hero-badge {
	display: inline-flex;
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.16);
	color: #ffffff;
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
}

.hero-title {
	display: block;
	font-size: 58rpx;
	font-weight: 800;
	color: #ffffff;
}

.hero-subtitle {
	display: block;
	margin-top: 18rpx;
	font-size: 28rpx;
	line-height: 1.7;
	color: rgba(255, 255, 255, 0.95);
}

.form-card {
	margin-top: 34rpx;
	padding: 34rpx 30rpx;
	border-radius: 38rpx;
	background: rgba(255, 255, 255, 0.94);
	border: 2rpx solid #d9e7f5;
	box-shadow: 0 26rpx 52rpx rgba(15, 23, 42, 0.06);
}

.section-title {
	display: block;
	font-size: 42rpx;
	font-weight: 800;
	color: #0f172a;
}

.section-subtitle {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	color: #64748b;
}

.field {
	margin-top: 26rpx;
}

.field-label {
	display: block;
	margin-bottom: 14rpx;
	font-size: 24rpx;
	font-weight: 700;
	color: #334155;
}

.field-input {
	height: 92rpx;
	padding: 0 28rpx;
	border-radius: 24rpx;
	background: #ffffff;
	border: 2rpx solid #d9e7f5;
	font-size: 30rpx;
	color: #0f172a;
}

.login-button {
	height: 94rpx;
	line-height: 94rpx;
	margin-top: 30rpx;
	border: none;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	color: #ffffff;
	font-size: 32rpx;
	font-weight: 800;
	box-shadow: 0 20rpx 40rpx rgba(96, 165, 250, 0.24);
}

.login-button[disabled] {
	opacity: 0.6;
}

.error-card {
	margin-top: 22rpx;
	padding: 22rpx;
	border-radius: 24rpx;
	background: #fef2f2;
	border: 2rpx solid #fecaca;
}

.error-text {
	font-size: 26rpx;
	line-height: 1.6;
	color: #b91c1c;
}
</style>
