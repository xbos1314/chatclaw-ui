import { reactive } from 'vue'
import { HEARTBEAT_INTERVAL, MESSAGE_PAGE_SIZE } from '@/common/config'
import {
	buildHttpBaseUrl,
	buildWsUrl,
	createLocalMediaMessage,
	createLocalTextMessage,
	joinUrl,
	normalizeAgent,
	normalizeMessage,
	uid
} from '@/common/chat'
import * as api from '@/services/http'
import notificationService from '@/services/notification'
import { clearSession, getSavedCredentials, getSavedSession, saveSession } from '@/services/storage'

const state = reactive({
	bootstrapped: false,
	isBootstrapping: false,
	status: 'disconnected',
	errorMessage: '',
	auth: {
		serverUrl: '',
		username: '',
		password: '',
		token: '',
		tokenExpiresAt: 0,
		downloadToken: '',
		downloadTokenExpiresAt: 0,
		accountId: '',
		avatarUrl: ''
	},
	agents: [],
	selectedAgentId: '',
	selectedAgentName: '',
	selectedAgentAvatar: '',
	messagesByAgent: {},
	latestMessages: {},
	unreadByAgent: {},
	typingByAgent: {},
	currentPageByAgent: {},
	hasMoreByAgent: {},
	loadingMoreByAgent: {},
	refreshingAgents: false
})

let socketTask = null
let connectPromise = null
let reconnectTimer = null
let heartbeatTimer = null
let downloadTokenTimer = null
let downloadTokenPromise = null
let isManualDisconnect = false
let reconnectCount = 0
const pendingAgentByRequestId = {}

function shouldIgnoreMessage(message) {
	return !!message && message.isUser && String(message.text || '').trim() === '/new'
}

function setAuth(session) {
	state.auth = Object.assign({}, state.auth, session)
	api.setBaseUrl(buildHttpBaseUrl(state.auth.serverUrl))
	api.setToken(state.auth.token)
	scheduleDownloadTokenRefresh()
}

function clearDownloadTokenRefreshTimer() {
	if (downloadTokenTimer) {
		clearTimeout(downloadTokenTimer)
		downloadTokenTimer = null
	}
}

function persistAuthSession() {
	saveSession(state.auth)
}

function setDownloadToken(downloadToken, downloadTokenExpiresAt) {
	state.auth = Object.assign({}, state.auth, {
		downloadToken: downloadToken || '',
		downloadTokenExpiresAt: Number(downloadTokenExpiresAt || 0)
	})
	persistAuthSession()
	scheduleDownloadTokenRefresh()
}

function scheduleDownloadTokenRefresh() {
	clearDownloadTokenRefreshTimer()
	if (!state.auth.token || !state.auth.serverUrl || !state.auth.downloadTokenExpiresAt) {
		return
	}
	const refreshAt = Number(state.auth.downloadTokenExpiresAt) - 5 * 60 * 1000
	const delay = Math.max(30000, refreshAt - Date.now())
	downloadTokenTimer = setTimeout(() => {
		refreshDownloadToken(true).catch(() => {})
	}, delay)
}

function isDownloadTokenValid(bufferMs) {
	const expiry = Number(state.auth.downloadTokenExpiresAt || 0)
	if (!state.auth.downloadToken) {
		return false
	}
	if (!expiry) {
		return true
	}
	return expiry > Date.now() + Number(bufferMs || 0)
}

export async function refreshDownloadToken(silent) {
	if (!state.auth.token) {
		return ''
	}
	if (downloadTokenPromise) {
		return downloadTokenPromise
	}
	downloadTokenPromise = api.refreshDownloadToken().then(result => {
		setDownloadToken(result.downloadToken, result.downloadTokenExpiresAt)
		return state.auth.downloadToken
	}).catch(error => {
		if (!silent) {
			throw error
		}
		return ''
	}).finally(() => {
		downloadTokenPromise = null
	})
	return downloadTokenPromise
}

