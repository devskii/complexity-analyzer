import * as vscode from 'vscode';

export default class ComplexityCodeLensProvider implements vscode.CodeLensProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    this.diagnosticCollection = diagnosticCollection;
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const diagnostics = this.diagnosticCollection.get(document.uri);

    if (!diagnostics || diagnostics.length === 0) {
      const lens = this.newCodeLens("No complex functions detected");
      return [lens];
    }

    const lens = this.newCodeLens(`Detected ${diagnostics.length} complex functions; consider refactoring`);
    return [lens];
  }

  private newCodeLens(title: string) {
    const topOfFile = new vscode.Range(0, 0, 0, 0);
    return new vscode.CodeLens(topOfFile, { title, command: "" });
  }
}
