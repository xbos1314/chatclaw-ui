<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="detail-page">
		<view class="detail-header">
			<view class="detail-back" @tap="goBack">
				<image class="detail-back__icon" src="/static/svg/left-black.svg" mode="aspectFit"></image>
			</view>
			<text class="detail-title">备忘详情</text>
			<view class="detail-actions">
				<view class="detail-icon-button" @tap="deleteMemo">
					<image class="detail-icon-button__icon" src="/static/svg/delete-red.svg" mode="aspectFit"></image>
				</view>
			</view>
		</view>
		<scroll-view class="detail-scroll" scroll-y>
			<view v-if="loading" class="detail-state">正在加载...</view>
			<view v-else-if="memo" class="detail-body">
				<view class="detail-card">
					<text class="detail-card__title">{{ memo.title || '未命名备忘' }}</text>
					<text class="detail-card__meta">{{ formatTime(memo.updatedAt) }}</text>
					<text class="detail-card__summary">{{ memo.summary || '暂无摘要' }}</text>
				</view>

				<view class="detail-card">
					<view class="voice-row">
						<view class="voice-button" @tap="toggleVoice">
							<image class="voice-button__icon" :src="playing ? '/static/svg/pause.svg' : '/static/svg/play.svg'" mode="aspectFit"></image>
						</view>
						<view class="voice-copy">
							<text class="voice-copy__title">原始语音</text>
							<text class="voice-copy__desc">{{ memo.voiceUrl || '无语音文件' }}</text>
						</view>
					</view>
				</view>

				<view class="detail-card">
					<text class="section-title">正文</text>
					<markdown-preview class="section-content" :content="memo.content || memo.originalText || '暂无内容'"></markdown-preview>
				</view>

				<view v-if="memo.keywords && memo.keywords.length" class="detail-card">
					<text class="section-title">关键词</text>
					<view class="keyword-wrap">
						<text v-for="keyword in memo.keywords" :key="keyword" class="keyword-chip">{{ keyword }}</text>
					</view>
				</view>

			</view>
		</scroll-view>
		<confirm-dialog
			:visible="confirmDialog.visible"
			:title="confirmDialog.title"
			:message="confirmDialog.message"
			:confirm-text="confirmDialog.confirmText"
			:danger="confirmDialog.danger"
			@cancel="closeConfirmDialog"
			@confirm="handleConfirmDialog"
		></confirm-dialog>
	</view>
</template>

<script>
import ConfirmDialog from '@/components/confirm-dialog.vue'
import chatStore from '@/store/chat'
import MarkdownPreview from '@/components/markdown-preview.vue'
import { workspaceService } from '@/services/workspace'

