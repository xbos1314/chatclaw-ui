/**
 * 根据文件名判断文件类型
 * @param {string} fileName
 * @returns {'image' | 'video' | 'file'}
 */
function getFileType(fileName) {
	if (!fileName) return 'file'
	const ext = getFileExt(fileName)
	const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
	const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', '3gp', 'webm']
	if (imageExts.includes(ext)) return 'image'
	if (videoExts.includes(ext)) return 'video'
	return 'file'
}

/**
 * 获取文件扩展名
 * @param {string} fileName
 * @returns {string}
 */
function getFileExt(fileName) {
	if (!fileName) return ''
	return fileName.split('.').pop().toLowerCase()
}

/**
 * 下载并保存文件到本地
 * @param {string} url - 文件URL
 * @param {string} fileName - 文件名
 * @returns {Promise<boolean>}
 */
export function downloadFileByUrl(url, fileName) {
	if (!url) {
		return Promise.reject(new Error('missing url'))
	}

	// #ifdef H5
	return fetch(url).then(async res => {
		if (!res.ok) {
			throw new Error('download failed')
		}
		const blob = await res.blob()
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = fileName || 'download'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(link.href)
		return true
	})
	// #endif

	// #ifndef H5
	return new Promise((resolve, reject) => {
		uni.downloadFile({
			url: url,
			success: res => {
				if (res.statusCode !== 200) {
					reject(new Error('download failed'))
					return
				}
				const tempFilePath = res.tempFilePath
				const fileType = getFileType(fileName)

				if (fileType === 'image') {
					uni.saveImageToPhotosAlbum({
						filePath: tempFilePath,
						success: () => resolve(true),
						fail: error => reject(error)
					})
				} else if (fileType === 'video') {
					uni.saveVideoToPhotosAlbum({
						filePath: tempFilePath,
						success: () => resolve(true),
						fail: error => reject(error)
					})
				} else {
					uni.openDocument({
						filePath: tempFilePath,
						fileType: getFileExt(fileName),
						success: () => resolve(true),
						fail: error => reject(error)
					})
				}
			},
			fail: error => reject(error)
		})
	})
	// #endif
}
