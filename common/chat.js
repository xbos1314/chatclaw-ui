import { DEFAULT_SERVER_PORT, DEFAULT_WS_PATH } from '@/common/config'

export function buildHttpBaseUrl(raw) {
	let value = (raw || '').trim()
	if (!value) {
		return `http://localhost:${DEFAULT_SERVER_PORT}`
	}
	if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0) {
		return stripWsPath(value)
	}
	if (value.indexOf('ws://') === 0) {
		value = value.slice(5)
	} else if (value.indexOf('wss://') === 0) {
		value = value.slice(6)
	}
	if (value.indexOf('//') === 0) {
		value = value.slice(2)
	}
	if (value.charAt(value.length - 1) === '/') {
		value = value.slice(0, -1)
	}
	if (value.indexOf(':') !== -1) {
		return stripWsPath(`http://${value}`)
	}
	return `http://${value}:${DEFAULT_SERVER_PORT}`
}

export function buildWsUrl(raw) {
	let value = (raw || '').trim()
	if (!value) {
		return `ws://localhost:${DEFAULT_SERVER_PORT}${DEFAULT_WS_PATH}`
	}
	if (value.indexOf('ws://') === 0 || value.indexOf('wss://') === 0) {
		return ensureWsPath(value)
	}
	if (value.indexOf('http://') === 0) {
		value = value.slice(7)
	} else if (value.indexOf('https://') === 0) {
		value = value.slice(8)
	}
	if (value.indexOf('//') === 0) {
		value = value.slice(2)
	}
	if (value.charAt(value.length - 1) === '/') {
		value = value.slice(0, -1)
	}
	if (value.indexOf(':') !== -1) {
		return ensureWsPath(`ws://${value}`)
	}
	return `ws://${value}:${DEFAULT_SERVER_PORT}${DEFAULT_WS_PATH}`
}

export function ensureWsPath(url) {
	const normalized = url.replace(/\/$/, '')
	const hasPath = normalized.match(/^wss?:\/\/[^/]+\/.+$/)
	return hasPath ? normalized : `${normalized}${DEFAULT_WS_PATH}`
}

export function stripWsPath(url) {
	return url.replace(new RegExp(`${DEFAULT_WS_PATH}/?$`), '').replace(/\/$/, '')
}

export function joinUrl(baseUrl, path) {
	if (!path) {
		return ''
	}
	if (path.indexOf('http://') === 0 || path.indexOf('https://') === 0) {
		return path
	}
	return `${(baseUrl || '').replace(/\/$/, '')}${path}`
}