export default {
	components: {
		ConfirmDialog,
		MarkdownPreview
	},
	data() {
		return {
			id: '',
			loading: true,
			memo: null,
			audioContext: null,
			playing: false,
			preparingAudio: false,
			cachedVoicePath: '',
			confirmDialog: {
				visible: false,
				title: '',
				message: '',
				confirmText: '确认',
				danger: false,
				action: ''
			}
		}
	},
	async onLoad(options) {
		this.id = decodeURIComponent(options.id || '')
		await this.loadDetail()
	},
	onUnload() {
		if (this.audioContext) {
			this.audioContext.destroy()
			this.audioContext = null
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadDetail() {
			this.loading = true
			try {
				this.memo = await workspaceService.getMemo(this.id)
			} catch (error) {
				uni.showToast({ title: error.message || '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		toggleVoice() {
			if (!this.memo || !this.memo.voiceUrl) return
			if (this.playing) {
				this.audioContext.pause()
			} else {
				this.playVoice()
			}
		},
		async playVoice() {
			if (this.preparingAudio) return
			try {
				if (!this.audioContext) {
					this.audioContext = uni.createInnerAudioContext()
					this.audioContext.onPlay(() => {
						this.playing = true
						this.preparingAudio = false
					})
					this.audioContext.onPause(() => {
						this.playing = false
					})
					this.audioContext.onEnded(() => {
						this.playing = false
					})
					this.audioContext.onError(() => {
						this.playing = false
						this.preparingAudio = false
					})
				}
				if (!this.cachedVoicePath) {
					this.preparingAudio = true
					const downloadUrl = await chatStore.getDownloadUrl(this.memo.voiceUrl)
					const response = await new Promise((resolve, reject) => {
						uni.downloadFile({
							url: downloadUrl,
							success: resolve,
							fail: reject
						})
					})
					if (!response || response.statusCode !== 200) {
						throw new Error('下载语音失败')
					}
					this.cachedVoicePath = response.tempFilePath || ''
				}
				this.audioContext.src = this.cachedVoicePath
				this.audioContext.play()
			} catch (error) {
				this.preparingAudio = false
				uni.showToast({ title: error.message || '播放失败', icon: 'none' })
			}
		},
		deleteMemo() {
			this.confirmDialog = {
				visible: true,
				title: '删除备忘',
				message: '确定删除这个语音备忘吗？此操作不可恢复。',
				confirmText: '确认删除',
				danger: true,
				action: 'deleteMemo'
			}
		},
		closeConfirmDialog() {
			this.confirmDialog = Object.assign({}, this.confirmDialog, { visible: false, action: '' })
		},
		async handleConfirmDialog() {
			const action = this.confirmDialog.action
			this.closeConfirmDialog()
			if (action !== 'deleteMemo') {
				return
			}
			try {
				await workspaceService.deleteMemo(this.id)
				uni.showToast({ title: '已删除', icon: 'none' })
				setTimeout(() => {
					uni.navigateBack()
				}, 300)
			} catch (error) {
				uni.showToast({ title: error.message || '删除失败', icon: 'none' })
			}
		},
		formatTime(timestamp) {
			if (!timestamp) return ''
			const date = new Date(timestamp)
			return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
		}
	}
}
</script>

<style lang="scss">
.detail-page {
	position: fixed;
	inset: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: #f7f9fc;
}

.detail-header {
	display: flex;
	align-items: center;
	padding: calc(18rpx + var(--status-bar-height)) 24rpx 18rpx;
	background: #fff;
	border-bottom: 2rpx solid #e2e8f0;
}

.detail-back {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.detail-back__icon {
	width: 38rpx;
	height: 38rpx;
}

.detail-title {
	flex: 1;
	margin-left: 12rpx;
	font-size: 32rpx;
	font-weight: 800;
	color: #0f172a;
}

.detail-actions {
	display: flex;
	align-items: center;
}

.detail-icon-button {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.detail-icon-button__icon {
	width: 34rpx;
	height: 34rpx;
}

.detail-scroll {
	flex: 1;
	min-height: 0;
}

.detail-state {
	padding: 40rpx;
	text-align: center;
	font-size: 28rpx;
	color: #64748b;
}

.detail-body {
	padding: 24rpx;
}

.detail-card {
	margin-bottom: 16rpx;
	padding: 24rpx;
	border-radius: 24rpx;
	background: #fff;
	box-shadow: 0 18rpx 36rpx rgba(15, 23, 42, 0.05);
}

.detail-card__title,
.section-title {
	display: block;
	font-size: 30rpx;
	font-weight: 800;
	color: #0f172a;
}

.detail-card__meta {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #94a3b8;
}

.detail-card__summary,
.section-content {
	display: block;
	margin-top: 14rpx;
	font-size: 26rpx;
	line-height: 1.7;
	color: #475569;
	white-space: pre-wrap;
}

.voice-row {
	display: flex;
	align-items: center;
}

.voice-button {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	display: flex;
	align-items: center;
	justify-content: center;
}

.voice-button__icon {
	width: 34rpx;
	height: 34rpx;
}

.voice-copy {
	flex: 1;
	margin-left: 18rpx;
	min-width: 0;
}

.voice-copy__title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
}

.voice-copy__desc {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #94a3b8;
	word-break: break-all;
}

.keyword-wrap {
	display: flex;
	flex-wrap: wrap;
	margin-top: 12rpx;
}

.keyword-chip {
	margin-right: 12rpx;
	margin-bottom: 12rpx;
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	background: #dbeafe;
	font-size: 22rpx;
	color: #2563eb;
}

.picker-field {
	margin-top: 14rpx;
	padding: 22rpx;
	border-radius: 20rpx;
	background: #f8fbff;
	border: 2rpx solid #d9e7f5;
	font-size: 26rpx;
	color: #0f172a;
}
</style>
