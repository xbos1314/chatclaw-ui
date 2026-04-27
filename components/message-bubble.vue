<template>
	<view class="message-row" :class="{ 'message-row--user': message.isUser }">
		<view v-if="!message.isUser" class="avatar avatar--agent">
			<image v-if="agentAvatar" class="avatar-image" :src="agentAvatar" mode="aspectFill"></image>
			<text v-else class="avatar-text">AI</text>
		</view>
		<view class="message-column" :class="{ 'message-column--user': message.isUser }">
			<view
				class="bubble"
				:class="bubbleClass"
				@touchstart="handlePressStart"
				@touchmove="handlePressMove"
				@touchend="handlePressEnd"
				@touchcancel="handlePressEnd"
			>
				<template v-if="isSpecialCard">
						<view class="special-card" :class="[specialCardClass, { 'special-card--user': message.isUser, 'special-card--assistant': !message.isUser }]" @tap="openSpecialCard">
							<view class="special-icon">
								<image class="special-icon__image" :src="specialIconSrc" mode="aspectFit"></image>
						</view>
						<view class="special-copy">
							<text class="special-title">{{ specialTitle }}</text>
							<text v-if="specialSummary" class="special-summary">{{ specialSummary }}</text>
						</view>
					</view>
				</template>
				<template v-else-if="isImage">
					<image class="media-image" :src="fullUrl" mode="widthFix" @tap="previewImage"></image>
				</template>
				<template v-else-if="isVideo">
					<view class="video-card" @tap="openVideoPlayer">
						<image v-if="videoThumbnail" class="media-video-cover" :src="videoThumbnail" mode="aspectFill"></image>
						<view class="media-video-play">
							<image class="media-video-play-icon" src="/static/svg/play.svg" mode="aspectFit"></image>
						</view>
					</view>
				</template>
				<template v-else-if="isVoice || isAudio">
					<view class="voice-card" :class="{ 'voice-card--compact': isCompactVoice }" @tap="togglePlay">
						<view class="voice-top">
							<view class="voice-play-btn">
								<image class="voice-play-icon" :src="voiceIconSrc" mode="aspectFit"></image>
							</view>
							<view v-if="!isCompactVoice" class="voice-copy">
								<text v-if="!isCompactVoice" class="voice-title">{{ voiceTitle }}</text>
							</view>
							<text v-if="isCompactVoice" class="voice-inline-duration">{{ displayDuration }}</text>
							<download-action v-if="showVoiceDownload" :url="fullUrl" :file-name="message.fileName || 'download'"></download-action>
						</view>
						<text v-if="!isCompactVoice" class="voice-duration">{{ displayDuration }}</text>
					</view>
				</template>
				<template v-else-if="isFile">
					<view class="file-card">
						<view class="file-icon">
							<image class="file-icon__image" :src="fileIconSrc" mode="aspectFit"></image>
						</view>
						<view class="file-copy">
							<text class="file-name">{{ message.fileName || '未命名文件' }}</text>
						</view>
						<download-action :url="fullUrl" :file-name="message.fileName || 'download'"></download-action>
					</view>
				</template>
				<template v-else>
					<markdown-preview class="message-text" :content="displayText" :dark="message.isUser"></markdown-preview>
				</template>
			</view>
		</view>
		<view v-if="message.isUser" class="avatar avatar--user">
			<image v-if="userAvatar" class="avatar-image" :src="userAvatar" mode="aspectFill"></image>
			<text v-else class="avatar-text">我</text>
		</view>
	</view>
</template>

<script>
import DownloadAction from '@/components/download-action.vue'
import MarkdownPreview from '@/components/markdown-preview.vue'
import { formatMessageTime, getMessageTextContent } from '@/common/chat'
import chatStore from '@/store/chat'

let activeAudioContext = null
const MESSAGE_LONGPRESS_DELAY = 450
const MESSAGE_LONGPRESS_MOVE_THRESHOLD = 12

