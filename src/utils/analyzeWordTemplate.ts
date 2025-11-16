import mammoth from "mammoth";

export interface TemplateStructure {
  headings: Array<{ level: number; text: string; position: number }>;
  tables: Array<{ position: number; rows: number; columns: number }>;
  paragraphs: Array<{ text: string; position: number; isEmpty: boolean }>;
  rawText: string;
  hasFinancialContent: boolean;
  hasTableStructure: boolean;
}

export async function analyzeWordTemplate(file: File): Promise<TemplateStructure> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Extract raw text
  const textResult = await mammoth.extractRawText({ arrayBuffer });
  const rawText = textResult.value;

  // Extract structured content with HTML conversion for better structure detection
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const htmlContent = htmlResult.value;

  // Parse structure from HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  // Extract headings
  const headings: TemplateStructure["headings"] = [];
  let position = 0;
  
  doc.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    const level = parseInt(heading.tagName.substring(1));
    const text = heading.textContent?.trim() || "";
    if (text) {
      headings.push({ level, text, position: position++ });
    }
  });

  // Extract tables
  const tables: TemplateStructure["tables"] = [];
  doc.querySelectorAll("table").forEach((table, index) => {
    const rows = table.querySelectorAll("tr").length;
    const firstRow = table.querySelector("tr");
    const columns = firstRow ? firstRow.querySelectorAll("td, th").length : 0;
    tables.push({ position: index, rows, columns });
  });

  // Extract paragraphs
  const paragraphs: TemplateStructure["paragraphs"] = [];
  doc.querySelectorAll("p").forEach((p, index) => {
    const text = p.textContent?.trim() || "";
    paragraphs.push({
      text,
      position: index,
      isEmpty: text.length === 0,
    });
  });

  // Analyze content characteristics
  const hasFinancialContent = /\b(budget|cost|amount|total|R\s*\d+|ZAR|rand)\b/i.test(rawText);
  const hasTableStructure = tables.length > 0;

  return {
    headings,
    tables,
    paragraphs,
    rawText,
    hasFinancialContent,
    hasTableStructure,
  };
}

export function compareTemplateStructures(
  completed: TemplateStructure,
  blank: TemplateStructure
): {
  similarityScore: number;
  structuralMatch: boolean;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  
  // Compare table counts
  const tableCountMatch = completed.tables.length === blank.tables.length;
  if (!tableCountMatch) {
    suggestions.push(
      `Completed template has ${completed.tables.length} tables, blank has ${blank.tables.length}. Ensure structure matches.`
    );
  }

  // Compare heading structure
  const headingCountMatch = Math.abs(completed.headings.length - blank.headings.length) <= 2;
  if (!headingCountMatch) {
    suggestions.push(
      `Heading count differs significantly (completed: ${completed.headings.length}, blank: ${blank.headings.length}).`
    );
  }

  // Check if blank template has financial indicators
  if (completed.hasFinancialContent && !blank.hasFinancialContent) {
    suggestions.push("Blank template might be missing financial content areas.");
  }

  // Calculate simple similarity score
  let score = 0;
  if (tableCountMatch) score += 40;
  if (headingCountMatch) score += 30;
  if (blank.hasTableStructure) score += 20;
  if (blank.hasFinancialContent) score += 10;

  return {
    similarityScore: score,
    structuralMatch: score >= 60,
    suggestions,
  };
}
