// Safe expression evaluator for derived/expression traces.
//
// This file is intentionally free of any React or DOM imports — it's pure
// logic so it can be unit-tested in isolation. It implements a hand-written
// tokenizer + recursive-descent parser that compiles an expression *once*
// into a reusable evaluator. We compile-then-evaluate because the bucket
// axis can run to tens of thousands of points: parsing per-bucket would be
// wasteful, but evaluating a small AST per-bucket is cheap.
//
// SECURITY: there is deliberately NO use of `eval`, `new Function`, or
// `with` anywhere here. The only things an expression can reference are the
// variables we hand it and the whitelisted functions below — nothing can
// reach the host environment.
//
// Beyond arithmetic, the grammar also supports comparison (`== != > >= < <=`,
// with bare `=` accepted as equality) and logical (`and`/`or`, or the `&&`/`||`
// aliases) operators that yield `1` (true) / `0` (false). These power boolean
// *conditions* — e.g. highlight bands where `throttle = 100` — while reusing the
// very same evaluator: a condition is just an expression whose result is read as
// truthy (`!= 0`). NaN (div-by-zero, unknown var, …) is falsey.

/** A user-defined trace computed in-browser from already-fetched series. */
export interface DerivedTrace {
  /** Stable id (for React keys / state updates). */
  id: string;
  /** Display label — becomes the trace's legend/tooltip name. */
  label: string;
  /** The math expression over base-series variables (e.g. `current_ac^2`). */
  expression: string;
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenType =
  | "number"
  | "ident"
  | "op"
  | "lparen"
  | "rparen"
  | "comma"
  | "eof";

interface Token {
  type: TokenType;
  value: string;
  /** Column (0-based) where the token starts — used for error reporting. */
  pos: number;
}

/** Thrown internally on a malformed expression; carries a column so the UI
 *  can point at the offending character. Callers see this as a returned
 *  error string, never an exception (see `compileExpression`). */
class ParseError extends Error {
  pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.name = "ParseError";
    this.pos = pos;
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const c = input[i];

    // Whitespace is insignificant.
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }

    // Numbers: integer or decimal. We don't support exponent notation
    // (1e3) — it'd collide visually with the `^` operator and isn't needed
    // for these expressions.
    if ((c >= "0" && c <= "9") || c === ".") {
      const start = i;
      let seenDot = false;
      while (i < n) {
        const d = input[i];
        if (d >= "0" && d <= "9") {
          i++;
        } else if (d === ".") {
          if (seenDot) throw new ParseError("Malformed number", start);
          seenDot = true;
          i++;
        } else {
          break;
        }
      }
      const text = input.slice(start, i);
      if (text === ".") throw new ParseError("Malformed number", start);
      tokens.push({ type: "number", value: text, pos: start });
      continue;
    }

    // Identifiers: variable names and function names share the same lexical
    // shape; the parser decides which is which by the following `(`.
    if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_") {
      const start = i;
      while (i < n) {
        const d = input[i];
        if (
          (d >= "a" && d <= "z") ||
          (d >= "A" && d <= "Z") ||
          (d >= "0" && d <= "9") ||
          d === "_"
        ) {
          i++;
        } else {
          break;
        }
      }
      tokens.push({ type: "ident", value: input.slice(start, i), pos: start });
      continue;
    }

    // Multi-char comparison / logical operators. Check the two-char forms
    // before the single-char ones so `>=` doesn't lex as `>` then `=`.
    const two = input.slice(i, i + 2);
    if (
      two === "==" ||
      two === "!=" ||
      two === ">=" ||
      two === "<=" ||
      two === "&&" ||
      two === "||"
    ) {
      tokens.push({ type: "op", value: two, pos: i });
      i += 2;
      continue;
    }

    // Single-char operators / punctuation. A lone `=` is accepted as equality
    // (friendlier for "throttle = 100") and normalized to `==` here so the
    // parser only deals with one spelling.
    if (c === "=") {
      tokens.push({ type: "op", value: "==", pos: i });
      i++;
      continue;
    }
    if (c === ">" || c === "<") {
      tokens.push({ type: "op", value: c, pos: i });
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "%" || c === "^") {
      tokens.push({ type: "op", value: c, pos: i });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "lparen", value: c, pos: i });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen", value: c, pos: i });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ type: "comma", value: c, pos: i });
      i++;
      continue;
    }

    throw new ParseError(`Unexpected character '${c}'`, i);
  }

  tokens.push({ type: "eof", value: "", pos: n });
  return tokens;
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

