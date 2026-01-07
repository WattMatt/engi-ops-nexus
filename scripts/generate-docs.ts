import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import ts from "typescript";
import {
  Node,
  Project,
  SourceFile,
  SyntaxKind,
  Symbol as MorphSymbol,
  Type,
} from "ts-morph";

type Category =
  | "UI Components"
  | "Components"
  | "Hooks"
  | "Utilities"
  | "Pages"
  | "Integrations"
  | "Lib"
  | "Data"
  | "Other";

type ExportDoc = {
  exportName: string;
  displayName: string;
  isDefault: boolean;
  kind:
    | "Component"
    | "Hook"
    | "Function"
    | "Class"
    | "Type"
    | "Enum"
    | "Constant"
    | "Namespace"
    | "Unknown";
  description?: string;
  signature?: string;
  definition?: string;
  props?: Array<{ name: string; type: string; optional: boolean }>;
  example?: string;
};

type ModuleDoc = {
  sourceRelPath: string;
  importPath: string;
  exports: ExportDoc[];
};

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "docs", "generated");
const TS_CONFIG = path.join(ROOT, "tsconfig.app.json");

function posixify(p: string) {
  return p.replaceAll(path.sep, "/");
}

function stripExtension(filePath: string) {
  return filePath.replace(/\.(tsx|ts)$/, "");
}

function toImportPathFromRel(relFromSrc: string) {
  return `@/${stripExtension(posixify(relFromSrc))}`;
}

function categorize(relFromSrc: string): Category {
  const rel = posixify(relFromSrc);
  if (rel.startsWith("components/ui/")) return "UI Components";
  if (rel.startsWith("components/")) return "Components";
  if (rel.startsWith("hooks/")) return "Hooks";
  if (rel.startsWith("utils/")) return "Utilities";
  if (rel.startsWith("pages/")) return "Pages";
  if (rel.startsWith("integrations/")) return "Integrations";
  if (rel.startsWith("lib/")) return "Lib";
  if (rel.startsWith("data/")) return "Data";
  return "Other";
}

function markdownEscapeInline(code: string) {
  return code.replaceAll("`", "\\`");
}

