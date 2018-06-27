const highlightJs = require('highlight.js');
const createMarkdownIt = require('markdown-it');
const markdownItNamedHeaders = require('markdown-it-named-headers');

const markdownIt = createMarkdownIt({
	html: true,
	highlight: (str, lang) => {
		if (lang && highlightJs.getLanguage(lang)) {
			try {
				return `<pre class="hljs"><code><div>${highlightJs.highlight(lang, str, true).value}</div></code></pre>`;
			} catch (error) { }
		}
		return `<pre class="hljs"><code><div>${markdownIt.utils.escapeHtml(str)}</div></code></pre>`;
	}
}).use(markdownItNamedHeaders, {});

module.exports = markdownIt