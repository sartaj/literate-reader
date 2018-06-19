// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const path = require('path')
const { createLiterateReaderHTML } = require('./lib/literate-reader-viewer')

class TextDocumentContentProvider {
  constructor(context){
    this._onDidChange = new vscode.EventEmitter();
    this._context = context;
    this._waiting = false;
    this.onDidChange = {
      get: () => this._onDidChange.event,
      enumerable: true,
      configurable: true
    };
    this.createMdHtml = this.createMdHtml.bind(this);
  }

  provideTextDocumentContent(uri) {
    return vscode.workspace.openTextDocument(vscode.Uri.parse(uri.query))
      .then(this.createMdHtml)
  }

  getMediaPath (mediaFile) {
    return this._context.asAbsolutePath(path.join('media', mediaFile));
  }

  linkGenerationFunction(link) {
    return `command:extension.literateReader?${JSON.stringify([link])}`
  }

  fixHref(resource, href) {
    if (href) {
      // Return early if href is already a URL
      if (vscode.Uri.parse(href).scheme) {
        return href;
      }
      // Otherwise convert to a file URI by joining the href with the resource location
      return vscode.Uri.file(path.join(path.dirname(resource.fsPath), href)).toString();
    } else {
      return href;
    }
  }

  computeCustomStyleSheetIncludes(uri) {
    const styles = vscode.workspace.getConfiguration('markdown')['styles'];
    return (styles && Array.isArray(styles))
      ? styles.map(style => 
				`<link rel="stylesheet" href="${this.fixHref(uri, style)}" type="text/css" media="screen">`
      )
      : []
  }

  createMdHtml(document) {
    if (!(document.languageId === 'javascript')) {
      return this.errorSnippet(`Only JS files are currently supported. Current file is ${document.languageId}`);
    }
    const { fileName, uri } = document;

    return createLiterateReaderHTML(fileName, this.linkGenerationFunction)
      .then(mdHtml => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
          <link rel="stylesheet" type="text/css" href="${this.getMediaPath('markdown.css')}" >
          <link rel="stylesheet" type="text/css" href="${this.getMediaPath('tomorrow.css')}" >
          ${this.computeCustomStyleSheetIncludes(uri)}
        </head>
        <body>
          ${mdHtml}
        </body>
      </html>
    `)
  }

  errorSnippet(error) {
    return "\n\t\t\t\t<body>\n\t\t\t\t\t" + error + "\n\t\t\t\t</body>";
  }

  update(uri) {
    if (!this._waiting) {
			this._waiting = true;
			setTimeout(() => {
				this._waiting = false;
				this._onDidChange.fire(uri);
			}, 300);
    }
  }

}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
const activate = context => {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "literate-reader" is now active!');

  const provider = new TextDocumentContentProvider(context);
  const registration = vscode.workspace.registerTextDocumentContentProvider('literate-reader', provider);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand('extension.literateReader', (uri) => openPreview(uri, false) )

  context.subscriptions.push(disposable, registration);

	vscode.workspace.onDidSaveTextDocument(document => {
    const uri = getDocUri(document);
    provider.update(uri);
	});

	vscode.workspace.onDidChangeTextDocument(event => {
			const uri = getDocUri(event.document);
			provider.update(uri);
	});

	vscode.workspace.onDidChangeConfiguration(() => {
		vscode.workspace.textDocuments.forEach((document) => {
      provider.update(document.uri);
		});
  });
};

function openPreview(uri, sideBySide) {
	const activeEditor = vscode.window.activeTextEditor;

  console.log("__URI__", uri, activeEditor.document);

  if (!activeEditor) {
		vscode.commands.executeCommand('workbench.action.navigateBack');
		return;
	}

  let markdownPreviewUri = getDocUri(activeEditor.document);

  vscode.commands
    .executeCommand('vscode.previewHtml',
      markdownPreviewUri,
      getViewColumn(sideBySide),
      `Literate Reading '${path.basename(activeEditor.document.fileName)}'`
    )
    .catch(reason => {
      vscode.window.showErrorMessage(reason);
    });
}

function getDocUri(document) {
  const uri = document.uri.with({ scheme: 'literate-reader', query: document.uri.toString() });
  console.log("uri", uri)
  return uri
}

function getViewColumn(sideBySide) {
	const active = vscode.window.activeTextEditor;
	if (!active) {
		return vscode.ViewColumn.One;
	}

	if (!sideBySide) {
		return active.viewColumn;
	}

	switch (active.viewColumn) {
		case vscode.ViewColumn.One:
			return vscode.ViewColumn.Two;
		case vscode.ViewColumn.Two:
			return vscode.ViewColumn.Three;
	}

	return active.viewColumn;
}

// this method is called when your extension is deactivated
const deactivate = () => {};

exports.activate = activate;
exports.deactivate = deactivate;