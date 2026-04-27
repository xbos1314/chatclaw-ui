<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="player-page">
		<swiper class="swiper" vertical :circular="false" :disable-touch="isScaling || showSpeedIndicator" :current="currentIndex" @change="onSlideChange">
			<swiper-item class="swiper-item" v-for="(video, index) in videos" :key="video.id || index">
				<view
					:id="`video-container-${index}`"
					:data-src="getFileUrl(video.fileUrl)"
					:data-cover="getFileUrl(video.coverUrl)"
					:data-index="index"
					:data-init="index"
					:data-action="videoAction"
					:change:data-init="renderVideo.initVideo"
					:change:data-action="renderVideo.handleAction"
					class="video-container"
					@click="handleTap"
				></view>
			</swiper-item>
		</swiper>

		<view class="progress-container" :class="{ landscape: isLandscape }" v-show="showControls" @click.stop>
			<view v-if="totalTime > 0" class="time-info">
				{{ formatTime(currentTime) }}
			</view>
			<slider
				class="progress-slider"
				:value="progress"
				:max="100"
				:min="0"
				:step="0.1"
				activeColor="#fff"
				backgroundColor="rgba(255, 255, 255, 0.3)"
				block-size="12"
				@change="handleProgressChange"
				@changing="handleProgressChanging"
			/>
			<view v-if="totalTime > 0" class="time-info">
				{{ formatTime(totalTime) }}
			</view>
			<!-- #ifndef H5 -->
			<view class="fullscreen-btn" @click="changeScreenOrientation">
				<image :src="!isLandscape ? '/static/landscape.svg' : '/static/portrait.svg'" class="fullscreen-icon" />
			</view>
			<!-- #endif -->
		</view>

		<view class="simple-progress" v-if="isPlaying && !showControls">
			<view class="simple-progress-bar" :style="{ width: progress + '%' }"></view>
		</view>

		<view v-if="isLoading" class="loading-indicator">
			<view class="spinner"></view>
		</view>

		<image v-if="showControls && !isPlaying && !isLoading" src="/static/svg/play.svg" class="play-icon" @click="handleTap" />

		<view class="close-btn" :class="{ landscape: isLandscape }" @click="goBack">
			<image src="/static/svg/left.svg" class="close-icon" />
		</view>

		<view v-if="videoScale !== 1" class="reset-scale-btn" :class="{ landscape: isLandscape }" @click.stop="resetScale">
			<image src="/static/refresh.svg" class="reset-scale-icon" />
			<text class="reset-scale-text">还原</text>
		</view>

		<view v-if="showSpeedIndicator" class="speed-indicator" :class="{ landscape: isLandscape }">
			<view class="speed-icon">
				<view class="arrow arrow1"></view>
				<view class="arrow arrow2"></view>
			</view>
			<text class="speed-text">倍速中</text>
		</view>
	</view>
</template>

<script>
import chatStore from '@/store/chat'

