import * as vscode from "vscode";
import * as ts from "typescript";
import ComplexityCodeLensProvider from "./ComplexityCodeLensProvider";

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
    const sourceFile = ts.createSourceFile(
      document.fileName,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    function visitNode(node: ts.Node) {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)
      ) {
        const complexity = computeCyclomaticComplexity(node);
        const functionName = getFunctionName(node) || "anonymous function";
        outputChannel.appendLine(`cc=${complexity}: ${functionName}`);

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
      ts.forEachChild(node, visitNode);
    }

    ts.forEachChild(sourceFile, visitNode);
    return diagnostics;
  }

  function computeCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1;

    function visit(node: ts.Node) {
      if (
        ts.isIfStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node) ||
        ts.isCaseClause(node) ||
        ts.isCatchClause(node) ||
        ts.isOptionalChain(node) ||
        ts.isNullishCoalesce(node)
      ) {
        complexity++;
      } else if (ts.isBinaryExpression(node)) {
        if (
          node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          node.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity++;
        }
      } else if (
        ts.isConditionalExpression(node) ||
        ts.isSwitchStatement(node)
      ) {
        complexity++;
      }
      ts.forEachChild(node, visit);
    }

    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)) &&
      node.body
    ) {
      if (ts.isBlock(node.body)) {
        ts.forEachChild(node.body, visit);
      } else if (ts.isExpression(node.body)) {
        visit(node.body);
      }
    }

    return complexity;
  }

  function getFunctionName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      return node.name?.getText();
    } else if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      if (
        node.parent &&
        ts.isVariableDeclaration(node.parent) &&
        node.parent.name
      ) {
        return node.parent.name.getText();
      }
    }

    return undefined;
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
