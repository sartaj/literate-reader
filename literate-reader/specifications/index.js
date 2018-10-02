const test = require('tape')
const fs = require('fs')
const path = require('path')
const concat = require('concat-stream')
const { pipe } = require('ramda')
const parser = require('@babel/parser')
const util = require('util');

const log = obj => {
  console.log(util.inspect(obj, false, null)); // => { code, map, ast }
}


const options = {
  options: { 
    presets: "@babel/env"
  }
}



// export default function({ types: t}) {
//   return {
//     visitor: {
//       // visitor contents
//     }
//   };
// }

// const function (babel) {
//   const { types: t } = babel;
  
//   return {
//     name: "ast-transform", // not required
//     visitor: {
//       Identifier(path) {
//         path.node.name = path.node.name.split('').reverse().join('');
//       }
//     }
//   };
// }

test('Should parse js ast', t => {
  t.plan(1)
  const file = path.join(__dirname, 'mocks/itsy-bitsy-data-structures.js')
  const code = fs.readFileSync(file, 'utf8')
  const ast = parser.parse(code)
  t.equals(ast.comments.length, 154)
})

test('Should parse typescript ast', t => {
  t.plan(1)
  const file = path.join(__dirname, 'mocks/cyclejs.ts')
  const code = fs.readFileSync(file, 'utf8')
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: [
      "typescript"
    ]
  })
  t.equals(ast.comments.length, 3)
})

// test('Should parse flow ast', t => {
//   t.plan(1)
//   const file = path.join(__dirname, 'mocks/cyclejs.ts')
//   const code = fs.readFileSync(file, 'utf8')
//   const ast = parser.parse(code, {
//     sourceType: "module",
//     plugins: [
//       "typescript"
//     ]
//   })
//   t.equals(ast.comments.length, 3)
// })


// test('Should parse jsx ast', t => {
//   t.plan(1)
//   const file = path.join(__dirname, 'mocks/cyclejs.ts')
//   const code = fs.readFileSync(file, 'utf8')
//   const ast = parser.parse(code, {
//     sourceType: "module",
//     plugins: [
//       "typescript"
//     ]
//   })
//   t.equals(ast.comments.length, 3)
// })

// Should work with itsy-bitsy style code comments

// Should work with jsdoc style comments

// Should work with markdown annotated code blocks without *

// Should work with markdown annotated code blocks with *

// Should work with markdown annotated single line blocks

// Should link imports

// Should be able to have annotation popups

// Should work with regular markdown

// Links in markdown to other files should work