export default {
	data() {
		return {
			videos: [],
			currentIndex: 0,
			isPlaying: false,
			isLoading: false,
			progress: 0,
			currentTime: 0,
			totalTime: 0,
			videoAction: {
				type: '',
				index: -1,
				timestamp: 0
			},
			isLandscape: false,
			wasPlayingBeforeSeeking: false,
			isSeeking: false,
			lastSeekProgress: 0,
			showControls: false,
			hideControlsTimer: null,
			isSwitching: false,
			videoScale: 1,
			isScaling: false,
			showSpeedIndicator: false
		}
	},
	onLoad(options) {
		const videoList = options.videoList
		this.currentIndex = Number(options.index || 0)
		if (videoList) {
			try {
				const list = JSON.parse(decodeURIComponent(videoList))
				if (Array.isArray(list) && list.length) {
					this.videos = list
					this.$nextTick(() => {
						this.videoAction = {
							type: 'play',
							index: this.currentIndex,
							timestamp: Date.now()
						}
					})
				}
			} catch (error) {
				console.error('解析视频列表失败:', error)
			}
		}
	},
	onBackPress() {
		if (this.isLandscape) {
			plus.screen.lockOrientation('portrait')
		}
	},
	onUnload() {
		if (this.hideControlsTimer) {
			clearTimeout(this.hideControlsTimer)
			this.hideControlsTimer = null
		}
		if (this.isLandscape) {
			// #ifndef H5
			plus.screen.lockOrientation('portrait')
			// #endif
		}
	},
	methods: {
		getFileUrl(path) {
			if (!path) {
				return ''
			}
			if (
				path.startsWith('http://') ||
				path.startsWith('https://') ||
				path.startsWith('data:') ||
				path.startsWith('blob:') ||
				path.startsWith('file://') ||
				path.startsWith('wxfile://')
			) {
				return path
			}
			if (path.startsWith('/')) {
				return chatStore.getFullUrl(path)
			}
			return chatStore.getFullUrl(path)
		},
		formatTime(seconds) {
			if (!seconds || isNaN(seconds)) return '0:00'
			const mins = Math.floor(seconds / 60)
			const secs = Math.floor(seconds % 60)
			return `${mins}:${secs.toString().padStart(2, '0')}`
		},
		showControlsWithTimeout() {
			this.showControls = true
			if (this.isPlaying) {
				this.startHideControlsTimer()
			}
		},
		startHideControlsTimer() {
			if (this.hideControlsTimer) {
				clearTimeout(this.hideControlsTimer)
			}
			this.hideControlsTimer = setTimeout(() => {
				this.showControls = false
			}, 2500)
		},
		clearHideControlsTimer() {
			if (this.hideControlsTimer) {
				clearTimeout(this.hideControlsTimer)
				this.hideControlsTimer = null
			}
		},
		handleTap() {
			if (this.showControls && !this.isPlaying && !this.isLoading) {
				this.videoAction = {
					type: 'play',
					index: this.currentIndex,
					timestamp: Date.now()
				}
				this.showControls = false
			} else if (this.showControls) {
				if (this.isPlaying) {
					this.videoAction = {
						type: 'pause',
						index: this.currentIndex,
						timestamp: Date.now()
					}
				}
			} else {
				this.showControls = true
				if (this.isPlaying) {
					this.startHideControlsTimer()
				}
			}
		},
		changeScreenOrientation() {
			this.isLandscape = !this.isLandscape
			// #ifndef H5
			if (this.isLandscape) {
				plus.screen.lockOrientation('landscape')
			} else {
				plus.screen.lockOrientation('portrait')
			}
			// #endif
		},
		handleProgressChanging(e) {
			this.clearHideControlsTimer()
			this.showControls = true
			if (this.isPlaying) {
				this.videoAction = {
					type: 'pause',
					index: this.currentIndex,
					timestamp: Date.now()
				}
			}
			if (!this.isSeeking) {
				this.wasPlayingBeforeSeeking = this.isPlaying
				this.isSeeking = true
				this.lastSeekProgress = e.detail.value
			}
			this.progress = e.detail.value
			if (Math.abs(e.detail.value - this.lastSeekProgress) >= 1) {
				const targetTime = (e.detail.value / 100) * this.totalTime
				this.videoAction = {
					type: 'seek',
					index: this.currentIndex,
					time: targetTime,
					timestamp: Date.now()
				}
				this.lastSeekProgress = e.detail.value
			}
		},
		handleProgressChange(e) {
			const targetTime = (e.detail.value / 100) * this.totalTime
			this.videoAction = {
				type: 'seek',
				index: this.currentIndex,
				time: targetTime,
				timestamp: Date.now()
			}
			this.isSeeking = false
			if (this.wasPlayingBeforeSeeking) {
				this.$nextTick(() => {
					this.videoAction = {
						type: 'play',
						index: this.currentIndex,
						timestamp: Date.now()
					}
				})
				this.showControls = false
			}
		},
		onSlideChange(e) {
			const oldIndex = this.currentIndex
			const newIndex = e.detail.current
			this.isSwitching = true
			this.videoAction = {
				type: 'pause',
				index: oldIndex,
				timestamp: Date.now()
			}
			this.progress = 0
			this.currentTime = 0
			this.totalTime = 0
			this.isPlaying = false
			this.showControls = false
			this.clearHideControlsTimer()
			this.videoScale = 1
			this.currentIndex = newIndex
			setTimeout(() => {
				this.isSwitching = false
			}, 100)
			this.$nextTick(() => {
				this.videoAction = {
					type: 'play',
					index: newIndex,
					timestamp: Date.now()
				}
				this.isPlaying = true
			})
		},
		goBack() {
			uni.navigateBack()
		},
		onVideoUpdate(data) {
			if (data.type === 'timeupdate') {
				if (data.duration) {
					if (this.currentTime !== data.currentTime && this.isLoading) {
						this.isLoading = false
					}
					this.currentTime = data.currentTime
					this.totalTime = data.duration
					this.progress = (data.currentTime / data.duration) * 100
				}
			} else if (data.type === 'waiting') {
				this.isLoading = true
			} else if (data.type === 'playing') {
				this.isLoading = false
				this.isPlaying = true
			} else if (data.type === 'pause') {
				if (this.isSwitching) return
				this.isPlaying = false
				this.showControls = true
				this.clearHideControlsTimer()
			}
		},
		onScaleChange(data) {
			this.videoScale = data.scale
		},
		onScaleStateChange(data) {
			this.isScaling = data.isScaling
		},
		onSpeedChange(data) {
			this.showSpeedIndicator = data.speed !== 1
		},
		resetScale() {
			this.videoScale = 1
			this.videoAction = {
				type: 'resetScale',
				index: this.currentIndex,
				timestamp: Date.now()
			}
		}
	}
}
</script>

