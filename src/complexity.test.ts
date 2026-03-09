import { describe, it, expect } from "vitest";
import {
  computeCyclomaticComplexity,
  getFunctionName,
  findFunctions,
} from "./complexity";

/** Parse code, find the first function, return its complexity. */
function getComplexity(code: string): number {
  const results = findFunctions(code);
  if (results.length === 0) {
    throw new Error("No function found in code snippet");
  }
  return results[0].complexity;
}

describe("computeCyclomaticComplexity", () => {
  it("returns 1 for an empty function", () => {
    expect(getComplexity("function f() {}")).toBe(1);
  });

  it("counts a single if statement", () => {
    expect(getComplexity("function f(x) { if (x) {} }")).toBe(2);
  });

  it("counts if/else-if chains", () => {
    expect(
      getComplexity("function f(x) { if (x) {} else if (x > 1) {} else {} }")
    ).toBe(3);
  });

  it("counts a for loop", () => {
    expect(
      getComplexity("function f() { for (let i = 0; i < 10; i++) {} }")
    ).toBe(2);
  });

  it("counts a for-in loop", () => {
    expect(getComplexity("function f(obj) { for (const k in obj) {} }")).toBe(
      2
    );
  });

  it("counts a for-of loop", () => {
    expect(getComplexity("function f(arr) { for (const x of arr) {} }")).toBe(
      2
    );
  });

  it("counts a while loop", () => {
    expect(getComplexity("function f() { while (true) {} }")).toBe(2);
  });

  it("counts a do-while loop", () => {
    expect(getComplexity("function f() { do {} while (true); }")).toBe(2);
  });

  it("counts a ternary expression", () => {
    expect(getComplexity("function f(x) { return x ? 1 : 0; }")).toBe(2);
  });

  it("counts a catch clause", () => {
    expect(getComplexity("function f() { try {} catch (e) {} }")).toBe(2);
  });

  it("counts && operator", () => {
    expect(getComplexity("function f(a, b) { return a && b; }")).toBe(2);
  });

  it("counts || operator", () => {
    expect(getComplexity("function f(a, b) { return a || b; }")).toBe(2);
  });

  it("counts ?. optional chaining", () => {
    expect(getComplexity("function f(obj) { return obj?.x; }")).toBe(2);
  });

  it("counts ?? nullish coalescing", () => {
    expect(getComplexity("function f(x) { return x ?? 0; }")).toBe(2);
  });

  it("counts switch + case clauses (switch=1, each case=1)", () => {
    const code = `function f(x) {
      switch (x) {
        case 1: break;
        case 2: break;
      }
    }`;
    // 1 (base) + 1 (switch) + 2 (cases) = 4
    expect(getComplexity(code)).toBe(4);
  });

  it("does not count default clause in switch", () => {
    const code = `function f(x) {
      switch (x) {
        default: break;
      }
    }`;
    // 1 (base) + 1 (switch) = 2
    expect(getComplexity(code)).toBe(2);
  });

  it("handles arrow functions", () => {
    expect(getComplexity("const f = (x) => { if (x) {} }")).toBe(2);
  });

  it("handles arrow functions with expression body", () => {
    expect(getComplexity("const f = (x) => x ? 1 : 0")).toBe(2);
  });

  it("counts nested if in loop", () => {
    const code = `function f(arr) {
      for (const x of arr) {
        if (x) {}
      }
    }`;
    expect(getComplexity(code)).toBe(3);
  });

  it("counts multiple logical operators", () => {
    expect(
      getComplexity("function f(a, b, c) { if (a && b || c) {} }")
    ).toBe(4);
  });

  it("detects high complexity (>= 9)", () => {
    const code = `function f(a, b, c, d) {
      if (a) {}
      if (b) {}
      if (c) {}
      if (d) {}
      for (let i = 0; i < 10; i++) {}
      while (a) {}
      do {} while (b);
      try {} catch (e) {}
    }`;
    // 1 + 4 ifs + 1 for + 1 while + 1 do-while + 1 catch = 9
    expect(getComplexity(code)).toBe(9);
  });
});

describe("findFunctions", () => {
  it("finds multiple functions", () => {
    const code = `
      function foo() {}
      function bar(x) { if (x) {} }
    `;
    const results = findFunctions(code);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("foo");
    expect(results[0].complexity).toBe(1);
    expect(results[1].name).toBe("bar");
    expect(results[1].complexity).toBe(2);
  });

  it("names arrow functions from variable declarations", () => {
    const code = "const greet = () => {}";
    const results = findFunctions(code);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("greet");
  });

  it("labels anonymous functions", () => {
    const code = "[1].map(function(x) { return x; })";
    const results = findFunctions(code);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("anonymous function");
  });

  it("labels anonymous arrow functions", () => {
    const code = "[1].map((x) => x)";
    const results = findFunctions(code);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("anonymous function");
  });
});

describe("getFunctionName", () => {
  it("returns name for function declarations", () => {
    const results = findFunctions("function myFunc() {}");
    expect(results[0].name).toBe("myFunc");
  });

  it("returns variable name for arrow functions", () => {
    const results = findFunctions("const handler = () => {}");
    expect(results[0].name).toBe("handler");
  });

  it("returns variable name for function expressions", () => {
    const results = findFunctions("const handler = function() {}");
    expect(results[0].name).toBe("handler");
  });

  it("returns 'anonymous function' when no name is available", () => {
    const results = findFunctions("(function() {})()");
    expect(results[0].name).toBe("anonymous function");
  });
});
