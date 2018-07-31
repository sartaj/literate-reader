const highlightJs = require('highlight.js');
const highlight = require('highlight-syntax/all')
const createMarkdownIt = require('markdown-it');
const markdownItNamedHeaders = require('markdown-it-named-headers');

const markdownIt = createMarkdownIt({
	html: true,
	highlight: (str, lang) => {
		if (lang === 'javascript' || lang === 'ts' || lang === 'tsx' || lang === 'jsx' || lang === 'js')  {
			return `<pre class="hljs"><code><div>${highlight(str, { lang })}</div></code></pre>`
		}
		if (lang && highlightJs.getLanguage(lang)) {
			try {
				return `<pre class="hljs"><code><div>${highlightJs.highlight(lang, str, true).value}</div></code></pre>`;
			} catch (error) { }
		}
		return `<pre class="hljs"><code><div>${markdownIt.utils.escapeHtml(str)}</div></code></pre>`;
	}
}).use(markdownItNamedHeaders, {});

module.exports = markdownIt