const esToMd = require('../lib/es-to-md')

const reallyComplicatedAndConfusedLiterateCode = `
// Imports
const fs = require('fs')

// Hello World
function hello(name) { // name: string
    // tell someone hello 
    return name + '// hello world'
}
`

// Given a single line comment

    // it should make a regular line.
    // it shouldn't parse // inside a template or string
    // it should parse code comments inside code blocks
    // it should 


// Given a multi line comment, it should mark a block as a code comment with the extension of the file

// If multi line comment has * at the beginning, it should remove the character

// If multi line comment has no *, it should respect as multi line comment

// If multi line comment has a code block, it should mark code block as being inside a comment, not executable code.

// If a multi line comment has jsdoc references, parse jsdoc parameters.