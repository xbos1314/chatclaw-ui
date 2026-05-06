<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="chat-page">
		<view class="chat-header">
			<view class="chat-header__left" @tap="goBack">
				<image class="back-icon" src="/static/svg/left-black.svg" mode="aspectFit"></image>
			</view>
			<view class="chat-header__center">
				<view class="chat-header__title-row">
					<text class="chat-title">{{ selectedName }}</text>
					<text v-if="selectedId && !typing" class="chat-id">{{ selectedId }}</text>
					<text v-if="typing" class="typing-text">正在输入...</text>
				</view>
			</view>
			<view class="chat-header__right">
				<image class="clear-icon" src="/static/svg/delete.svg" mode="aspectFit" @tap="clearMessages"></image>
				<connection-chip :status="store.status"></connection-chip>
			</view>
		</view>
		<scroll-view
			class="chat-scroll"
			:style="{ top: `${headerHeight}px`, bottom: `${composerHeight}px` }"
			scroll-y
			:scroll-top="scrollTop"
			:scroll-into-view="scrollIntoViewId"
			upper-threshold="0"
			@scrolltoupper="loadMore"
			@scroll="handleScroll"
		>
			<view class="chat-list">
				<view v-if="displayMessages.length && showHistoryLoading" class="load-more-row">
					<text class="load-more-text">加载中...</text>
				</view>
				<view v-if="loadingHistory && !displayMessages.length" class="state-card">
					<text class="state-text">正在加载...</text>
				</view>
				<view v-else-if="!displayMessages.length" class="state-card">
					<text class="state-text">开始和 {{ selectedId || '智能体' }} 聊天吧</text>
				</view>
				<view
					v-for="message in displayMessages"
					:key="message.id"
					:id="getMessageAnchorId(message.id)"
					class="message-item"
				>
					<message-bubble
						:message="message"
						:agent-avatar="agentAvatar"
						:user-avatar="userAvatar"
						:full-url="resolveFileUrl(message)"
						@message-longpress="onMessageLongPress"
					></message-bubble>
				</view>
			</view>
		</scroll-view>
		<view class="chat-composer-host">
			<chat-composer @message-sent="scrollToLatestMessage" @layout-change="updateLayoutMetrics"></chat-composer>
		</view>
		<confirm-dialog
			:visible="confirmDialog.visible"
			:title="confirmDialog.title"
			:message="confirmDialog.message"
			:confirm-text="confirmDialog.confirmText"
			:cancel-text="confirmDialog.cancelText"
			:danger="confirmDialog.danger"
			@cancel="closeConfirmDialog"
			@confirm="handleConfirmDialog"
		></confirm-dialog>
	</view>
</template>

<script>
import ChatComposer from '@/components/chat-composer.vue'
import ConfirmDialog from '@/components/confirm-dialog.vue'
import ConnectionChip from '@/components/connection-chip.vue'
import MessageBubble from '@/components/message-bubble.vue'
import { getMessageTextContent } from '@/common/chat'
import chatStore from '@/store/chat'

const LOAD_MORE_REARM_OFFSET = 140

