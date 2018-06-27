const path = require('path')
const through2 = require('through2')

const mdToHtml = require('./md-to-html')
const esToMd = require('./es-to-md');

const resolveFrom = require('resolve-from');
const pkgDir = require('pkg-dir');
const splitHtml = require('split-html');

const _pipe = (f, g) => (...args) => g(f(...args))
const pipe = (...fns) => fns.reduce(_pipe)

const LINK_BEGIN = '__LITERATE_READER_MODULE_LINK_BEGIN__'
const LINK_END = '__LITERATE_READER_MODULE_LINK_END__'

const isInQuotes = /(\'|\")(.*)(\'|\")/
const isImportOrRequire = /require\(\'|from\ \'/;
const isMarkedModule = new RegExp(LINK_BEGIN + '(.*)' + LINK_END, 'g');

const resolveESFilePath = (file, linkString) => {
  let filePath = resolveFrom.silent(path.dirname(file), linkString)
  if(!filePath) {
    const directory = path.dirname(file);
    const isNodeModule = linkString.indexOf('./') === -1;
    if(isNodeModule) {
      filePath =  resolveFrom.silent(pkgDir.sync(directory), linkString)
      if(!filePath) {
          filePath = path.join(directory, linkString)
      }
    } else {
      const linkStringExt = path.extname(linkString);
      if(linkStringExt) filePath = path.join(directory, linkString);
      else filePath = path.join(directory, `${linkString}${path.extname(file)}`)
    }
  }
  return filePath
}

const generateLinkFromESModulesWithMarkersInHtml = (file, linkGeneratorFunction) => html => {
  return html
    .replace(isMarkedModule, (match, linkString) => {
      const link = resolveESFilePath(file, linkString)
      const encodedLink = linkGeneratorFunction(link)
      return  `<a href="${encodedLink}">${linkString}</a>`
    })
}

const injectLinkMarkerInMd = line => {
  const markerInjected = line.replace(isInQuotes, (match, p1, p2, p3) =>
          `${p1}${LINK_BEGIN}${p2}${LINK_END}${p3}`)
  return markerInjected
}

// ## `transformFunction`
const InjectImports = through2.ctor(function injectImports (chunk, enc, cb) {
  if(isImportOrRequire.test(chunk)) {
		this.push(injectLinkMarkerInMd(String(chunk)))
  } else {
    this.push(chunk)
  }
	cb()
})

const InjectContainerDivsIntoCode = through2.ctor(function injectImports (chunk, enc, cb) {
  if(/<code>/.test(chunk)) {
    this.push('<div><code></pre>\n\n')
  } else if(/<\/code>/.test(chunk)) {
    this.push('</code></pre></div>\n\n')
  } else {
    this.push(chunk)
  }
  cb()
})

const removeUnneededElements = htmlString => htmlString
  .replace('<div class="literate-reader-docs-container"></div>', '')
  .replace('<div class="literate-reader-docs-container"> </div>', '')
  .replace('<div class="literate-reader-docs-container">\n</div>', '')
  .replace('<code>', '<pre><code>')
  .replace('</code>', '</code></pre>')


const wrapDocsInContainerDiv = htmlString => 
  splitHtml(htmlString, 'pre:root')
    .map(htmlSnippet => 
      htmlSnippet.slice(0, 4) !== '<pre'
      ? `<div class="literate-reader-docs-container">${htmlSnippet}</div>`
      : htmlSnippet
    )
    .join('')


const esToLiterateHtml = (file, linkGeneratorFunction) => {
  return new Promise(resolve => {
    const doc = esToMd.doc(file)
      .pipe(new InjectImports())
      .pipe(new InjectContainerDivsIntoCode());

    // Doc is a Node Stream. We listen to the finish and then render.
    doc.on('finish', () => {
      const md = doc.read().toString('utf8');
      const mdToHtmlString = mdToHtml.render(md);
      const html = pipe(
        generateLinkFromESModulesWithMarkersInHtml(file, linkGeneratorFunction),
        wrapDocsInContainerDiv,
        removeUnneededElements,
        html => `<div class="literate-reader-es-container">\n${html}\n</div>`
      )(mdToHtmlString);

      resolve(html);
    })
  });
}

module.exports = esToLiterateHtml