<script module="renderVideo" lang="renderjs">
export default {
	data() {
		return {
			videoElements: {},
			isScaling: false,
			scale: 1,
			lastDistance: 0,
			translateX: 0,
			translateY: 0,
			isPlay: true
		}
	},
	methods: {
		initVideo(newVal, oldVal, ownerInstance, instance) {
			const index = newVal
			const container = instance.$el
			if (!this.videoElements[index]) {
				this.videoElements[index] = this.createVideo(container, index, ownerInstance)
			}
		},
		handleAction(newVal, oldVal, ownerInstance) {
			const { type, index, time } = newVal
			if (!type || index < 0) return
			const video = this.videoElements[index]
			if (!video) return
			if (type === 'play') {
				this.isPlay = true
				video.play()
				const nextVideo = this.videoElements[index + 1]
				if (nextVideo && nextVideo.readyState < 3) {
					nextVideo.load()
				}
			} else if (type === 'pause') {
				this.isPlay = false
				video.pause()
			} else if (type === 'seek' && time !== undefined) {
				video.currentTime = time
			} else if (type === 'resetScale') {
				this.translateX = 0
				this.translateY = 0
				this.scale = 1
				video.style.transform = 'translate(0px, 0px) scale(1)'
				ownerInstance.callMethod('onScaleChange', { scale: 1 })
			} else if (type === 'setSpeed') {
				video.playbackRate = newVal.speed || 1
				ownerInstance.callMethod('onSpeedChange', { speed: newVal.speed })
			}
		},
		createVideo(container, index, ownerInstance) {
			const video = document.createElement('video')
			video.src = container.dataset.src
			video.style.width = '100%'
			video.style.height = '100%'
			video.style.objectFit = 'contain'
			video.style.transform = 'scale(1)'
			video.style.transition = 'transform 0.1s ease-out'
			video.loop = true
			video.controls = false
			video.playsInline = true
			video.poster = container.dataset.cover
			video.preload = 'metadata'
			video.setAttribute('webkit-playsinline', 'true')
			video.setAttribute('x5-playsinline', 'true')

			let initialDistance = 0
			let initialScale = 1
			let scaleEndTimer = null
			let lastCenterX = 0
			let lastCenterY = 0
			let isSingleTouchInit = false
			let longPressTimer = null
			const LONG_PRESS_DURATION = 300

			video.addEventListener('touchstart', e => {
				if (e.touches.length === 2) {
					if (longPressTimer) {
						clearTimeout(longPressTimer)
						longPressTimer = null
					}
					isSingleTouchInit = false
					this.isScaling = true
					ownerInstance.callMethod('onScaleStateChange', { isScaling: true })
					if (scaleEndTimer) {
						clearTimeout(scaleEndTimer)
						scaleEndTimer = null
					}
					const x1 = e.touches[0].clientX
					const y1 = e.touches[0].clientY
					const x2 = e.touches[1].clientX
					const y2 = e.touches[1].clientY
					const dx = x1 - x2
					const dy = y1 - y2
					initialDistance = Math.hypot(dx, dy)
					initialScale = this.scale
					lastCenterX = (x1 + x2) / 2
					lastCenterY = (y1 + y2) / 2
				} else if (e.touches.length === 1 && this.isPlay) {
					longPressTimer = setTimeout(() => {
						video.playbackRate = 2
						video.play()
						ownerInstance.callMethod('onSpeedChange', { speed: 2 })
						longPressTimer = null
					}, LONG_PRESS_DURATION)
				}
			})

			video.addEventListener('touchmove', e => {
				if (this.isScaling === true && e.touches.length === 2) {
					const x1 = e.touches[0].clientX
					const y1 = e.touches[0].clientY
					const x2 = e.touches[1].clientX
					const y2 = e.touches[1].clientY
					const dx = x1 - x2
					const dy = y1 - y2
					const currentDistance = Math.hypot(dx, dy)
					let newScale = this.scale
					if (initialDistance > 0) {
						newScale = (currentDistance / initialDistance) * initialScale
						newScale = Math.min(Math.max(newScale, 0.5), 8)
					}
					const centerX = (x1 + x2) / 2
					const centerY = (y1 + y2) / 2
					const elementCenterX = video.offsetWidth / 2
					const elementCenterY = video.offsetHeight / 2
					const imagePinchX = (centerX - elementCenterX - this.translateX) / this.scale + elementCenterX
					const imagePinchY = (centerY - elementCenterY - this.translateY) / this.scale + elementCenterY
					const newTranslateX = centerX - newScale * (imagePinchX - elementCenterX) - elementCenterX
					const newTranslateY = centerY - newScale * (imagePinchY - elementCenterY) - elementCenterY
					this.scale = newScale
					this.translateX = newTranslateX
					this.translateY = newTranslateY
					lastCenterX = centerX
					lastCenterY = centerY
					video.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`
					ownerInstance.callMethod('onScaleChange', { scale: this.scale })
				} else if (this.isScaling === true && e.touches.length === 1) {
					const x = e.touches[0].clientX
					const y = e.touches[0].clientY
					if (!isSingleTouchInit) {
						lastCenterX = x
						lastCenterY = y
						isSingleTouchInit = true
						return
					}
					const moveX = x - lastCenterX
					const moveY = y - lastCenterY
					this.translateX += moveX
					this.translateY += moveY
					lastCenterX = x
					lastCenterY = y
					video.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`
				} else if (e.touches.length === 1) {
					if (longPressTimer) {
						clearTimeout(longPressTimer)
						longPressTimer = null
					}
				}
				e.preventDefault()
			})

			video.addEventListener('touchend', e => {
				if (longPressTimer) {
					clearTimeout(longPressTimer)
					longPressTimer = null
				}
				if (video.playbackRate === 2) {
					video.playbackRate = 1
					ownerInstance.callMethod('onSpeedChange', { speed: 1 })
				}
				if (this.isScaling && e.touches.length === 0) {
					isSingleTouchInit = false
					initialDistance = 0
					if (scaleEndTimer) {
						clearTimeout(scaleEndTimer)
					}
					scaleEndTimer = setTimeout(() => {
						this.isScaling = false
						ownerInstance.callMethod('onScaleStateChange', { isScaling: false })
					}, 250)
				}
			})

			video.addEventListener('timeupdate', () => {
				ownerInstance.callMethod('onVideoUpdate', {
					type: 'timeupdate',
					currentTime: video.currentTime,
					duration: video.duration
				})
			})
			video.addEventListener('waiting', () => {
				ownerInstance.callMethod('onVideoUpdate', { type: 'waiting' })
			})
			video.addEventListener('playing', () => {
				ownerInstance.callMethod('onVideoUpdate', { type: 'playing' })
			})
			video.addEventListener('pause', () => {
				ownerInstance.callMethod('onVideoUpdate', { type: 'pause' })
			})

			container.appendChild(video)
			return video
		}
	}
}
</script>

