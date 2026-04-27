<template>
	<view>
		<web-view v-if="url" :src="url"></web-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			title: '',
			url: ''
		}
	},
	onLoad(options) {
		this.title = decodeURIComponent(options.title || '页面')
		this.url = decodeURIComponent(options.url || '')
	},
	methods: {

	}
}
</script>

<style lang="scss">

</style>