export default {
	name: 'MessageBubble',
	components: {
		DownloadAction,
		MarkdownPreview
	},
	props: {
		message: {
			type: Object,
			required: true
		},
		agentAvatar: {
			type: String,
			default: ''
		},
		userAvatar: {
			type: String,
			default: ''
		},
		fullUrl: {
			type: String,
			default: ''
		}
	},
	data() {
		return {
			audioContext: null,
			isPlaying: false,
			duration: 0,
			currentTime: 0,
			videoThumbnail: '',
			longpressTimer: null,
			pressStartX: 0,
			pressStartY: 0
		}
	},
	created() {
		uni.$on('chat-audio-stop', this.cleanupAudio)
	},
	beforeUnmount() {
		uni.$off('chat-audio-stop', this.cleanupAudio)
		this.cleanupAudio()
	},
	beforeDestroy() {
		uni.$off('chat-audio-stop', this.cleanupAudio)
		this.cleanupAudio()
	},
	watch: {
		message: {
			immediate: true,
			deep: true,
			handler() {
				const persistedDurationMs = Number(this.message?.duration || 0)
				if (persistedDurationMs > 0 && (!this.isPlaying || !this.duration)) {
					this.duration = persistedDurationMs / 1000
				}
			}
		},
		fullUrl: {
			immediate: true,
			handler() {
				this.captureVideoThumbnail()
			}
		}
	},
	computed: {
		timeText() {
			return formatMessageTime(this.message.timestamp)
		},
		isImage() {
			return this.message.type === 'image'
		},
		isVideo() {
			return this.message.type === 'video'
		},
		isVoice() {
			return this.message.type === 'voice'
		},
		isAudio() {
			return this.message.type === 'audio'
		},
		isCompactVoice() {
			return this.message.type === 'voice'
		},
		isFile() {
			return this.message.type === 'file'
		},
		voiceTitle() {
			return this.isCompactVoice ? '语音消息' : (this.message.fileName || '音频')
		},
		effectiveDuration() {
			const fallbackDuration = Number(this.message?.duration || 0) > 0 ? Number(this.message.duration) / 1000 : 0
			return Number(this.duration || 0) > 0 ? Number(this.duration) : fallbackDuration
		},
		displayDuration() {
			if (this.isPlaying && this.effectiveDuration > 0) {
				const remaining = Math.max(0, this.effectiveDuration - Number(this.currentTime || 0))
				return this.formatDuration(remaining)
			}
			return this.formatDuration(this.effectiveDuration)
		},
		voiceIconSrc() {
			if (this.isPlaying) {
				return '/static/svg/pause.svg'
			}
			if (this.isCompactVoice) {
				return '/static/svg/audio-wave.svg'
			}
			return '/static/svg/play.svg'
		},
		showVoiceDownload() {
			return this.isAudio
		},
		fileIconSrc() {
			return this.getFileIcon(this.message.fileName)
		},
		isSpecialCard() {
			return this.message.type.indexOf('memo_') === 0 || this.message.type.indexOf('document_') === 0 || this.message.type.indexOf('miniprogram_') === 0
		},
		displayText() {
			return getMessageTextContent(this.message)
		},
		specialTitle() {
			const titleMap = {
				memo_request: '语音备忘整理请求',
				memo_edit_request: '发送语音备忘',
				memo_result: '语音备忘整理完成',
				document_request: '发送云文档',
				document_edit_request: '继续完善文档',
				document_result: '云文档已生成',
				miniprogram_request: '小程序创建请求',
				miniprogram_context_request: '发送小程序',
				miniprogram_edit_request: '继续完善小程序',
				miniprogram_result: '小程序已生成'
			}
			if (this.message.type.indexOf('document_') === 0 && this.message.documentTitle) {
				return this.message.documentTitle
			}
			if (this.message.type.indexOf('memo_') === 0 && this.message.memoTitle) {
				return this.message.memoTitle
			}
			if (this.message.type.indexOf('miniprogram_') === 0 && this.message.appName) {
				return this.message.appName
			}
			return titleMap[this.message.type] || this.message.title || '结构化消息'
		},
		specialSummary() {
			if (this.message.type === 'memo_request') {
				return this.message.memoSummary || '已将语音备忘发送给智能体，可继续围绕这条备忘沟通'
			}
			if (this.message.type === 'memo_edit_request') {
				return this.message.memoSummary || '智能体将基于这条备忘继续整理内容'
			}
			if (this.message.type === 'memo_result') {
				return this.message.memoSummary || ''
			}
			if (this.message.type === 'document_request') {
				return this.message.documentSummary || '已将云文档发送给智能体，可继续围绕该文档沟通'
			}
			if (this.message.type === 'document_edit_request') {
				return this.message.documentSummary || '智能体将基于这份文档继续完善内容'
			}
			if (this.message.type === 'document_result') {
				return this.message.documentSummary || '智能体已创建或更新云文档'
			}
			if (this.message.type === 'miniprogram_request') {
				return this.message.appName ? `已将“${this.message.appName}”发送给智能体创建` : '已将小程序需求发送给智能体'
			}
			if (this.message.type === 'miniprogram_context_request') {
				return this.message.appName ? `已将“${this.message.appName}”发送给智能体，后续可继续围绕该项目沟通` : '已将小程序发送给智能体，后续可继续围绕该项目沟通'
			}
			if (this.message.type === 'miniprogram_edit_request') {
				return this.message.appName ? `已将“${this.message.appName}”发送给智能体继续修改` : '已将小程序发送给智能体继续修改'
			}
			if (this.message.type === 'miniprogram_result') {
				return this.message.appSummary || ''
			}
			return this.message.summary || ''
		},
		specialCardClass() {
			if (this.message.type.indexOf('memo_') === 0) {
				if (this.message.type === 'memo_result') {
					return 'special-card--memo-result'
				}
				return 'special-card--memo'
			}
			if (this.message.type.indexOf('document_') === 0) {
				if (this.message.type === 'document_edit_request') {
					return 'special-card--document-edit'
				}
				if (this.message.type === 'document_result') {
					return 'special-card--document-result'
				}
				return 'special-card--document'
			}
			if (this.message.type.indexOf('miniprogram_') === 0) {
				if (this.message.type === 'miniprogram_context_request') {
					return 'special-card--mini-context'
				}
				if (this.message.type === 'miniprogram_edit_request') {
					return 'special-card--mini-edit'
				}
				if (this.message.type === 'miniprogram_result') {
					return 'special-card--mini-result'
				}
				return 'special-card--mini'
			}
			return ''
		},
		specialIconSrc() {
			if (this.message.type.indexOf('memo_') === 0) {
				return '/static/svg/memo-card.svg'
			}
			if (this.message.type.indexOf('document_') === 0) {
				return '/static/svg/document-card.svg'
			}
			return '/static/svg/miniprogram-card.svg'
		},
		bubbleClass() {
			return {
				'bubble--user': this.message.isUser && !this.isSpecialCard && !this.isImage && !this.isVideo && !this.isVoice && !this.isAudio && !this.isFile,
				'bubble--assistant': !this.message.isUser && !this.isSpecialCard && !this.isImage && !this.isVideo && !this.isVoice && !this.isAudio && !this.isFile,
				'bubble--media': this.isImage || this.isVideo || this.isVoice || this.isAudio || this.isFile || this.isSpecialCard
			}
		}
	},
	beforeDestroy() {
		this.clearLongpress()
	},
	methods: {
		handlePressStart(event) {
			const touch = this.getTouchPoint(event)
			this.clearLongpress()
			this.pressStartX = touch ? touch.clientX : 0
			this.pressStartY = touch ? touch.clientY : 0
			this.longpressTimer = setTimeout(() => {
				this.longpressTimer = null
				this.handleLongPress()
			}, MESSAGE_LONGPRESS_DELAY)
		},
		handlePressMove(event) {
			if (!this.longpressTimer) {
				return
			}
			const touch = this.getTouchPoint(event)
			if (!touch) {
				return
			}
			const deltaX = Math.abs(touch.clientX - this.pressStartX)
			const deltaY = Math.abs(touch.clientY - this.pressStartY)
			if (deltaX > MESSAGE_LONGPRESS_MOVE_THRESHOLD || deltaY > MESSAGE_LONGPRESS_MOVE_THRESHOLD) {
				this.clearLongpress()
			}
		},
		handlePressEnd() {
			this.clearLongpress()
		},
		getTouchPoint(event) {
			const changedTouches = event && event.changedTouches
			const touches = event && event.touches
			return (changedTouches && changedTouches[0]) || (touches && touches[0]) || null
		},
		clearLongpress() {
			if (this.longpressTimer) {
				clearTimeout(this.longpressTimer)
				this.longpressTimer = null
			}
		},
		previewImage() {
			if (!this.fullUrl) {
				return
			}
			uni.previewImage({
				current: this.fullUrl,
				urls: [this.fullUrl]
			})
		},
		captureVideoThumbnail() {
			if (!this.isVideo || !this.fullUrl) {
				this.videoThumbnail = ''
				return
			}
			this.videoThumbnail = this.message.coverUrl ? chatStore.getFullUrl(this.message.coverUrl) : ''
		},
		openVideoPlayer() {
			if (!this.fullUrl) {
				return
			}
			const videoList = JSON.stringify([{
				id: this.message.id,
				fileUrl: this.message.fileUrl,
				coverUrl: this.videoThumbnail,
				fileName: this.message.fileName || ''
			}])
			uni.navigateTo({
				url: `/pages/player/index?videoList=${encodeURIComponent(videoList)}&index=0`
			})
		},
		handleLongPress() {
			this.$emit('message-longpress', this.message)
		},
		openSpecialCard() {
			if (this.message.type.indexOf('memo_') === 0 && this.message.memoId) {
				uni.navigateTo({
					url: `/pages/workspace/memo-detail?id=${encodeURIComponent(this.message.memoId)}`
				})
				return
			}
			if (this.message.type.indexOf('document_') === 0 && this.message.documentId) {
				uni.navigateTo({
					url: `/pages/workspace/document-detail?id=${encodeURIComponent(this.message.documentId)}`
				})
				return
			}
			if (this.message.type.indexOf('miniprogram_') === 0 && this.message.appId) {
				uni.navigateTo({
					url: `/pages/workspace/miniprogram-detail?id=${encodeURIComponent(this.message.appId)}`
				})
			}
		},
		syncAudioDuration() {
			if (!this.audioContext) {
				return
			}
			const nextDuration = Number(this.audioContext.duration || 0)
			if (Number.isFinite(nextDuration) && nextDuration > 0) {
				this.duration = nextDuration
			}
		},
		createAudioContext() {
			if (this.audioContext) {
				return this.audioContext
			}
			this.audioContext = uni.createInnerAudioContext()
			this.audioContext.src = this.fullUrl
			this.audioContext.onCanplay(() => {
				setTimeout(() => {
					this.syncAudioDuration()
				}, 0)
			})
			this.audioContext.onPlay(() => {
				this.isPlaying = true
				this.syncAudioDuration()
			})
			this.audioContext.onPause(() => {
				this.isPlaying = false
				if (activeAudioContext === this.audioContext) {
					activeAudioContext = null
				}
			})
			this.audioContext.onEnded(() => {
				this.isPlaying = false
				this.currentTime = 0
				this.audioContext.seek(0)
				if (activeAudioContext === this.audioContext) {
					activeAudioContext = null
				}
			})
			this.audioContext.onTimeUpdate(() => {
				this.syncAudioDuration()
				this.currentTime = this.audioContext.currentTime
			})
			this.audioContext.onError(() => {
				this.isPlaying = false
				this.currentTime = 0
				if (activeAudioContext === this.audioContext) {
					activeAudioContext = null
				}
			})
			return this.audioContext
		},
		togglePlay() {
			const audio = this.createAudioContext()
			if (this.isPlaying) {
				audio.pause()
			} else {
				audio.src = this.fullUrl
				if (activeAudioContext && activeAudioContext !== audio) {
					activeAudioContext.pause()
				}
				activeAudioContext = audio
				audio.play()
			}
		},
		formatDuration(seconds) {
			if (!seconds || isNaN(seconds)) return '00:00'
			const mins = Math.floor(seconds / 60)
			const secs = Math.floor(seconds % 60)
			return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
		},
		getFileIcon(fileName) {
			if (!fileName) return '/static/svg/file-unknown.svg'
			const ext = fileName.split('.').pop().toLowerCase()
			const iconMap = {
				jpg: '/static/svg/file-image.svg',
				jpeg: '/static/svg/file-image.svg',
				png: '/static/svg/file-image.svg',
				gif: '/static/svg/file-image.svg',
				webp: '/static/svg/file-image.svg',
				bmp: '/static/svg/file-image.svg',
				svg: '/static/svg/file-image.svg',
				mp4: '/static/svg/file-video.svg',
				avi: '/static/svg/file-video.svg',
				mov: '/static/svg/file-video.svg',
				wmv: '/static/svg/file-video.svg',
				flv: '/static/svg/file-video.svg',
				webm: '/static/svg/file-video.svg',
				mp3: '/static/svg/file-audio.svg',
				wav: '/static/svg/file-audio.svg',
				ogg: '/static/svg/file-audio.svg',
				aac: '/static/svg/file-audio.svg',
				wma: '/static/svg/file-audio.svg',
				doc: '/static/svg/file-doc.svg',
				docx: '/static/svg/file-doc.svg',
				txt: '/static/svg/file-doc.svg',
				md: '/static/svg/file-doc.svg',
				js: '/static/svg/file-doc.svg',
				ts: '/static/svg/file-doc.svg',
				json: '/static/svg/file-doc.svg',
				html: '/static/svg/file-doc.svg',
				css: '/static/svg/file-doc.svg',
				pdf: '/static/svg/file-pdf.svg',
				xls: '/static/svg/file-xlsx.svg',
				xlsx: '/static/svg/file-xlsx.svg',
				csv: '/static/svg/file-xlsx.svg',
				zip: '/static/svg/file-zip.svg',
				rar: '/static/svg/file-zip.svg',
				'7z': '/static/svg/file-zip.svg',
				tar: '/static/svg/file-zip.svg',
				gz: '/static/svg/file-zip.svg'
			}
			return iconMap[ext] || '/static/svg/file-unknown.svg'
		},
		cleanupAudio() {
			if (this.audioContext) {
				try {
					this.audioContext.stop()
				} catch (error) {
				}
				if (activeAudioContext === this.audioContext) {
					activeAudioContext = null
				}
				this.audioContext.destroy()
				this.audioContext = null
			}
		}
	}
}
</script>

