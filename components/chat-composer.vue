<template>
	<view class="composer-shell">
		<view v-if="showMediaPanel" class="media-panel">
			<view class="media-panel__grid">
				<view class="media-button" @tap="pickImage">
					<view class="media-button__icon-box">
						<image class="media-button__icon" src="/static/svg/tab-image.svg" mode="aspectFit"></image>
					</view>
					<text class="media-button__label">图片</text>
				</view>
				<view class="media-button" @tap="pickVideo">
					<view class="media-button__icon-box">
						<image class="media-button__icon" src="/static/svg/tab-video.svg" mode="aspectFit"></image>
					</view>
					<text class="media-button__label">视频</text>
				</view>
				<view class="media-button" @tap="pickFile">
					<view class="media-button__icon-box">
						<image class="media-button__icon" src="/static/svg/tab-file.svg" mode="aspectFit"></image>
					</view>
					<text class="media-button__label">文件</text>
				</view>
				<view class="media-button" @tap="selectAndSendMemo">
					<view class="media-button__icon-box">
						<image class="media-button__icon" src="/static/svg/memo-card.svg" mode="aspectFit"></image>
					</view>
					<text class="media-button__label">语音备忘</text>
				</view>
				<view class="media-button" @tap="selectAndSendDocument">
					<view class="media-button__icon-box">
						<image class="media-button__icon" src="/static/svg/document-card.svg" mode="aspectFit"></image>
					</view>
					<text class="media-button__label">云文档</text>
				</view>
				<view class="media-button" @tap="selectAndSendMiniprogram">
					<view class="media-button__icon-box">
						<image class="media-button__icon" src="/static/svg/miniprogram-card.svg" mode="aspectFit"></image>
					</view>
					<text class="media-button__label">小程序</text>
				</view>
			</view>
		</view>
		<view class="composer-input-row">
			<view class="tool-button tool-button--plain" @tap="toggleMediaPanel">
				<image class="tool-toggle-icon" :src="showMediaPanel ? '/static/svg/minus-circle.svg' : '/static/svg/plus-circle.svg'" mode="aspectFit"></image>
			</view>
			<button
				v-if="voiceMode"
				class="voice-button composer-voice-button"
				:class="{
					'voice-button--recording': recording && !recordWillCancel,
					'voice-button--cancel': recordWillCancel
				}"
				@touchstart.stop.prevent="startRecord"
				@touchmove.stop.prevent="handleRecordMove"
				@touchend.stop.prevent="stopRecord"
				@touchcancel.stop.prevent="cancelRecord"
			>
				{{ recordButtonText }}
			</button>
			<view v-else class="composer-input-wrap">
				<textarea class="composer-input" auto-height :adjust-position="false" cursor-spacing="24" placeholder="输入消息" v-model="draft"></textarea>
			</view>
			<view
				v-if="voiceMode && supportsVoiceInput"
				class="tool-button tool-button--plain tool-button--voice-right"
				@tap="toggleVoice"
			>
				<image class="tool-toggle-icon tool-toggle-icon--voice" src="/static/svg/keyboard.svg" mode="aspectFit"></image>
			</view>
			<view
				v-else-if="!trimmedDraft && supportsVoiceInput"
				class="tool-button tool-button--plain tool-button--voice-right"
				@tap="toggleVoice"
			>
				<image class="tool-toggle-icon tool-toggle-icon--voice" src="/static/svg/mic.svg" mode="aspectFit"></image>
			</view>
			<view v-else class="send-button" :class="{ 'send-button--disabled': sending || (!trimmedDraft) }" @tap="sendTextMessage">
				<text>{{ sending ? '发送中' : '发送' }}</text>
			</view>
		</view>
		<view v-if="recording" class="record-hint" :class="{ 'record-hint--cancel': recordWillCancel }">
			<text class="record-hint__title">{{ recordWillCancel ? '松开取消' : '上滑取消' }}</text>
			<text class="record-hint__desc">{{ recordWillCancel ? '松开后将放弃本次录音' : `已录制 ${recordDuration}s` }}</text>
		</view>
		<view v-if="showSelector" class="selector-mask" @tap="closeSelector">
			<view class="selector-sheet" @tap.stop>
				<view class="selector-handle"></view>
				<view class="selector-header">
					<text class="selector-title">{{ selectorTitle }}</text>
					<text class="selector-close" @tap="closeSelector">关闭</text>
				</view>
				<scroll-view class="selector-list" scroll-y>
					<view
						v-for="item in selectorItems"
						:key="item.key"
						class="selector-item"
						@tap="selectWorkspaceItem(item)"
					>
						<view class="selector-item__avatar">
							<image class="selector-item__avatar-icon" :src="item.icon" mode="aspectFit"></image>
						</view>
						<view class="selector-item__copy">
							<text class="selector-item__title">{{ item.label }}</text>
							<text v-if="item.summary" class="selector-item__summary">{{ item.summary }}</text>
						</view>
						<view class="selector-item__action">发送</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