export async function ensureDownloadToken(forceRefresh) {
	if (!state.auth.token) {
		return ''
	}
	if (!forceRefresh && isDownloadTokenValid(60000)) {
		return state.auth.downloadToken
	}
	return refreshDownloadToken(false)
}

function appendDownloadToken(url) {
	if (!requiresDownloadToken(url) || !state.auth.downloadToken) {
		return url
	}
	const hashIndex = url.indexOf('#')
	const hash = hashIndex === -1 ? '' : url.slice(hashIndex)
	let main = hashIndex === -1 ? url : url.slice(0, hashIndex)
	main = main.replace(/([?&])token=[^&#]*(&)?/, (_match, prefix, tail) => (tail ? prefix : ''))
	main = main.replace(/[?&]$/, '')
	const divider = main.indexOf('?') === -1 ? '?' : '&'
	return `${main}${divider}token=${encodeURIComponent(state.auth.downloadToken)}${hash}`
}

function requiresDownloadToken(url) {
	if (!url) {
		return false
	}
	if (url.indexOf('/files/download/public/') !== -1) {
		return false
	}
	return url.indexOf('/files/') !== -1 || url.indexOf('/voices/download/') !== -1
}

function resetChatState() {
	state.agents = []
	state.selectedAgentId = ''
	state.selectedAgentName = ''
	state.selectedAgentAvatar = ''
	state.messagesByAgent = {}
	state.latestMessages = {}
	state.unreadByAgent = {}
	state.typingByAgent = {}
	state.currentPageByAgent = {}
	state.hasMoreByAgent = {}
	state.loadingMoreByAgent = {}
	state.refreshingAgents = false
}

function setStatus(status, errorMessage) {
	state.status = status
	if (typeof errorMessage !== 'undefined') {
		state.errorMessage = errorMessage
	}
}

function syncTypingStateFromAgents(agents) {
	const nextTypingByAgent = Object.assign({}, state.typingByAgent)
	;(agents || []).forEach(agent => {
		if (!agent || !agent.id) {
			return
		}
		nextTypingByAgent[agent.id] = !!agent.isTyping
	})
	state.typingByAgent = nextTypingByAgent
}

function updateAgentMessages(agentId, messages) {
	state.messagesByAgent[agentId] = messages
	state.latestMessages[agentId] = messages.length ? messages[0] : null
}

function mergeMessage(agentId, incoming, insertAtStart) {
	const normalized = normalizeMessage(incoming)
	const existing = (state.messagesByAgent[agentId] || []).slice()
	let matchedIndex = -1
	if (normalized.requestId) {
		matchedIndex = existing.findIndex(item => item.requestId && item.requestId === normalized.requestId)
	}
	if (matchedIndex === -1) {
		matchedIndex = existing.findIndex(item => item.id === normalized.id)
	}
	if (matchedIndex !== -1) {
		existing.splice(matchedIndex, 1, Object.assign({}, existing[matchedIndex], normalized, {
			isPending: false,
			isRead: state.selectedAgentId === agentId && !normalized.isUser ? true : normalized.isRead
		}))
		updateAgentMessages(agentId, existing)
		return
	}
	if (insertAtStart) {
		existing.unshift(Object.assign({}, normalized, {
			isRead: state.selectedAgentId === agentId && !normalized.isUser ? true : normalized.isRead
		}))
	} else {
		existing.push(normalized)
	}
	updateAgentMessages(agentId, existing)
}

function confirmPendingMessage(agentId, requestId, messageId) {
	const messages = (state.messagesByAgent[agentId] || []).slice()
	const index = messages.findIndex(item => item.requestId === requestId)
	if (index === -1) {
		return
	}
	messages.splice(index, 1, Object.assign({}, messages[index], {
		id: messageId,
		isPending: false
	}))
	updateAgentMessages(agentId, messages)
}

function replaceMessages(agentId, messages) {
	const normalized = (messages || []).map(item => normalizeMessage(item))
	updateAgentMessages(agentId, normalized)
}

function applySelectedReadState(agentId) {
	if (!agentId) {
		return
	}
	const messages = (state.messagesByAgent[agentId] || []).map(item => {
		if (!item.isUser && !item.isRead) {
			return Object.assign({}, item, { isRead: true })
		}
		return item
	})
	updateAgentMessages(agentId, messages)
	state.unreadByAgent[agentId] = 0
	api.markRead(agentId).catch(() => {})
}

function attachSocketListeners(currentTask, resolve, reject, shouldRefresh) {
	let settled = false
	currentTask.onOpen(async () => {
		if (socketTask !== currentTask) {
			return
		}
		setStatus('connected', '')
		reconnectCount = 0
		startHeartbeat()
		try {
			if (shouldRefresh !== false) {
				await requestAgents()
			}
			if (state.selectedAgentId) {
				await loadMessages(state.selectedAgentId, 1, true)
				applySelectedReadState(state.selectedAgentId)
			}
		} finally {
			settled = true
			resolve(true)
		}
	})

	currentTask.onMessage(event => {
		if (socketTask !== currentTask) {
			return
		}
		handleSocketMessage(event.data)
	})

	currentTask.onError(error => {
		if (socketTask !== currentTask) {
			return
		}
		setStatus('error', '实时连接失败，请检查服务器地址或网络')
		if (!settled) {
			settled = true
			reject(error)
		}
	})

	currentTask.onClose(() => {
		if (socketTask !== currentTask) {
			return
		}
		stopHeartbeat()
		socketTask = null
		if (isManualDisconnect) {
			setStatus('disconnected', '')
			return
		}
		setStatus('reconnecting', '连接已断开，正在重新连接...')
		if (!settled) {
			settled = true
			reject(new Error('socket closed'))
		}
		scheduleReconnect()
	})
}

function scheduleReconnect() {
	if (reconnectTimer || !state.auth.token || !state.auth.serverUrl) {
		return
	}
	reconnectCount += 1
	reconnectTimer = setTimeout(async () => {
		reconnectTimer = null
		try {
			await connectSocket(true)
		} catch (error) {
			scheduleReconnect()
		}
	}, Math.min(1500 * reconnectCount, 6000))
}

function stopReconnect() {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer)
		reconnectTimer = null
	}
}

