import { getBaseUrl, getToken, request } from '@/services/http'

function authHeader() {
	const token = getToken()
	return token ? { Authorization: `Bearer ${token}` } : {}
}

function unwrapData(body) {
	if (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
		return body.data
	}
	return body || {}
}

function toInt(value, fallback = 0) {
	const n = Number(value)
	return Number.isFinite(n) ? n : fallback
}

export function normalizeMemo(raw) {
	return {
		id: raw.id || '',
		accountId: raw.accountId || raw.account_id || '',
		agentId: raw.agentId || raw.agent_id || '',
		title: raw.title || '',
		summary: raw.summary || '',
		content: raw.content || '',
		keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
		voiceUrl: raw.voiceUrl || raw.voice_url || '',
		voicePath: raw.voicePath || raw.voice_path || '',
		originalText: raw.originalText || raw.original_text || '',
		status: raw.status || 'processing',
		createdAt: toInt(raw.createdAt ?? raw.created_at, Date.now()),
		updatedAt: toInt(raw.updatedAt ?? raw.updated_at, Date.now())
	}
}

export function normalizeDocument(raw) {
	return {
		id: raw.id || '',
		accountId: raw.accountId || raw.account_id || '',
		agentId: raw.agentId || raw.agent_id || '',
		fileName: raw.fileName || raw.file_name || raw.title || '',
		filePath: raw.filePath || raw.file_path || '',
		summary: raw.summary || '',
		format: raw.format || 'markdown',
		source: raw.source || 'user',
		status: raw.status || 'ready',
		createdAt: toInt(raw.createdAt ?? raw.created_at, 0),
		updatedAt: toInt(raw.updatedAt ?? raw.updated_at, 0)
	}
}

export function normalizeDocumentTask(raw) {
	return {
		id: raw.id || '',
		documentId: raw.documentId || raw.document_id || '',
		agentId: raw.agentId || raw.agent_id || '',
		taskType: raw.taskType || raw.task_type || '',
		status: raw.status || '',
		prompt: raw.prompt || '',
		notes: raw.notes || '',
		requestMessageId: raw.requestMessageId || raw.request_message_id || '',
		resultMessageId: raw.resultMessageId || raw.result_message_id || '',
		errorMessage: raw.errorMessage || raw.error_message || '',
		createdAt: toInt(raw.createdAt ?? raw.created_at, 0),
		updatedAt: toInt(raw.updatedAt ?? raw.updated_at, 0)
	}
}

export function normalizeMiniprogram(raw) {
	return {
		appId: raw.appId || raw.app_id || '',
		name: raw.name || '',
		summary: raw.summary || '',
		description: raw.description || '',
		status: raw.status || 'creating',
		publicUrl: raw.publicUrl || raw.public_url || '',
		lastError: raw.lastError || raw.last_error || '',
		agentId: raw.agentId || raw.agent_id || '',
		createdAt: toInt(raw.createdAt ?? raw.created_at, 0),
		updatedAt: toInt(raw.updatedAt ?? raw.updated_at, 0),
		latestTask: raw.latestTask ? normalizeMiniprogramTask(raw.latestTask) : null
	}
}

export function normalizeMiniprogramTask(raw) {
	return {
		id: raw.id || '',
		appId: raw.appId || raw.app_id || '',
		taskType: raw.taskType || raw.task_type || '',
		status: raw.status || '',
		prompt: raw.prompt || '',
		notes: raw.notes || '',
		errorMessage: raw.errorMessage || raw.error_message || '',
		createdAt: toInt(raw.createdAt ?? raw.created_at, 0),
		updatedAt: toInt(raw.updatedAt ?? raw.updated_at, 0)
	}
}

export function normalizeProjectNode(raw) {
	return {
		name: raw.name || '',
		path: raw.path || '',
		type: raw.type || 'file',
		children: Array.isArray(raw.children) ? raw.children.map(item => normalizeProjectNode(item)) : []
	}
}

