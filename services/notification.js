const LOCAL_NOTIFICATION_PREFIX = 'chatclaw_local_notification'

function isAppPlus() {
	// #ifdef APP-PLUS
	return true
	// #endif
	// #ifndef APP-PLUS
	return false
	// #endif
}

function buildPayload(agentId) {
	return JSON.stringify({
		source: LOCAL_NOTIFICATION_PREFIX,
		agentId: agentId || ''
	})
}

function parsePayload(payload) {
	if (!payload) {
		return null
	}
	if (typeof payload === 'object') {
		return payload
	}
	try {
		return JSON.parse(String(payload))
	} catch (error) {
		return null
	}
}

function getNotificationBody(message) {
	switch (message.type) {
		case 'memo_request':
			return '[语音备忘整理请求]'
		case 'memo_edit_request':
			return '[发送语音备忘]'
		case 'memo_result':
			return '[语音备忘整理完成]'
		case 'document_request':
			return '[发送云文档]'
		case 'document_edit_request':
			return '[继续完善云文档]'
		case 'document_result':
			return '[云文档已更新]'
		case 'miniprogram_request':
			return '[小程序创建请求]'
		case 'miniprogram_context_request':
			return '[发送小程序]'
		case 'miniprogram_edit_request':
			return '[继续完善小程序]'
		case 'miniprogram_result':
			return '[小程序已生成]'
		case 'text':
			return message.text || ''
		case 'image':
			return '[图片]'
		case 'audio':
			return '[音频]'
		case 'voice':
			return '[语音]'
		case 'video':
			return '[视频]'
		case 'file':
			return `[文件] ${message.fileName || ''}`.trim()
		default:
			return '[消息]'
	}
}

function requestPermission() {
	if (!isAppPlus()) {
		return
	}
	// #ifdef APP-PLUS
	try {
		if (plus.os.name === 'Android') {
			const main = plus.android.runtimeMainActivity()
			const Build = plus.android.importClass('android.os.Build')
			if (Build.VERSION.SDK_INT >= 33) {
				const permissions = ['android.permission.POST_NOTIFICATIONS']
				plus.android.requestPermissions(permissions, () => {}, () => {})
			}
		}
	} catch (error) {}
	// #endif
}

function initialize() {
	requestPermission()
}

function showMessageNotification({ agentId, agentName, message }) {
	if (!isAppPlus() || !agentId || !message || message.isUser) {
		return
	}
	// #ifdef APP-PLUS
	try {
		plus.push.createMessage(
			getNotificationBody(message),
			buildPayload(agentId),
			{
				title: agentName || '智能体',
				cover: true
			}
		)
	} catch (error) {}
	// #endif
}

function cancelNotification(agentId) {
	if (!isAppPlus() || !agentId) {
		return
	}
	// #ifdef APP-PLUS
	try {
		if (plus.os.name === 'iOS') {
			plus.push.clear()
			return
		}
		const messages = plus.push.getAllMessage() || []
		messages.forEach(item => {
			const payload = parsePayload(item.payload)
			if (payload && payload.source === LOCAL_NOTIFICATION_PREFIX && payload.agentId === agentId) {
				plus.push.remove(item)
			}
		})
	} catch (error) {}
	// #endif
}

function cancelAllNotifications() {
	if (!isAppPlus()) {
		return
	}
	// #ifdef APP-PLUS
	try {
		plus.push.clear()
	} catch (error) {}
	// #endif
}

export default {
	initialize,
	requestPermission,
	showMessageNotification,
	cancelNotification,
	cancelAllNotifications
}
