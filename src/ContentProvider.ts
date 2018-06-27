import * as path from 'path';
import * as vscode from 'vscode';
const { createLiterateReaderHTML } = require('../lib/literate-reader-viewer')

export class LiterateReaderContentProvider
  implements vscode.TextDocumentContentProvider {
  static readonly URI = vscode.Uri.parse('literate-reader://read');

  private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  private _context : any;
  private activeUri: any;
  private UriHistory: string[];

  constructor(context) {
    this.onDidChangeEmitter = new vscode.EventEmitter();
    this._context = context;
  }

  getMediaPath (mediaFile) {
    return this._context.asAbsolutePath(path.join('media', mediaFile));
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

  provideTextDocumentContent(): Thenable<string> {
    const uri = this.activeUri;
    const html = createLiterateReaderHTML(uri.fsPath, this.linkGenerationFunction)
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
          <nav class="literate-reader-nav">
            <ul>
              <li>←/li>
            </ul>
          </nav>
          ${mdHtml}
          <script>
            window.scrollTo(0, 0);
          </script>
        </body>
      </html>
    `)
    return html;
    // .then(mdHtml => { console.log(mdHtml); return mdHtml; })

  }

  errorSnippet(error) {
    return "\n\t\t\t\t<body>\n\t\t\t\t\t" + error + "\n\t\t\t\t</body>";
  }

  changeUri(uri) {
    if(uri) {
      this.activeUri = uri
      this.UriHistory.push(uri);
    };
    this.update();
  }

  get onDidChange(): vscode.Event<vscode.Uri> {
    return this.onDidChangeEmitter.event;
  }

  update() {
    this.onDidChangeEmitter.fire(LiterateReaderContentProvider.URI);
  }
}