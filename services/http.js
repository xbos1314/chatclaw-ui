import { buildHttpBaseUrl, getMimeType, readFileAsBase64 } from '@/common/chat'
import { clearSession } from '@/services/storage'

const runtime = {
	baseUrl: '',
	token: ''
}
let handlingUnauthorized = false

function resolveExpiresAt(rawValue, fallbackSeconds) {
	const numeric = Number(rawValue || 0)
	if (Number.isFinite(numeric) && numeric > 0) {
		if (numeric > 1000000000000) {
			return numeric
		}
		if (numeric > 1000000000) {
			return numeric * 1000
		}
		return Date.now() + numeric * 1000
	}
	if (fallbackSeconds) {
		return Date.now() + fallbackSeconds * 1000
	}
	return 0
}

function handleUnauthorized() {
	if (handlingUnauthorized) {
		return
	}
	handlingUnauthorized = true
	runtime.token = ''
	clearSession({ clearCredentials: false })
	uni.reLaunch({
		url: '/pages/login/index'
	})
	setTimeout(() => {
		handlingUnauthorized = false
	}, 300)
}

function handleResponse(response) {
	const statusCode = response.statusCode || 0
	if (statusCode >= 200 && statusCode < 300) {
		return response.data || {}
	}
	if (statusCode === 401) {
		handleUnauthorized()
		const error = new Error('登录已过期，请重新登录')
		error.statusCode = statusCode
		throw error
	}
	let message = '请求失败'
	if (response.data && typeof response.data === 'object' && response.data.error) {
		message = response.data.error
	}
	const error = new Error(message)
	error.statusCode = statusCode
	throw error
}

export function setBaseUrl(url) {
	runtime.baseUrl = (url || '').replace(/\/$/, '')
}

export function getBaseUrl() {
	return runtime.baseUrl
}

export function setToken(token) {
	runtime.token = token || ''
}

export function getToken() {
	return runtime.token
}

export function clearToken() {
	runtime.token = ''
}

export function request(path, options) {
	const settings = options || {}
	const baseUrl = settings.baseUrl ? buildHttpBaseUrl(settings.baseUrl) : runtime.baseUrl
	const method = settings.method || 'GET'
	const headers = Object.assign({
		'Content-Type': 'application/json'
	}, settings.headers || {})
	if (!settings.skipAuth && runtime.token) {
		headers.Authorization = `Bearer ${runtime.token}`
	}
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${baseUrl}${path}`,
			method: method,
			data: settings.data || {},
			header: headers,
			success: response => {
				try {
					resolve(handleResponse(response))
				} catch (error) {
					reject(error)
				}
			},
			fail: error => reject(error)
		})
	})
}

export async function auth(serverUrl, username, password) {
	const baseUrl = buildHttpBaseUrl(serverUrl)
	const result = await request('/auth', {
		baseUrl: baseUrl,
		method: 'POST',
		data: {
			username: username,
			password: password
		},
		skipAuth: true
	})
	return {
		baseUrl: baseUrl,
		token: result.token,
		tokenExpiresAt: Number(result.expires_at || 0),
		downloadToken: result.download_token || '',
		downloadTokenExpiresAt: resolveExpiresAt(result.download_token_expires_in, 3600),
		accountId: result.account_id || '',
		username: result.username || username,
		avatarUrl: result.avatar_url || ''
	}
}

export async function refreshDownloadToken() {
	const result = await request('/files/refresh-download-token', {
		method: 'POST'
	})
	return {
		downloadToken: result.download_token || '',
		downloadTokenExpiresAt: resolveExpiresAt(result.expires_in, 3600)
	}
}

export function getAgents() {
	return request('/agents')
}

export function getMessages(agentId, page, pageSize) {
	return request('/messages', {
		method: 'GET',
		data: {
			agent_id: agentId,
			page: page,
			page_size: pageSize
		}
	})
}

export function getUnreadCount(agentId) {
	return request('/messages/unread-count', {
		method: 'GET',
		data: agentId ? { agent_id: agentId } : {}
	})
}

export function markRead(agentId) {
	return request('/messages/read', {
		method: 'POST',
		data: {
			agent_id: agentId
		}
	})
}

export function clearMessages(agentId) {
	return request(`/messages?agent_id=${agentId}`, {
		method: 'DELETE'
	})
}

export function deleteMessage(messageId) {
	return request(`/messages/${messageId}`, {
		method: 'DELETE'
	})
}

export function updateMessage(messageId, updates) {
	return request(`/messages/${messageId}`, {
		method: 'PATCH',
		data: updates || {}
	})
}

export function getFiles(contentType, page, pageSize) {
	return request('/files', {
		method: 'GET',
		data: {
			content_type: contentType || '',
			page: page || 1,
			page_size: pageSize || 20
		}
	})
}

export function deleteFileRecord(fileId) {
	return request(`/files/${fileId}`, {
		method: 'DELETE'
	})
}

export function updateAvatar(avatarUrl) {
	return request('/users/avatar', {
		method: 'POST',
		data: {
			avatar_url: avatarUrl
		}
	})
}

export async function uploadFile(source, agentId) {
	const payload = {
		file_name: source.name || source.path.split('/').pop() || 'upload.bin',
		content_type: getMimeType(source.name || source.path),
		data: await readFileAsBase64(source)
	}
	if (agentId) {
		payload.agent_id = agentId
	}
	const result = await request('/files/upload', {
		method: 'POST',
		data: payload
	})
	return {
		fileUrl: result.file_url || '',
		coverUrl: result.cover_url || ''
	}
}