import chatStore from '@/store/chat'
import { uploadFile } from '@/services/http'
import { workspaceService } from '@/services/workspace'

const RECORD_CANCEL_OFFSET = 60

export default {
	name: 'ChatComposer',
	data() {
		return {
			draft: '',
			sending: false,
			showMediaPanel: false,
			showSelector: false,
			selectorTitle: '',
			selectorItems: [],
			selectorResolver: null,
			voiceMode: false,
			supportsVoiceInput: true,
			recording: false,
			recordDuration: 0,
			recordDurationMs: 0,
			recordStartAt: 0,
			recordStartY: 0,
			recordWillCancel: false,
			recordTimer: null,
			recorderManager: null,
			recordTempPath: '',
			recordStopResolver: null
		}
	},
	computed: {
		trimmedDraft() {
			return (this.draft || '').trim()
		},
		recordButtonText() {
			if (this.recordWillCancel) {
				return '松开取消'
			}
			if (this.recording) {
				return `松开发送 ${this.recordDuration}s`
			}
			return '按住说话'
		}
	},
	created() {
		// #ifdef H5
		this.supportsVoiceInput = false
		// #endif

		// #ifndef H5
		if (uni.getRecorderManager) {
			this.recorderManager = uni.getRecorderManager()
			if (this.recorderManager) {
				this.recorderManager.onStop(result => {
					this.recordTempPath = result.tempFilePath || ''
					this.recordDurationMs = Number(result.duration || 0)
					if (this.recordStopResolver) {
						this.recordStopResolver({
							tempFilePath: this.recordTempPath,
							duration: this.recordDurationMs
						})
						this.recordStopResolver = null
					}
				})
			}
		}
		// #endif
	},
	beforeUnmount() {
		if (this.recordTimer) {
			clearInterval(this.recordTimer)
			this.recordTimer = null
		}
	},
	methods: {
		toggleMediaPanel() {
			this.showMediaPanel = !this.showMediaPanel
			this.$nextTick(() => {
				this.$emit('layout-change')
			})
		},
		closeSelector() {
			if (this.selectorResolver) {
				this.selectorResolver(null)
			}
			this.selectorResolver = null
			this.showSelector = false
			this.selectorTitle = ''
			this.selectorItems = []
		},
		toggleVoice() {
			this.showMediaPanel = false
			this.voiceMode = !this.voiceMode
			if (this.voiceMode) {
				this.showMediaPanel = false
			}
			this.$nextTick(() => {
				this.$emit('layout-change')
			})
		},
		async sendTextMessage() {
			if (!this.trimmedDraft) {
				return
			}
			this.sending = true
			const text = this.trimmedDraft
			this.draft = ''
			try {
				await chatStore.sendText(text)
				this.$emit('message-sent')
			} catch (error) {
				uni.showToast({
					title: error.message || '发送失败',
					icon: 'none'
				})
				this.draft = text
			} finally {
				this.sending = false
			}
		},
		async pickImage() {
			try {
				this.showMediaPanel = false
				const result = await this.chooseImage()
				if (!result) {
					return
				}
				await this.uploadAndSend(result, 'send_image')
			} catch (error) {
				uni.showToast({
					title: error.message || '图片发送失败',
					icon: 'none'
				})
			}
		},
		async pickVideo() {
			try {
				this.showMediaPanel = false
				const result = await this.chooseVideo()
				if (!result) {
					return
				}
				await this.uploadAndSend(result, 'send_video')
			} catch (error) {
				uni.showToast({
					title: error.message || '视频发送失败',
					icon: 'none'
				})
			}
		},
		isAudioFile(name = '') {
			const lower = String(name).toLowerCase()
			return ['.aac', '.amr', '.m4a', '.mp3', '.ogg', '.wav'].some(ext => lower.endsWith(ext))
		},
		async pickFile() {
			try {
				this.showMediaPanel = false
				const result = await this.chooseFile()
				if (!result) {
					return
				}
				await this.uploadAndSend(result, this.isAudioFile(result.name) ? 'send_audio' : 'send_file')
			} catch (error) {
				uni.showToast({
					title: error.message || '文件发送失败',
					icon: 'none'
				})
			}
		},
		async selectAndSendMiniprogram() {
			if (!chatStore.state.selectedAgentId) {
				uni.showToast({ title: '请先选择一个智能体', icon: 'none' })
				return
			}
			try {
				const result = await workspaceService.getMiniprogramList({ page: 1, pageSize: 50 })
				if (!result.items.length) {
					uni.showToast({ title: '暂无可发送的小程序', icon: 'none' })
					return
				}
				const selected = await this.pickWorkspaceItem('选择要发送的小程序', result.items.map(item => ({
					label: item.name,
					summary: item.summary || item.description || item.status || '',
					icon: '/static/svg/miniprogram-card.svg',
					key: item.appId,
					value: item
				})))
				if (!selected) return
				this.showMediaPanel = false
				await workspaceService.sendMiniprogramToAgent({
					appId: selected.appId,
					agentId: chatStore.state.selectedAgentId
				})
				uni.showToast({ title: '已发送给智能体', icon: 'none' })
			} catch (error) {
				uni.showToast({ title: error.message || '发送失败', icon: 'none' })
			}
		},
		async selectAndSendMemo() {
			if (!chatStore.state.selectedAgentId) {
				uni.showToast({ title: '请先选择一个智能体', icon: 'none' })
				return
			}
			try {
				const result = await workspaceService.getMemoList({ page: 1, pageSize: 50 })
				if (!result.items.length) {
					uni.showToast({ title: '暂无可发送的语音备忘', icon: 'none' })
					return
				}
				const selected = await this.pickWorkspaceItem('选择要发送的语音备忘', result.items.map(item => ({
					label: item.title || '未命名备忘',
					summary: item.summary || item.status || '',
					icon: '/static/svg/memo-card.svg',
					key: item.id,
					value: item
				})))
				if (!selected) return
				this.showMediaPanel = false
				await workspaceService.sendMemoToAgent(selected.id, chatStore.state.selectedAgentId)
				uni.showToast({ title: '已发送给智能体', icon: 'none' })
			} catch (error) {
				uni.showToast({ title: error.message || '发送失败', icon: 'none' })
			}
		},
		async selectAndSendDocument() {
			if (!chatStore.state.selectedAgentId) {
				uni.showToast({ title: '请先选择一个智能体', icon: 'none' })
				return
			}
			try {
				const result = await workspaceService.getDocumentList({ page: 1, pageSize: 50 })
				if (!result.items.length) {
					uni.showToast({ title: '暂无可发送的云文档', icon: 'none' })
					return
				}
				const selected = await this.pickWorkspaceItem('选择要发送的云文档', result.items.map(item => ({
					label: item.fileName || '未命名文档.md',
					summary: item.summary || '',
					icon: '/static/svg/document-card.svg',
					key: item.id,
					value: item
				})))
				if (!selected) return
				this.showMediaPanel = false
				await workspaceService.sendDocumentToAgent({
					documentId: selected.id,
					agentId: chatStore.state.selectedAgentId
				})
				uni.showToast({ title: '已发送给智能体', icon: 'none' })
			} catch (error) {
				uni.showToast({ title: error.message || '发送失败', icon: 'none' })
			}
		},
		pickWorkspaceItem(title, items) {
			return new Promise(resolve => {
				this.selectorTitle = title
				this.selectorItems = items
				this.selectorResolver = resolve
				this.showSelector = true
			})
		},
		selectWorkspaceItem(item) {
			if (this.selectorResolver) {
				this.selectorResolver(item.value)
			}
			this.selectorResolver = null
			this.showSelector = false
			this.selectorTitle = ''
			this.selectorItems = []
		},
		async uploadAndSend(fileSource, type, extra) {
			uni.showLoading({
				title: '正在上传',
				mask: true
			})
			try {
				const uploadResult = await uploadFile(fileSource, chatStore.state.selectedAgentId)
				await chatStore.sendMedia(type, uploadResult.fileUrl, fileSource.name, Object.assign({}, extra, {
					coverUrl: uploadResult.coverUrl || ''
				}))
				this.$emit('message-sent')
			} finally {
				uni.hideLoading()
			}
		},
		chooseImage() {
			return new Promise((resolve, reject) => {
				uni.chooseImage({
					count: 1,
					success: result => {
						const path = result.tempFilePaths[0]
						const tempFile = (result.tempFiles || [])[0] || {}
						resolve({
							path: path,
							name: tempFile.name || path.split('/').pop(),
							file: tempFile
						})
					},
					fail: error => {
						if (error && error.errMsg && error.errMsg.indexOf('cancel') !== -1) {
							resolve(null)
							return
						}
						reject(error)
					}
				})
			})
		},
		chooseVideo() {
			return new Promise((resolve, reject) => {
				uni.chooseVideo({
					sourceType: ['album'],
					success: result => {
						resolve({
							path: result.tempFilePath,
							name: result.name || (result.tempFilePath || '').split('/').pop(),
							file: result.file || null
						})
					},
					fail: error => {
						if (error && error.errMsg && error.errMsg.indexOf('cancel') !== -1) {
							resolve(null)
							return
						}
						reject(error)
					}
				})
			})
		},
		chooseFile() {
			return new Promise((resolve, reject) => {
				// #ifndef H5
				uni.chooseMessageFile({
					count: 1,
					type: 'file',
					success: result => {
						const file = (result.tempFiles || [])[0] || {}
						resolve({
							path: file.path || '',
							name: file.name || '',
							file: file
						})
					},
					fail: error => {
						if (error && error.errMsg && error.errMsg.indexOf('cancel') !== -1) {
							resolve(null)
							return
						}
						reject(error)
					}
				})
				// #endif

				// #ifdef H5
				const input = document.createElement('input')
				input.type = 'file'
				input.accept = '*/*'
				input.onchange = (e) => {
					const file = e.target.files[0]
					if (file) {
						resolve({
							path: URL.createObjectURL(file),
							name: file.name,
							file: file
						})
					} else {
						resolve(null)
					}
				}
				input.oncancel = () => {
					resolve(null)
				}
				input.click()
				// #endif
			})
		},
		startRecord(event) {
			if (!this.recorderManager || this.recording) {
				return
			}
			const touch = this.getTouchPoint(event)
			this.recordWillCancel = false
			this.recording = true
			this.recordDuration = 0
			this.recordDurationMs = 0
			this.recordStartAt = Date.now()
			this.recordStartY = touch ? touch.clientY : 0
			this.recordTimer = setInterval(() => {
				const elapsedMs = Math.max(0, Date.now() - this.recordStartAt)
				this.recordDurationMs = elapsedMs
				this.recordDuration = Math.max(1, Math.floor(elapsedMs / 1000))
			}, 200)
			this.recorderManager.start({
				format: 'mp3'
			})
		},
		handleRecordMove(event) {
			if (!this.recording) {
				return
			}
			const touch = this.getTouchPoint(event)
			if (!touch) {
				return
			}
			if (!this.recordStartY) {
				this.recordStartY = touch.clientY
			}
			this.recordWillCancel = this.recordStartY - touch.clientY >= RECORD_CANCEL_OFFSET
		},
		async stopRecord() {
			if (!this.recorderManager || !this.recording) {
				return
			}
			const shouldCancel = this.recordWillCancel
			this.recording = false
			if (this.recordTimer) {
				clearInterval(this.recordTimer)
				this.recordTimer = null
			}
			const stopResult = await new Promise(resolve => {
				this.recordStopResolver = resolve
				this.recorderManager.stop()
				setTimeout(() => {
					if (this.recordStopResolver) {
						this.recordStopResolver({
							tempFilePath: this.recordTempPath,
							duration: this.recordDurationMs || Math.max(0, Date.now() - this.recordStartAt)
						})
						this.recordStopResolver = null
					}
				}, 1500)
			})
			const durationMs = Number((stopResult && stopResult.duration) || this.recordDurationMs || Math.max(0, Date.now() - this.recordStartAt))
			const tempFilePath = (stopResult && stopResult.tempFilePath) || this.recordTempPath
			if (shouldCancel) {
				this.resetRecordState()
				return
			}
			if (!tempFilePath || durationMs < 1000) {
				this.resetRecordState()
				uni.showToast({
					title: '录音时长太短',
					icon: 'none'
				})
				return
			}
			try {
				await this.uploadAndSend({
					path: tempFilePath,
					name: `voice_${Date.now()}.mp3`
				}, 'send_voice', {
					duration: durationMs
				})
			} catch (error) {
				uni.showToast({
					title: error.message || '语音发送失败',
					icon: 'none'
				})
			} finally {
				this.resetRecordState()
			}
		},
		cancelRecord() {
			if (!this.recorderManager || !this.recording) {
				return
			}
			this.recording = false
			if (this.recordTimer) {
				clearInterval(this.recordTimer)
				this.recordTimer = null
			}
			this.recorderManager.stop()
			this.resetRecordState()
		},
		getTouchPoint(event) {
			const changedTouches = event && event.changedTouches
			const touches = event && event.touches
			return (changedTouches && changedTouches[0]) || (touches && touches[0]) || null
		},
		resetRecordState() {
			this.recordTempPath = ''
			this.recordDuration = 0
			this.recordDurationMs = 0
			this.recordStartAt = 0
			this.recordStartY = 0
			this.recordWillCancel = false
			this.$nextTick(() => {
				this.$emit('layout-change')
			})
		}
	}
}
</script>

