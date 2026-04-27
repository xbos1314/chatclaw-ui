<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="detail-page">
		<view class="detail-header">
			<view class="detail-back" @tap="goBack">
				<image class="detail-back__icon" src="/static/svg/left-black.svg" mode="aspectFit"></image>
			</view>
			<text class="detail-title">云文档</text>
			<view class="detail-actions">
				<view class="detail-icon-button" @tap="togglePreview">
					<image class="detail-icon-button__icon" :src="previewMode ? '/static/svg/edit-black.svg' : '/static/svg/preview-black.svg'" mode="aspectFit"></image>
				</view>
				<view class="detail-icon-button" @tap="saveDocument">
					<image class="detail-icon-button__icon" src="/static/svg/save-black.svg" mode="aspectFit"></image>
				</view>
				<view class="detail-icon-button" @tap="deleteDocument">
					<image class="detail-icon-button__icon" src="/static/svg/delete-red.svg" mode="aspectFit"></image>
				</view>
			</view>
		</view>

		<scroll-view class="detail-scroll" scroll-y>
			<view v-if="loading" class="detail-state">正在加载...</view>
			<view v-else-if="document" class="detail-body">
				<view class="detail-card">
					<input v-model="fileName" class="title-input" placeholder="文档名称" />
					<text class="detail-meta">{{ formatTime(document.updatedAt) }}</text>
					<textarea v-model="summary" class="summary-input" auto-height placeholder="文档摘要"></textarea>
				</view>

				<view class="detail-card">
					<textarea v-if="!previewMode" v-model="content" class="content-editor" auto-height maxlength="-1"></textarea>
					<markdown-preview v-else class="content-preview" :content="content || '暂无内容'"></markdown-preview>
				</view>

				<view class="detail-card">
					<text class="section-title">任务记录</text>
					<view v-if="!tasks.length" class="empty-line">暂无任务</view>
					<view v-for="task in tasks" :key="task.id" class="task-item">
						<view class="task-item__row">
							<text class="task-item__type">{{ task.prompt || '修改文档内容' }}</text>
							<text class="task-item__status" :class="`task-item__status--${task.status}`">{{ taskStatusText(task.status) }}</text>
						</view>
						<text v-if="task.prompt" class="task-item__text">{{ task.notes }}</text>
						<text v-if="task.errorMessage" class="task-item__error">{{ task.errorMessage }}</text>
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
			document: null,
			fileName: '',
			summary: '',
			content: '',
			tasks: [],
			previewMode: false,
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
	methods: {
		goBack() {
			uni.navigateBack()
		},
		togglePreview() {
			this.previewMode = !this.previewMode
		},
		async loadDetail() {
			this.loading = true
			try {
				this.document = await workspaceService.getDocument(this.id)
				this.fileName = this.document.fileName
				this.summary = this.document.summary
				const file = await workspaceService.getDocumentFile(this.id)
				this.content = file.content || ''
				this.tasks = await workspaceService.getDocumentTasks(this.id)
			} catch (error) {
				uni.showToast({ title: error.message || '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async saveDocument() {
			try {
				if (this.fileName !== this.document.fileName || this.summary !== this.document.summary) {
					this.document = await workspaceService.updateDocument(this.id, {
						file_name: this.fileName,
						summary: this.summary
					})
				}
				await workspaceService.saveDocumentFile({
					documentId: this.id,
					content: this.content
				})
				uni.showToast({ title: '已保存', icon: 'none' })
				await this.loadDetail()
			} catch (error) {
				uni.showToast({ title: error.message || '保存失败', icon: 'none' })
			}
		},
		deleteDocument() {
			this.confirmDialog = {
				visible: true,
				title: '删除文档',
				message: '确定删除这个文档吗？此操作不可恢复。',
				confirmText: '确认删除',
				danger: true,
				action: 'deleteDocument'
			}
		},
		closeConfirmDialog() {
			this.confirmDialog = Object.assign({}, this.confirmDialog, { visible: false, action: '' })
		},
		async handleConfirmDialog() {
			const action = this.confirmDialog.action
			this.closeConfirmDialog()
			if (action !== 'deleteDocument') {
				return
			}
			try {
				await workspaceService.deleteDocument(this.id)
				uni.showToast({ title: '已删除', icon: 'none' })
				setTimeout(() => uni.navigateBack(), 300)
			} catch (error) {
				uni.showToast({ title: error.message || '删除失败', icon: 'none' })
			}
		},
		formatTime(timestamp) {
			if (!timestamp) return ''
			const date = new Date(timestamp)
			return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
		},
		taskStatusText(status) {
			if (status === 'completed') return '已完成'
			if (status === 'failed') return '失败'
			if (status === 'running') return '进行中'
			return '待处理'
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
	background: #f3f6fb;
}

.detail-header {
	display: flex;
	align-items: center;
	background: #fff;
}

.detail-header {
	padding: calc(18rpx + var(--status-bar-height)) 24rpx 16rpx;
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

.title-input,
.summary-input,
.content-editor {
	width: 100%;
	background: transparent;
}

.title-input {
	font-size: 32rpx;
	font-weight: 800;
	color: #0f172a;
}

.detail-meta {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #94a3b8;
}

.summary-input {
	margin-top: 12rpx;
	min-height: 80rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: #475569;
}

.section-title {
	display: block;
	font-size: 28rpx;
	font-weight: 800;
	color: #0f172a;
}

.content-editor,
.content-preview {
	margin-top: 14rpx;
	min-height: 520rpx;
}

.content-editor {
	font-size: 24rpx;
	line-height: 1.7;
	color: #334155;
	white-space: pre-wrap;
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

.task-item__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.task-item__type,
.task-item__status {
	font-size: 22rpx;
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
</style>
