import * as vscode from 'vscode';
import { LiterateReaderContentProvider } from './ContentProvider';

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  try {
    const provider = new LiterateReaderContentProvider(context);
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'extension.literateReader',
        openLiterateReader,
      ),
      vscode.workspace.registerTextDocumentContentProvider(
        'literate-reader',
        provider,
      ),
    );

    function openLiterateReader(uri) {
      provider.changeUri(uri || vscode.window.activeTextEditor.document.uri)
      return vscode.commands
        .executeCommand(
          'vscode.previewHtml',
          LiterateReaderContentProvider.URI,
          vscode.ViewColumn.One,
          'Literate Reader',
        )
        .then(
          success => {
            // no-op
          },
          error => {
            vscode.window.showErrorMessage(error);
          },
        );
    }

    vscode.workspace.onDidChangeTextDocument(e => {
      provider.update();
    });

    vscode.window.onDidChangeTextEditorSelection(e => {
      if (
        vscode.window.activeTextEditor &&
        e.textEditor === vscode.window.activeTextEditor
      ) {
        provider.update();
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(error);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
}