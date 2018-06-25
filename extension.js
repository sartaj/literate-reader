// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const path = require('path')
const { createLiterateReaderHTML } = require('./lib/literate-reader-viewer')

class TextDocumentContentProvider {
  constructor(context){
    this.onDidChangeEmitter = new vscode.EventEmitter();
    this._context = context;
    this.activeUri = null;
    this.changeUri = this.changeUri.bind(this);
    this.update = this.update.bind(this);
    this.provideTextDocumentContent = this.provideTextDocumentContent.bind(this);
  }

  getMediaPath (mediaFile) {
    return this._context.asAbsolutePath(path.join('media', mediaFile));
  }
  
  get onDidChange() {
    return this.onDidChangeEmitter.event;
  }

  linkGenerationFunction(link) {
    const lin = encodeURI(`command:extension.literateReader?${JSON.stringify(vscode.Uri.parse(`file://${link}`))}`)
    return lin
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

  provideTextDocumentContent() {
    const uri = this.activeUri;
    return createLiterateReaderHTML(uri.fsPath, this.linkGenerationFunction)
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
          <script>
            window.scrollTo(0, 0);
          </script>
        </body>
      </html>
    `)
    // .then(mdHtml => { console.log(mdHtml); return mdHtml; })

  }

  errorSnippet(error) {
    return "\n\t\t\t\t<body>\n\t\t\t\t\t" + error + "\n\t\t\t\t</body>";
  }

  changeUri(uri) {
    if(uri) this.activeUri = uri;
    this.update();
  }

  update() {
    this.onDidChangeEmitter.fire('literate-reader://read');
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
  const disposable = vscode.commands.registerCommand('extension.literateReader', openPreview)
  context.subscriptions.push(disposable, registration);

  vscode.workspace.onDidSaveTextDocument(() => {
    provider.update();
	});

	vscode.workspace.onDidChangeTextDocument(() => {
    provider.update();
	});

	vscode.workspace.onDidChangeConfiguration(() => {
		vscode.workspace.textDocuments.forEach(() => {
      provider.update();
		});
  });

  function openPreview(uri) {
    provider.changeUri(uri || vscode.window.activeTextEditor.document.uri)
    return vscode.commands
      .executeCommand('vscode.previewHtml',
        'literate-reader://read',
        getViewColumn(false),
        `Literate Reader'`
      )
      .catch(reason => {
        vscode.window.showErrorMessage(reason);
      });
  }

};

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