/** Comparison and logical operators fold into the same `bin` node as the
 *  arithmetic ones; `evalNode` switches on `op` to pick the semantics. */
type BinOp =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "^"
  | "=="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "and"
  | "or";

type Node =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string; pos: number }
  | { kind: "neg"; operand: Node }
  | { kind: "bin"; op: BinOp; left: Node; right: Node }
  | { kind: "call"; name: string; args: Node[]; pos: number };

/** Whitelisted functions and their arity. Anything not in here is a parse
 *  error — there's no path to an arbitrary global. */
const FUNCTIONS: Record<string, { arity: number; fn: (...a: number[]) => number }> = {
  abs:   { arity: 1, fn: (x) => Math.abs(x) },
  sqrt:  { arity: 1, fn: (x) => Math.sqrt(x) },
  log:   { arity: 1, fn: (x) => Math.log10(x) },
  ln:    { arity: 1, fn: (x) => Math.log(x) },
  exp:   { arity: 1, fn: (x) => Math.exp(x) },
  floor: { arity: 1, fn: (x) => Math.floor(x) },
  ceil:  { arity: 1, fn: (x) => Math.ceil(x) },
  round: { arity: 1, fn: (x) => Math.round(x) },
  min:   { arity: 2, fn: (a, b) => Math.min(a, b) },
  max:   { arity: 2, fn: (a, b) => Math.max(a, b) },
  pow:   { arity: 2, fn: (a, b) => Math.pow(a, b) },
};

// ---------------------------------------------------------------------------
// Parser (recursive descent)
//
// Grammar (lowest to highest precedence):
//   expr    := or
//   or      := and (('or' | '||') and)*
//   and     := compare (('and' | '&&') compare)*
//   compare := sum (('==' | '!=' | '>' | '>=' | '<' | '<=') sum)*
//   sum     := term (('+' | '-') term)*
//   term    := unary (('*' | '/' | '%') unary)*
//   unary   := '-' unary | power
//   power   := primary ('^' unary)?        // right-associative
//   primary := number | ident | ident '(' args ')' | '(' expr ')'
//
// `and`/`or` are spelled as identifiers (the tokenizer can't tell a keyword
// from a variable), so the parser recognizes them by value at the `or`/`and`
// levels; `&&`/`||` are the operator-token aliases. Comparisons left-fold,
// which is good enough for these expressions (chained `a < b < c` is unusual
// and reads as `(a < b) < c`, matching most calculator behavior).
// ---------------------------------------------------------------------------