<style lang="scss">
.message-row {
	display: flex;
	align-items: flex-start;
	margin-bottom: 28rpx;
}

.message-row--user {
	justify-content: flex-end;
}

.message-column {
	max-width: 74%;
}

.message-column--user {
	align-items: flex-end;
}

.avatar {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	flex-shrink: 0;
}

.avatar--agent {
	margin-right: 16rpx;
}

.avatar--user {
	margin-left: 16rpx;
}

.avatar-image {
	width: 100%;
	height: 100%;
	border-radius: 50%;
}

.avatar-text {
	font-size: 24rpx;
	font-weight: 700;
	color: #ffffff;
}

.bubble {
	padding: 0rpx 24rpx;
	border-radius: 22rpx;
	word-break: break-word;
	overflow: hidden;
}

.bubble--user {
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
}

.bubble--assistant {
	background: #ffffff;
}

.bubble--media {
	background: transparent;
	padding: 0;
}

.message-text {
	font-size: 30rpx;
	line-height: 1.65;
	color: #0f172a;
	white-space: pre-wrap;
}

.message-text--user {
	color: #ffffff;
}

.media-image {
	max-width: 420rpx;
	border-radius: 24rpx;
	background: #dbeafe;
}

.media-video {
	width: 420rpx;
	height: 300rpx;
	border-radius: 24rpx;
	background: #0f172a;
}

