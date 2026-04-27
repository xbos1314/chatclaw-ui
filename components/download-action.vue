<template>
	<view class="download-action" :class="{ 'download-action--loading': loading }" @tap.stop="handleTap">
		<text v-if="loading" class="download-action__text">下载中</text>
		<image v-else class="download-action__icon" src="/static/svg/download.svg" mode="aspectFit"></image>
	</view>
</template>

<script>
import { downloadFileByUrl } from '@/services/download'
import chatStore from '@/store/chat'

export default {
	name: 'DownloadAction',
	props: {
		url: {
			type: String,
			default: ''
		},
		fileName: {
			type: String,
			default: 'download'
		}
	},
	data() {
		return {
			loading: false
		}
	},
	methods: {
		async handleTap() {
			if (!this.url || this.loading) {
				return
			}
			this.loading = true
			try {
				const downloadUrl = await chatStore.getDownloadUrl(this.url)
				await downloadFileByUrl(downloadUrl, this.fileName)
				uni.showToast({
					title: '保存成功',
					icon: 'success'
				})
			} catch (error) {
				uni.showToast({
					title: '下载失败',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		}
	}
}
</script>

<style lang="scss">
.download-action {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	min-width: 64rpx;
	min-height: 40rpx;
}

.download-action__icon {
	width: 40rpx;
	height: 40rpx;
}

.download-action__text {
	font-size: 22rpx;
	font-weight: 600;
	color: #60a5fa;
	white-space: nowrap;
}

.download-action--loading {
	opacity: 0.92;
}
</style>