function startHeartbeat() {
	stopHeartbeat()
	heartbeatTimer = setInterval(() => {
		if (socketTask && state.status === 'connected') {
			sendSocketPayload({ type: 'ping' }, true).catch(() => {})
		}
	}, HEARTBEAT_INTERVAL)
}

function stopHeartbeat() {
	if (heartbeatTimer) {
		clearInterval(heartbeatTimer)
		heartbeatTimer = null
	}
}

function sendSocketPayload(payload, silent) {
	return new Promise((resolve, reject) => {
		if (!socketTask) {
			reject(new Error('socket unavailable'))
			return
		}
		socketTask.send({
			data: JSON.stringify(payload),
			success: () => resolve(true),
			fail: error => {
				if (!silent) {
					setStatus(state.status, '消息发送失败，请稍后重试')
				}
				reject(error)
			}
		})
	})
}

function handleSocketMessage(rawData) {
	let data = rawData
	if (typeof rawData === 'string') {
		try {
			data = JSON.parse(rawData)
		} catch (error) {
			return
		}
	}
	const type = data.type || ''
	if (type === 'message') {
		const message = normalizeMessage(data)
		if (shouldIgnoreMessage(message)) {
			return
		}
		const agentId = message.agentId || state.selectedAgentId
		if (!agentId) {
			return
		}
		mergeMessage(agentId, message, true)
		if (agentId === state.selectedAgentId) {
			applySelectedReadState(agentId)
		} else if (!message.isUser) {
			state.unreadByAgent[agentId] = Number(state.unreadByAgent[agentId] || 0) + 1
			const agent = state.agents.find(item => item.id === agentId)
			notificationService.showMessageNotification({
				agentId,
				agentName: (agent && agent.name) || agentId || '智能体',
				message
			})
		}
		return
	}
	if (type === 'message_sent') {
		const requestId = data.request_id || ''
		const messageId = data.message_id || ''
		const agentId = pendingAgentByRequestId[requestId] || ''
		if (agentId && requestId && messageId) {
			confirmPendingMessage(agentId, requestId, messageId)
			delete pendingAgentByRequestId[requestId]
		}
		return
	}
	if (type === 'typing_start' || type === 'typing_stop') {
		const agentId = data.agent_id || state.selectedAgentId
		if (agentId) {
			state.typingByAgent[agentId] = type === 'typing_start'
		}
		return
	}
	if (type === 'unread_count') {
		const agentId = data.agent_id || ''
		if (agentId) {
			state.unreadByAgent[agentId] = Number(data.count || 0)
		}
		return
	}
	if (type === 'error') {
		setStatus(state.status, data.error || '服务器返回错误')
		return
	}
	if (type === 'agents_list' && Array.isArray(data.agents)) {
		const agents = data.agents.map(item => normalizeAgent(item))
		state.agents = agents
		syncTypingStateFromAgents(agents)
	}
}

