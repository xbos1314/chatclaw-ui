<template>
	<page-meta page-style="overflow: hidden;"></page-meta>
	<view class="files-page">
		<view class="files-header">
			<view class="files-back" @tap="goBack">
				<image class="files-back__icon" src="/static/svg/left-black.svg" mode="aspectFit"></image>
			</view>
			<text class="files-title">{{ name || '项目文件' }}</text>
			<view class="files-action" @tap="saveCurrentFile">
				<image class="files-action__icon" src="/static/svg/save-black.svg" mode="aspectFit"></image>
			</view>
		</view>

		<view class="files-layout">
			<scroll-view class="files-sidebar" scroll-y>
				<view v-for="item in flatFiles" :key="item.path" class="files-node" :class="{ 'files-node--active': selectedPath === item.path }" @tap="selectFile(item)">
					<text class="files-node__text">{{ item.label }}</text>
				</view>
			</scroll-view>
			<view class="files-content">
				<textarea v-if="selectedPath" v-model="content" class="files-editor" maxlength="-1"></textarea>
				<view v-else class="files-empty">请选择文件</view>
			</view>
		</view>
	</view>
</template>

<script>
import { workspaceService } from '@/services/workspace'

function flattenNodes(nodes, depth = 0, result = []) {
	nodes.forEach(node => {
		result.push({
			path: node.path,
			type: node.type,
			label: `${' '.repeat(depth * 2)}${node.name}`
		})
		if (node.children && node.children.length) {
			flattenNodes(node.children, depth + 1, result)
		}
	})
	return result
}

export default {
	data() {
		return {
			id: '',
			name: '',
			flatFiles: [],
			selectedPath: '',
			content: ''
		}
	},
	async onLoad(options) {
		this.id = decodeURIComponent(options.id || '')
		this.name = decodeURIComponent(options.name || '项目文件')
		await this.loadFiles()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadFiles() {
			try {
				const items = await workspaceService.getMiniprogramProjectFiles(this.id)
				this.flatFiles = flattenNodes(items).filter(item => item.type === 'file')
				if (this.flatFiles.length) {
					await this.selectFile(this.flatFiles[0])
				}
			} catch (error) {
				uni.showToast({ title: error.message || '加载失败', icon: 'none' })
			}
		},
		async selectFile(item) {
			this.selectedPath = item.path
			try {
				const result = await workspaceService.getMiniprogramProjectFileContent(this.id, item.path)
				this.content = result.content || ''
			} catch (error) {
				uni.showToast({ title: error.message || '加载失败', icon: 'none' })
			}
		},
		async saveCurrentFile() {
			if (!this.selectedPath) return
			try {
				await workspaceService.saveMiniprogramProjectFileContent({
					appId: this.id,
					path: this.selectedPath,
					content: this.content
				})
				uni.showToast({ title: '已保存', icon: 'none' })
			} catch (error) {
				uni.showToast({ title: error.message || '保存失败', icon: 'none' })
			}
		}
	}
}
</script>

<style lang="scss">
.files-page {
	position: fixed;
	inset: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: #f7f9fc;
}

.files-header {
	display: flex;
	align-items: center;
	padding: calc(18rpx + var(--status-bar-height)) 24rpx 18rpx;
	background: #fff;
	border-bottom: 2rpx solid #e2e8f0;
}

.files-back {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.files-back__icon {
	width: 38rpx;
	height: 38rpx;
}

.files-title {
	flex: 1;
	margin-left: 12rpx;
	font-size: 30rpx;
	font-weight: 800;
	color: #0f172a;
}

.files-action {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.files-action__icon {
	width: 34rpx;
	height: 34rpx;
}

.files-layout {
	flex: 1;
	min-height: 0;
	display: flex;
}

.files-sidebar {
	width: 260rpx;
	background: #fff;
	border-right: 2rpx solid #e2e8f0;
}

.files-node {
	padding: 18rpx 18rpx 18rpx 20rpx;
	border-bottom: 2rpx solid #f1f5f9;
}

.files-node--active {
	background: #eef6ff;
}

.files-node__text {
	font-size: 24rpx;
	color: #334155;
	white-space: pre-wrap;
	word-break: break-all;
}

.files-content {
	flex: 1;
	min-width: 0;
	padding: 20rpx;
}

.files-editor {
	width: 100%;
	height: 100%;
	min-height: 100%;
	padding: 20rpx;
	border-radius: 20rpx;
	background: #fff;
	font-size: 24rpx;
	line-height: 1.6;
	color: #0f172a;
	box-sizing: border-box;
}

.files-empty {
	padding-top: 80rpx;
	text-align: center;
	font-size: 26rpx;
	color: #94a3b8;
}
</style>
