const path = require('path')
const highlightJs = require('highlight.js');
const createMarkdownIt = require('markdown-it');
const markdownItNamedHeaders = require('markdown-it-named-headers');
const resolveFrom = require('resolve-from')
const through2 = require('through2')

const jdi = require('./jdi');

const LINK_BEGIN = '__LITERATE_READER_MODULE_LINK_BEGIN__'
const LINK_END = '__LITERATE_READER_MODULE_LINK_END__'

const isInQuotes = /(\'|\")(.*)(\'|\")/
const isImportOrRequire = /require\(\'|from\ \'/;
const isMarkedModule = new RegExp(LINK_BEGIN + '(.*)' + LINK_END, 'g');

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

const generateLinkFromModulesWithMarkersInHtml = (html, file, linkGeneratorFunction) => {
  return html
    .replace(isMarkedModule, (match, p1) => {
      const link = resolveFrom(path.dirname(file), p1)
      const encodedLink = encodeURIComponent(linkGeneratorFunction(link))
      return  `<a href="${encodedLink}">${p1}</a>`
    })
}

const injectLinkMarkerInMd = line => {
  const markerInjected = line.replace(isInQuotes, (match, p1, p2, p3) =>
          `${p1}${LINK_BEGIN}${p2}${LINK_END}${p3}`)
  return markerInjected
}

// ## `transformFunction`
function injectImports (chunk, enc, cb) {
  // Check if line chunk contains import or require string
	if(isImportOrRequire.test(chunk)) {
		this.push(injectLinkMarkerInMd(String(chunk)))
  } else {
    this.push(chunk)
  }
	cb()
}

const InjectImports = through2.ctor(injectImports)

const createLiterateReaderHTML = (file, linkGeneratorFunction) => {
  return new Promise(resolve => {
    const doc = jdi.doc(file)
      .pipe(new InjectImports());

    // Doc is a Node Stream. We listen to the finish and then render.
    doc.on('finish', () => {
      const mdString = doc.read().toString('utf8');
      const mdHtml = markdownIt.render(mdString);
      const linkedMdHtml = generateLinkFromModulesWithMarkersInHtml(mdHtml, file, linkGeneratorFunction);
      resolve(linkedMdHtml);
    })
  });
}

module.exports.createLiterateReaderHTML = createLiterateReaderHTML