function cleanTypeText(typeText: string) {
  // Collapse TS import() qualifiers like:
  // import("/abs/path/node_modules/@types/react/jsx-runtime").JSX.Element -> JSX.Element
  return typeText
    .replace(/import\(["'][^"']+["']\)\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFirstMeaningfulDeclaration(symbol: MorphSymbol) {
  const decls = symbol.getDeclarations();
  const meaningful = decls.find((d) => {
    const k = d.getKind();
    return (
      k === SyntaxKind.FunctionDeclaration ||
      k === SyntaxKind.VariableDeclaration ||
      k === SyntaxKind.ClassDeclaration ||
      k === SyntaxKind.InterfaceDeclaration ||
      k === SyntaxKind.TypeAliasDeclaration ||
      k === SyntaxKind.EnumDeclaration ||
      k === SyntaxKind.ModuleDeclaration ||
      k === SyntaxKind.ArrowFunction ||
      k === SyntaxKind.FunctionExpression
    );
  });
  return meaningful ?? decls[0];
}

function getJsDocDescription(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  // Many nodes in ts-morph support getJsDocs(), but not all.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybe = node as any;
  if (typeof maybe.getJsDocs !== "function") return undefined;
  const docs = maybe.getJsDocs();
  const description = docs
    .map((d: any) => (typeof d.getDescription === "function" ? d.getDescription().trim() : ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
  return description || undefined;
}

function hasJsx(node: Node | undefined): boolean {
  if (!node) return false;
  let found = false;
  node.forEachDescendant((d) => {
    if (
      Node.isJsxElement(d) ||
      Node.isJsxSelfClosingElement(d) ||
      Node.isJsxFragment(d) ||
      d.getKind() === SyntaxKind.JsxExpression
    ) {
      found = true;
      return false;
    }
    return undefined;
  });
  return found;
}

function isLikelyComponentExport(
  exportName: string,
  sourceRelPath: string,
  decl: Node | undefined,
  exportType: Type,
): boolean {
  const rel = posixify(sourceRelPath);
  const isTsx = rel.endsWith(".tsx");
  const startsUpper = exportName.length > 0 && exportName[0] === exportName[0].toUpperCase();
  if (!startsUpper) return false;
  if (!isTsx && !rel.startsWith("components/") && !rel.startsWith("pages/")) return false;

  if (hasJsx(decl)) return true;

  // Heuristic: return type contains JSX/React element-ish types.
  const callSigs = exportType.getCallSignatures();
  const ret = callSigs[0]?.getReturnType().getText(decl ?? undefined);
  return Boolean(ret && /(JSX\.Element|ReactElement|ReactNode)/.test(ret));
}

function isLikelyHookExport(exportName: string, exportType: Type): boolean {
  if (!exportName.startsWith("use")) return false;
  // Hooks are callable.
  return exportType.getCallSignatures().length > 0;
}

function formatCallableSignature(displayName: string, t: Type, context: Node | undefined) {
  const sig = t.getCallSignatures()[0];
  if (!sig) return undefined;
  const decl = sig.getDeclaration();
  if (!decl) return `${displayName}(…): ${cleanTypeText(sig.getReturnType().getText(context))}`;
  const params = decl.getParameters().map((p) => {
    const name = p.getName();
    const typeText = cleanTypeText(p.getType().getText(p));
    const optional = p.isOptional();
    return `${name}${optional ? "?" : ""}: ${typeText}`;
  });
  const ret = cleanTypeText(decl.getReturnType().getText(decl));
  return `${displayName}(${params.join(", ")}): ${ret}`;
}

function isOptionalProp(symbol: MorphSymbol) {
  // ts-morph Symbol wraps compilerSymbol
  const flags = symbol.compilerSymbol.getFlags();
  return (flags & ts.SymbolFlags.Optional) !== 0;
}

function truncateLines(text: string, maxLines: number) {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return `${lines.slice(0, maxLines).join("\n")}\n// ... truncated (${lines.length - maxLines} more lines) ...`;
}

function guessExampleValue(typeText: string): string {
  const t = typeText.trim();
  if (t === "string" || t.endsWith("string")) return `"..."`;
  if (t === "number" || t.endsWith("number")) return "{0}";
  if (t === "boolean" || t.endsWith("boolean")) return "{true}";
  if (t.includes("React.ReactNode") || t.includes("ReactNode") || t.includes("JSX.Element")) return "{null}";
  if (t.includes("=>")) return "{() => {}}";
  if (t.endsWith("[]") || t.startsWith("Array<")) return "{[]}";
  if (t.includes("|")) {
    const first = t.split("|").map((s) => s.trim()).find((s) => !["undefined", "null"].includes(s));
    if (first) return guessExampleValue(first);
  }
  if (t === "null") return "{null}";
  if (t === "undefined") return "{undefined}";
  return "{undefined as any}";
}

function getPropsFromComponent(
  decl: Node | undefined,
  exportType: Type,
): Array<{ name: string; type: string; optional: boolean }> | undefined {
  // Prefer the first call signature's first parameter type
  const callSig = exportType.getCallSignatures()[0];
  const firstParam = callSig?.getParameters()?.[0];
  const firstParamDecl = firstParam?.getValueDeclaration();
  const propsType = firstParamDecl?.getType() ?? undefined;

  if (!propsType) return undefined;
  const props = propsType
    .getApparentProperties()
    .map((p) => {
      const valueDecl = p.getValueDeclaration() ?? decl;
      const typeText = cleanTypeText(
        p.getTypeAtLocation(valueDecl ?? decl ?? undefined).getText(valueDecl ?? undefined),
      );
      return { name: p.getName(), type: typeText, optional: isOptionalProp(p) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return props.length ? props : undefined;
}

function buildExample(
  doc: Pick<ExportDoc, "kind" | "displayName" | "exportName" | "isDefault" | "props">,
  importPath: string,
) {
  const importLine = doc.isDefault
    ? `import ${doc.displayName} from "${importPath}";`
    : `import { ${doc.exportName} } from "${importPath}";`;

  if (doc.kind === "Component") {
    const requiredProps = (doc.props ?? []).filter((p) => !p.optional && p.name !== "children");
    const propsSnippet =
      requiredProps.length === 0
        ? ""
        : " " +
          requiredProps
            .slice(0, 8)
            .map((p) => `${p.name}=${guessExampleValue(p.type)}`)
            .join(" ");
    const componentName = doc.isDefault ? doc.displayName : doc.exportName;
    return `${importLine}

export function Example() {
  return <${componentName}${propsSnippet} />;
}`;
  }

  if (doc.kind === "Hook") {
    const hookName = doc.isDefault ? doc.displayName : doc.exportName;
    return `${importLine}

export function Example() {
  const result = ${hookName}();
  void result;
  return null;
}`;
  }

  if (doc.kind === "Function") {
    const fnName = doc.isDefault ? doc.displayName : doc.exportName;
    return `${importLine}

const result = ${fnName}(/* ...args */);
void result;`;
  }

  if (doc.kind === "Constant") {
    const name = doc.isDefault ? doc.displayName : doc.exportName;
    return `${importLine}

console.log(${name});`;
  }

  if (doc.kind === "Type" || doc.kind === "Enum" || doc.kind === "Class") {
    const name = doc.isDefault ? doc.displayName : doc.exportName;
    return `${importLine}

// Use ${name} in your code where appropriate.`;
  }

  return `${importLine}

// Usage depends on this export's shape.`;
}

function getDefaultDisplayNameFromFile(sourceRelPath: string) {
  const stem = path.basename(sourceRelPath).replace(/\.(tsx|ts)$/, "");
  // Basic PascalCase for dashed names.
  return stem
    .split(/[^a-zA-Z0-9]/g)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join("");
}

async function writeFileEnsuringDir(filePath: string, contents: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

function moduleToMarkdown(category: Category, modules: ModuleDoc[]) {
  const lines: string[] = [];
  lines.push(`## ${category}`);
  lines.push("");
  lines.push(
    `Generated on ${new Date().toISOString()}. Regenerate with \`npm run docs:generate\`.`,
  );
  lines.push("");

  for (const m of modules) {
    lines.push(`### \`${markdownEscapeInline(m.importPath)}\``);
    lines.push("");
    lines.push(`- **Source**: \`${markdownEscapeInline(m.sourceRelPath)}\``);
    lines.push("");

    for (const e of m.exports) {
      lines.push(`#### \`${markdownEscapeInline(e.displayName)}\``);
      lines.push("");
      lines.push(
        `- **Import**: \`${
          e.isDefault
            ? `import ${e.displayName} from "${m.importPath}";`
            : `import { ${e.exportName} } from "${m.importPath}";`
        }\``,
      );
      lines.push(`- **Kind**: ${e.kind}`);
      if (e.signature) lines.push(`- **Signature**: \`${markdownEscapeInline(cleanTypeText(e.signature))}\``);
      if (e.description) {
        lines.push("");
        lines.push(e.description);
        lines.push("");
      }
      if (e.definition) {
        lines.push("");
        lines.push("**Definition**:");
        lines.push("");
        lines.push("```ts");
        lines.push(e.definition);
        lines.push("```");
      }
      if (e.props?.length) {
        lines.push("");
        lines.push("**Props**:");
        for (const p of e.props.slice(0, 30)) {
          lines.push(
            `- **\`${markdownEscapeInline(p.name)}\`${p.optional ? " (optional)" : ""}**: \`${markdownEscapeInline(
              p.type,
            )}\``,
          );
        }
        if (e.props.length > 30) {
          lines.push(`- **…**: (and ${e.props.length - 30} more)`);
        }
      }

      if (e.example) {
        lines.push("");
        lines.push("**Example**:");
        lines.push("");
        lines.push("```tsx");
        lines.push(e.example);
        lines.push("```");
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function indexToMarkdown(files: Array<{ category: Category; filename: string }>) {
  const lines: string[] = [];
  lines.push("## Generated API Reference");
  lines.push("");
  lines.push(
    "This folder is generated from the current TypeScript source exports (public surface area).",
  );
  lines.push("");
  lines.push("- **Regenerate**: `npm run docs:generate`");
  lines.push("- **Scope**: every exported symbol from `src/**/*.ts(x)`");
  lines.push("");
  lines.push("## Sections");
  lines.push("");
  for (const f of files) {
    lines.push(`- **${f.category}**: \`./${f.filename}\``);
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  if (!existsSync(TS_CONFIG)) {
    throw new Error(`Missing tsconfig: ${TS_CONFIG}`);
  }

  // Fresh output each run
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const project = new Project({
    tsConfigFilePath: TS_CONFIG,
    skipAddingFilesFromTsConfig: false,
  });

  const sourceFiles = project
    .getSourceFiles()
    .filter((sf) => {
      const fp = sf.getFilePath();
      return fp.startsWith(SRC_DIR) && !sf.isDeclarationFile();
    })
    .sort((a, b) => a.getFilePath().localeCompare(b.getFilePath()));

  const byCategory = new Map<Category, ModuleDoc[]>();

  function addModule(cat: Category, moduleDoc: ModuleDoc) {
    const list = byCategory.get(cat) ?? [];
    list.push(moduleDoc);
    byCategory.set(cat, list);
  }

  for (const sf of sourceFiles) {
    const sourceRelPath = posixify(path.relative(SRC_DIR, sf.getFilePath()));
    const importPath = toImportPathFromRel(sourceRelPath);
    const category = categorize(sourceRelPath);

    const exportSymbols = sf.getExportSymbols();
    const defaultExportSymbol = sf.getDefaultExportSymbol();
    const hasExports = exportSymbols.length > 0 || Boolean(defaultExportSymbol);
    if (!hasExports) continue;

    const moduleExports: ExportDoc[] = [];

    const seen = new Set<string>();
    const all: Array<{ isDefault: boolean; symbol: MorphSymbol; exportName: string }> = [];

    for (const s of exportSymbols) {
      const name = s.getName();
      if (seen.has(`named:${name}`)) continue;
      seen.add(`named:${name}`);
      all.push({ isDefault: false, symbol: s, exportName: name });
    }

    if (defaultExportSymbol) {
      const defaultName = getDefaultDisplayNameFromFile(sourceRelPath);
      all.push({ isDefault: true, symbol: defaultExportSymbol, exportName: defaultName });
    }

    for (const item of all) {
      try {
        const resolved = item.symbol.getAliasedSymbol?.() ?? item.symbol;
        const decl = getFirstMeaningfulDeclaration(resolved);
        const exportType = resolved.getTypeAtLocation(decl ?? sf);

        const description = getJsDocDescription(decl);

        const isComponent = isLikelyComponentExport(item.exportName, sourceRelPath, decl, exportType);
        const isHook = !isComponent && isLikelyHookExport(item.exportName, exportType);
        const signature =
          exportType.getCallSignatures().length > 0
            ? formatCallableSignature(item.exportName, exportType, decl ?? sf)
            : undefined;

        let kind: ExportDoc["kind"] = "Unknown";
        if (isComponent) kind = "Component";
        else if (isHook) kind = "Hook";
        else if (exportType.getCallSignatures().length > 0) kind = "Function";
        else if (decl && Node.isClassDeclaration(decl)) kind = "Class";
        else if (decl && (Node.isInterfaceDeclaration(decl) || Node.isTypeAliasDeclaration(decl))) kind = "Type";
        else if (decl && Node.isEnumDeclaration(decl)) kind = "Enum";
        else if (decl && Node.isModuleDeclaration(decl)) kind = "Namespace";
        else if (decl && Node.isVariableDeclaration(decl)) kind = "Constant";

        const props = kind === "Component" ? getPropsFromComponent(decl, exportType) : undefined;

        const displayName = item.isDefault ? item.exportName : item.exportName;

        const exportDoc: ExportDoc = {
          exportName: item.exportName,
          displayName,
          isDefault: item.isDefault,
          kind,
          description,
          signature,
          props,
        };

        // For type exports, include a short signature-like “definition” when possible.
        if (
          (kind === "Type" || kind === "Enum" || kind === "Class") &&
          decl &&
          (Node.isTypeAliasDeclaration(decl) ||
            Node.isInterfaceDeclaration(decl) ||
            Node.isEnumDeclaration(decl) ||
            Node.isClassDeclaration(decl))
        ) {
          exportDoc.definition = truncateLines(decl.getText(), 200);
        }

        exportDoc.example = buildExample(exportDoc, importPath);
        moduleExports.push(exportDoc);
      } catch {
        moduleExports.push({
          exportName: item.exportName,
          displayName: item.exportName,
          isDefault: item.isDefault,
          kind: "Unknown",
          example: buildExample(
            { kind: "Unknown", displayName: item.exportName, exportName: item.exportName, isDefault: item.isDefault },
            importPath,
          ),
        });
      }
    }

    // Skip modules with only the synthetic `__esModule`-style exports (rare, but safe)
    if (moduleExports.length === 0) continue;

    moduleExports.sort((a, b) => a.displayName.localeCompare(b.displayName));
    addModule(category, { sourceRelPath: `src/${sourceRelPath}`, importPath, exports: moduleExports });
  }

  const orderedCategories: Category[] = [
    "UI Components",
    "Components",
    "Pages",
    "Hooks",
    "Utilities",
    "Integrations",
    "Lib",
    "Data",
    "Other",
  ];

  const outputs: Array<{ category: Category; filename: string }> = [];

  for (const cat of orderedCategories) {
    const modules = (byCategory.get(cat) ?? []).sort((a, b) => a.importPath.localeCompare(b.importPath));
    if (modules.length === 0) continue;
    const filename =
      cat === "UI Components"
        ? "ui-components.md"
        : cat.toLowerCase().replaceAll(" ", "-") + ".md";
    outputs.push({ category: cat, filename });
    const md = moduleToMarkdown(cat, modules);
    await writeFileEnsuringDir(path.join(OUT_DIR, filename), md);
  }

  const index = indexToMarkdown(outputs);
  await writeFileEnsuringDir(path.join(OUT_DIR, "INDEX.md"), index);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

