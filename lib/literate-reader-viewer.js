const path = require('path')
const fs = require('fs')
const esToHtml = require('./lib/es-to-html')
const mdToHtml = require('./lib/md-to-html')

const createLiterateReaderHTML = async (file, linkGeneratorFunction) => {
  try {
    const ext = path.extname(file).slice(1)
    switch(ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'flow':
        const esHtml = await esToHtml(file, linkGeneratorFunction)
        return esHtml
      case 'md':
      case 'txt':
        const contents = fs.readFileSync(file, { encoding: 'utf-8' })
        return mdToHtml.render(contents)
      default:
        const codeContents = fs.readFileSync(file, { encoding: 'utf-8' })
        return mdToHtml.render(`\`\`\`${ext}\n${codeContents}\n\`\`\`\n`)
    }
  } catch(e) {
    console.error(e)
  }
}

module.exports.createLiterateReaderHTML = createLiterateReaderHTML