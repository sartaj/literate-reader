const test = require('tape')
const fs = require('fs')
const path = require('path')
const concat = require('concat-stream')
const { pipe } = require('ramda')
const babel = require('@babel/core')
const file = path.join(__dirname, 'mocks/itsy-bitsy-data-structures.js')
var util = require('util');
const code = fs.readFileSync(file, 'utf8')

const log = obj => {
  console.log(util.inspect(obj, false, null)); // => { code, map, ast }
}

babel.transform(code, (err, result) => {
  debugger;
});

export default function({ types: t}) {
  return {
    visitor: {
      // visitor contents
    }
  };
}

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

// test('', t => {

// })