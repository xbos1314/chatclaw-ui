<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="profile-page">
		<view class="profile-sticky">
			<view class="profile-header">
				<view class="profile-user">
					<view class="profile-avatar" @tap="pickAvatar">
						<image v-if="avatarUrl" class="profile-avatar__image" :src="avatarUrl" mode="aspectFill"></image>
						<text v-else class="profile-avatar__text">我</text>
						<view class="profile-avatar__camera">
						<image class="profile-avatar__camera-icon" src="/static/svg/camera.svg" mode="aspectFit"></image>
					</view>
					</view>
					<view class="profile-copy">
						<text class="profile-name">{{ store.auth.username || '未登录用户' }}</text>
						<text class="profile-id">{{ store.auth.accountId || '未知账号' }}</text>
					</view>
					<image class="profile-logout" src="/static/svg/logout.svg" mode="aspectFit" @tap="logout"></image>
				</view>
			</view>

			<view class="profile-tabs">
				<view
					v-for="(tab, index) in tabs"
					:key="tab.key"
					class="profile-tab"
					:class="{ 'profile-tab--active': currentIndex === index }"
					@tap="selectTab(index)"
				>
					<image class="profile-tab__icon" :src="currentIndex === index ? tab.activeIcon : tab.icon" mode="aspectFit"></image>
					<text class="profile-tab__text">{{ tab.label }}</text>
				</view>
			</view>
		</view>

		<swiper class="profile-swiper" :current="currentIndex" @change="onSwiperChange">
			<swiper-item v-for="tab in tabs" :key="tab.key">
				<scroll-view
					class="profile-scroll"
					scroll-y
					:refresher-enabled="profileRefreshEnabled && currentType === tab.key"
					:refresher-triggered="refreshing && currentType === tab.key"
					refresher-background="#F7F9FC"
					refresher-threshold="90"
					lower-threshold="120"
					@touchstart="handleProfileScrollTouchStart"
					@touchmove="handleProfileScrollTouchMove"
					@touchend="handleProfileScrollTouchEnd"
					@touchcancel="handleProfileScrollTouchEnd"
					@scroll="handleProfileScroll"
					@refresherrefresh="handleRefresh"
					@scrolltolower="loadMoreByType(tab.key)"
				>
					<view class="profile-body">
						<view v-if="isLoadingType(tab.key) && !getFilesByType(tab.key).length" class="profile-state">
							<text class="profile-state__text">正在加载...</text>
						</view>
						<view v-else-if="!getFilesByType(tab.key).length" class="profile-state">
							<text class="profile-state__text">暂无{{ tab.label }}</text>
						</view>

						<view v-else-if="tab.key === 'image'" class="profile-grid">
							<view
								v-for="file in getFilesByType(tab.key)"
								:key="file.id"
								class="profile-grid__item"
								@touchstart="handleItemTouchStart(file, $event)"
								@touchmove="handleItemTouchMove"
								@touchend="handleItemTouchEnd"
								@touchcancel="handleItemTouchEnd"
							>
								<image class="profile-grid__image" :src="fullUrl(file.fileUrl)" mode="aspectFill" @tap="previewImage(file, tab.key)"></image>
							</view>
						</view>

						<view v-else-if="tab.key === 'video'" class="profile-grid">
							<view
								v-for="file in getFilesByType(tab.key)"
								:key="file.id"
								class="profile-grid__item"
								@tap="goToPlayer(file, tab.key)"
								@touchstart="handleItemTouchStart(file, $event)"
								@touchmove="handleItemTouchMove"
								@touchend="handleItemTouchEnd"
								@touchcancel="handleItemTouchEnd"
							>
								<image class="profile-grid__video" :src="fullUrl(file.coverUrl)" mode="aspectFill"></image>
								<view class="profile-grid__play-icon">
									<image src="/static/svg/play.svg" class="play-icon" mode="aspectFit"></image>
								</view>
							</view>
						</view>

						<view v-else-if="tab.key === 'audio'" class="profile-list">
							<view
								v-for="file in getFilesByType(tab.key)"
								:key="file.id"
								class="profile-card"
								@tap="togglePlay(file)"
								@touchstart="handleItemTouchStart(file, $event)"
								@touchmove="handleItemTouchMove"
								@touchend="handleItemTouchEnd"
								@touchcancel="handleItemTouchEnd"
							>
								<view class="audio-play-btn">
									<image class="audio-play-btn__icon" :src="playingMap[file.id] ? '/static/svg/pause.svg' : '/static/svg/play.svg'" mode="aspectFit"></image>
								</view>
								<view class="profile-card__info">
									<text class="profile-card__title">{{ file.fileName || '音频' }}</text>
									<text class="audio-duration">{{ formatDuration(durationMap[file.id] || getFileDurationSeconds(file)) }}</text>
								</view>
								<download-action class="profile-card__download" :url="fullUrl(file.fileUrl)" :file-name="file.fileName || 'download'"></download-action>
							</view>
						</view>

						<view v-else class="profile-list">
							<view
								v-for="file in getFilesByType(tab.key)"
								:key="file.id"
								class="profile-card"
								@touchstart="handleItemTouchStart(file, $event)"
								@touchmove="handleItemTouchMove"
								@touchend="handleItemTouchEnd"
								@touchcancel="handleItemTouchEnd"
							>
								<image :src="getFileIcon(file.fileName)" class="profile-card__icon" mode="aspectFit"></image>
								<view class="profile-card__info">
									<text class="profile-card__title">{{ file.fileName || '未命名文件' }}</text>
									<text class="profile-card__size">{{ formatFileSize(file.fileSize) }}</text>
								</view>
								<download-action class="profile-card__download" :url="fullUrl(file.fileUrl)" :file-name="file.fileName || 'download'"></download-action>
							</view>
						</view>

						<view v-if="isLoadingMoreType(tab.key)" class="profile-loading-more">加载更多...</view>
					</view>
				</scroll-view>
			</swiper-item>
		</swiper>
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
import DownloadAction from '@/components/download-action.vue'
import chatStore from '@/store/chat'
import { downloadFileByUrl } from '@/services/download'
import { getFiles, uploadFile } from '@/services/http'
import * as api from '@/services/http'

