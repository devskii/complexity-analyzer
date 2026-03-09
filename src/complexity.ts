import * as ts from "typescript";

export function computeCyclomaticComplexity(node: ts.Node): number {
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

export function getFunctionName(node: ts.Node): string | undefined {
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

export interface FunctionInfo {
  node: ts.Node;
  name: string;
  complexity: number;
}

export function findFunctions(
  sourceCode: string,
  fileName?: string
): FunctionInfo[] {
  const sourceFile = ts.createSourceFile(
    fileName || "file.ts",
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const results: FunctionInfo[] = [];

  function visitNode(node: ts.Node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      const complexity = computeCyclomaticComplexity(node);
      const name = getFunctionName(node) || "anonymous function";
      results.push({ node, name, complexity });
    }
    ts.forEachChild(node, visitNode);
  }

  ts.forEachChild(sourceFile, visitNode);
  return results;
}