async function hydrateAgentMeta(agentId) {
	try {
		const results = await Promise.all([
			api.getMessages(agentId, 1, 1),
			api.getUnreadCount(agentId)
		])
		const messageData = results[0]
		const unreadData = results[1]
		const latest = (messageData.data || []).map(item => normalizeMessage(item))
		state.latestMessages[agentId] = latest.length ? latest[0] : null
		state.unreadByAgent[agentId] = Number(unreadData.count || 0)
	} catch (error) {
		state.latestMessages[agentId] = null
		state.unreadByAgent[agentId] = 0
	}
}

export async function bootstrapSession() {
	if (state.isBootstrapping) {
		return !!state.auth.token
	}
	state.isBootstrapping = true
	try {
		const session = getSavedSession()
		if (!session.token || !session.serverUrl || !session.accountId) {
			state.bootstrapped = true
			return false
		}
		if (session.tokenExpiresAt && session.tokenExpiresAt <= Date.now()) {
			clearSession({ clearCredentials: false })
			state.bootstrapped = true
			return false
		}
		setAuth(session)
		await ensureDownloadToken(!session.downloadToken || !session.downloadTokenExpiresAt || session.downloadTokenExpiresAt <= Date.now())
		await connectSocket(true)
		state.bootstrapped = true
		return true
	} catch (error) {
		state.bootstrapped = true
		return false
	} finally {
		state.isBootstrapping = false
	}
}

export function getCredentials() {
	return getSavedCredentials()
}

export async function login(serverUrl, username, password) {
	const authResult = await api.auth(serverUrl, username, password)
	const session = {
		serverUrl: serverUrl,
		username: username,
		password: password,
		token: authResult.token,
		tokenExpiresAt: authResult.tokenExpiresAt,
		downloadToken: authResult.downloadToken,
		downloadTokenExpiresAt: authResult.downloadTokenExpiresAt,
		accountId: authResult.accountId,
		avatarUrl: authResult.avatarUrl
	}
	saveSession(session)
	setAuth(session)
	await connectSocket(true)
	return true
}

