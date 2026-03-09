import * as vscode from "vscode";
import * as ts from "typescript";
import ComplexityCodeLensProvider from "./ComplexityCodeLensProvider";
import { findFunctions } from "./complexity";

const diagnosticCollection = vscode.languages.createDiagnosticCollection();
const outputChannel = vscode.window.createOutputChannel("Complexity Analyzer");

export function activate(context: vscode.ExtensionContext) {
  if (vscode.window.activeTextEditor) {
    updateDiagnostics(vscode.window.activeTextEditor);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDiagnostics(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document === event.document) {
        updateDiagnostics(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "javascript", scheme: "file" },
      new ComplexityCodeLensProvider(diagnosticCollection)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "typescript", scheme: "file" },
      new ComplexityCodeLensProvider(diagnosticCollection)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "javascriptreact", scheme: "file" },
      new ComplexityCodeLensProvider(diagnosticCollection)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "typescriptreact", scheme: "file" },
      new ComplexityCodeLensProvider(diagnosticCollection)
    )
  );

  function updateDiagnostics(editor: vscode.TextEditor) {
    if (!editor) return;

    const document = editor.document;
    const languageId = document.languageId;
    if (
      ![
        "javascript",
        "typescript",
        "javascriptreact",
        "typescriptreact",
      ].includes(languageId)
    ) {
      return;
    }

    const sourceCode = document.getText();
    const diagnostics = analyzeCyclomaticComplexity(sourceCode, document);

    diagnosticCollection.clear();
    diagnosticCollection.set(document.uri, diagnostics);
  }

  function analyzeCyclomaticComplexity(
    sourceCode: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const functions = findFunctions(sourceCode, document.fileName);

    for (const { name, complexity, node } of functions) {
      outputChannel.appendLine(`cc=${complexity}: ${name}`);

      if (complexity >= 9) {
        const range = getFunctionNameRange(node, document);

        if (range) {
          const diagnostic: vscode.Diagnostic = {
            range,
            message: `Cyclomatic Complexity = ${complexity} (high)`,
            severity: vscode.DiagnosticSeverity.Warning,
          };
          diagnostics.push(diagnostic);
        }
      }
    }

    return diagnostics;
  }

  function getFunctionNameRange(
    node: ts.Node,
    document: vscode.TextDocument
  ): vscode.Range | undefined {
    let startPos: number | undefined;
    let endPos: number | undefined;

    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      if (node.name) {
        startPos = node.name.getStart();
        endPos = node.name.getEnd();
      } else {
        startPos = node.getStart();
        endPos = startPos + "function".length;
      }
    } else if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      if (
        node.parent &&
        ts.isVariableDeclaration(node.parent) &&
        node.parent.name
      ) {
        startPos = node.parent.name.getStart();
        endPos = node.parent.name.getEnd();
      } else {
        startPos = node.getStart();
        endPos =
          node.getStart() +
          (ts.isArrowFunction(node) ? "=>".length : "function".length);
      }
    }

    if (startPos !== undefined && endPos !== undefined) {
      const start = document.positionAt(startPos);
      const end = document.positionAt(endPos);
      return new vscode.Range(start, end);
    }

    return undefined;
  }
}

export function deactivate() {
  diagnosticCollection.dispose();
  outputChannel.dispose();
}
