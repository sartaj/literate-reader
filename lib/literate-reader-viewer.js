const path = require('path')
const through2 = require('through2')
const highlightJs = require('highlight.js');
const createMarkdownIt = require('markdown-it');
const markdownItNamedHeaders = require('markdown-it-named-headers');
const resolveFrom = require('resolve-from')
const splitHtml = require('split-html');
const jdi = require('./jdi');

const _pipe = (f, g) => (...args) => g(f(...args))
const pipe = (...fns) => fns.reduce(_pipe)

const LINK_BEGIN = '__LITERATE_READER_MODULE_LINK_BEGIN__'
const LINK_END = '__LITERATE_READER_MODULE_LINK_END__'

const isInQuotes = /(\'|\")(.*)(\'|\")/
const isImportOrRequire = /require\(\'|from\ \'/;
const isMarkedModule = new RegExp(LINK_BEGIN + '(.*)' + LINK_END, 'g');

const markdownIt = createMarkdownIt({
	html: true,
	highlight: (str, lang) => {
    if(lang === 'js') lang = 'typescript'
		if (lang && highlightJs.getLanguage(lang)) {
			try {
				return `<pre class="hljs"><code><div>${highlightJs.highlight(lang, str, true).value}</div></code></pre>`;
			} catch (error) { }
		}
		return `<pre class="hljs"><code><div>${markdownIt.utils.escapeHtml(str)}</div></code></pre>`;
	}
}).use(markdownItNamedHeaders, {});

const generateLinkFromModulesWithMarkersInHtml = (file, linkGeneratorFunction) => html => {
  return html
    .replace(isMarkedModule, (match, p1) => {
      const link = resolveFrom(path.dirname(file), p1)
      const encodedLink = linkGeneratorFunction(link)
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

  if(/<code>/.test(chunk)) {
    this.push('<div><code></pre>\n\n')
  } else if(/<\/code>/.test(chunk)) {
    this.push('</code></pre></div>\n\n')
  } else if(isImportOrRequire.test(chunk)) {
		this.push(injectLinkMarkerInMd(String(chunk)))
  } else {
    this.push(chunk)
  }
	cb()
}

const InjectImports = through2.ctor(injectImports)

const wrapDocsInContainerDiv = htmlString => splitHtml(htmlString, 'pre:root')
  .map(htmlSnippet => 
    htmlSnippet.slice(0, 4) !== '<pre'
    ? `<div class="literate-reader-docs-container">${htmlSnippet}</div>`
    : htmlSnippet
  )
  .join('')
  .replace('<div class="literate-reader-docs-container"></div>', '')
  .replace('<div class="literate-reader-docs-container"> </div>', '')
  .replace('<div class="literate-reader-docs-container">\n</div>', '')
  .replace('<code>', '<pre><code>')
  .replace('</code>', '</code></pre>')
  // .replace(new RegExp('<script>(.*)<\/script>', 'g'), (match, p1) => `<pre><code>${p1}</code></pre>`)

const createLiterateReaderHTML = (file, linkGeneratorFunction) => {
  return new Promise(resolve => {
    const doc = jdi.doc(file)
      .pipe(new InjectImports());

    // Doc is a Node Stream. We listen to the finish and then render.
    doc.on('finish', () => {
      const md = doc.read().toString('utf8');

      const html = pipe(
        generateLinkFromModulesWithMarkersInHtml(file, linkGeneratorFunction),
        wrapDocsInContainerDiv
      )(markdownIt.render(md))

      resolve(html);
    })
  });
}

module.exports.createLiterateReaderHTML = createLiterateReaderHTML