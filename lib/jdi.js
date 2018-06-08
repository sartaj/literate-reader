#!/usr/bin/env node
/**
 * # `index.js`
 * This file exposes functions for using `jdi` APIs directly, without the `jdi`
 * command line utility.
 */
'use strict' // jdi-disable-line
/**
 * ## module dependencies
 * Native node dependencies.
 */
const fs       = require('fs')
const path     = require('path')
// Dependencies used for processing the read streams of processed source files.
const split    = require('split')
const through2 = require('through2')

// ## regular expressions
/**
 * ### `isDoc`
 * `isDoc` matches comments starting with `//`. Whitespace is being ignored.
 */
const isDoc = /^\s*\/\/\s*/
/**
 * ### `isBlank`
 * `isBlank` matches lines containing only whitespace characters, such as tabs
 * or spaces.
 */
const isBlank = /^\s*$/
/**
 * ### `isShebang`
 * `isShebang` matches lines that start with the shebang character sequence. See
 * [Shebang (Unix)](https://de.wikipedia.org/wiki/Shebang) explaining the syntax
 * of the directive itself.
 */
const isShebang = /^#!/
/**
 * ### `isIgnored`
 * `isIgnored` matches lines that end with "jdi-disable-line". This is inspired
 * by `eslint`'s `eslint-disable-line` directive.
 */
const isIgnored = /^.*jdi-disable-line$/
/**
 * ### `isOption`
 * With `isOption` option settings are introduced. They are similar to line
 * comments but have a star right after the double slash ('//*'').
 * Options are set by 'key value', whereby 'off', 'false' or 'no' value is
 * seen as `false` but 'on', 'true', 'yes' or no value is seen as `true`.
 * Options may be set also optional by block comment start tags, e.g. by
 * using '/**'.
 *
 * _Added by RB_
 */
const isOption = /^\s*(?:(?:\/\/)|(?:\/\*))\*\s*/
/**
 * ### `isComment`
 * Once the comment option is enabled, all comment lines which start with a
 * star ('*') are filtered by removing leading whitespace, the star and following
 * whitespace.
 *
 * _Added by RB_
 */
const isComment = /^\s*\*\s*/
/**
 * ### `isCommentEnd`
 * Comment blocks may be closed by using the regular block end tag on a
 * single line.
 *
 * _Added by RB_
 */
const isCommentEnd = /^\s*\*\/\s*$/
/**
 * ### `TrueOptions`
 * Array of option values which are evaluated as `true`
 *
 * _Added by RB_
 */
const TrueOptions = ['on', 'true', 'yes']