class Parser {
  private tokens: Token[];
  private idx = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.idx];
  }

  private next(): Token {
    return this.tokens[this.idx++];
  }

  parse(): Node {
    const node = this.parseExpr();
    const tok = this.peek();
    if (tok.type !== "eof") {
      throw new ParseError(`Unexpected '${tok.value}'`, tok.pos);
    }
    return node;
  }

  // The top of the precedence chain. `expr` simply enters at the lowest
  // binding level (logical `or`) and everything cascades down from there.
  private parseExpr(): Node {
    return this.parseOr();
  }

  /** True when the current token is the keyword `ident` (`and`/`or`). These
   *  arrive as `ident` tokens, so we match on type+value rather than `op`. */
  private isKeyword(word: string): boolean {
    const t = this.peek();
    return t.type === "ident" && t.value === word;
  }

  private parseOr(): Node {
    let left = this.parseAnd();
    // `or` (keyword) and `||` (operator alias) are equivalent.
    while (this.isKeyword("or") || (this.peek().type === "op" && this.peek().value === "||")) {
      this.next();
      const right = this.parseAnd();
      left = { kind: "bin", op: "or", left, right };
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseComparison();
    while (this.isKeyword("and") || (this.peek().type === "op" && this.peek().value === "&&")) {
      this.next();
      const right = this.parseComparison();
      left = { kind: "bin", op: "and", left, right };
    }
    return left;
  }

  private parseComparison(): Node {
    let left = this.parseSum();
    while (
      this.peek().type === "op" &&
      (this.peek().value === "==" ||
        this.peek().value === "!=" ||
        this.peek().value === ">" ||
        this.peek().value === ">=" ||
        this.peek().value === "<" ||
        this.peek().value === "<=")
    ) {
      const op = this.next().value as "==" | "!=" | ">" | ">=" | "<" | "<=";
      const right = this.parseSum();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  private parseSum(): Node {
    let left = this.parseTerm();
    while (this.peek().type === "op" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.next().value as "+" | "-";
      const right = this.parseTerm();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  private parseTerm(): Node {
    let left = this.parseUnary();
    while (
      this.peek().type === "op" &&
      (this.peek().value === "*" || this.peek().value === "/" || this.peek().value === "%")
    ) {
      const op = this.next().value as "*" | "/" | "%";
      const right = this.parseUnary();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  private parseUnary(): Node {
    if (this.peek().type === "op" && this.peek().value === "-") {
      this.next();
      return { kind: "neg", operand: this.parseUnary() };
    }
    // A leading unary plus is a harmless no-op; accept it for symmetry.
    if (this.peek().type === "op" && this.peek().value === "+") {
      this.next();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): Node {
    const base = this.parsePrimary();
    if (this.peek().type === "op" && this.peek().value === "^") {
      this.next();
      // Right-associative: the exponent itself parses as a unary so
      // `2^-3` and `2^2^3` (= 2^(2^3)) work as expected.
      const exponent = this.parseUnary();
      return { kind: "bin", op: "^", left: base, right: exponent };
    }
    return base;
  }

  private parsePrimary(): Node {
    const tok = this.peek();

    if (tok.type === "number") {
      this.next();
      return { kind: "num", value: parseFloat(tok.value) };
    }

    if (tok.type === "lparen") {
      this.next();
      const inner = this.parseExpr();
      const close = this.peek();
      if (close.type !== "rparen") {
        throw new ParseError("Expected ')'", close.pos);
      }
      this.next();
      return inner;
    }

    if (tok.type === "ident") {
      this.next();
      // Function call if immediately followed by '('. Otherwise a variable.
      if (this.peek().type === "lparen") {
        const spec = FUNCTIONS[tok.value];
        if (!spec) {
          throw new ParseError(`Unknown function '${tok.value}'`, tok.pos);
        }
        this.next(); // consume '('
        const args: Node[] = [];
        if (this.peek().type !== "rparen") {
          args.push(this.parseExpr());
          while (this.peek().type === "comma") {
            this.next();
            args.push(this.parseExpr());
          }
        }
        const close = this.peek();
        if (close.type !== "rparen") {
          throw new ParseError("Expected ')'", close.pos);
        }
        this.next();
        if (args.length !== spec.arity) {
          throw new ParseError(
            `${tok.value}() takes ${spec.arity} argument${spec.arity === 1 ? "" : "s"}, got ${args.length}`,
            tok.pos,
          );
        }
        return { kind: "call", name: tok.value, args, pos: tok.pos };
      }
      return { kind: "var", name: tok.value, pos: tok.pos };
    }

    throw new ParseError(
      tok.type === "eof" ? "Unexpected end of expression" : `Unexpected '${tok.value}'`,
      tok.pos,
    );
  }
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

function evalNode(node: Node, vars: Record<string, number>): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "var": {
      const v = vars[node.name];
      // Unknown variable → NaN, which the chart renders as null/0. We can't
      // catch this at compile time because the available variable set isn't
      // known to the evaluator; the widget surfaces undefined refs instead.
      return v === undefined ? NaN : v;
    }
    case "neg":
      return -evalNode(node.operand, vars);
    case "bin": {
      const l = evalNode(node.left, vars);
      const r = evalNode(node.right, vars);
      switch (node.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        // Division by zero yields Infinity/NaN — left as-is and surfaced as
        // a non-finite result (the compiled wrapper normalizes it).
        case "/": return l / r;
        case "%": return l % r;
        case "^": return Math.pow(l, r);
        // Comparisons / logicals yield 1 (true) or 0 (false). A NaN operand
        // makes any comparison false (NaN compares false to everything),
        // which is the behavior we want — an undefined condition isn't a hit.
        case "==": return l === r ? 1 : 0;
        case "!=": return l !== r ? 1 : 0;
        case ">":  return l > r ? 1 : 0;
        case ">=": return l >= r ? 1 : 0;
        case "<":  return l < r ? 1 : 0;
        case "<=": return l <= r ? 1 : 0;
        // Truthiness = value `!= 0`. NaN is falsey (NaN !== 0 is true, so guard
        // it explicitly). Logicals always return a clean 0/1, never the operand.
        case "and": return l !== 0 && !Number.isNaN(l) && r !== 0 && !Number.isNaN(r) ? 1 : 0;
        case "or":  return (l !== 0 && !Number.isNaN(l)) || (r !== 0 && !Number.isNaN(r)) ? 1 : 0;
      }
      return NaN;
    }
    case "call":
      return FUNCTIONS[node.name].fn(...node.args.map((a) => evalNode(a, vars)));
  }
}

/** A compiled, reusable expression. `variables` lists every identifier the
 *  expression references (deduped) so callers can validate them up-front. */
export interface CompiledExpression {
  variables: string[];
  /** Evaluate against a variable map. Non-finite results (div-by-zero,
   *  unknown var, log of a negative, ...) come back as `NaN` so the chart's
   *  null→0 handling kicks in instead of throwing. */
  evaluate: (vars: Record<string, number>) => number;
}

export interface CompileResult {
  ok: boolean;
  /** Present when `ok`. */
  compiled?: CompiledExpression;
  /** Present when `!ok` — human-readable message and (0-based) column. */
  error?: { message: string; position: number };
}

/** Walk the AST once to collect the set of referenced variable names. */
function collectVars(node: Node, out: Set<string>): void {
  switch (node.kind) {
    case "var":
      out.add(node.name);
      break;
    case "neg":
      collectVars(node.operand, out);
      break;
    case "bin":
      collectVars(node.left, out);
      collectVars(node.right, out);
      break;
    case "call":
      for (const a of node.args) collectVars(a, out);
      break;
    case "num":
      break;
  }
}

/** Compile an expression once into a reusable evaluator. Returns a result
 *  object (never throws) — `{ ok: true, compiled }` on success or
 *  `{ ok: false, error }` with a message + column on a parse error. */
export function compileExpression(expression: string): CompileResult {
  try {
    const tokens = tokenize(expression);
    const ast = new Parser(tokens).parse();

    // An empty expression (just whitespace) tokenizes to a lone EOF; the
    // parser rejects it as "unexpected end", which is the right message.

    const varSet = new Set<string>();
    collectVars(ast, varSet);

    const compiled: CompiledExpression = {
      variables: [...varSet],
      evaluate: (vars) => {
        const result = evalNode(ast, vars);
        // Normalize ±Infinity to NaN so the chart treats every degenerate
        // result uniformly (it coerces null/NaN → 0). Finite results pass
        // through untouched.
        return Number.isFinite(result) ? result : NaN;
      },
    };
    return { ok: true, compiled };
  } catch (e) {
    if (e instanceof ParseError) {
      return { ok: false, error: { message: e.message, position: e.pos } };
    }
    // Defensive — shouldn't happen, but never let a non-ParseError escape.
    return {
      ok: false,
      error: { message: e instanceof Error ? e.message : "Invalid expression", position: 0 },
    };
  }
}
