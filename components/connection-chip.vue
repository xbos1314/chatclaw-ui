<template>
	<view class="status-chip" :class="[`status-chip--${status}`]">
		<view class="status-dot"></view>
		<text class="status-text">{{ label }}</text>
	</view>
</template>

<script>
export default {
	name: 'ConnectionChip',
	props: {
		status: {
			type: String,
			default: 'disconnected'
		}
	},
	computed: {
		label() {
			if (this.status === 'connected') {
				return '正常'
			}
			if (this.status === 'connecting' || this.status === 'reconnecting') {
				return '连接中'
			}
			return '失败'
		}
	}
}
</script>

<style lang="scss">
.status-chip {
	display: flex;
	align-items: center;
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
}

.status-dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	margin-right: 10rpx;
}

.status-text {
	font-size: 22rpx;
	font-weight: 700;
}

.status-chip--connected {
	background: #dcfce7;
	color: #15803d;
}

.status-chip--connected .status-dot {
	background: #15803d;
}

.status-chip--connecting,
.status-chip--reconnecting {
	background: #fef3c7;
	color: #b45309;
}

.status-chip--connecting .status-dot,
.status-chip--reconnecting .status-dot {
	background: #b45309;
}

.status-chip--disconnected,
.status-chip--error {
	background: #fee2e2;
	color: #b91c1c;
}

.status-chip--disconnected .status-dot,
.status-chip--error .status-dot {
	background: #b91c1c;
}
</style>