.video-card {
	position: relative;
	width: 420rpx;
	height: 300rpx;
	border-radius: 24rpx;
	overflow: hidden;
	background: #0f172a;
}

.media-video-cover {
	width: 100%;
	height: 100%;
	display: block;
}

.media-video-cover--placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24rpx;
	background: linear-gradient(135deg, #0f172a, #334155);
}

.media-video-label {
	font-size: 24rpx;
	line-height: 1.5;
	color: rgba(255, 255, 255, 0.9);
	text-align: center;
	word-break: break-all;
}

.media-video-play {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background: rgba(15, 23, 42, 0.52);
	display: flex;
	align-items: center;
	justify-content: center;
	backdrop-filter: blur(8rpx);
}

.media-video-play-icon {
	width: 36rpx;
	height: 36rpx;
}

.voice-card,
.file-card,
.special-card {
	display: flex;
	align-items: flex-start;
	background: #eff6ff;
	border: 2rpx solid #d6e8ff;
	border-radius: 24rpx;
	padding: 22rpx;
	box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.06);
}

.message-row:not(.message-row--user) .voice-card,
.message-row:not(.message-row--user) .file-card {
	background: #ffffff;
}

.special-card {
	padding: 22rpx;
	border-radius: 24rpx;
	gap: 18rpx;
	width: 100%;
	box-sizing: border-box;
}