<style scoped>
.player-page {
	position: fixed;
	inset: 0;
	overflow: hidden;
	background: #000;
	z-index: 9999;
}

.swiper {
	width: 100vw;
	height: 100vh;
}

.video-container {
	width: 100vw;
	height: 100vh;
}

.close-btn {
	position: fixed;
	top: calc(var(--status-bar-height) + 10px);
	left: 12px;
	width: clamp(36px, 6vw, 48px);
	height: clamp(36px, 6vw, 48px);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 25;
}

.close-btn.landscape {
	top: calc(env(safe-area-inset-top) + 22px);
}

.close-icon {
	width: clamp(22px, 4vw, 28px);
	height: clamp(22px, 4vw, 28px);
	filter: brightness(0) invert(1);
}

.progress-container {
	position: fixed;
	left: 20px;
	right: 20px;
	bottom: calc(env(safe-area-inset-bottom) + 15px);
	display: flex;
	align-items: center;
	gap: clamp(8px, 2vw, 12px);
	z-index: 25;
	transition: bottom 0.3s ease;
}

.progress-container.landscape {
	bottom: calc(env(safe-area-inset-bottom) + 0px);
}

.progress-slider {
	flex: 1;
}

.fullscreen-btn {
	width: clamp(36px, 6vw, 48px);
	height: clamp(36px, 6vw, 48px);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.fullscreen-icon {
	width: clamp(18px, 4vw, 26px);
	height: clamp(18px, 4vw, 26px);
	filter: brightness(0) invert(1);
}

.time-info {
	color: white;
	font-size: clamp(15px, 3vw, 17px);
	opacity: 0.85;
	white-space: nowrap;
	flex-shrink: 0;
}

.simple-progress {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: 3px;
	background: rgba(255, 255, 255, 0.3);
	z-index: 10;
}

.simple-progress-bar {
	height: 100%;
	background: #fff;
	transition: width 0.1s linear;
}

.loading-indicator {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 20;
}

.spinner {
	width: clamp(32px, 6vw, 48px);
	height: clamp(32px, 6vw, 48px);
	border: 3px solid rgba(255, 255, 255, 0.3);
	border-top-color: white;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

.play-icon {
	position: fixed;
	top: 50%;
	left: 50%;
	width: clamp(40px, 12vw, 70px);
	height: clamp(40px, 12vw, 70px);
	opacity: 0.85;
	z-index: 20;
	transform: translate(-50%, -50%);
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.reset-scale-btn {
	position: fixed;
	right: 20px;
	bottom: calc(env(safe-area-inset-bottom) + 60px);
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	background: rgba(0, 0, 0, 0.3);
	border-radius: 20px;
	z-index: 25;
	backdrop-filter: blur(10px);
}

.reset-scale-btn.landscape {
	bottom: calc(env(safe-area-inset-bottom) + 50px);
}

.reset-scale-icon {
	width: 18px;
	height: 18px;
	filter: brightness(0) invert(1);
}

.reset-scale-text {
	color: #fff;
	font-size: 14px;
	font-weight: 500;
}

.speed-indicator {
	position: fixed;
	left: 50%;
	transform: translateX(-50%);
	bottom: calc(env(safe-area-inset-bottom) + 60px);
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	background: rgba(0, 0, 0, 0.3);
	border-radius: 20px;
	z-index: 25;
	backdrop-filter: blur(10px);
}

.speed-indicator.landscape {
	bottom: calc(env(safe-area-inset-bottom) + 50px);
}

.speed-indicator .speed-text {
	color: #fff;
	font-size: 14px;
	font-weight: 500;
}

.speed-icon {
	display: flex;
}

.arrow {
	width: 0;
	height: 0;
	border-top: 6px solid transparent;
	border-bottom: 6px solid transparent;
	border-left: 10px solid #fff;
	opacity: 0.3;
}

.arrow1 {
	animation: blink 1s infinite;
}

.arrow2 {
	margin-left: 1.5px;
	animation: blink 1s infinite 0.5s;
}

@keyframes blink {
	0%,
	100% {
		opacity: 0.3;
	}
	50% {
		opacity: 1;
	}
}
</style>