export function uid(prefix) {
	return `${prefix || 'id'}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
}

export function getMimeType(fileName) {
	const ext = ((fileName || '').split('.').pop() || '').toLowerCase()
	const map = {
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		webp: 'image/webp',
		mp3: 'audio/mpeg',
		wav: 'audio/wav',
		m4a: 'audio/mp4',
		ogg: 'audio/ogg',
		opus: 'audio/ogg',
		mp4: 'video/mp4',
		mov: 'video/quicktime',
		webm: 'video/webm',
		pdf: 'application/pdf',
		doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		zip: 'application/zip',
		txt: 'text/plain'
	}
	return map[ext] || 'application/octet-stream'
}

export function parseJsonString(content) {
	if (!content || typeof content !== 'string') {
		return null
	}
	try {
		return JSON.parse(content)
	} catch (error) {
		return null
	}
}

function resolveMessageText(rawContent, payload, contentType) {
	if (typeof rawContent === 'string' && !payload) {
		return rawContent
	}
	if (payload) {
		if (contentType === 'memo_result' && typeof payload.content === 'string') {
			return payload.content
		}
		if (typeof payload.text === 'string') {
			return payload.text
		}
		if (typeof payload.content === 'string') {
			return payload.content
		}
	}
	if (typeof rawContent === 'object' && rawContent) {
		if (typeof rawContent.text === 'string') {
			return rawContent.text
		}
		if (typeof rawContent.content === 'string') {
			return rawContent.content
		}
	}
	if (typeof rawContent === 'string') {
		return rawContent
	}
	return ''
}

export function getMessageTextContent(message) {
	return resolveMessageText(
		message && Object.prototype.hasOwnProperty.call(message, 'rawContent') ? message.rawContent : message && message.content,
		message && message.payload ? message.payload : parseJsonString(message && message.content),
		(message && message.type) || (message && message.contentType) || 'text'
	) || (message && message.text) || ''
}

export function normalizeAgent(raw) {
	return {
		id: raw.id || '',
		name: raw.name || '未命名智能体',
		description: raw.description || '',
		avatar: raw.avatar || '',
		isTyping: !!raw.isTyping
	}
}

export function normalizeMessage(raw) {
	const contentType = raw.contentType || raw.type || 'text'
	const payload = parseJsonString(raw.content)
	const rawContent = raw.content
	let text = resolveMessageText(rawContent, payload, contentType) || raw.text || ''
	let fileName = raw.fileName || raw.file_name || ''
	let fileUrl = raw.fileUrl || raw.file_url || ''
	let coverUrl = raw.coverUrl || raw.cover_url || ''
	let title = raw.title || ''
	let summary = raw.summary || ''
	let memoId = raw.memo_id || raw.memoId || ''
	let memoTitle = raw.memo_title || raw.title || ''
	let memoSummary = raw.memo_summary || raw.summary || ''
	let documentId = raw.document_id || raw.documentId || ''
	let documentTitle = raw.file_name || raw.title || raw.document_title || ''
	let documentSummary = raw.document_summary || raw.summary || ''
	let documentFilePath = raw.file_path || raw.document_file_path || ''
	let appId = raw.app_id || raw.appId || ''
	let appName = raw.app_name || raw.title || ''
	let appSummary = raw.app_summary || raw.summary || ''
	let appPublicUrl = raw.public_url || raw.publicUrl || ''

	if (payload) {
		title = title || payload.title || payload.name || payload.file_name || ''
		summary = summary || payload.summary || ''
		if ((contentType === 'memo_request' || contentType === 'memo_edit_request')) {
			memoId = memoId || payload.memo_id || ''
			memoTitle = memoTitle || payload.title || payload.memo_title || ''
			memoSummary = memoSummary || payload.summary || payload.memo_summary || ''
		}
		if (contentType === 'memo_result') {
			memoId = memoId || payload.memo_id || ''
			memoTitle = memoTitle || payload.title || ''
			memoSummary = memoSummary || payload.summary || ''
		}
		if (contentType.indexOf('document_') === 0) {
			documentId = documentId || payload.document_id || ''
			documentTitle = documentTitle || payload.file_name || payload.title || payload.document_title || ''
			documentSummary = documentSummary || payload.summary || payload.document_summary || ''
			documentFilePath = documentFilePath || payload.file_path || payload.document_file_path || ''
		}
		if (contentType.indexOf('miniprogram_') === 0) {
			appId = appId || payload.app_id || ''
			appName = appName || payload.name || payload.title || ''
			appSummary = appSummary || payload.summary || ''
			appPublicUrl = appPublicUrl || payload.public_url || payload.publicUrl || ''
		}
	}
	return {
		id: raw.id || uid('message'),
		requestId: raw.request_id || raw.requestId || '',
		type: contentType,
		text: text,
		fileUrl: fileUrl,
		coverUrl: coverUrl,
		fileName: fileName,
		mimeType: raw.mimeType || raw.contentType || '',
		timestamp: raw.timestamp || raw.createdAt || Date.now(),
		error: raw.error || '',
		isUser: raw.direction === 'inbound' || !!raw.isUser,
		agentId: raw.agent_id || raw.agentId || '',
		duration: raw.duration || 0,
		isRead: raw.read === 1 || raw.direction === 'inbound' || !!raw.isRead,
		fileId: raw.fileId || '',
		title: title,
		summary: summary,
		memoId,
		memoTitle,
		memoSummary,
		documentId,
		documentTitle,
		documentSummary,
		documentFilePath,
		appId,
		appName,
		appSummary,
		appPublicUrl,
		payload: payload,
		rawContent: rawContent,
		isPending: !!raw.isPending
	}
}

export function createLocalTextMessage(text, agentId, requestId) {
	return {
		id: uid('local'),
		requestId: requestId,
		type: 'user_text',
		text: text,
		fileUrl: '',
		fileName: '',
		timestamp: Date.now(),
		error: '',
		isUser: true,
		agentId: agentId,
		duration: 0,
		isRead: true,
		fileId: '',
		title: '',
		summary: '',
		payload: null,
		isPending: true
	}
}

export function createLocalMediaMessage(type, fileUrl, fileName, agentId, requestId, duration, coverUrl) {
	return {
		id: uid('local'),
		requestId: requestId,
		type: type,
		text: '',
		fileUrl: fileUrl,
		coverUrl: coverUrl || '',
		fileName: fileName || '',
		timestamp: Date.now(),
		error: '',
		isUser: true,
		agentId: agentId,
		duration: duration || 0,
		isRead: true,
		fileId: '',
		title: '',
		summary: '',
		payload: null,
		isPending: true
	}
}

export function getMessagePreview(message, fallbackText) {
	if (!message) {
		return fallbackText || '暂无消息'
	}
	const labels = {
		memo_request: '[备忘录整理请求]',
		memo_edit_request: '[发送语音备忘]',
		memo_result: '[备忘录整理完成]',
		document_request: '[发送云文档]',
		document_edit_request: '[继续完善文档]',
		document_result: '[云文档已生成]',
		miniprogram_request: '[小程序创建请求]',
		miniprogram_context_request: '[发送小程序]',
		miniprogram_edit_request: '[继续完善小程序]',
		miniprogram_result: '[小程序已生成]',
		image: '[图片]',
		video: '[视频]',
		voice: '[语音]',
		audio: '[音频]',
		file: `[文件] ${message.fileName || ''}`.trim()
	}
	if (labels[message.type]) {
		return labels[message.type]
	}
	if (message.text) {
		return message.text.replace(/\n+/g, ' ')
	}
	return fallbackText || '暂无消息'
}

export function formatSessionTime(timestamp) {
	if (!timestamp) {
		return ''
	}
	const now = new Date()
	const date = new Date(timestamp)
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
	const diff = now.getTime() - date.getTime()
	if (date.getTime() >= todayStart) {
		return `${pad(date.getHours())}:${pad(date.getMinutes())}`
	}
	if (diff < 2 * 24 * 60 * 60 * 1000) {
		return '昨天'
	}
	if (diff < 7 * 24 * 60 * 60 * 1000) {
		return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
	}
	return `${date.getMonth() + 1}/${date.getDate()}`
}

export function formatMessageTime(timestamp) {
	if (!timestamp) {
		return ''
	}
	const date = new Date(timestamp)
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function pad(value) {
	return value < 10 ? `0${value}` : `${value}`
}

export function readFileAsBase64(source) {
	return new Promise((resolve, reject) => {
		// #ifdef H5
		if (source && source.file) {
			const reader = new FileReader()
			reader.onload = () => {
				const result = String(reader.result || '')
				resolve(result.split(',').pop() || '')
			}
			reader.onerror = error => reject(error)
			reader.readAsDataURL(source.file)
			return
		}
		reject(new Error('当前 H5 环境缺少文件对象，无法读取文件'))
		// #endif

		// #ifdef APP-PLUS
		if (source && source.path && typeof plus !== 'undefined') {
			if (source.path.indexOf('content://') === 0 && plus.os.name === 'Android') {
				let inputStream = null
				try {
					const Uri = plus.android.importClass('android.net.Uri')
					const Base64 = plus.android.importClass('android.util.Base64')
					const main = plus.android.runtimeMainActivity()
					const contentResolver = main.getContentResolver()
					const uri = Uri.parse(source.path)
					inputStream = plus.android.invoke(contentResolver, 'openInputStream', uri)
					if (!inputStream) {
						throw new Error('无法打开所选文件')
					}
					const bytes = readAndroidInputStreamBytes(inputStream)
					resolve(Base64.encodeToString(bytes, Base64.NO_WRAP))
					return
				} catch (error) {
					reject(error)
					return
				} finally {
					if (inputStream) {
						plus.android.invoke(inputStream, 'close')
					}
				}
			}
			plus.io.resolveLocalFileSystemURL(source.path, entry => {
				entry.file(file => {
					const reader = new plus.io.FileReader()
					reader.onloadend = event => {
						const result = String(event.target.result || '')
						resolve(result.split(',').pop() || '')
					}
					reader.onerror = error => reject(error)
					reader.readAsDataURL(file)
				}, reject)
			}, reject)
			return
		}
		reject(new Error('当前 App 环境无法读取文件'))
		// #endif

		// #ifdef MP
		if (source && source.path) {
			const fs = uni.getFileSystemManager()
			fs.readFile({
				filePath: source.path,
				encoding: 'base64',
				success: result => resolve(result.data || ''),
				fail: error => reject(error)
			})
			return
		}
		reject(new Error('当前小程序环境无法读取文件'))
		// #endif
	})
}

function readAndroidInputStreamBytes(inputStream) {
	try {
		return plus.android.invoke(inputStream, 'readAllBytes')
	} catch (error) {
		const ByteArrayOutputStream = plus.android.importClass('java.io.ByteArrayOutputStream')
		const outputStream = new ByteArrayOutputStream()
		let nextByte = plus.android.invoke(inputStream, 'read')
		while (nextByte !== -1) {
			plus.android.invoke(outputStream, 'write', nextByte)
			nextByte = plus.android.invoke(inputStream, 'read')
		}
		return plus.android.invoke(outputStream, 'toByteArray')
	}
}