export const workspaceService = {
	async createMemo({ filePath, agentId, fileName }) {
		const baseUrl = getBaseUrl()
		if (!baseUrl) throw new Error('Base URL not set')
		return new Promise((resolve, reject) => {
			uni.uploadFile({
				url: `${baseUrl}/memo/voice`,
				filePath,
				name: 'file',
				formData: {
					agent_id: agentId || ''
				},
				header: authHeader(),
				fileName: fileName || '',
				success: uploadRes => {
					try {
						const data = unwrapData(JSON.parse(uploadRes.data || '{}'))
						resolve(normalizeMemo(data))
					} catch (error) {
						reject(error)
					}
				},
				fail: reject
			})
		})
	},
	async getMemoList({ agentId, page = 1, pageSize = 20 } = {}) {
		const body = unwrapData(await request('/memo/list', {
			method: 'GET',
			data: {
				agent_id: agentId || '',
				page,
				page_size: pageSize
			}
		}))
		return {
			items: (body.memos || []).map(item => normalizeMemo(item)),
			total: toInt(body.total, 0),
			page: toInt(body.page, page),
			pageSize: toInt(body.pageSize ?? body.page_size, pageSize),
			totalPages: toInt(body.totalPages ?? body.total_pages, 1)
		}
	},
	async getMemo(id) {
		return normalizeMemo(unwrapData(await request(`/memo/${id}`, { method: 'GET' })))
	},
	async updateMemo(id, payload) {
		return normalizeMemo(unwrapData(await request(`/memo/${id}`, {
			method: 'PUT',
			data: payload
		})))
	},
	async deleteMemo(id) {
		return request(`/memo/${id}`, { method: 'DELETE' })
	},
	async sendMemoToAgent(id, agentId) {
		return request(`/memo/${id}/send`, {
			method: 'POST',
			data: { agent_id: agentId }
		})
	},
	async createDocument({ fileName, summary, agentId }) {
		return normalizeDocument(unwrapData(await request('/document', {
			method: 'POST',
			data: {
				file_name: fileName,
				summary: summary || '',
				agent_id: agentId || ''
			}
		})))
	},
	async getDocumentList({ agentId, page = 1, pageSize = 20 } = {}) {
		const body = unwrapData(await request('/document/list', {
			method: 'GET',
			data: {
				agent_id: agentId || '',
				page,
				page_size: pageSize
			}
		}))
		return {
			items: (body.documents || []).map(item => normalizeDocument(item)),
			total: toInt(body.total, 0),
			page: toInt(body.page, page),
			pageSize: toInt(body.pageSize ?? body.page_size, pageSize),
			totalPages: toInt(body.totalPages ?? body.total_pages, 1)
		}
	},
	async getDocument(id) {
		return normalizeDocument(unwrapData(await request(`/document/${id}`, { method: 'GET' })))
	},
	async updateDocument(id, payload) {
		return normalizeDocument(unwrapData(await request(`/document/${id}`, {
			method: 'PUT',
			data: payload
		})))
	},
	async deleteDocument(id) {
		return request(`/document/${id}`, { method: 'DELETE' })
	},
	async sendDocumentToAgent({ documentId, agentId, mode = 'context', prompt = '', notes = '' }) {
		return request(`/document/${documentId}/send`, {
			method: 'POST',
			data: {
				agent_id: agentId,
				mode,
				prompt,
				notes
			}
		})
	},
	async getDocumentFile(documentId) {
		return unwrapData(await request(`/document/${documentId}/file`, { method: 'GET' }))
	},
	async saveDocumentFile({ documentId, content }) {
		return unwrapData(await request(`/document/${documentId}/file`, {
			method: 'PUT',
			data: { content }
		}))
	},
	async getDocumentTasks(documentId) {
		const body = unwrapData(await request(`/document/${documentId}/tasks`, { method: 'GET' }))
		return (body.items || []).map(item => normalizeDocumentTask(item))
	},
	async getMiniprogramList({ page = 1, pageSize = 20 } = {}) {
		const body = unwrapData(await request('/api/miniprogram/list', {
			method: 'GET',
			data: {
				page,
				page_size: pageSize
			}
		}))
		return {
			items: (body.items || []).map(item => normalizeMiniprogram(item)),
			total: toInt(body.total, 0),
			page: toInt(body.page, page),
			pageSize: toInt(body.pageSize ?? body.page_size, pageSize),
			totalPages: toInt(body.totalPages ?? body.total_pages, 1)
		}
	},
	async createMiniprogram({ name, prompt, agentId, notes }) {
		return unwrapData(await request('/api/miniprogram/create', {
			method: 'POST',
			data: {
				name,
				prompt,
				agent_id: agentId,
				notes
			}
		}))
	},
	async getMiniprogram(appId) {
		return normalizeMiniprogram(unwrapData(await request(`/api/miniprogram/${appId}`, { method: 'GET' })))
	},
	async deleteMiniprogram(appId) {
		return request(`/api/miniprogram/${appId}`, { method: 'DELETE' })
	},
	async buildMiniprogram(appId) {
		return unwrapData(await request(`/api/miniprogram/${appId}/build`, { method: 'POST' }))
	},
	async reviseMiniprogram({ appId, prompt, agentId, notes }) {
		return request(`/api/miniprogram/${appId}/revise`, {
			method: 'POST',
			data: {
				prompt,
				agent_id: agentId,
				notes
			}
		})
	},
	async sendMiniprogramToAgent({ appId, agentId }) {
		return request(`/api/miniprogram/${appId}/send`, {
			method: 'POST',
			data: { agent_id: agentId }
		})
	},
	async getMiniprogramTasks(appId) {
		const body = unwrapData(await request(`/api/miniprogram/${appId}/tasks`, { method: 'GET' }))
		return (body.items || []).map(item => normalizeMiniprogramTask(item))
	},
	async getMiniprogramProjectFiles(appId) {
		const body = unwrapData(await request(`/api/miniprogram/${appId}/project-files`, { method: 'GET' }))
		return (body.items || []).map(item => normalizeProjectNode(item))
	},
	async getMiniprogramProjectFileContent(appId, filePath) {
		return unwrapData(await request(`/api/miniprogram/${appId}/project-files`, {
			method: 'GET',
			data: { path: filePath }
		}))
	},
	async saveMiniprogramProjectFileContent({ appId, path, content }) {
		return unwrapData(await request(`/api/miniprogram/${appId}/project-files`, {
			method: 'PUT',
			data: { path, content }
		}))
	},
	buildAbsolutePublicUrl(publicUrl) {
		const baseUrl = getBaseUrl() || ''
		if (!publicUrl) return ''
		if (publicUrl.startsWith('http://') || publicUrl.startsWith('https://')) {
			return publicUrl
		}
		return `${baseUrl}${publicUrl}`
	}
}

