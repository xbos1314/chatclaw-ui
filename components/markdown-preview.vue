<template>
	<view class="markdown-preview">
		<rich-text :nodes="html"></rich-text>
	</view>
</template>

<script>
function escapeHtml(text) {
	return String(text || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function palette(dark) {
	if (dark) {
		return {
			text: '#ffffff',
			heading: '#ffffff',
			link: '#ffffff',
			codeBg: 'rgba(255,255,255,0.14)',
			codeColor: '#ffffff',
			tableHeadBg: 'transparent',
			tableHeadBorder: 'rgba(255,255,255,0.28)',
			tableCellBorder: 'rgba(255,255,255,0.20)',
			tableBg: 'transparent',
			codeBlockBg: 'rgba(15,23,42,0.45)',
			codeBlockColor: '#e2e8f0',
			quoteBg: 'rgba(255,255,255,0.08)',
			quoteBorder: 'rgba(255,255,255,0.45)',
			divider: 'rgba(255,255,255,0.2)'
		}
	}
	return {
		text: '#334155',
		heading: '#0f172a',
		link: '#2563eb',
		codeBg: '#f1f5f9',
		codeColor: '#0f172a',
		tableHeadBg: 'transparent',
		tableHeadBorder: '#d9e7f5',
		tableCellBorder: '#e2e8f0',
		tableBg: 'transparent',
		codeBlockBg: '#0f172a',
		codeBlockColor: '#e2e8f0',
		quoteBg: '#f8fbff',
		quoteBorder: '#93c5fd',
		divider: '#e2e8f0'
	}
}

function renderInline(source, dark) {
	const colors = palette(dark)
	let text = String(source || '')
	text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, (_, alt, url) => {
		return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="display:block;max-width:100%;width:auto;height:auto;margin:12px 0;border-radius:12px;" />`
	})
	text = escapeHtml(text)
	text = text.replace(/&lt;img src=&quot;([^"]+)&quot; alt=&quot;([^"]*)&quot; style=&quot;([^"]*)&quot; \/&gt;/g, (_, src, alt, style) => {
		return `<img src="${src}" alt="${alt}" style="${style}" />`
	})
	text = text.replace(/`([^`]+)`/g, `<code style="padding:2px 6px;border-radius:5px;background:${colors.codeBg};color:${colors.codeColor};font-size:13px;">$1</code>`)
	text = text.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:700;">$1</strong>')
	text = text.replace(/\*([^*]+)\*/g, '<em style="font-style:italic;">$1</em>')
	text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color:${colors.link};text-decoration:underline;">$1</a>`)
	return text
}

function isTableDelimiter(line) {
	return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line || '')
}

function isTableRow(line) {
	return /\|/.test(line || '')
}

function splitTableRow(line) {
	return String(line || '')
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map(cell => cell.trim())
}

function renderTable(headers, rows, dark) {
	const colors = palette(dark)
	const headerHtml = headers
			.map(cell => `<th style="padding:10px 12px;border:1px solid ${colors.tableHeadBorder};background:${colors.tableHeadBg};text-align:left;font-size:13px;font-weight:700;color:${colors.heading};">${renderInline(cell, dark)}</th>`)
		.join('')
	const bodyHtml = rows
		.map(row => {
			const tds = row
				.map(cell => `<td style="padding:10px 12px;border:1px solid ${colors.tableCellBorder};font-size:13px;line-height:1.6;color:${colors.text};vertical-align:top;">${renderInline(cell, dark)}</td>`)
				.join('')
			return `<tr>${tds}</tr>`
		})
		.join('')
	return `<div style="margin:10px 0;overflow:auto;"><table style="width:100%;border-collapse:collapse;border-spacing:0;background:${colors.tableBg};border-radius:10px;overflow:hidden;">${headerHtml ? `<thead><tr>${headerHtml}</tr></thead>` : ''}<tbody>${bodyHtml}</tbody></table></div>`
}

function renderMarkdown(source, dark) {
	const lines = String(source || '').replace(/\r\n/g, '\n').split('\n')
	const parts = []
	let inCode = false
	let codeBuffer = []
	let listType = ''
	const colors = palette(dark)

	function closeList() {
		if (listType) {
			parts.push(listType === 'ol' ? '</ol>' : '</ul>')
			listType = ''
		}
	}

	function flushCode() {
		if (!inCode) return
		const code = escapeHtml(codeBuffer.join('\n'))
		parts.push(`<pre style="margin:10px 0;padding:14px;border-radius:12px;background:${colors.codeBlockBg};color:${colors.codeBlockColor};font-size:13px;line-height:1.6;white-space:pre-wrap;overflow:auto;"><code>${code}</code></pre>`)
		codeBuffer = []
		inCode = false
	}

	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i]
		if (line.trim().startsWith('```')) {
			closeList()
			if (inCode) {
				flushCode()
			} else {
				inCode = true
			}
			continue
		}

		if (inCode) {
			codeBuffer.push(line)
			continue
		}

		const trimmed = line.trim()
		if (!trimmed) {
			closeList()
			parts.push('<div style="height:10px;"></div>')
			continue
		}

		if (i + 1 < lines.length && isTableRow(trimmed) && isTableDelimiter(lines[i + 1])) {
			closeList()
			const headers = splitTableRow(trimmed)
			const rows = []
			i += 2
			while (i < lines.length && lines[i].trim() && isTableRow(lines[i])) {
				rows.push(splitTableRow(lines[i]))
				i += 1
			}
			i -= 1
			parts.push(renderTable(headers, rows, dark))
			continue
		}

		const heading = trimmed.match(/^(#{1,6})\s+(.+)$/)
		if (heading) {
			closeList()
			const level = heading[1].length
			const sizeMap = { 1: 20, 2: 18, 3: 17, 4: 16, 5: 15, 6: 14 }
			parts.push(`<div style="margin:6px 0 4px;font-size:${sizeMap[level]}px;font-weight:700;color:${colors.heading};">${renderInline(heading[2], dark)}</div>`)
			continue
		}

		if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
			closeList()
			parts.push(`<div style="height:1px;margin:10px 0;background:${colors.divider};"></div>`)
			continue
		}

		const quote = trimmed.match(/^>\s?(.*)$/)
		if (quote) {
			closeList()
			parts.push(`<div style="margin:8px 0;padding:10px 12px;border-left:4px solid ${colors.quoteBorder};background:${colors.quoteBg};color:${colors.text};font-size:14px;line-height:1.6;">${renderInline(quote[1], dark)}</div>`)
			continue
		}

		const ordered = trimmed.match(/^(\d+)\.\s+(.+)$/)
		if (ordered) {
			if (listType !== 'ol') {
				closeList()
				listType = 'ol'
				parts.push(`<ol style="margin:8px 0 8px 20px;padding:0;color:${colors.text};font-size:14px;">`)
			}
			parts.push(`<li style="margin:4px 0;line-height:1.6;">${renderInline(ordered[2], dark)}</li>`)
			continue
		}

		const unordered = trimmed.match(/^[-*]\s+(.+)$/)
		if (unordered) {
			if (listType !== 'ul') {
				closeList()
				listType = 'ul'
				parts.push(`<ul style="margin:8px 0 8px 20px;padding:0;color:${colors.text};font-size:14px;">`)
			}
			parts.push(`<li style="margin:4px 0;line-height:1.6;">${renderInline(unordered[1], dark)}</li>`)
			continue
		}

		closeList()
		parts.push(`<p style="margin:8px 0;line-height:1.7;color:${colors.text};font-size:14px;">${renderInline(trimmed, dark)}</p>`)
	}

	closeList()
	flushCode()
	return parts.join('')
}

export default {
	name: 'MarkdownPreview',
	props: {
		content: {
			type: String,
			default: ''
		},
		dark: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		html() {
			return renderMarkdown(this.content, this.dark)
		}
	}
}
</script>

<style lang="scss">
.markdown-preview {
	width: 100%;
}
</style>