<style lang="scss">
.composer-shell {
	position: relative;
	background: rgba(255, 255, 255, 0.96);
	border-top: 2rpx solid rgba(217, 231, 245, 0.85);
	padding: 18rpx 20rpx calc(18rpx + env(safe-area-inset-bottom));
	box-shadow: 0 -18rpx 42rpx rgba(15, 23, 42, 0.06);
	flex-shrink: 0;
}

.voice-button {
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 22rpx;
	background: #e0f2fe;
	color: #0284c7;
	font-size: 30rpx;
	font-weight: 700;
	border: none;
}

.voice-button--recording {
	background: linear-gradient(135deg, #f87171, #ef4444);
	color: #ffffff;
}

.voice-button--cancel {
	background: #fee2e2;
	color: #dc2626;
}

.tool-button {
	width: 80rpx;
	height: 80rpx;
	margin-right: 8rpx;
	border-radius: 24rpx;
	background: #dbeafe;
	display: flex;
	align-items: center;
	justify-content: center;
}

.tool-button--plain {
	background: transparent;
	border-radius: 0;
	width: 56rpx;
	height: 56rpx;
}

.tool-button--voice-right {
	margin-left: 10rpx;
	margin-right: 0;
}

.tool-button:last-child {
	margin-right: 0;
}

.tool-toggle-icon {
	width: 56rpx;
	height: 56rpx;
}

.tool-toggle-icon--voice {
	width: 48rpx;
	height: 48rpx;
}

.media-panel {
	padding: 8rpx 0 18rpx;
}

.media-panel__grid {
	display: flex;
	flex-wrap: wrap;
}

.media-button {
	width: 25%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 10rpx 0;
}

.media-button__icon-box {
	width: 80rpx;
	height: 80rpx;
	border-radius: 24rpx;
	background: #dbeafe;
	display: flex;
	align-items: center;
	justify-content: center;
}

.media-button__icon {
	width: 40rpx;
	height: 40rpx;
}

.media-button__label {
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #475569;
}

.composer-input-row {
	display: flex;
	align-items: center;
}

.record-hint {
	position: absolute;
	left: 50%;
	bottom: calc(128rpx + env(safe-area-inset-bottom));
	transform: translateX(-50%);
	min-width: 300rpx;
	padding: 18rpx 24rpx;
	border-radius: 22rpx;
	background: rgba(15, 23, 42, 0.82);
	box-shadow: 0 18rpx 36rpx rgba(15, 23, 42, 0.18);
	display: flex;
	flex-direction: column;
	align-items: center;
	pointer-events: none;
}

.record-hint--cancel {
	background: rgba(220, 38, 38, 0.92);
}

.record-hint__title {
	font-size: 26rpx;
	font-weight: 700;
	line-height: 1.4;
	color: #ffffff;
}

.record-hint__desc {
	margin-top: 6rpx;
	font-size: 22rpx;
	line-height: 1.4;
	color: rgba(255, 255, 255, 0.82);
}

.composer-voice-button {
	flex: 1;
	margin-right: 12rpx;
}

.composer-input-wrap {
	flex: 1;
	background: #f8fbff;
	border: 2rpx solid #d9e7f5;
	border-radius: 28rpx;
	padding: 16rpx 22rpx;
	margin-right: 12rpx;
}

.composer-input {
	width: 100%;
	font-size: 30rpx;
	line-height: 1.5;
	color: #0f172a;
}

.send-button {
	height: 72rpx;
	line-height: 72rpx;
	padding: 0 32rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	color: #ffffff;
	box-shadow: 0 14rpx 28rpx rgba(96, 165, 250, 0.25);
	font-size: 28rpx;
	font-weight: 700;
}

.send-button--disabled {
	opacity: 0.45;
}

.selector-mask {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.24);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	z-index: 20;
}

