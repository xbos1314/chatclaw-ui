<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="session-page">
		<view class="session-header">
			<view>
				<text class="page-title">会话</text>
			</view>
			<connection-chip :status="store.status"></connection-chip>
		</view>
		<scroll-view
			class="session-scroll"
			scroll-y
			refresher-enabled
			:refresher-triggered="refreshing"
			refresher-background="#F4F8FC"
			refresher-threshold="90"
			@refresherrefresh="handleRefresh"
		>
			<view class="session-body">
				<view v-if="!agents.length && !store.refreshingAgents" class="empty-card">
					<view class="empty-icon">AI</view>
					<text class="empty-title">暂无可用智能体</text>
					<text class="empty-subtitle">下拉刷新后重新获取智能体信息</text>
				</view>
				<view v-for="agent in agents" :key="agent.id" class="agent-card" @tap="openChat(agent)">
					<view class="agent-avatar">
						<image v-if="agentAvatar(agent)" class="agent-avatar__image" :src="agentAvatar(agent)" mode="aspectFill"></image>
						<text v-else class="agent-avatar__text">AI</text>
						<view v-if="unreadCount(agent.id)" class="agent-badge">
							<text class="agent-badge__text">{{ unreadCount(agent.id) > 99 ? '99+' : unreadCount(agent.id) }}</text>
						</view>
					</view>
					<view class="agent-copy">
						<view class="agent-row">
							<text class="agent-name">{{ agent.name }}</text>
							<text class="agent-id">{{ agent.id }}</text>
						</view>
						<view class="agent-row agent-row--secondary">
							<text class="agent-preview" :class="{ 'agent-preview--typing': isTyping(agent.id), 'agent-preview--unread': latestMessage(agent.id) && latestMessage(agent.id).isRead === false }">
								{{ isTyping(agent.id) ? `${agent.id} 正在输入...` : preview(agent) }}
							</text>
							<text class="agent-time">{{ previewTime(agent.id) }}</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import ConnectionChip from '@/components/connection-chip.vue'
import chatStore from '@/store/chat'
import { formatSessionTime, getMessagePreview } from '@/common/chat'

export default {
	components: {
		ConnectionChip
	},
	data() {
		return {
			store: chatStore.state,
			refreshing: false
		}
	},
	computed: {
		agents() {
			return this.store.agents || []
		}
	},
	async onShow() {
		if (!this.store.auth.token) {
			return
		}
		await this.refreshAgents()
	},
	methods: {
		async handleRefresh() {
			if (this.refreshing) {
				return
			}
			this.refreshing = true
			try {
				await this.refreshAgents()
			} finally {
				this.refreshing = false
			}
		},
		async refreshAgents() {
			try {
				await chatStore.requestAgents()
			} catch (error) {
				uni.showToast({
					title: error.message || '加载会话失败',
					icon: 'none'
				})
			}
		},
		latestMessage(agentId) {
			return this.store.latestMessages[agentId] || null
		},
		unreadCount(agentId) {
			return Number(this.store.unreadByAgent[agentId] || 0)
		},
		isTyping(agentId) {
			return !!this.store.typingByAgent[agentId]
		},
		preview(agent) {
			return getMessagePreview(this.latestMessage(agent.id), agent.description || '暂无消息')
		},
		previewTime(agentId) {
			const latest = this.latestMessage(agentId)
			return latest ? formatSessionTime(latest.timestamp) : ''
		},
		agentAvatar(agent) {
			return chatStore.getFullUrl(agent.avatar)
		},
		async openChat(agent) {
			await chatStore.selectAgent(agent)
			uni.navigateTo({
				url: `/pages/chat/index?agentId=${encodeURIComponent(agent.id)}`
			})
		},
		async logout() {
			await chatStore.logout()
			uni.reLaunch({
				url: '/pages/login/index'
			})
		}
	}
}
</script>

<style lang="scss">
.session-page {
	position: fixed;
	inset: 0;
	height: 100%;
	display: flex;
	flex-direction: column;
	background: linear-gradient(180deg, #f4f8fc 0%, #f8fbff 100%);
	overflow: hidden;
}

.session-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding-left: 24rpx;
	padding-right: 24rpx;
	padding-top: calc(28rpx + var(--status-bar-height));
	padding-bottom: 20rpx;
	background: #ffffff;
	flex-shrink: 0;
}

.page-title {
	display: block;
	font-size: 42rpx;
	font-weight: 800;
	color: #0f172a;
}

.session-scroll {
	flex: 1;
	height: 100%;
	min-height: 0;
}

.session-body {
	padding: 0 24rpx calc(120rpx + env(safe-area-inset-bottom));
	padding-top: 24rpx;
	box-sizing: border-box;
}

.empty-card,
.agent-card {
	background: linear-gradient(135deg, #eef6ff, #f8fbff);
	border: 2rpx solid #d6e8ff;
	border-radius: 34rpx;
}

.empty-card {
	margin-top: 18rpx;
	padding: 72rpx 40rpx;
	text-align: center;
}

.empty-icon {
	width: 132rpx;
	height: 132rpx;
	margin: 0 auto;
	border-radius: 36rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	color: #ffffff;
	font-size: 36rpx;
	font-weight: 800;
}

.empty-title {
	display: block;
	margin-top: 30rpx;
	font-size: 34rpx;
	font-weight: 800;
	color: #0f172a;
}

.empty-subtitle {
	display: block;
	margin-top: 14rpx;
	font-size: 26rpx;
	color: #64748b;
}

.agent-card {
	background: #ffffff;
	display: flex;
	align-items: center;
	padding: 26rpx;
	margin-bottom: 18rpx;
}

.agent-avatar {
	position: relative;
	width: 104rpx;
	height: 104rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	flex-shrink: 0;
}

.agent-avatar__image {
	width: 100%;
	height: 100%;
	border-radius: 50%;
}

.agent-avatar__text {
	font-size: 34rpx;
	font-weight: 800;
	color: #ffffff;
}

.agent-badge {
	position: absolute;
	top: -8rpx;
	right: -8rpx;
	min-width: 40rpx;
	height: 40rpx;
	padding: 0 10rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #ef4444;
}

.agent-badge__text {
	font-size: 20rpx;
	font-weight: 700;
	color: #ffffff;
}

.agent-copy {
	flex: 1;
	min-width: 0;
	margin-left: 20rpx;
}

.agent-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.agent-row--secondary {
	margin-top: 10rpx;
	align-items: flex-start;
}

.agent-name {
	flex: 1;
	min-width: 0;
	font-size: 32rpx;
	font-weight: 800;
	color: #0f172a;
}

.agent-id {
	margin-left: 16rpx;
	font-size: 22rpx;
	color: #64748b;
}

.agent-preview {
	flex: 1;
	min-width: 0;
	font-size: 26rpx;
	line-height: 1.45;
	color: #64748b;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.agent-preview--typing {
	color: #2563eb;
}

.agent-preview--unread {
	color: #c2410c;
}

.agent-time {
	margin-left: 16rpx;
	font-size: 22rpx;
	color: #94a3b8;
}

.ghost-button {
	height: 80rpx;
	line-height: 80rpx;
	border-radius: 999rpx;
	border: 2rpx solid #d6e8ff;
	background: #ffffff;
	color: #2563eb;
	font-size: 28rpx;
	font-weight: 700;
}

.ghost-button--danger {
	color: #dc2626;
}

.ghost-button--full {
	width: 100%;
}
</style>
