<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="detail-page">
		<view class="detail-header">
			<view class="detail-back" @tap="goBack">
				<image class="detail-back__icon" src="/static/svg/left-black.svg" mode="aspectFit"></image>
			</view>
			<text class="detail-title">小程序详情</text>
			<view class="detail-actions">
				<view class="detail-icon-button" @tap="openFiles">
					<image class="detail-icon-button__icon" src="/static/svg/folder-black.svg" mode="aspectFit"></image>
				</view>
				<view class="detail-icon-button" @tap="refreshDetail">
					<image class="detail-icon-button__icon" src="/static/svg/refresh-black.svg" mode="aspectFit"></image>
				</view>
				<view class="detail-icon-button" @tap="deleteProject">
					<image class="detail-icon-button__icon" src="/static/svg/delete-red.svg" mode="aspectFit"></image>
				</view>
			</view>
		</view>

		<scroll-view class="detail-scroll" scroll-y>
			<view v-if="loading" class="detail-state">正在加载...</view>
			<view v-else-if="project" class="detail-body">
				<view class="detail-card">
					<view class="project-head">
						<text class="project-title">{{ project.name }}</text>
						<text class="project-status" :class="`project-status--${project.status}`">{{ statusText(project.status) }}</text>
					</view>
					<text class="project-desc">{{ project.summary || project.description || '暂无说明' }}</text>
				</view>

				<view class="detail-card">
					<view class="action-grid">
						<view class="app-btn app-btn--secondary" @tap="copyLink">复制链接</view>
						<view class="app-btn" :class="{ 'app-btn--disabled': project.status !== 'ready' }" @tap="openProject">打开</view>
						<view class="app-btn app-btn--secondary" @tap="buildProject">构建</view>
						<view class="app-btn app-btn--secondary" @tap="reviseProject">继续完善</view>
					</view>
				</view>

				<view class="detail-card">
					<text class="section-title">任务记录</text>
					<view v-if="!tasks.length" class="empty-line">暂无任务</view>
					<view v-for="task in tasks" :key="task.id" class="task-item">
						<view class="task-item__row">
							<text class="task-item__type">{{ taskTypeText(task.taskType) }}</text>
							<text class="task-item__status" :class="`task-item__status--${task.status}`">{{ taskStatusText(task.status) }}</text>
						</view>
						<text v-if="task.prompt" class="task-item__text">{{ task.prompt }}</text>
						<text v-if="task.errorMessage" class="task-item__error">{{ task.errorMessage }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<view v-if="showRevisePanel" class="overlay-mask" @tap="closeRevisePanel" @touchmove.stop.prevent>
			<view class="sheet-panel" @tap.stop>
				<view class="sheet-header">
					<text class="sheet-title">继续完善小程序</text>
					<view class="sheet-close" @tap="closeRevisePanel">
						<image class="sheet-close__icon" src="/static/svg/close-black.svg" mode="aspectFit"></image>
					</view>
				</view>
				<view class="sheet-section">
					<textarea v-model="reviseForm.prompt" class="sheet-textarea" auto-height maxlength="-1" placeholder="描述你希望继续修改和完善的内容..."></textarea>
				</view>
				<view class="sheet-section">
					<textarea v-model="reviseForm.notes" class="sheet-textarea" auto-height maxlength="-1" placeholder="补充说明（可选）"></textarea>
				</view>
				<view class="sheet-actions">
					<view class="app-btn app-btn--secondary sheet-actions__item" @tap="closeRevisePanel">取消</view>
					<view class="app-btn sheet-actions__item" @tap="submitReviseProject">提交</view>
				</view>
			</view>
		</view>
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
import { workspaceService } from '@/services/workspace'

export default {
	components: {
		ConfirmDialog
	},
	data() {
		return {
			id: '',
			loading: true,
			project: null,
			tasks: [],
			showRevisePanel: false,
			reviseForm: {
				prompt: '',
				notes: ''
			},
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
		await this.refreshDetail()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async refreshDetail() {
			this.loading = true
			try {
				this.project = await workspaceService.getMiniprogram(this.id)
				this.tasks = await workspaceService.getMiniprogramTasks(this.id)
			} catch (error) {
				uni.showToast({ title: error.message || '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		openProject() {
			if (this.project.status !== 'ready') return
			const url = workspaceService.buildAbsolutePublicUrl(this.project.publicUrl)
			if (!url) return
			this.openPublicProject(url)
		},
		openPublicProject(url) {
			// #ifdef H5
			window.open(url, '_blank', 'noopener,noreferrer')
			// #endif
			// #ifndef H5
			uni.navigateTo({
				url: `/pages/common/browser?title=${encodeURIComponent(this.project.name)}&url=${encodeURIComponent(url)}`
			})
			// #endif
		},
		copyLink() {
			const url = workspaceService.buildAbsolutePublicUrl(this.project.publicUrl)
			if (!url) return
			uni.setClipboardData({
				data: `${this.project.name}\n${url}`,
				success: () => {
					uni.showToast({ title: '链接已复制', icon: 'none' })
				}
			})
		},
		openFiles() {
			uni.navigateTo({
				url: `/pages/workspace/miniprogram-files?id=${encodeURIComponent(this.id)}&name=${encodeURIComponent(this.project.name)}`
			})
		},
		async buildProject() {
			try {
				await workspaceService.buildMiniprogram(this.id)
				uni.showToast({ title: '已提交构建', icon: 'none' })
				await this.refreshDetail()
			} catch (error) {
				uni.showToast({ title: error.message || '构建失败', icon: 'none' })
			}
		},
		reviseProject() {
			this.reviseForm = { prompt: '', notes: '' }
			this.showRevisePanel = true
		},
		closeRevisePanel() {
			this.showRevisePanel = false
			this.reviseForm = { prompt: '', notes: '' }
		},
		async submitReviseProject() {
			const prompt = (this.reviseForm.prompt || '').trim()
			if (prompt.length < 2) {
				uni.showToast({ title: '请输入需求', icon: 'none' })
				return
			}
			try {
				await workspaceService.reviseMiniprogram({
					appId: this.id,
					prompt,
					agentId: this.project.agentId,
					notes: (this.reviseForm.notes || '').trim()
				})
				this.closeRevisePanel()
				uni.showToast({ title: '已提交', icon: 'none' })
				await this.refreshDetail()
			} catch (error) {
				uni.showToast({ title: error.message || '提交失败', icon: 'none' })
			}
		},
		deleteProject() {
			this.confirmDialog = {
				visible: true,
				title: '删除小程序',
				message: '确定删除这个小程序吗？此操作不可恢复。',
				confirmText: '确认删除',
				danger: true,
				action: 'deleteProject'
			}
		},
		closeConfirmDialog() {
			this.confirmDialog = Object.assign({}, this.confirmDialog, { visible: false, action: '' })
		},
		async handleConfirmDialog() {
			const action = this.confirmDialog.action
			this.closeConfirmDialog()
			if (action !== 'deleteProject') {
				return
			}
			try {
				await workspaceService.deleteMiniprogram(this.id)
				uni.showToast({ title: '已删除', icon: 'none' })
				setTimeout(() => uni.navigateBack(), 300)
			} catch (error) {
				uni.showToast({ title: error.message || '删除失败', icon: 'none' })
			}
		},
		statusText(status) {
			if (status === 'ready') return '可访问'
			if (status === 'failed') return '失败'
			return '生成中'
		},
		taskTypeText(type) {
			if (type === 'create') return '创建任务'
			if (type === 'build') return '构建任务'
			return '更新任务'
		},
		taskStatusText(status) {
			if (status === 'completed') return '已完成'
			if (status === 'failed') return '失败'
			if (status === 'running') return '执行中'
			return '等待中'
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
	margin-left: 8rpx;
}

.detail-icon-button__icon {
	width: 34rpx;
	height: 34rpx;
}

.detail-scroll {
	flex: 1;
	min-height: 0;
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

.project-head,
.task-item__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.project-title,
.section-title {
	font-size: 30rpx;
	font-weight: 800;
	color: #0f172a;
}

.project-status {
	font-size: 22rpx;
	color: #2563eb;
}

.project-status--ready {
	color: #16a34a;
}

.project-status--failed {
	color: #dc2626;
}

.project-desc {
	display: block;
	margin-top: 12rpx;
	font-size: 24rpx;
	line-height: 1.7;
	color: #64748b;
}

.action-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	grid-gap: 18rpx;
}

.empty-line {
	margin-top: 12rpx;
	font-size: 24rpx;
	color: #94a3b8;
}

.task-item {
	margin-top: 14rpx;
	padding-top: 14rpx;
	border-top: 2rpx solid #eff6ff;
}

.task-item__type,
.task-item__status {
	font-size: 22rpx;
	color: #2563eb;
}

.task-item__status--completed {
	color: #16a34a;
}

.task-item__status--failed {
	color: #dc2626;
}

.task-item__status--running {
	color: #2563eb;
}

.task-item__text,
.task-item__error {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: #475569;
	white-space: pre-wrap;
}

.task-item__error {
	color: #dc2626;
}

.detail-state {
	padding: 40rpx;
	text-align: center;
	font-size: 28rpx;
	color: #64748b;
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
	padding: 24rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));
	background: #fff;
	border-radius: 28rpx 28rpx 0 0;
	position: relative;
	z-index: 81;
}

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

.sheet-section {
	margin-top: 18rpx;
}

.sheet-textarea {
	width: 100%;
	padding: 22rpx;
	border-radius: 22rpx;
	background: #f8fbff;
	border: 2rpx solid #d9e7f5;
	font-size: 26rpx;
	line-height: 1.6;
	color: #0f172a;
	box-sizing: border-box;
	min-height: 180rpx;
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
</style>
