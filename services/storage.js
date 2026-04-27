import { STORAGE_KEYS } from '@/common/config'

export function getSavedCredentials() {
	return {
		serverUrl: uni.getStorageSync(STORAGE_KEYS.serverUrl) || '',
		username: uni.getStorageSync(STORAGE_KEYS.username) || '',
		password: uni.getStorageSync(STORAGE_KEYS.password) || ''
	}
}

export function getSavedSession() {
	return {
		serverUrl: uni.getStorageSync(STORAGE_KEYS.serverUrl) || '',
		username: uni.getStorageSync(STORAGE_KEYS.username) || '',
		password: uni.getStorageSync(STORAGE_KEYS.password) || '',
		token: uni.getStorageSync(STORAGE_KEYS.token) || '',
		tokenExpiresAt: Number(uni.getStorageSync(STORAGE_KEYS.tokenExpiresAt) || 0),
		downloadToken: uni.getStorageSync(STORAGE_KEYS.downloadToken) || '',
		downloadTokenExpiresAt: Number(uni.getStorageSync(STORAGE_KEYS.downloadTokenExpiresAt) || 0),
		accountId: uni.getStorageSync(STORAGE_KEYS.accountId) || '',
		avatarUrl: uni.getStorageSync(STORAGE_KEYS.avatarUrl) || ''
	}
}

export function saveSession(session) {
	uni.setStorageSync(STORAGE_KEYS.serverUrl, session.serverUrl || '')
	uni.setStorageSync(STORAGE_KEYS.username, session.username || '')
	uni.setStorageSync(STORAGE_KEYS.password, session.password || '')
	uni.setStorageSync(STORAGE_KEYS.token, session.token || '')
	uni.setStorageSync(STORAGE_KEYS.tokenExpiresAt, session.tokenExpiresAt || 0)
	uni.setStorageSync(STORAGE_KEYS.downloadToken, session.downloadToken || '')
	uni.setStorageSync(STORAGE_KEYS.downloadTokenExpiresAt, session.downloadTokenExpiresAt || 0)
	uni.setStorageSync(STORAGE_KEYS.accountId, session.accountId || '')
	uni.setStorageSync(STORAGE_KEYS.avatarUrl, session.avatarUrl || '')
}

export function clearSession(options) {
	const clearCredentials = !options || options.clearCredentials !== false
	uni.removeStorageSync(STORAGE_KEYS.token)
	uni.removeStorageSync(STORAGE_KEYS.tokenExpiresAt)
	uni.removeStorageSync(STORAGE_KEYS.downloadToken)
	uni.removeStorageSync(STORAGE_KEYS.downloadTokenExpiresAt)
	uni.removeStorageSync(STORAGE_KEYS.accountId)
	uni.removeStorageSync(STORAGE_KEYS.avatarUrl)
	if (clearCredentials) {
		uni.removeStorageSync(STORAGE_KEYS.username)
		uni.removeStorageSync(STORAGE_KEYS.password)
		uni.removeStorageSync(STORAGE_KEYS.serverUrl)
	}
}