const isImageLine = /!\[/;

// +RB: Option values which are evaluated as `false`
/**
 * ### `FalseOptions`
 * Array of option values which are evaluated as `false`
 *
 * _Added by RB_
 */
const FalseOptions = ['off', 'false', 'no']
/**
 * ### `ParseOptions`
 * Global object to hold all current options
 *
 * _Added by RB_
 */
var ParseOptions = {}

// ## `transformFunction`
function transformFunction (chunk, enc, cb) {
	const extname = this.options.extname

	/**
	 * ### check options setting
	 *
	 * So far supported options are
	 *
	 *   - `ignore` : once switched on, all following lines are not part of the
	 *     output until `ignore` is switch off again
	 *   - `nocode` : when switched on, code blocks arent part of the output
	 *     until `nocode` is switched off again. Please note that code comments
	 *     (see below) are still part of the output.
	 *   - `code` : when switched on, all following comments are formatted as
	 *     code until `code` is switched off again.
	 *   - `comment` when switched on, all following code is formatted as
	 *     comment until switched off again. Comments are auto detected by using
	 *     block comment start tags with a directly following star ('/**') on a
	 *     single line.
     *
	 * _Added by RB_
	 */
	if (isOption.test(chunk)) {
		// remove option marker and split by whitespace
		var keyvalue = String(chunk).replace(isOption, "").split(/\s+/)
		// when no key is set assume it's a comment option
		if (keyvalue.length === 0 || keyvalue[0] === '') keyvalue = ['comment', 'on'];
    // all options are lower case
		var key = keyvalue[0].toLowerCase()
		if (keyvalue.length > 1) {
			ParseOptions[key] = keyvalue.slice(1).join(" ").trim()
			if (FalseOptions.indexOf(ParseOptions[key]) >= 0) ParseOptions[key] = false;
			else if (TrueOptions.indexOf(ParseOptions[key]) >= 0) ParseOptions[key] = true;
		}
		else ParseOptions[key] = true;

		// There might be the need to initialize an option once it is set.
		// This is the right place to do that:
		switch (key) {
			case "nocode":
			case "code":
				// close a code block on ignoring following lines or when showing
				// code comment blocks
				if (this.isCodeBlock) {
					this.push('```\n')
					this.isCodeBlock = false;
				}
				break;
		}
		cb()
		return
	}
	/**
	 * ### comment block end
	 * Block comment end tags on a single line are
	 * switching off the comment option (when set)
	 *
	 * _Added by RB_
	 */
	if (ParseOptions.comment && isCommentEnd.test(chunk)) {
		ParseOptions.comment = false
		cb()
		return
	}

	/**
	 * ### option `ignore`
	 * Ignore anything until `ignore` is set to false
	 *
	 * _Added by RB_
	 */
	if (ParseOptions.ignore) {
		cb()
		return
	}

	// ### shebang
	// Are we currently processing the first line of the file in question?
	const isFirstLine = !this.isNotFirstLine
	this.isNotFirstLine = true

	// Check if the file starts with a shebang.
	if (isFirstLine && isShebang.test(chunk)) {
		// If we are on the first line of the file and the file starts with a
		// shebang, e.g. `#!/usr/bin/env node`, we ignore the shebang.
		cb()
		return
	}

	if (isImageLine.test(chunk)) {
		this.push(chunk)
		this.push('\n')
		this.push('\n')
		cb()
		return
	}

	// ### blank lines
	// We ignore empty lines in order to avoid creating excessive code blocks.
	// Empty lines are being preserved in the transformed `.md` file. They can
	// be used for separating sections.
	if (isBlank.test(chunk)) {
		this.push(chunk)
		// this.push('\n')
		cb()
		return
	}

	// ### ignored lines
	// Check if line ends with jdi-disable-line.
	if (isIgnored.test(chunk)) {
		// If jdi should ignore this line, `cb()` without pushing `chunk`.
		cb()
		return
	}

	// +RB: the `isDoc` evaluation is needed several times, so let's store it.
	this.isDoc = (isDoc.test(chunk) || ParseOptions.comment) ? true : false
	/**
	 * ### option nocode
	 * Ignore code blocks when the `nocode` option is set.
	 * _Added by RB_
	 */
	if (!this.isDoc && ParseOptions.nocode) {
		cb()
		return
	}
	/**
	 * ### code blocks
	 * Check if we are currently in a code block. Everything that is **not** a
	 * comment can be considered to be a code block.
	 * _Modified by RB_:
	 * Extended by the `code` option, which could be used to include
	 * code example comments within the documentation.
	 */
	const isCodeBlock = this.isCodeBlock
	this.isCodeBlock = (!this.isDoc || ParseOptions.code) ? true: false
	// Did we just start a code block?
	if (this.isCodeBlock && !isCodeBlock) {
		// If yes, append `\`\`\`\`${extname}` to start the code block.
		// +RB: newline added for compatibility (e.g. for CuteMarkEdit).
		this.push(`\n\`\`\`${extname}\n`)
	}

	// Did we just close a code block?
	if (!this.isCodeBlock && isCodeBlock) {
		// If yes, append `\`\`\`` to close the code block.
		this.push('```\n')
	}

	// +RB: Are we currently in a doc block? (inversed order)
	if (this.isDoc) {
		// We're in a comment (= documentation). We remove the
		// comment prefix and trailing whitespace (typically `// `).
		// That way `// # title` becomes `# title`.
		// +RB: Do that only, when the `comment` option isn't set,
		// otherwise filter the whitespace and star.
		if (ParseOptions.comment) this.push(String(chunk).replace(isComment, ''));
		else this.push(String(chunk).replace(isDoc, ''))
	}
	else {
		// Otherwise, just pass the chunk through
		this.push(chunk)
	}

	this.push('\n')
	cb()
}

// ## `flushFunction`
// This function is being called just prior to the stream ending. Keep in mind
// that it's a `prototype` function, thuse `flushFunction` and
// `transformFunction` share the same `this` context.
function flushFunction (cb) {
	// ### closing code blocks
	// Make sure we're closing any open code blocks with `\`\`\``.
	// +RB: support for `nocode` option added
	if (this.isCodeBlock && (!ParseOptions.nocode)) {
		this.push('```\n')
	}

	// ### file footer
	// Here we append a footer to the generated `.md` file. The footer includes
	// the date when the file has been generated, as well as the relative
	// filename of the processed file itself.
	// const file = this.options.file
	// The `.md` file will be in the same directory as the source file. We only
	// need the basename.
	// const basename = path.basename(file)
	// const date = String(new Date())
	// this.push('------------------------\n')
	// this.push(`Generated _${date}_ from [&#x24C8; ${basename}](${basename} "View in source")\n`)
	this.push('\n')
	cb()
}

// ## `Transform`
// Instead of returning a `stream.Transform` instance, through2.ctor() returns a
// constructor for our custom Transform that operates on a line-by-line basis.
const Transform = through2.ctor(transformFunction, flushFunction)

// ## `doc`
// `doc` accepts a filename, creates a corresponding read stream, processes the
// file and writes the resulting `.md` file to disk.
const doc = file =>
	fs.createReadStream(file)
		// [`split`](https://www.npmjs.com/package/split) is a transform that
		// generates chunks separated by new-line.
		.pipe(split())
		// Here we invoke our custom `Transform` instance used for processing
		// the separated line-chunks.
		.pipe(new Transform({
			// If there is no file extension, we assume that the source file is
			// a JavaScript file. In some cases, we could also determine the
			// extension name from the first line of the file, e.g.
			// `#!/usr/bin/env node`.
			extname: path.extname(file).substr(1) || 'js',

			// The `file` is being used for adding the header of the `.md`
			// output.
			file
		}))

// ## `handleClose`
// We print a message whenever we generated a `.md` file.
const handleClose = cwd => function handler () {
	const toPath = path.relative(cwd, this.path)
	console.log('wrote', this.bytesWritten, 'bytes to', toPath) // eslint-disable-line no-console
}

// ## `run`
// This is the main function of `jdi`. It accepts an array of `args` and
// generates corresponding `.md` files.
// **Warning:** `run` has persistent side-effects (it overrides files). If you
// just want to create streams of documented source files, use `doc()` instead.
const run = (cwd, args) =>
	args
		// Files that should be documented are being passed in via `args`, e.g.
		// if the user invokes `jdi index.js test.js`, `args` will be an array
		// of `['index.js', 'test.js']`.
		.map(file => path.join(cwd, file))
		// Now we have an array of filenames to be processed.
		// We map over those files and create a corresponding stream.
		.map(doc)
		// Create a corresponding [`WriteStream`](https://nodejs.org/api/fs.html#fs_class_fs_writestream).
		.map(out => out.pipe(fs.createWriteStream(`${out.options.file}.md`)))
		// .pipe(fs.createWriteStream(`${file}.md`))
		// Now we attach the `close` listener.
		.forEach(stream => stream.on('close', handleClose(cwd)))

// ## `exports`
// Public APIs:
exports.run = run
exports.doc = doc
exports.Transform = Transform