export async function connectSocket(refreshAfterConnect) {
	if (!state.auth.serverUrl || !state.auth.token) {
		throw new Error('未找到登录信息')
	}
	if (connectPromise) {
		return connectPromise
	}
	if (socketTask && state.status === 'connected') {
		return true
	}
	isManualDisconnect = false
	stopReconnect()
	setStatus(state.status === 'reconnecting' ? 'reconnecting' : 'connecting', '')
	connectPromise = new Promise((resolve, reject) => {
		try {
			const url = buildWsUrl(state.auth.serverUrl)
			const divider = url.indexOf('?') === -1 ? '?' : '&'
			const task = uni.connectSocket({
				url: `${url}${divider}token=${encodeURIComponent(state.auth.token)}`,
				complete: () => {}
			})
			socketTask = task
			attachSocketListeners(task, resolve, reject, refreshAfterConnect)
		} catch (error) {
			reject(error)
		}
	}).finally(() => {
		connectPromise = null
	})
	return connectPromise
}

export function disconnect() {
	isManualDisconnect = true
	stopReconnect()
	stopHeartbeat()
	if (socketTask) {
		socketTask.close({
			code: 1000,
			reason: 'manual close'
		})
		socketTask = null
	}
	setStatus('disconnected', '')
}

export async function logout() {
	disconnect()
	notificationService.cancelAllNotifications()
	clearSession({ clearCredentials: true })
	api.clearToken()
	clearDownloadTokenRefreshTimer()
	state.auth = {
		serverUrl: '',
		username: '',
		password: '',
		token: '',
		tokenExpiresAt: 0,
		downloadToken: '',
		downloadTokenExpiresAt: 0,
		accountId: '',
		avatarUrl: ''
	}
	resetChatState()
}

export async function updateAvatar(avatarUrl) {
	await api.updateAvatar(avatarUrl)
	state.auth = Object.assign({}, state.auth, {
		avatarUrl: avatarUrl
	})
	persistAuthSession()
}

export async function requestAgents() {
	state.refreshingAgents = true
	try {
		const result = await api.getAgents()
		const agents = (result.agents || []).map(item => normalizeAgent(item))
		state.agents = agents
		syncTypingStateFromAgents(agents)
		await Promise.all(agents.map(agent => hydrateAgentMeta(agent.id)))
		return agents
	} finally {
		state.refreshingAgents = false
	}
}

export async function selectAgent(agent) {
	const target = typeof agent === 'string'
		? state.agents.find(item => item.id === agent)
		: agent
	if (!target) {
		return
	}
	state.selectedAgentId = target.id
	state.selectedAgentName = target.name
	state.selectedAgentAvatar = target.avatar || ''
	notificationService.cancelNotification(target.id)
	await loadMessages(target.id, 1)
	applySelectedReadState(target.id)
}

export function deselectAgent() {
	state.selectedAgentId = ''
	state.selectedAgentName = ''
	state.selectedAgentAvatar = ''
}

export async function loadMessages(agentId, page, silent) {
	const currentPage = page || 1
	state.loadingMoreByAgent[agentId] = true
	try {
		const result = await api.getMessages(agentId, currentPage, MESSAGE_PAGE_SIZE)
		const messages = (result.data || []).map(item => normalizeMessage(item)).filter(item => !shouldIgnoreMessage(item))
		if (currentPage === 1) {
			replaceMessages(agentId, messages)
		} else {
			const existing = (state.messagesByAgent[agentId] || []).slice()
			updateAgentMessages(agentId, existing.concat(messages))
		}
		state.currentPageByAgent[agentId] = Number(result.page || currentPage)
		state.hasMoreByAgent[agentId] = Number(result.total_pages || 1) > Number(result.page || currentPage)
		if (!silent && agentId === state.selectedAgentId) {
			applySelectedReadState(agentId)
		}
		return state.messagesByAgent[agentId] || []
	} finally {
		state.loadingMoreByAgent[agentId] = false
	}
}

export async function loadMoreMessages() {
	if (!state.selectedAgentId || state.loadingMoreByAgent[state.selectedAgentId] || !state.hasMoreByAgent[state.selectedAgentId]) {
		return
	}
	const nextPage = Number(state.currentPageByAgent[state.selectedAgentId] || 1) + 1
	await loadMessages(state.selectedAgentId, nextPage, true)
}