export default {
	components: {
		ChatComposer,
		ConfirmDialog,
		ConnectionChip,
		MessageBubble
	},
	data() {
		return {
			store: chatStore.state,
			scrollTop: 999999,
			scrollIntoViewId: '',
			headerHeight: 88,
			composerHeight: 96,
			skipNextAutoScroll: false,
			lastScrollTop: 0,
			lastScrollHeight: 0,
			showHistoryLoading: false,
			waitForLeaveTopBeforeLoad: false,
			confirmDialog: {
				visible: false,
				title: '',
				message: '',
				confirmText: '确认',
				cancelText: '取消',
				danger: false,
				action: ''
			}
		}
	},
	computed: {
		selectedId() {
			return this.store.selectedAgentId
		},
		selectedName() {
			return this.store.selectedAgentName || '聊天'
		},
		typing() {
			return !!this.store.typingByAgent[this.store.selectedAgentId]
		},
		agentAvatar() {
			return chatStore.getFullUrl(this.store.selectedAgentAvatar)
		},
		userAvatar() {
			return chatStore.getFullUrl(this.store.auth.avatarUrl)
		},
		displayMessages() {
			return chatStore.getDisplayedMessages().slice().reverse()
		},
		loadingHistory() {
			return !!this.store.loadingMoreByAgent[this.store.selectedAgentId]
		},
		canLoadMore() {
			return !!this.store.hasMoreByAgent[this.store.selectedAgentId]
		}
	},
	async onLoad(options) {
		if (!this.store.auth.token) {
			const hasSession = await chatStore.bootstrapSession()
			if (!hasSession) {
				uni.reLaunch({
					url: '/pages/login/index'
				})
				return
			}
		}
		if (options && options.agentId) {
			const agentId = decodeURIComponent(options.agentId)
			if (this.store.selectedAgentId !== agentId) {
				if (!this.store.agents.length) {
					await chatStore.requestAgents()
				}
				await chatStore.selectAgent(agentId)
			}
		}
		await this.$nextTick()
		this.updateLayoutMetrics()
		this.scrollToLatestMessage()
	},
	onShow() {
		this.$nextTick(() => {
			this.updateLayoutMetrics()
		})
	},
	onHide() {
		uni.$emit('chat-audio-stop')
	},
	onUnload() {
		uni.$emit('chat-audio-stop')
		chatStore.deselectAgent()
	},
	watch: {
		displayMessages() {
			if (this.loadingHistory || this.skipNextAutoScroll) {
				this.skipNextAutoScroll = false
				return
			}
			this.$nextTick(() => {
				this.scrollToLatestMessage()
			})
		}
	},
	methods: {
		getMessageAnchorId(messageId) {
			return `chat-message-anchor-${messageId}`
		},
		getMessageText(message) {
			return getMessageTextContent(message)
		},
		goBack() {
			chatStore.deselectAgent()
			uni.navigateBack()
		},
		scrollToLatestMessage() {
			const latestMessage = this.displayMessages[this.displayMessages.length - 1]
			if (!latestMessage || !latestMessage.id) {
				return
			}
			this.$nextTick(() => {
				this.scrollIntoViewId = ''
				this.$nextTick(() => {
					this.scrollIntoViewId = this.getMessageAnchorId(latestMessage.id)
				})
			})
		},
		updateLayoutMetrics() {
			const query = uni.createSelectorQuery().in(this)
			query.select('.chat-header').boundingClientRect()
			query.select('.chat-composer-host').boundingClientRect()
			query.exec(results => {
				const headerRect = results && results[0]
				const composerRect = results && results[1]
				if (headerRect && headerRect.height) {
					this.headerHeight = Number(headerRect.height || this.headerHeight)
				}
				if (composerRect && composerRect.height) {
					this.composerHeight = Number(composerRect.height || this.composerHeight)
				}
			})
		},
		handleScroll(event) {
			const detail = event && event.detail ? event.detail : {}
			this.lastScrollTop = Number(detail.scrollTop || 0)
			this.lastScrollHeight = Number(detail.scrollHeight || 0)
			if (this.waitForLeaveTopBeforeLoad && this.lastScrollTop > LOAD_MORE_REARM_OFFSET) {
				this.waitForLeaveTopBeforeLoad = false
			}
		},
		getChatListHeight() {
			return new Promise(resolve => {
				const query = uni.createSelectorQuery().in(this)
				query.select('.chat-list').boundingClientRect()
				query.exec(results => {
					const rect = results && results[0]
					resolve(rect ? Number(rect.height || 0) : 0)
				})
			})
		},
		resolveFileUrl(message) {
			return chatStore.getFullUrl(message.fileUrl)
		},
		async loadMore() {
			if (this.loadingHistory || this.showHistoryLoading || !this.canLoadMore || this.waitForLeaveTopBeforeLoad) {
				return
			}
			try {
				this.showHistoryLoading = true
				this.waitForLeaveTopBeforeLoad = true
				const previousHeight = await this.getChatListHeight()
				const previousTop = this.lastScrollTop
				this.skipNextAutoScroll = true
				await chatStore.loadMoreMessages()
				await new Promise(resolve => this.$nextTick(resolve))
				const nextHeight = await this.getChatListHeight()
				const heightDelta = Math.max(0, nextHeight - previousHeight)
				if (heightDelta > 0) {
					this.scrollTop = Math.max(0, previousTop + heightDelta)
					await new Promise(resolve => this.$nextTick(resolve))
				}
				this.showHistoryLoading = false
			} catch (error) {
				this.showHistoryLoading = false
				this.skipNextAutoScroll = false
				uni.showToast({
					title: error.message || '加载失败',
					icon: 'none'
				})
			}
		},
		clearMessages() {
			this.confirmDialog = {
				visible: true,
				title: '清空聊天记录',
				message: '确定要清空当前智能体的所有聊天记录吗？此操作不可恢复。',
				confirmText: '确认清空',
				cancelText: '取消',
				danger: true,
				action: 'clearMessages'
			}
		},
		closeConfirmDialog() {
			this.confirmDialog = Object.assign({}, this.confirmDialog, {
				visible: false,
				action: ''
			})
		},
		async handleConfirmDialog() {
			const action = this.confirmDialog.action
			this.closeConfirmDialog()
			if (action !== 'clearMessages') {
				return
			}
			await chatStore.clearCurrentMessages()
			uni.showToast({
				title: '聊天记录已清空',
				icon: 'none'
			})
		},
		onMessageLongPress(message) {
			uni.showActionSheet({
				itemList: ['复制文本', '删除消息'],
				success: async result => {
					if (result.tapIndex === 0) {
						const text = this.getMessageText(message)
						if (!text) {
							uni.showToast({
								title: '当前消息不可复制',
								icon: 'none'
							})
							return
						}
						uni.setClipboardData({
							data: text
						})
					}
					if (result.tapIndex === 1) {
						await chatStore.removeMessage(message)
					}
				}
			})
		}
	}
}
</script>

