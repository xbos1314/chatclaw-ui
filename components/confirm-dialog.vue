<template>
		<view v-if="visible" class="confirm-dialog-mask" @tap="handleMaskTap">
			<view class="confirm-dialog" @tap.stop>
				<view class="confirm-dialog__icon-wrap" :class="{ 'confirm-dialog__icon-wrap--danger': danger }">
					<text class="confirm-dialog__icon" :class="{ 'confirm-dialog__icon--danger': danger }">!</text>
				</view>
			<text class="confirm-dialog__title">{{ title }}</text>
			<text class="confirm-dialog__message">{{ message }}</text>
			<view class="confirm-dialog__actions">
				<view class="confirm-dialog__btn app-btn app-btn--secondary" @tap="handleCancel">{{ cancelText }}</view>
				<view class="confirm-dialog__btn app-btn" :class="{ 'app-btn--danger': danger }" @tap="handleConfirm">
					{{ confirmText }}
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ConfirmDialog',
	props: {
		visible: {
			type: Boolean,
			default: false
		},
		title: {
			type: String,
			default: '确认操作'
		},
		message: {
			type: String,
			default: ''
		},
		confirmText: {
			type: String,
			default: '确认'
		},
		cancelText: {
			type: String,
			default: '取消'
		},
		danger: {
			type: Boolean,
			default: false
		},
		closeOnMask: {
			type: Boolean,
			default: true
		}
	},
	methods: {
		handleMaskTap() {
			if (this.closeOnMask) {
				this.$emit('cancel')
			}
		},
		handleCancel() {
			this.$emit('cancel')
		},
		handleConfirm() {
			this.$emit('confirm')
		}
	}
}
</script>

<style lang="scss">
.confirm-dialog-mask {
	position: fixed;
	inset: 0;
	z-index: 120;
	background: rgba(15, 23, 42, 0.22);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 56rpx;
}

.confirm-dialog {
	width: 100%;
	max-width: 600rpx;
	padding: 44rpx 44rpx 36rpx;
	border-radius: 48rpx;
	background: #ffffff;
	box-shadow: 0 28rpx 64rpx rgba(15, 23, 42, 0.12);
}

.confirm-dialog__icon-wrap {
	width: 104rpx;
	height: 104rpx;
	margin: 0 auto;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(96, 165, 250, 0.12);
}

.confirm-dialog__icon-wrap--danger {
	background: rgba(239, 68, 68, 0.12);
}

.confirm-dialog__icon {
	font-size: 52rpx;
	line-height: 1;
	font-weight: 800;
	color: #60a5fa;
}

.confirm-dialog__icon--danger {
	color: #ef4444;
}

.confirm-dialog__title {
	display: block;
	margin-top: 28rpx;
	text-align: center;
	font-size: 36rpx;
	font-weight: 800;
	line-height: 1.4;
	color: #111827;
}

.confirm-dialog__message {
	display: block;
	margin-top: 18rpx;
	text-align: center;
	font-size: 28rpx;
	line-height: 1.6;
	color: #6b7280;
}

.confirm-dialog__actions {
	display: flex;
	margin-top: 44rpx;
}

.confirm-dialog__btn {
	flex: 1;
	min-height: 88rpx;
	border-radius: 24rpx;
	font-size: 28rpx;
}

.confirm-dialog__btn + .confirm-dialog__btn {
	margin-left: 24rpx;
}
</style>
