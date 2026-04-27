<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="workspace-page">
		<view class="workspace-tabs">
			<view
				v-for="(tab, index) in tabs"
				:key="tab.key"
				class="workspace-tab"
				:class="{ 'workspace-tab--active': currentIndex === index }"
				@tap="selectTab(index)"
			>
				<image class="workspace-tab__icon" :src="currentIndex === index ? tab.activeIcon : tab.icon" mode="aspectFit"></image>
				<text class="workspace-tab__text">{{ tab.label }}</text>
			</view>
		</view>

		<swiper class="workspace-swiper" :current="currentIndex" @change="onSwiperChange">
			<swiper-item>
				<scroll-view
					class="workspace-scroll"
					scroll-y
					:refresher-enabled="workspaceRefreshEnabled && currentIndex === 0"
					:refresher-triggered="refreshing"
					refresher-background="#F7F9FC"
					refresher-threshold="90"
					@touchstart="handleWorkspaceScrollTouchStart"
					@touchmove="handleWorkspaceScrollTouchMove"
					@touchend="handleWorkspaceScrollTouchEnd"
					@touchcancel="handleWorkspaceScrollTouchEnd"
					@scroll="handleWorkspaceScroll"
					@refresherrefresh="handleRefresh"
				>
					<view class="workspace-body">
						<view v-if="loading" class="workspace-state">
							<text class="workspace-state__text">正在加载...</text>
						</view>
						<template v-else>
							<view v-if="!memoItems.length" class="intro-card">
								<view class="intro-card__head">
									<text class="intro-card__title">AI 语音备忘录</text>
								</view>
								<text class="intro-card__desc">点击右下角加号即可创建语音备忘，智能体会自动整理标题、摘要和正文。</text>
							</view>
							<view v-for="item in memoItems" :key="item.id" class="workspace-card" @tap="openMemo(item)">
								<view class="workspace-card__row">
									<view class="workspace-card__left">
										<view class="workspace-card__icon-box" :class="{ 'workspace-card__icon-box--muted': item.status !== 'completed' }">
											<image class="workspace-card__icon" src="/static/svg/memo-card.svg" mode="aspectFit"></image>
										</view>
										<text class="workspace-card__title">{{ item.title || '未命名备忘' }}</text>
									</view>
									<text class="workspace-card__status-chip" :class="`workspace-card__status-chip--${item.status}`">{{ memoStatusText(item.status) }}</text>
								</view>
								<text class="workspace-card__desc">{{ item.summary || item.originalText || '等待智能体整理中...' }}</text>
								<view class="workspace-card__meta">
									<text class="workspace-card__meta-chip">{{ formatRelativeTime(item.createdAt) }}</text>
									<text class="workspace-card__meta-chip">{{ item.agentId }}</text>
								</view>
							</view>
						</template>
					</view>
				</scroll-view>
			</swiper-item>

			<swiper-item>
				<scroll-view
					class="workspace-scroll"
					scroll-y
					:refresher-enabled="workspaceRefreshEnabled && currentIndex === 1"
					:refresher-triggered="refreshing"
					refresher-background="#F7F9FC"
					refresher-threshold="90"
					@touchstart="handleWorkspaceScrollTouchStart"
					@touchmove="handleWorkspaceScrollTouchMove"
					@touchend="handleWorkspaceScrollTouchEnd"
					@touchcancel="handleWorkspaceScrollTouchEnd"
					@scroll="handleWorkspaceScroll"
					@refresherrefresh="handleRefresh"
				>
					<view class="workspace-body">
						<view v-if="loading" class="workspace-state">
							<text class="workspace-state__text">正在加载...</text>
						</view>
						<template v-else>
							<view v-if="!miniprogramItems.length" class="intro-card">
								<view class="intro-card__head">
									<text class="intro-card__title">AI 小程序工作台</text>
								</view>
								<text class="intro-card__desc">创建后智能体会生成可访问的小程序页面、项目文件和任务记录。</text>
							</view>
							<view v-for="item in miniprogramItems" :key="item.appId" class="workspace-card" @tap="openMiniprogram(item)">
								<view class="workspace-card__row">
									<view class="workspace-card__left">
										<view class="workspace-card__icon-box">
											<image class="workspace-card__icon" src="/static/svg/miniprogram-card.svg" mode="aspectFit"></image>
										</view>
										<text class="workspace-card__title">{{ item.name }}</text>
									</view>
									<text class="workspace-card__status-chip" :class="`workspace-card__status-chip--${item.status}`">{{ miniprogramStatusText(item.status) }}</text>
								</view>
								<text class="workspace-card__desc">{{ item.summary || item.description || '暂无说明' }}</text>
								<view class="workspace-card__actions">
									<view class="workspace-card__action" :class="{ 'workspace-card__action--disabled': item.status !== 'ready' }" @tap.stop="openMiniprogramProject(item)">打开</view>
									<view class="workspace-card__action workspace-card__action--secondary" @tap.stop="openMiniprogram(item)">详情</view>
								</view>
							</view>
						</template>
					</view>
				</scroll-view>
			</swiper-item>

			<swiper-item>
				<scroll-view
					class="workspace-scroll"
					scroll-y
					:refresher-enabled="workspaceRefreshEnabled && currentIndex === 2"
					:refresher-triggered="refreshing"
					refresher-background="#F7F9FC"
					refresher-threshold="90"
					@touchstart="handleWorkspaceScrollTouchStart"
					@touchmove="handleWorkspaceScrollTouchMove"
					@touchend="handleWorkspaceScrollTouchEnd"
					@touchcancel="handleWorkspaceScrollTouchEnd"
					@scroll="handleWorkspaceScroll"
					@refresherrefresh="handleRefresh"
				>
					<view class="workspace-body">
						<view v-if="loading" class="workspace-state">
							<text class="workspace-state__text">正在加载...</text>
						</view>
						<template v-else>
							<view v-if="!documentItems.length" class="intro-card">
								<view class="intro-card__head">
									<text class="intro-card__title">AI 云文档</text>
								</view>
								<text class="intro-card__desc">创建 Markdown 文档后，可以编辑、预览、查看任务，并把文档继续发送给智能体完善。</text>
							</view>
							<view v-for="item in documentItems" :key="item.id" class="workspace-card" @tap="openDocument(item)">
								<view class="workspace-card__row">
									<view class="workspace-card__left">
										<view class="workspace-card__icon-box">
											<image class="workspace-card__icon" src="/static/svg/document-card.svg" mode="aspectFit"></image>
										</view>
										<text class="workspace-card__title">{{ item.fileName || '未命名文档.md' }}</text>
									</view>
									<text class="workspace-card__status-chip workspace-card__status-chip--ready">{{ documentStatusText(item.status) }}</text>
								</view>
								<text class="workspace-card__desc">{{ item.summary || '暂无摘要' }}</text>
								<view class="workspace-card__meta">
									<text class="workspace-card__meta-chip">{{ formatRelativeTime(item.updatedAt) }}</text>
								</view>
							</view>
						</template>
					</view>
				</scroll-view>
			</swiper-item>
		</swiper>

		<view class="workspace-fab" @tap="handleCreate">
			<text class="workspace-fab__text">+</text>
		</view>

		<view v-if="showMemoPanel" class="overlay-mask" @tap="handleMemoMaskTap" @touchmove.stop.prevent>
			<view class="sheet-panel" @tap.stop>
				<view v-if="memoUploading" class="memo-panel memo-panel--uploading">
					<view class="memo-uploading">
						<view class="memo-uploading__spinner"></view>
						<view class="memo-uploading__copy">
							<text class="memo-uploading__title">正在保存语音备忘</text>
							<text class="memo-uploading__desc">即将发送给智能体整理，请稍候</text>
						</view>
					</view>
				</view>
				<view v-else-if="memoShowAgentSelector" class="memo-panel memo-panel--selector">
					<view class="memo-agent-selector">
						<view class="memo-agent-selector__head">
							<text class="memo-agent-selector__title">发送给谁整理</text>
						</view>
						<text class="memo-agent-selector__desc">选择一个智能体来整理这条语音备忘</text>
						<view class="agent-chip-wrap agent-chip-wrap--memo">
							<view
								v-for="agent in agentOptions"
								:key="agent.id"
								class="agent-chip"
								@tap="selectMemoAgentAndSave(agent)"
							>
								<text class="agent-chip__text">{{ agent.name }}</text>
							</view>
						</view>
						<view class="memo-agent-selector__actions">
							<view class="memo-agent-selector__cancel" @tap="cancelMemoAgentSelect">取消</view>
						</view>
					</view>
				</view>
				<view v-else class="memo-panel">
					<view class="memo-panel__top">
						<view class="memo-panel__spacer"></view>
						<view class="sheet-close" @tap="cancelMemoPanel">
							<image class="sheet-close__icon" src="/static/svg/close-black.svg" mode="aspectFit"></image>
						</view>
					</view>
					<view v-if="memoRecording" class="memo-panel__hint memo-panel__hint--recording">
						<text class="memo-panel__title memo-panel__title--recording">正在录音</text>
						<view class="memo-panel__hint-row">
							<text class="memo-panel__desc">{{ memoRecordHint }}</text>
							<view v-if="memoRecordingLocked" class="memo-panel__lock-chip">
								<text class="memo-panel__lock-chip-text">录音已锁定</text>
							</view>
						</view>
					</view>
					<view v-else class="memo-panel__hint">
						<text class="memo-panel__title">语音备忘</text>
						<text class="memo-panel__desc">长按下方麦克风，松开后选择智能体整理</text>
					</view>
					<view class="memo-panel__mic-wrap">
						<view
							class="memo-panel__mic-button"
							:class="{ 'memo-panel__mic-button--recording': memoRecording }"
							@tap.stop.prevent="handleMemoMicTap"
							@touchstart.stop.prevent="handleMemoRecordingPressStart"
							@touchmove.stop.prevent="handleMemoRecordingMove"
							@touchend.stop.prevent="handleMemoRecordingRelease"
							@touchcancel.stop.prevent="cancelMemoRecording"
						>
							<image
								class="memo-panel__mic-icon"
								:src="memoRecording ? '/static/svg/audio-wave.svg' : '/static/svg/mic.svg'"
								mode="aspectFit"
							></image>
							<text class="memo-panel__mic-text">{{ memoRecording ? '录音中' : '按住说话' }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<view v-if="showMemoUnsupportedPanel" class="overlay-mask" @tap="closeMemoUnsupportedPanel" @touchmove.stop.prevent>
			<view class="sheet-panel" @tap.stop>
				<view class="sheet-header">
					<text class="sheet-title">创建语音备忘</text>
					<view class="sheet-close" @tap="closeMemoUnsupportedPanel">
						<image class="sheet-close__icon" src="/static/svg/close-black.svg" mode="aspectFit"></image>
					</view>
				</view>
				<view class="sheet-empty">
					<text class="sheet-empty__title">H5暂不支持创建语音备忘</text>
					<text class="sheet-empty__desc">请在小程序或 App 端使用录音创建语音备忘。</text>
				</view>
			</view>
		</view>

		<view v-if="showDocumentPanel" class="overlay-mask" @tap="closeDocumentPanel" @touchmove.stop.prevent>
			<view class="sheet-panel" @tap.stop>
				<view class="sheet-header">
					<text class="sheet-title">新建云文档</text>
					<view class="sheet-close" @tap="closeDocumentPanel">
						<image class="sheet-close__icon" src="/static/svg/close-black.svg" mode="aspectFit"></image>
					</view>
				</view>
				<view class="sheet-section">
					<input v-model="documentForm.fileName" class="sheet-input" placeholder="输入文件名" />
				</view>
				<view class="sheet-actions">
					<view class="app-btn app-btn--secondary sheet-actions__item" @tap="closeDocumentPanel">取消</view>
					<view class="app-btn sheet-actions__item" @tap="submitDocumentCreate">创建文档</view>
				</view>
			</view>
		</view>

		<view v-if="showMiniprogramPanel" class="overlay-mask" @tap="closeMiniprogramPanel" @touchmove.stop.prevent>
			<view class="sheet-panel" @tap.stop>
				<view class="sheet-header">
					<text class="sheet-title">创建小程序</text>
					<view class="sheet-close" @tap="closeMiniprogramPanel">
						<image class="sheet-close__icon" src="/static/svg/close-black.svg" mode="aspectFit"></image>
					</view>
				</view>
				<view class="sheet-section">
					<input v-model="miniprogramForm.name" class="sheet-input" placeholder="小程序名称（可选）" />
				</view>
				<view class="sheet-section">
					<textarea v-model="miniprogramForm.prompt" class="sheet-textarea" auto-height maxlength="-1" placeholder="描述你想要的小程序功能..."></textarea>
				</view>
				<view class="sheet-section">
					<text class="sheet-label">选择智能体</text>
					<view class="agent-chip-wrap">
						<view
							v-for="(agent, index) in agentOptions"
							:key="agent.id"
							class="agent-chip"
							:class="{ 'agent-chip--active': selectedMiniprogramAgentIndex === index }"
							@tap="selectedMiniprogramAgentIndex = index"
						>
							<text class="agent-chip__text">{{ agent.name }}</text>
						</view>
					</view>
				</view>
				<view class="sheet-section">
					<textarea v-model="miniprogramForm.notes" class="sheet-textarea" auto-height maxlength="-1" placeholder="补充风格、页面、交互偏好（可选）"></textarea>
				</view>
				<view class="sheet-actions">
					<view class="app-btn app-btn--secondary sheet-actions__item" @tap="closeMiniprogramPanel">取消</view>
					<view class="app-btn sheet-actions__item" @tap="submitMiniprogramCreate">提交</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import chatStore from '@/store/chat'
import { workspaceService } from '@/services/workspace'

const MEMO_LOCK_THRESHOLD = 60
const MEMO_LONG_PRESS_DELAY = 300
const SWIPE_GESTURE_THRESHOLD = 20

export default {
	data() {
		return {
			currentIndex: 0,
			refreshing: false,
			workspaceRefreshEnabled: true,
			workspaceGestureLocked: '',
			workspaceTouchStartX: 0,
			workspaceTouchStartY: 0,
			workspaceScrollTop: 0,
			loading: false,
			loadingTabKey: '',
			loadedTabMap: {},
			tabs: [
				{ key: 'memo', label: '语音备忘', icon: '/static/svg/memo-card-gray.svg', activeIcon: '/static/svg/memo-card.svg', subtitle: '记录语音后交给智能体整理结构化备忘。' },
				{ key: 'miniapp', label: '小程序', icon: '/static/svg/miniprogram-card-gray.svg', activeIcon: '/static/svg/miniprogram-card.svg', subtitle: '创建、查看和继续完善 AI 生成的小程序。' },
				{ key: 'document', label: '云文档', icon: '/static/svg/document-card-gray.svg', activeIcon: '/static/svg/document-card.svg', subtitle: '整理长期可编辑的 Markdown 云文档。' }
			],
			memoItems: [],
			documentItems: [],
			miniprogramItems: [],
			showMemoPanel: false,
			showMemoUnsupportedPanel: false,
			showDocumentPanel: false,
			showMiniprogramPanel: false,
			recorderManager: null,
			memoRecording: false,
			memoRecordingLocked: false,
			memoRecordingLockReleaseGuard: false,
			memoShowAgentSelector: false,
			memoUploading: false,
			memoRecordStartAt: 0,
			memoRecordDuration: 0,
			memoRecordDurationMs: 0,
			memoRecordStartX: 0,
			memoRecordStartY: 0,
			memoPressTimer: null,
			memoRecordTimer: null,
			memoTempPath: '',
			memoStopResolver: null,
			selectedMiniprogramAgentIndex: 0,
			documentForm: {
				fileName: ''
			},
			miniprogramForm: {
				name: '',
				prompt: '',
				notes: ''
			}
		}
	},
	beforeUnmount() {
		if (this.memoPressTimer) {
			clearTimeout(this.memoPressTimer)
			this.memoPressTimer = null
		}
		if (this.memoRecordTimer) {
			clearInterval(this.memoRecordTimer)
			this.memoRecordTimer = null
		}
	},
	computed: {
		currentTab() {
			return this.tabs[this.currentIndex]
		},
		agentOptions() {
			return chatStore.state.agents || []
		},
		memoRecordHint() {
			const duration = this.formatMemoDuration(this.memoRecordDuration)
			if (this.memoRecordingLocked) {
				return `${duration}  点击按钮结束`
			}
			return `${duration}  上滑锁定，松开结束`
		}
	},
	async onShow() {
		if (!chatStore.state.auth.token) {
			const hasSession = await chatStore.bootstrapSession()
			if (!hasSession) {
				uni.reLaunch({ url: '/pages/login/index' })
				return
			}
		}
		// #ifndef H5
		if (!this.recorderManager && uni.getRecorderManager) {
			this.recorderManager = uni.getRecorderManager()
			this.recorderManager.onStop(result => {
				this.memoTempPath = result.tempFilePath || ''
				this.memoRecordDurationMs = Number(result.duration || 0)
				if (this.memoStopResolver) {
					this.memoStopResolver({
						tempFilePath: this.memoTempPath,
						duration: this.memoRecordDurationMs
					})
					this.memoStopResolver = null
				}
			})
		}
		// #endif
		if (!this.loadedTabMap[this.currentTab.key]) {
			await this.loadCurrentTab()
		}
	},
	methods: {
		async handleRefresh() {
			if (this.refreshing) {
				return
			}
			this.refreshing = true
			try {
				await this.loadCurrentTab({ force: true })
			} finally {
				this.refreshing = false
			}
		},
		handleWorkspaceScrollTouchStart(event) {
			const touch = this.getWorkspaceTouchPoint(event)
			this.workspaceRefreshEnabled = false
			this.workspaceGestureLocked = ''
			this.workspaceTouchStartX = touch ? touch.clientX : 0
			this.workspaceTouchStartY = touch ? touch.clientY : 0
		},
		handleWorkspaceScrollTouchMove(event) {
			const touch = this.getWorkspaceTouchPoint(event)
			if (!touch) {
				return
			}
			const deltaX = Math.abs(touch.clientX - this.workspaceTouchStartX)
			const deltaY = touch.clientY - this.workspaceTouchStartY
			const absDeltaY = Math.abs(deltaY)
			if (!this.workspaceGestureLocked) {
				if (deltaX > SWIPE_GESTURE_THRESHOLD && deltaX > absDeltaY) {
					this.workspaceGestureLocked = 'horizontal'
				} else if (absDeltaY > SWIPE_GESTURE_THRESHOLD && absDeltaY > deltaX) {
					this.workspaceGestureLocked = 'vertical'
				}
			}
			if (
				this.workspaceGestureLocked === 'vertical' &&
				deltaY > 0 &&
				this.workspaceScrollTop <= 0
			) {
				this.workspaceRefreshEnabled = true
			}
		},
		handleWorkspaceScrollTouchEnd() {
			setTimeout(() => {
				this.workspaceGestureLocked = ''
				this.workspaceRefreshEnabled = true
			}, 80)
		},
		handleWorkspaceScroll(event) {
			this.workspaceScrollTop = Number(event.detail.scrollTop || 0)
		},
		getWorkspaceTouchPoint(event) {
			const changedTouches = event && event.changedTouches
			const touches = event && event.touches
			return (changedTouches && changedTouches[0]) || (touches && touches[0]) || null
		},
		async selectTab(index) {
			if (index === this.currentIndex) {
				return
			}
			this.currentIndex = index
			if (!this.loadedTabMap[this.currentTab.key]) {
				await this.loadCurrentTab()
			}
		},
		async onSwiperChange(e) {
			const nextIndex = Number(e.detail.current || 0)
			if (nextIndex === this.currentIndex) {
				return
			}
			this.currentIndex = nextIndex
			if (!this.loadedTabMap[this.currentTab.key]) {
				await this.loadCurrentTab()
			}
		},
		async loadCurrentTab(options = {}) {
			const { force = false } = options
			const tabKey = this.currentTab.key
			if (!force && this.loadedTabMap[tabKey]) {
				return
			}
			if (!force && this.loading && this.loadingTabKey === tabKey) {
				return
			}
			this.loadingTabKey = tabKey
			this.loading = true
			try {
				if (tabKey === 'memo') {
					const result = await workspaceService.getMemoList({ page: 1, pageSize: 50 })
					this.memoItems = result.items
				} else if (tabKey === 'miniapp') {
					const result = await workspaceService.getMiniprogramList({ page: 1, pageSize: 50 })
					this.miniprogramItems = result.items
				} else {
					const result = await workspaceService.getDocumentList({ page: 1, pageSize: 50 })
					this.documentItems = result.items
				}
				this.loadedTabMap = Object.assign({}, this.loadedTabMap, { [tabKey]: true })
			} catch (error) {
				uni.showToast({ title: error.message || '加载失败', icon: 'none' })
			} finally {
				if (this.loadingTabKey === tabKey) {
					this.loading = false
					this.loadingTabKey = ''
				}
			}
		},
		handleCreate() {
			if (this.currentTab.key === 'memo') {
				// #ifdef H5
				this.showMemoUnsupportedPanel = true
				return
				// #endif
				this.resetMemoState()
				this.showMemoPanel = true
				return
			}
			if (this.currentTab.key === 'document') {
				this.showCreateDocumentDialog()
				return
			}
			this.showCreateMiniprogramDialog()
		},
		handleMemoMaskTap() {
			if (this.memoUploading) {
				return
			}
			this.cancelMemoPanel()
		},
		cancelMemoPanel() {
			if (this.memoRecording) {
				this.showMemoPanel = false
				this.cancelMemoRecording(true)
				return
			}
			this.showMemoPanel = false
			this.resetMemoState()
		},
		closeMemoUnsupportedPanel() {
			this.showMemoUnsupportedPanel = false
		},
		closeDocumentPanel() {
			this.showDocumentPanel = false
			this.documentForm.fileName = ''
		},
		closeMiniprogramPanel() {
			this.showMiniprogramPanel = false
			this.miniprogramForm = { name: '', prompt: '', notes: '' }
		},
		handleMemoRecordingPressStart(event) {
			if (this.memoRecording || this.memoPressTimer || !this.recorderManager) {
				return
			}
			const touch = this.getMemoTouchPoint(event)
			this.memoRecordStartX = touch ? touch.clientX : 0
			this.memoPressTimer = setTimeout(() => {
				this.memoPressTimer = null
				this.startMemoRecording(event)
			}, MEMO_LONG_PRESS_DELAY)
		},
		startMemoRecording(event) {
			if (!this.recorderManager || this.memoRecording) {
				return
			}
			const touch = this.getMemoTouchPoint(event)
			this.memoTempPath = ''
			this.memoRecording = true
			this.memoRecordingLocked = false
			this.memoRecordingLockReleaseGuard = false
			this.memoShowAgentSelector = false
			this.memoRecordDuration = 0
			this.memoRecordDurationMs = 0
			this.memoRecordStartAt = Date.now()
			this.memoRecordStartX = touch ? touch.clientX : 0
			this.memoRecordStartY = touch ? touch.clientY : 0
			this.memoRecordTimer = setInterval(() => {
				const elapsedMs = Math.max(0, Date.now() - this.memoRecordStartAt)
				this.memoRecordDurationMs = elapsedMs
				this.memoRecordDuration = Math.max(1, Math.floor(elapsedMs / 1000))
			}, 200)
			this.recorderManager.start({ format: 'mp3' })
		},
		handleMemoRecordingMove(event) {
			if (!this.memoRecording || this.memoRecordingLocked) {
				return
			}
			const touch = this.getMemoTouchPoint(event)
			if (!touch) {
				return
			}
			if (!this.memoRecordStartY) {
				this.memoRecordStartY = touch.clientY
			}
			if (this.memoRecordStartY - touch.clientY >= MEMO_LOCK_THRESHOLD) {
				this.memoRecordingLocked = true
				this.memoRecordingLockReleaseGuard = true
			}
		},
		async handleMemoRecordingRelease() {
			if (this.memoPressTimer) {
				clearTimeout(this.memoPressTimer)
				this.memoPressTimer = null
			}
			if (!this.memoRecording) {
				return
			}
			if (this.memoRecordingLocked) {
				if (this.memoRecordingLockReleaseGuard) {
					this.memoRecordingLockReleaseGuard = false
					return
				}
				await this.finishMemoRecording()
				return
			}
			await this.finishMemoRecording()
		},
		async handleMemoMicTap() {
			return
		},
		async finishMemoRecording() {
			if (!this.recorderManager || !this.memoRecording) {
				return
			}
			// 使用计时器计算的实际时长，不依赖系统返回的 duration
			const actualDurationMs = Math.max(0, Date.now() - Number(this.memoRecordStartAt || Date.now()))
			this.memoRecording = false
			this.memoRecordingLocked = false
			this.memoRecordingLockReleaseGuard = false
			if (this.memoRecordTimer) {
				clearInterval(this.memoRecordTimer)
				this.memoRecordTimer = null
			}
			const stopResult = await new Promise(resolve => {
				this.memoStopResolver = resolve
				this.recorderManager.stop()
				setTimeout(() => {
					if (this.memoStopResolver) {
						this.memoStopResolver({
							tempFilePath: this.memoTempPath || '',
							duration: actualDurationMs
						})
						this.memoStopResolver = null
					}
				}, 1500)
			})
			const finalDurationMs = Number((stopResult && stopResult.duration) || actualDurationMs)
			const tempPath = (stopResult && stopResult.tempFilePath) || this.memoTempPath || ''
			this.memoTempPath = tempPath || this.memoTempPath || ''
			this.memoRecordDurationMs = finalDurationMs
			this.memoRecordDuration = Math.max(1, Math.floor(finalDurationMs / 1000))
			if (!this.memoTempPath || finalDurationMs < 1000) {
				this.resetMemoState()
				uni.showToast({ title: '录音时长太短', icon: 'none' })
				return
			}
			this.memoShowAgentSelector = true
		},
		async selectMemoAgentAndSave(agent) {
			if (!agent || !agent.id || !this.memoTempPath) {
				uni.showToast({ title: '录音文件不存在', icon: 'none' })
				return
			}
			this.memoUploading = true
			this.memoShowAgentSelector = false
			try {
				await workspaceService.createMemo({
					filePath: this.memoTempPath,
					fileName: `memo_${Date.now()}.mp3`,
					agentId: agent.id
				})
				this.showMemoPanel = false
				this.resetMemoState()
				await this.loadCurrentTab({ force: true })
				uni.showToast({ title: '语音备忘已保存', icon: 'none' })
			} catch (error) {
				this.memoUploading = false
				this.memoShowAgentSelector = true
				uni.showToast({ title: error.message || '创建失败', icon: 'none' })
			}
		},
		cancelMemoAgentSelect() {
			this.showMemoPanel = false
			this.resetMemoState()
		},
		cancelMemoRecording(shouldClose = false) {
			if (this.memoPressTimer) {
				clearTimeout(this.memoPressTimer)
				this.memoPressTimer = null
			}
			if (this.memoRecordTimer) {
				clearInterval(this.memoRecordTimer)
				this.memoRecordTimer = null
			}
			if (this.recorderManager) {
				try {
					this.recorderManager.stop()
				} catch (error) {
				}
			}
			if (this.memoStopResolver) {
				this.memoStopResolver('')
				this.memoStopResolver = null
			}
			this.resetMemoState()
			if (shouldClose) {
				this.showMemoPanel = false
			}
		},
		resetMemoState() {
			this.memoRecording = false
			this.memoRecordingLocked = false
			this.memoRecordingLockReleaseGuard = false
			this.memoShowAgentSelector = false
			this.memoUploading = false
			this.memoRecordDuration = 0
			this.memoRecordDurationMs = 0
			this.memoRecordStartAt = 0
			this.memoRecordStartX = 0
			this.memoRecordStartY = 0
			this.memoPressTimer = null
			this.memoStopResolver = null
			this.memoTempPath = ''
		},
		getMemoTouchPoint(event) {
			const changedTouches = event && event.changedTouches
			const touches = event && event.touches
			return (changedTouches && changedTouches[0]) || (touches && touches[0]) || null
		},
		formatMemoDuration(durationSeconds) {
			const total = Math.max(0, Number(durationSeconds) || 0)
			const minutes = `${Math.floor(total / 60)}`.padStart(2, '0')
			const seconds = `${total % 60}`.padStart(2, '0')
			return `${minutes}:${seconds}`
		},
		showCreateDocumentDialog() {
			this.documentForm.fileName = ''
			this.showDocumentPanel = true
		},
		showCreateMiniprogramDialog() {
			this.miniprogramForm = { name: '', prompt: '', notes: '' }
			this.selectedMiniprogramAgentIndex = 0
			this.showMiniprogramPanel = true
		},
		async submitDocumentCreate() {
			const fileName = (this.documentForm.fileName || '').trim()
			if (!fileName) {
				uni.showToast({ title: '请输入文档名称', icon: 'none' })
				return
			}
			try {
				await workspaceService.createDocument({ fileName })
				this.closeDocumentPanel()
				await this.loadCurrentTab({ force: true })
				uni.showToast({ title: '文档已创建', icon: 'none' })
			} catch (error) {
				uni.showToast({ title: error.message || '创建失败', icon: 'none' })
			}
		},
		async submitMiniprogramCreate() {
			const prompt = (this.miniprogramForm.prompt || '').trim()
			if (prompt.length < 10) {
				uni.showToast({ title: '描述至少 10 个字', icon: 'none' })
				return
			}
			try {
				const agentId = this.agentOptions[this.selectedMiniprogramAgentIndex]?.id || chatStore.state.selectedAgentId || 'nova'
				await workspaceService.createMiniprogram({
					name: (this.miniprogramForm.name || '').trim(),
					prompt,
					agentId,
					notes: (this.miniprogramForm.notes || '').trim()
				})
				this.closeMiniprogramPanel()
				await this.loadCurrentTab({ force: true })
				uni.showToast({ title: '已提交创建请求', icon: 'none' })
			} catch (error) {
				uni.showToast({ title: error.message || '创建失败', icon: 'none' })
			}
		},
		openMemo(item) {
			uni.navigateTo({ url: `/pages/workspace/memo-detail?id=${encodeURIComponent(item.id)}` })
		},
		openDocument(item) {
			uni.navigateTo({ url: `/pages/workspace/document-detail?id=${encodeURIComponent(item.id)}` })
		},
		openMiniprogram(item) {
			uni.navigateTo({ url: `/pages/workspace/miniprogram-detail?id=${encodeURIComponent(item.appId)}` })
		},
		openMiniprogramProject(item) {
			if (!item || item.status !== 'ready') {
				return
			}
			const url = workspaceService.buildAbsolutePublicUrl(item.publicUrl)
			if (!url) {
				return
			}
			this.openPublicMiniprogram(item, url)
		},
		openPublicMiniprogram(item, url) {
			// #ifdef H5
			window.open(url, '_blank', 'noopener,noreferrer')
			// #endif
			// #ifndef H5
			uni.navigateTo({
				url: `/pages/common/browser?title=${encodeURIComponent(item.name)}&url=${encodeURIComponent(url)}`
			})
			// #endif
		},
		formatRelativeTime(timestamp) {
			if (!timestamp) return ''
			const diff = Date.now() - Number(timestamp)
			const minute = 60 * 1000
			const hour = 60 * minute
			const day = 24 * hour
			if (diff < minute) return '刚刚'
			if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
			if (diff < day) return `${Math.floor(diff / hour)}小时前`
			return `${Math.floor(diff / day)}天前`
		},
		miniprogramStatusText(status) {
			if (status === 'ready') return '可访问'
			if (status === 'failed') return '失败'
			return '生成中'
		},
		memoStatusText(status) {
			if (status === 'completed') return '已整理'
			if (status === 'failed') return '失败'
			return '整理中'
		},
		documentStatusText(status) {
			if (status === 'ready') return '可编辑'
			if (status === 'failed') return '失败'
			return '处理中'
		}
	}
}
</script>

<style lang="scss">
.workspace-page {
	position: fixed;
	inset: 0;
	height: 100%;
	display: flex;
	flex-direction: column;
	background: linear-gradient(180deg, #f7f9fc 0%, #f8fbff 100%);
	overflow: hidden;
}

.workspace-tabs {
	position: sticky;
	top: 0;
	z-index: 10;
	display: flex;
	padding: calc(8rpx + var(--status-bar-height)) 24rpx 0;
	background: #ffffff;
	border-bottom: 2rpx solid #d9e7f5;
	flex-shrink: 0;
}

.workspace-tab {
	flex: 1;
	padding: 18rpx 0 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-bottom: 4rpx solid transparent;
}

.workspace-tab--active {
	border-bottom-color: #60a5fa;
}

.workspace-tab__icon {
	width: 28rpx;
	height: 28rpx;
	margin-right: 10rpx;
	flex-shrink: 0;
}

.workspace-tab__text {
	font-size: 28rpx;
	font-weight: 700;
	color: #64748b;
}

.workspace-tab--active .workspace-tab__text {
	color: #60a5fa;
}

.workspace-swiper {
	flex: 1;
	min-height: 0;
}

.workspace-scroll {
	flex: 1;
	min-height: 0;
	height: 100%;
}

.workspace-body {
	padding: 16rpx 24rpx calc(120rpx + env(safe-area-inset-bottom));
}

.intro-card,
.workspace-card {
	border-radius: 24rpx;
	background: #fff;
	border: 2rpx solid #d6e8ff;
	box-shadow: 0 20rpx 42rpx rgba(15, 23, 42, 0.05);
}

.workspace-state {
	padding: 120rpx 0;
	text-align: center;
}

.workspace-state__text {
	font-size: 26rpx;
	color: #64748b;
}

.intro-card {
	padding: 26rpx;
	background: linear-gradient(135deg, #eef6ff, #f8fbff);
}

.intro-card__head {
	display: flex;
	align-items: center;
}

.intro-card__icon {
	width: 36rpx;
	height: 36rpx;
	margin-right: 12rpx;
}

.intro-card__title {
	display: block;
	font-size: 32rpx;
	font-weight: 800;
	color: #0f172a;
}

.intro-card__desc {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	line-height: 1.7;
	color: #64748b;
}

.workspace-card {
	margin-top: 14rpx;
	padding: 24rpx;
}

.workspace-card__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.workspace-card__left {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
}

.workspace-card__icon-box {
	width: 80rpx;
	height: 80rpx;
	border-radius: 24rpx;
	background: #dbeafe;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.workspace-card__icon-box--muted {
	background: #e2e8f0;
}

.workspace-card__icon {
	width: 40rpx;
	height: 40rpx;
}

.workspace-card__title {
	flex: 1;
	min-width: 0;
	margin-left: 24rpx;
	font-size: 30rpx;
	font-weight: 800;
	color: #0f172a;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.workspace-card__desc {
	display: block;
	margin-top: 18rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: #64748b;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.workspace-card__meta {
	display: flex;
	align-items: center;
	margin-top: 12rpx;
}

.workspace-card__meta-chip {
	margin-right: 12rpx;
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
	background: rgba(96, 165, 250, 0.1);
	font-size: 22rpx;
	color: #60a5fa;
}

.workspace-card__status-chip {
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	background: rgba(37, 99, 235, 0.1);
	font-size: 22rpx;
	font-weight: 700;
	color: #2563eb;
	flex-shrink: 0;
}

.workspace-card__status-chip--completed,
.workspace-card__status-chip--ready {
	background: rgba(22, 163, 74, 0.12);
	color: #16a34a;
}

.workspace-card__status-chip--processing {
	background: rgba(100, 116, 139, 0.12);
	color: #64748b;
}

.workspace-card__status-chip--failed {
	background: rgba(220, 38, 38, 0.12);
	color: #dc2626;
}

.workspace-card__actions {
	display: flex;
	margin-top: 18rpx;
}

.workspace-card__action {
	flex: 1;
	height: 68rpx;
	border-radius: 18rpx;
	background: linear-gradient(135deg, #60a5fa, #2563eb);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	font-weight: 700;
	color: #fff;
}

.workspace-card__action + .workspace-card__action {
	margin-left: 12rpx;
}

.workspace-card__action--secondary {
	background: #eef6ff;
	color: #2563eb;
}

.workspace-card__action--disabled {
	opacity: 0.45;
}

.workspace-fab {
	position: fixed;
	right: 24rpx;
	bottom: calc(132rpx + env(safe-area-inset-bottom));
	width: 96rpx;
	height: 96rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #60a5fa, #2563eb);
	box-shadow: 0 20rpx 40rpx rgba(37, 99, 235, 0.28);
	display: flex;
	align-items: center;
	justify-content: center;
}

.workspace-fab__text {
	font-size: 56rpx;
	line-height: 1;
	color: #fff;
}

.overlay-mask {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.28);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	z-index: 80;
}

.sheet-panel {
	width: 100%;
	margin-bottom: 0;
	padding: 24rpx 24rpx calc(140rpx + env(safe-area-inset-bottom));
	background: #fff;
	border-radius: 28rpx 28rpx 0 0;
	position: relative;
	z-index: 81;
}

/* #ifdef APP-PLUS */
.workspace-fab {
	bottom: 64rpx;
}

.sheet-panel {
	padding: 24rpx;
}
/* #endif */

.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.sheet-title {
	font-size: 32rpx;
	font-weight: 800;
	color: #0f172a;
}

.sheet-close {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.sheet-close__icon {
	width: 30rpx;
	height: 30rpx;
}

.memo-panel {
	width: 100%;
	padding: 12rpx 4rpx 28rpx;
}

.memo-panel--selector,
.memo-panel--uploading {
	padding-top: 6rpx;
	padding-bottom: 8rpx;
}

.memo-panel__top {
	display: flex;
	align-items: center;
}

.memo-panel__spacer {
	flex: 1;
}

.memo-panel__hint {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.memo-panel__hint--recording {
	margin-top: 4rpx;
}

.memo-panel__title {
	font-size: 32rpx;
	font-weight: 700;
	color: #0f172a;
}

.memo-panel__title--recording {
	color: #2563eb;
}

.memo-panel__desc {
	margin-top: 8rpx;
	font-size: 26rpx;
	font-weight: 500;
	color: #64748b;
	text-align: center;
}

.memo-panel__hint-row {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
}

.memo-panel__lock-chip {
	margin-top: 8rpx;
	margin-left: 12rpx;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: #dbeafe;
}

.memo-panel__lock-chip-text {
	font-size: 22rpx;
	font-weight: 700;
	color: #1d4ed8;
}

.memo-panel__mic-wrap {
	height: 112rpx;
	margin-top: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.memo-panel__mic-button {
	min-width: 400rpx;
	height: 88rpx;
	padding: 0 28rpx;
	border-radius: 22rpx;
	background: #e0f2fe;
	border: 2rpx solid rgba(2, 132, 199, 0.12);
	box-shadow: none;
	display: flex;
	align-items: center;
	justify-content: center;
}

.memo-panel__mic-button--recording {
	background: linear-gradient(135deg, #f87171, #ef4444);
	border-color: transparent;
	box-shadow: none;
}

.memo-panel__mic-icon {
	width: 38rpx;
	height: 38rpx;
	flex-shrink: 0;
}

.memo-panel__mic-text {
	margin-left: 14rpx;
	font-size: 30rpx;
	font-weight: 700;
	color: #0284c7;
}

.memo-panel__mic-button--recording .memo-panel__mic-text {
	color: #ffffff;
}

.memo-agent-selector__head {
	display: flex;
	align-items: center;
}

.memo-agent-selector__title {
	font-size: 32rpx;
	font-weight: 700;
	color: #0f172a;
}

.memo-agent-selector__desc {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #64748b;
}

.agent-chip-wrap--memo {
	margin-top: 20rpx;
}

.memo-agent-selector__actions {
	margin-top: 16rpx;
	display: flex;
	justify-content: flex-end;
}

.memo-agent-selector__cancel {
	padding: 12rpx 16rpx;
	font-size: 26rpx;
	color: #64748b;
}

.memo-uploading {
	display: flex;
	align-items: center;
	padding: 8rpx 0;
}

.memo-uploading__spinner {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	border: 6rpx solid rgba(37, 99, 235, 0.18);
	border-top-color: #2563eb;
	animation: memo-spin 0.9s linear infinite;
}

.memo-uploading__copy {
	flex: 1;
	margin-left: 24rpx;
}

.memo-uploading__title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: #0f172a;
}

.memo-uploading__desc {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	font-weight: 500;
	color: #64748b;
}

@keyframes memo-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.sheet-section {
	margin-top: 18rpx;
}

.sheet-label {
	display: block;
	margin-bottom: 10rpx;
	font-size: 24rpx;
	font-weight: 700;
	color: #334155;
}

.picker-field {
	padding: 22rpx;
	border-radius: 22rpx;
	background: #f8fbff;
	border: 2rpx solid #d9e7f5;
	font-size: 26rpx;
	color: #0f172a;
}

.sheet-input,
.sheet-textarea {
	width: 100%;
	padding: 22rpx;
	border-radius: 22rpx;
	background: #f8fbff;
	border: 2rpx solid #d9e7f5;
	font-size: 26rpx;
	color: #0f172a;
	box-sizing: border-box;
}

.sheet-input {
	height: 88rpx;
}

.sheet-textarea {
	min-height: 180rpx;
	line-height: 1.6;
}

.sheet-actions {
	display: flex;
	margin-top: 20rpx;
}

.sheet-actions__item {
	flex: 1;
}

.sheet-actions__item + .sheet-actions__item {
	margin-left: 12rpx;
}

.sheet-empty {
	padding: 36rpx 12rpx 12rpx;
	text-align: center;
}

.sheet-empty__title {
	display: block;
	font-size: 30rpx;
	font-weight: 800;
	color: #0f172a;
}

.sheet-empty__desc {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: #64748b;
}

.agent-chip-wrap {
	display: flex;
	flex-wrap: wrap;
	margin-top: 10rpx;
}

.agent-chip {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 10rpx;
	margin-bottom: 10rpx;
	padding: 8rpx 22rpx;
	border-radius: 18rpx;
	background: #f8fafc;
	border: 2rpx solid rgba(96, 165, 250, 0.35);
}

.agent-chip--active {
	background: #dbeafe;
	border-color: #60a5fa;
}

.agent-chip__text {
	font-size: 24rpx;
	font-weight: 600;
	color: #2563eb;
}

.memo-recorder {
	margin-top: 20rpx;
	text-align: center;
}

.memo-recorder__time {
	font-size: 24rpx;
	color: #64748b;
	margin-bottom: 16rpx;
}

.memo-recorder__button {
	min-height: 92rpx;
	font-size: 30rpx;
	font-weight: 800;
}

.memo-recorder__button--recording {
	background: linear-gradient(135deg, #f87171, #ef4444);
}
</style>