export async function clearCurrentMessages() {
	if (!state.selectedAgentId) {
		return
	}
	await api.clearMessages(state.selectedAgentId)
	updateAgentMessages(state.selectedAgentId, [])
	state.latestMessages[state.selectedAgentId] = null
	state.currentPageByAgent[state.selectedAgentId] = 1
	state.hasMoreByAgent[state.selectedAgentId] = false
	state.unreadByAgent[state.selectedAgentId] = 0
}

export async function removeMessage(message) {
	if (!message || !message.id || !message.agentId) {
		return
	}
	await api.deleteMessage(message.id)
	const agentId = message.agentId
	const remaining = (state.messagesByAgent[agentId] || []).filter(item => item.id !== message.id)
	updateAgentMessages(agentId, remaining)
}

export async function sendText(text) {
	if (!state.selectedAgentId) {
		throw new Error('请先选择一个智能体')
	}
	await connectSocket(false)
	const requestId = uid('req')
	const localMessage = createLocalTextMessage(text, state.selectedAgentId, requestId)
	const current = (state.messagesByAgent[state.selectedAgentId] || []).slice()
	current.unshift(localMessage)
	updateAgentMessages(state.selectedAgentId, current)
	pendingAgentByRequestId[requestId] = state.selectedAgentId
	await sendSocketPayload({
		type: 'send_text',
		text: text,
		agent_id: state.selectedAgentId,
		request_id: requestId
	})
}

export async function sendMedia(messageType, fileUrl, fileName, extra) {
	if (!state.selectedAgentId) {
		throw new Error('请先选择一个智能体')
	}
	await connectSocket(false)
	const requestId = uid('req')
	const localType = messageType.replace(/^send_/, '')
	const localMessage = createLocalMediaMessage(
		localType,
		fileUrl,
		fileName,
		state.selectedAgentId,
		requestId,
		extra && extra.duration,
		extra && extra.coverUrl
	)
	const current = (state.messagesByAgent[state.selectedAgentId] || []).slice()
	current.unshift(localMessage)
	updateAgentMessages(state.selectedAgentId, current)
	pendingAgentByRequestId[requestId] = state.selectedAgentId
	const payload = {
		type: messageType,
		file_url: fileUrl,
		file_name: fileName || '',
		agent_id: state.selectedAgentId,
		request_id: requestId
	}
	if (extra && extra.duration) {
		payload.duration = extra.duration
	}
	if (extra && extra.coverUrl) {
		payload.cover_url = extra.coverUrl
	}
	await sendSocketPayload(payload)
}

export function getFullUrl(path) {
	return appendDownloadToken(joinUrl(api.getBaseUrl(), path))
}

export async function getDownloadUrl(path) {
	const absoluteUrl = joinUrl(api.getBaseUrl(), path)
	if (requiresDownloadToken(absoluteUrl)) {
		await ensureDownloadToken(false)
	}
	return appendDownloadToken(absoluteUrl)
}

export async function refreshDownloadTokenIfNeeded() {
	if (!state.auth.token) {
		return ''
	}
	if (isDownloadTokenValid(5 * 60 * 1000)) {
		return state.auth.downloadToken
	}
	return refreshDownloadToken(true)
}

export function getSelectedMessages() {
	return state.selectedAgentId ? (state.messagesByAgent[state.selectedAgentId] || []) : []
}

export function getDisplayedMessages() {
	return getSelectedMessages()
}

export default {
	state,
	bootstrapSession,
	connectSocket,
	requestAgents,
	selectAgent,
	deselectAgent,
	loadMessages,
	loadMoreMessages,
	sendText,
	sendMedia,
	clearCurrentMessages,
	removeMessage,
	updateAvatar,
	login,
	logout,
	getCredentials,
	getDisplayedMessages,
	getSelectedMessages,
	getFullUrl,
	getDownloadUrl,
	refreshDownloadTokenIfNeeded
}