.selector-sheet {
	width: 100%;
	max-height: 70vh;
	background: #ffffff;
	border-radius: 28rpx 28rpx 0 0;
	padding: 12rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
	box-shadow: 0 -18rpx 48rpx rgba(15, 23, 42, 0.12);
}

.selector-handle {
	width: 64rpx;
	height: 8rpx;
	border-radius: 999rpx;
	background: #d9e7f5;
	margin: 0 auto 14rpx;
}

.selector-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-bottom: 12rpx;
}

.selector-title {
	font-size: 32rpx;
	font-weight: 800;
	color: #0f172a;
}

.selector-close {
	font-size: 24rpx;
	color: #64748b;
}

.selector-list {
	max-height: 56vh;
}

.selector-item {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	border-top: 2rpx solid #eff6ff;
}

.selector-item:first-child {
	border-top: none;
}

.selector-item__avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 24rpx;
	background: #dbeafe;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.selector-item__avatar-icon {
	width: 40rpx;
	height: 40rpx;
}

.selector-item__copy {
	flex: 1;
	min-width: 0;
	margin-left: 16rpx;
}

.selector-item__title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
}

.selector-item__summary {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	line-height: 1.5;
	color: #64748b;
	max-height: 3em;
	overflow: hidden;
	text-overflow: ellipsis;
}

.selector-item__action {
	padding: 12rpx 18rpx;
	border-radius: 999rpx;
	background: #eef6ff;
	font-size: 22rpx;
	font-weight: 700;
	color: #2563eb;
	flex-shrink: 0;
}
</style>