const SWIPE_GESTURE_THRESHOLD = 20
const ITEM_LONGPRESS_DELAY = 450
const ITEM_LONGPRESS_MOVE_THRESHOLD = 12

export default {
	components: {
		ConfirmDialog,
		DownloadAction
	},
	data() {
		return {
			store: chatStore.state,
			currentIndex: 0,
			refreshing: false,
			profileRefreshEnabled: true,
			profileGestureLocked: '',
			profileLongpressBlocked: false,
			profileTouchStartX: 0,
			profileTouchStartY: 0,
			profileScrollTop: 0,
			itemLongpressTimer: null,
			itemLongpressTriggered: false,
			itemTouchStartX: 0,
			itemTouchStartY: 0,
			pendingDeleteFile: null,
			confirmDialog: {
				visible: false,
				title: '',
				message: '',
				confirmText: '确认',
				danger: false,
				action: ''
			},
			tabs: [
				{ key: 'image', label: '图片', icon: '/static/svg/tab-image-gray.svg', activeIcon: '/static/svg/tab-image.svg' },
				{ key: 'video', label: '视频', icon: '/static/svg/tab-video-gray.svg', activeIcon: '/static/svg/tab-video.svg' },
				{ key: 'file', label: '文件', icon: '/static/svg/tab-file-gray.svg', activeIcon: '/static/svg/tab-file.svg' },
				{ key: 'audio', label: '音频', icon: '/static/svg/tab-audio-gray.svg', activeIcon: '/static/svg/tab-audio.svg' }
			],
			cache: {},
			loadingMap: {},
			loadingMoreMap: {},
			pageMap: {},
			hasMoreMap: {},
			audioInstances: {},
			playingMap: {},
			durationMap: {},
		}
	},
	computed: {
		currentType() {
			return this.tabs[this.currentIndex].key
		},
		avatarUrl() {
			return chatStore.getFullUrl(this.store.auth.avatarUrl)
		}
	},
	async onShow() {
		if (!this.store.auth.token) {
			const hasSession = await chatStore.bootstrapSession()
			if (!hasSession) {
				uni.reLaunch({
					url: '/pages/login/index'
				})
				return
			}
		}
		if (!this.cache[this.currentType]) {
			await this.fetchFiles(this.currentType)
		}
	},
	methods: {
		async handleRefresh() {
			if (this.refreshing) {
				return
			}
			this.refreshing = true
			try {
				await this.fetchFiles(this.currentType, true)
			} finally {
				this.refreshing = false
			}
		},
		handleProfileScrollTouchStart(event) {
			const touch = this.getProfileTouchPoint(event)
			this.profileRefreshEnabled = false
			this.profileGestureLocked = ''
			this.profileLongpressBlocked = false
			this.profileTouchStartX = touch ? touch.clientX : 0
			this.profileTouchStartY = touch ? touch.clientY : 0
		},
		handleProfileScrollTouchMove(event) {
			this.handleItemTouchMove(event)
			const touch = this.getProfileTouchPoint(event)
			if (!touch) {
				return
			}
			const deltaX = Math.abs(touch.clientX - this.profileTouchStartX)
			const deltaY = touch.clientY - this.profileTouchStartY
			const absDeltaY = Math.abs(deltaY)
			if (!this.profileGestureLocked) {
				if (deltaX > SWIPE_GESTURE_THRESHOLD && deltaX > absDeltaY) {
					this.profileGestureLocked = 'horizontal'
					this.profileLongpressBlocked = true
				} else if (absDeltaY > SWIPE_GESTURE_THRESHOLD && absDeltaY > deltaX) {
					this.profileGestureLocked = 'vertical'
					this.profileLongpressBlocked = true
				}
			}
			if (
				this.profileGestureLocked === 'vertical' &&
				deltaY > 0 &&
				this.profileScrollTop <= 0
			) {
				this.profileRefreshEnabled = true
			}
		},
		handleProfileScrollTouchEnd() {
			this.handleItemTouchEnd()
			setTimeout(() => {
				this.profileGestureLocked = ''
				this.profileRefreshEnabled = true
				this.profileLongpressBlocked = false
			}, 80)
		},
		handleProfileScroll(event) {
			this.profileScrollTop = Number(event.detail.scrollTop || 0)
		},
		getProfileTouchPoint(event) {
			const changedTouches = event && event.changedTouches
			const touches = event && event.touches
			return (changedTouches && changedTouches[0]) || (touches && touches[0]) || null
		},
		handleItemTouchStart(file, event) {
			const touch = this.getProfileTouchPoint(event)
			this.clearItemLongpress()
			this.itemLongpressTriggered = false
			this.itemTouchStartX = touch ? touch.clientX : 0
			this.itemTouchStartY = touch ? touch.clientY : 0
			this.itemLongpressTimer = setTimeout(() => {
				this.itemLongpressTimer = null
				if (this.profileLongpressBlocked || this.profileGestureLocked) {
					return
				}
				this.itemLongpressTriggered = true
				this.showFileActions(file)
			}, ITEM_LONGPRESS_DELAY)
		},
		handleItemTouchMove(event) {
			if (!this.itemLongpressTimer) {
				return
			}
			const touch = this.getProfileTouchPoint(event)
			if (!touch) {
				return
			}
			const deltaX = Math.abs(touch.clientX - this.itemTouchStartX)
			const deltaY = Math.abs(touch.clientY - this.itemTouchStartY)
			if (deltaX > ITEM_LONGPRESS_MOVE_THRESHOLD || deltaY > ITEM_LONGPRESS_MOVE_THRESHOLD) {
				this.clearItemLongpress()
			}
		},
		handleItemTouchEnd() {
			this.clearItemLongpress()
			setTimeout(() => {
				this.itemLongpressTriggered = false
			}, 0)
		},
		clearItemLongpress() {
			if (this.itemLongpressTimer) {
				clearTimeout(this.itemLongpressTimer)
				this.itemLongpressTimer = null
			}
		},
		async selectTab(index) {
			if (index === this.currentIndex) {
				return
			}
			this.currentIndex = index
			if (!this.cache[this.currentType]) {
				await this.fetchFiles(this.currentType)
			}
		},
		async onSwiperChange(e) {
			const nextIndex = Number(e.detail.current || 0)
			if (nextIndex === this.currentIndex) {
				return
			}
			this.currentIndex = nextIndex
			if (!this.cache[this.currentType]) {
				await this.fetchFiles(this.currentType)
			}
		},
		getFilesByType(type) {
			return this.cache[type] || []
		},
		isLoadingType(type) {
			return !!this.loadingMap[type]
		},
		isLoadingMoreType(type) {
			return !!this.loadingMoreMap[type]
		},
		fullUrl(path) {
			return chatStore.getFullUrl(path)
		},
		getFileIcon(fileName) {
			if (!fileName) return '/static/svg/file-unknown.svg'
			const ext = fileName.split('.').pop()?.toLowerCase()
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
		formatFileSize(bytes) {
			if (!bytes || bytes === 0) return '0 B'
			const k = 1024
			const sizes = ['B', 'KB', 'MB', 'GB']
			const i = Math.floor(Math.log(bytes) / Math.log(k))
			return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
		},
		async fetchFiles(type, refresh) {
			if (this.loadingMap[type]) {
				return
			}
			this.loadingMap = Object.assign({}, this.loadingMap, { [type]: true })
			try {
				const result = await getFiles(type, 1, 10)
				this.cache = Object.assign({}, this.cache, {
					[type]: result.data || []
				})
				this.pageMap = Object.assign({}, this.pageMap, {
					[type]: Number(result.page || 1)
				})
				this.hasMoreMap = Object.assign({}, this.hasMoreMap, {
					[type]: Number(result.total_pages || 1) > Number(result.page || 1)
				})
			} catch (error) {
				if (!refresh) {
					uni.showToast({
						title: error.message || '加载失败',
						icon: 'none'
					})
				}
			} finally {
				this.loadingMap = Object.assign({}, this.loadingMap, { [type]: false })
			}
		},
		async loadMoreByType(type = this.currentType) {
			if (this.loadingMoreMap[type] || this.loadingMap[type] || !this.hasMoreMap[type]) {
				return
			}
			this.loadingMoreMap = Object.assign({}, this.loadingMoreMap, { [type]: true })
			try {
				const nextPage = Number(this.pageMap[type] || 1) + 1
				const result = await getFiles(type, nextPage, 10)
				this.cache = Object.assign({}, this.cache, {
					[type]: (this.cache[type] || []).concat(result.data || [])
				})
				this.pageMap = Object.assign({}, this.pageMap, {
					[type]: Number(result.page || nextPage)
				})
				this.hasMoreMap = Object.assign({}, this.hasMoreMap, {
					[type]: Number(result.total_pages || 1) > Number(result.page || nextPage)
				})
			} finally {
				this.loadingMoreMap = Object.assign({}, this.loadingMoreMap, { [type]: false })
			}
		},
		previewImage(file, type = this.currentType) {
			const urls = this.getFilesByType(type).map(item => this.fullUrl(item.fileUrl))
			uni.previewImage({
				current: this.fullUrl(file.fileUrl),
				urls: urls
			})
		},
		showFileActions(file) {
			const allowSave = this.currentType === 'image' || this.currentType === 'video'
			const itemList = allowSave ? ['保存', '删除'] : ['删除']
			uni.showActionSheet({
				itemList,
				success: async result => {
					if (allowSave && result.tapIndex === 0) {
						await this.saveMediaFile(file)
						return
					}
					if ((allowSave && result.tapIndex === 1) || (!allowSave && result.tapIndex === 0)) {
						await this.deleteMediaFile(file)
					}
				}
			})
		},
		async saveMediaFile(file) {
			try {
				const downloadUrl = await chatStore.getDownloadUrl(file.fileUrl)
				await downloadFileByUrl(downloadUrl, file.fileName || 'download')
				uni.showToast({
					title: '保存成功',
					icon: 'success'
				})
			} catch (error) {
				uni.showToast({
					title: '保存失败',
					icon: 'none'
				})
			}
		},
		async deleteMediaFile(file) {
			const fileId = file.fileId || file.id
			if (!fileId) {
				uni.showToast({
					title: '删除失败',
					icon: 'none'
				})
				return
			}
			this.pendingDeleteFile = file
			this.confirmDialog = {
				visible: true,
				title: '删除文件',
				message: '确定删除这个文件吗？',
				confirmText: '确认删除',
				danger: true,
				action: 'deleteFile'
			}
		},
		async executeDeleteMediaFile(file) {
			const fileId = file.fileId || file.id
			try {
				await api.deleteFileRecord(fileId)
				this.cache = Object.assign({}, this.cache, {
					[this.currentType]: (this.cache[this.currentType] || []).filter(item => item.id !== file.id)
				})
				uni.showToast({
					title: '已删除',
					icon: 'none'
				})
			} catch (error) {
				uni.showToast({
					title: error.message || '删除失败',
					icon: 'none'
				})
			}
		},
		goToPlayer(file, type = this.currentType) {
			const files = this.getFilesByType(type)
			const videoList = JSON.stringify(files)
			uni.navigateTo({
				url: `/pages/player/index?videoList=${encodeURIComponent(videoList)}&index=${files.findIndex(f => f.id === file.id)}`
			})
		},
		async pickAvatar() {
			try {
				const image = await new Promise((resolve, reject) => {
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
						fail: reject
					})
				})
				if (!image) {
					return
				}
				uni.showLoading({
					title: '上传中',
					mask: true
				})
				const uploadResult = await uploadFile(image)
				await chatStore.updateAvatar(uploadResult.fileUrl)
				uni.showToast({
					title: '头像已更新',
					icon: 'none'
				})
			} catch (error) {
				if (error && error.errMsg && error.errMsg.indexOf('cancel') !== -1) {
					return
				}
				uni.showToast({
					title: error.message || '头像上传失败',
					icon: 'none'
				})
			} finally {
				uni.hideLoading()
			}
		},
		async logout() {
			this.confirmDialog = {
				visible: true,
				title: '确认退出',
				message: '确定要退出登录吗？',
				confirmText: '退出登录',
				danger: true,
				action: 'logout'
			}
		},
		closeConfirmDialog() {
			this.pendingDeleteFile = null
			this.confirmDialog = Object.assign({}, this.confirmDialog, { visible: false, action: '' })
		},
		async handleConfirmDialog() {
			const action = this.confirmDialog.action
			const pendingDeleteFile = this.pendingDeleteFile
			this.pendingDeleteFile = null
			this.closeConfirmDialog()
			if (action === 'logout') {
				await chatStore.logout()
				uni.reLaunch({
					url: '/pages/login/index'
				})
				return
			}
			if (action === 'deleteFile' && pendingDeleteFile) {
				await this.executeDeleteMediaFile(pendingDeleteFile)
			}
		},
		createAudioInstance(file) {
			if (this.audioInstances[file.id]) {
				return this.audioInstances[file.id]
			}
			const audio = uni.createInnerAudioContext()
			audio.onPlay(() => {
				this.playingMap = Object.assign({}, this.playingMap, { [file.id]: true })
			})
			audio.onPause(() => {
				this.playingMap = Object.assign({}, this.playingMap, { [file.id]: false })
			})
			audio.onEnded(() => {
				this.playingMap = Object.assign({}, this.playingMap, { [file.id]: false })
			})
			audio.onTimeUpdate(() => {
				this.durationMap = Object.assign({}, this.durationMap, { [file.id]: audio.duration })
			})
			audio.onError(() => {
				this.playingMap = Object.assign({}, this.playingMap, { [file.id]: false })
			})
			this.audioInstances[file.id] = audio
			return audio
		},
		async togglePlay(file) {
			const audio = this.createAudioInstance(file)
			if (this.playingMap[file.id]) {
				audio.pause()
			} else {
				audio.src = await chatStore.getDownloadUrl(file.fileUrl)
				Object.keys(this.audioInstances).forEach(id => {
					if (id !== file.id && this.playingMap[id]) {
						this.audioInstances[id].pause()
						this.playingMap = Object.assign({}, this.playingMap, { [id]: false })
					}
				})
				audio.play()
			}
		},
		getFileDurationSeconds(file) {
			const raw = Number((file && file.duration) || 0)
			if (!Number.isFinite(raw) || raw <= 0) {
				return 0
			}
			return raw >= 1000 ? raw / 1000 : raw
		},
		formatDuration(seconds) {
			if (!seconds || isNaN(seconds)) return '00:00'
			const mins = Math.floor(seconds / 60)
			const secs = Math.floor(seconds % 60)
			return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
		},
		onUnload() {
			Object.values(this.audioInstances).forEach(audio => {
				audio.destroy()
			})
			this.audioInstances = {}
		}
	}
}
</script>