<style lang="scss">
.chat-page {
	position: fixed;
	inset: 0;
	background: #f3f4f6;
	overflow: hidden;
}

.chat-header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 12;
	display: flex;
	align-items: center;
	padding: calc(18rpx + var(--status-bar-height)) 20rpx 16rpx;
	background: #ffffff;
	backdrop-filter: blur(18rpx);
	border-bottom: 2rpx solid rgba(217, 231, 245, 0.85);
}

.chat-header__left {
	width: 56rpx;
	height: 56rpx;
	border-radius: 18rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-icon {
	width: 40rpx;
	height: 40rpx;
}

.chat-header__center {
	flex: 1;
	min-width: 0;
	margin: 0 18rpx;
}

.chat-header__title-row {
	display: flex;
	align-items: center;
}

.chat-title {
	font-size: 34rpx;
	font-weight: 800;
	color: #0f172a;
}

.chat-id {
	margin-left: 12rpx;
	font-size: 24rpx;
	color: #64748b;
}

.typing-text {
	margin-left: 12rpx;
	font-size: 26rpx;
	color: #60a5fa;
}

.chat-header__right {
	display: flex;
	align-items: center;
}

.clear-icon {
	width: 36rpx;
	height: 36rpx;
	margin-right: 16rpx;
}

.chat-scroll {
	position: fixed;
	left: 0;
	right: 0;
	overflow: hidden;
}

.chat-list {
	display: flex;
	flex-direction: column;
	padding: 24rpx 20rpx;
	padding-bottom: 40rpx;
	box-sizing: border-box;
}

.chat-composer-host {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 12;
}

.state-card {
	margin-top: 80rpx;
	padding: 44rpx 30rpx;
	text-align: center;
}

.state-text {
	font-size: 28rpx;
	color: #64748b;
}

.load-more-row {
	text-align: center;
	margin-bottom: 22rpx;
}

.load-more-text {
	font-size: 24rpx;
	color: #64748b;
}
</style>