.special-card--assistant {
	background: #ffffff;
	border: 2rpx solid rgba(148, 163, 184, 0.18);
	box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.04);
}

.special-card--user {
	background: #dbeafe;
	border: 2rpx solid rgba(148, 163, 184, 0.18);
	box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.04);
}

.voice-card {
	display: flex;
	flex-direction: column;
	min-width: 280rpx;
	padding: 20rpx 24rpx;
	padding-right: 96rpx;
	position: relative;
}

.voice-card--compact {
	min-width: 0;
	padding-right: 24rpx;
}

.voice-top {
	display: flex;
	align-items: center;
}

.voice-play-btn {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.voice-play-icon {
	width: 28rpx;
	height: 28rpx;
}

.voice-copy {
	flex: 1;
	min-width: 0;
	margin-left: 16rpx;
}

.voice-title,
.special-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
}

.voice-title {
	display: block;
	line-height: 1.5;
	word-break: break-all;
	white-space: normal;
}

.file-name {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
	line-height: 1.5;
	word-break: break-all;
	white-space: normal;
}

.voice-duration {
	font-size: 24rpx;
	color: #64748b;
}

.voice-duration {
	display: block;
	margin-top: 8rpx;
	margin-left: 72rpx;
}

.voice-inline-duration {
	margin-left: 16rpx;
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
	flex-shrink: 0;
}