<style lang="scss">
.profile-page {
	position: fixed;
	inset: 0;
	height: 100%;
	display: flex;
	flex-direction: column;
	background: #f7f9fc;
	overflow: hidden;
}

.profile-sticky {
	background: #ffffff;
	flex-shrink: 0;
}

.profile-header {
	padding: calc(24rpx + var(--status-bar-height)) 24rpx 12rpx;
	background: #ffffff;
}

.profile-user {
	display: flex;
	align-items: center;
}

.profile-avatar {
	position: relative;
	width: 124rpx;
	height: 124rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.profile-avatar__image {
	width: 100%;
	height: 100%;
	border-radius: 50%;
}

.profile-avatar__text {
	font-size: 40rpx;
	font-weight: 800;
	color: #ffffff;
}

.profile-avatar__camera {
	position: absolute;
	right: -6rpx;
	bottom: -2rpx;
	padding: 6rpx 10rpx;
	border-radius: 999rpx;
	background: #ffffff;
	border: 2rpx solid #e2e8f0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.profile-avatar__camera-icon {
	width: 22rpx;
	height: 22rpx;
}

.profile-copy {
	flex: 1;
	min-width: 0;
	margin-left: 20rpx;
}

.profile-name {
	display: block;
	font-size: 42rpx;
	font-weight: 700;
	color: #0f172a;
}

.profile-id {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #64748b;
}

.profile-logout {
	width: 32rpx;
	height: 32rpx;
	padding: 12rpx;
	border-radius: 999rpx;
	background: #eff6ff;
}

.profile-tabs {
	display: flex;
	padding: 0 16rpx;
	background: #ffffff;
}

.profile-swiper {
	flex: 1;
	width: 100%;
	min-height: 0;
}

.profile-swiper swiper-item {
	height: 100%;
}

.profile-tab {
	flex: 1;
	padding: 22rpx 0;
	display: flex;
	align-items: center;
	justify-content: center;
	border-bottom: 4rpx solid transparent;
}

.profile-tab--active {
	border-bottom-color: #60a5fa;
}

.profile-tab__icon {
	width: 28rpx;
	height: 28rpx;
	margin-right: 10rpx;
	flex-shrink: 0;
}

.profile-tab__text {
	font-size: 28rpx;
	font-weight: 700;
	color: #64748b;
}

.profile-tab--active .profile-tab__text {
	color: #60a5fa;
}

.profile-scroll {
	flex: 1;
	height: 100%;
	min-height: 0;
}

.profile-body {
	min-height: 100%;
	padding: 12rpx 16rpx calc(120rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.profile-state {
	padding: 120rpx 0;
	text-align: center;
}

.profile-state__text,
.profile-loading-more {
	font-size: 26rpx;
	color: #64748b;
	text-align: center;
}

.profile-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
}

.profile-grid__item {
	position: relative;
	width: calc(50% - 8rpx);
	margin-bottom: 16rpx;
	border-radius: 24rpx;
	overflow: hidden;
	background: #ffffff;
	box-shadow: 0 20rpx 40rpx rgba(15, 23, 42, 0.05);
}

.profile-grid__image,
.profile-grid__video {
	width: 100%;
	height: 360rpx;
	background: #e2e8f0;
	display: block;
}

.profile-grid__play-icon {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
}

.play-icon {
	width: 40rpx;
	height: 40rpx;
}

.profile-list {
	padding-bottom: 24rpx;
}

.profile-card {
	display: flex;
	align-items: center;
	padding: 24rpx 32rpx;
	margin-bottom: 16rpx;
	border-radius: 24rpx;
	background: #ffffff;
	border: 2rpx solid #e2e8f0;
	box-shadow: 0 20rpx 40rpx rgba(15, 23, 42, 0.05);
}

.profile-card__title {
	flex: 1;
	font-size: 30rpx;
	font-weight: 700;
	color: #0f172a;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.profile-card__icon {
	width: 48rpx;
	height: 48rpx;
	margin-right: 20rpx;
	flex-shrink: 0;
}

.profile-card__download {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.profile-card__download-icon {
	width: 40rpx;
	height: 40rpx;
}

.profile-card__audio {
	width: 100%;
	margin-top: 16rpx;
	display: flex;
	align-items: center;
}

.audio-play-btn {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #60a5fa, #38bdf8);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.audio-play-btn__icon {
	width: 32rpx;
	height: 32rpx;
}

.profile-card__info {
	flex: 1;
	margin-left: 20rpx;
	overflow: hidden;
}

.profile-card__size {
	display: block;
	font-size: 24rpx;
	color: #64748b;
	margin-top: 4rpx;
}

.audio-duration {
	display: block;
	font-size: 24rpx;
	color: #64748b;
	margin-top: 4rpx;
}
</style>