.file-icon,
.special-icon {
	width: 88rpx;
	height: 88rpx;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.file-icon {
	background: rgba(255, 255, 255, 0.72);
	border: 2rpx solid rgba(148, 163, 184, 0.14);
	box-sizing: border-box;
}

.file-icon__image {
	width: 42rpx;
	height: 42rpx;
}

.special-icon {
	background: rgba(255, 255, 255, 0.72);
	border: 2rpx solid rgba(148, 163, 184, 0.14);
	box-sizing: border-box;
}

.special-icon__image {
	width: 40rpx;
	height: 40rpx;
}

.file-copy,
.special-copy {
	margin-left: 18rpx;
	flex: 1;
	min-width: 0;
}

.special-card--user .special-icon {
	background: rgba(255, 255, 255, 0.72);
	border-color: rgba(148, 163, 184, 0.14);
}

.file-card {
	position: relative;
	padding-right: 96rpx;
	align-items: center;
}

.voice-card .download-action,
.file-card .download-action {
	position: absolute;
	right: 16rpx;
	top: 50%;
	transform: translateY(-50%);
}

.file-url,
.special-summary {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	line-height: 1.5;
	color: #64748b;
	word-break: break-all;
}

.special-card--user .special-title,
.special-card--user .special-summary {
	color: inherit;
}

.special-card--assistant .special-title {
	color: #0f172a;
}

.special-card--assistant .special-summary {
	color: #64748b;
}

.meta-row {
	display: flex;
	align-items: center;
	margin-top: 10rpx;
	padding-left: 6rpx;
}

.meta-row--user {
	justify-content: flex-end;
}

.meta-time,
.meta-pending {
	font-size: 22rpx;
	color: #94a3b8;
}

.meta-pending {
	margin-left: 12rpx;
	color: #f97316;
}
</style>
