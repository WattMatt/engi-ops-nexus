import mammoth from "mammoth";

export interface DetectedField {
  fieldName: string;
  value: string;
  context: string;
  location: "heading" | "table" | "paragraph";
}

export interface TemplateStructure {
  headings: Array<{ level: number; text: string; position: number }>;
  tables: Array<{ position: number; rows: number; columns: number }>;
  paragraphs: Array<{ text: string; position: number; isEmpty: boolean }>;
  images: Array<{ 
    position: number; 
    altText?: string; 
    context: string;
    beforeText: string;
    afterText: string;
  }>;
  detectedFields: DetectedField[];
  rawText: string;
  hasFinancialContent: boolean;
  hasTableStructure: boolean;
  hasImages: boolean;
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

  // Extract images
  const images: TemplateStructure["images"] = [];
  const imgElements = doc.querySelectorAll("img");
  
  imgElements.forEach((img, index) => {
    const altText = img.getAttribute("alt") || undefined;
    
    // Get context from surrounding elements
    const parent = img.parentElement;
    const previousSibling = parent?.previousElementSibling;
    const nextSibling = parent?.nextElementSibling;
    
    const beforeText = previousSibling?.textContent?.trim().slice(-50) || "";
    const afterText = nextSibling?.textContent?.trim().slice(0, 50) || "";
    
    // Determine context based on surrounding content
    let context = "Unknown";
    if (beforeText.toLowerCase().includes("logo") || altText?.toLowerCase().includes("logo")) {
      context = "Logo";
    } else if (beforeText.toLowerCase().includes("signature")) {
      context = "Signature";
    } else if (parent?.closest("table")) {
      context = "Table Image";
    } else if (previousSibling?.tagName.match(/^H[1-6]$/)) {
      context = "Section Image";
    } else {
      context = "Content Image";
    }
    
    images.push({
      position: index,
      altText,
      context,
      beforeText,
      afterText,
    });
  });

  // Analyze content characteristics
  const hasFinancialContent = /\b(budget|cost|amount|total|R\s*\d+|ZAR|rand)\b/i.test(rawText);
  const hasTableStructure = tables.length > 0;
  const hasImages = images.length > 0;

  // Detect potential data fields from the completed template
  const detectedFields: DetectedField[] = [];
  
  // Pattern 1: "Label: Value" pairs
  const labelValuePattern = /^([A-Z][A-Za-z\s]+):\s*(.+)$/gm;
  let match;
  while ((match = labelValuePattern.exec(rawText)) !== null) {
    const label = match[1].trim();
    const value = match[2].trim();
    
    // Skip if value looks like a placeholder already
    if (!value.includes("{{") && value.length > 0 && value.length < 100) {
      detectedFields.push({
        fieldName: label.toLowerCase().replace(/\s+/g, "_"),
        value,
        context: label,
        location: "paragraph"
      });
    }
  }

  // Pattern 2: Table headers with data
  tables.forEach((table, tableIndex) => {
    const tableElement = doc.querySelectorAll("table")[tableIndex];
    const headerRow = tableElement?.querySelector("tr");
    const headers: string[] = [];
    
    headerRow?.querySelectorAll("th, td").forEach(cell => {
      const text = cell.textContent?.trim();
      if (text) headers.push(text);
    });
    
    if (headers.length > 0) {
      headers.forEach(header => {
        detectedFields.push({
          fieldName: header.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
          value: header,
          context: `Table column: ${header}`,
          location: "table"
        });
      });
    }
  });

  // Pattern 3: Headings as section indicators
  headings.forEach(heading => {
    if (heading.text.length > 0 && heading.text.length < 50) {
      detectedFields.push({
        fieldName: heading.text.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        value: heading.text,
        context: `Section: ${heading.text}`,
        location: "heading"
      });
    }
  });

  return {
    headings,
    tables,
    paragraphs,
    images,
    detectedFields,
    rawText,
    hasFinancialContent,
    hasTableStructure,
    hasImages,
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

  // Compare images
  const imageCountMatch = completed.images.length === blank.images.length;
  if (!imageCountMatch) {
    suggestions.push(
      `Image count differs (completed: ${completed.images.length}, blank: ${blank.images.length}). Placeholders will be generated for ${blank.images.length} images.`
    );
  }

  // Identify image contexts
  if (blank.images.length > 0) {
    const imageContexts = blank.images.map(img => img.context).join(", ");
    suggestions.push(`Detected images: ${imageContexts}`);
  }

  // Calculate simple similarity score
  let score = 0;
  if (tableCountMatch) score += 30;
  if (headingCountMatch) score += 25;
  if (blank.hasTableStructure) score += 20;
  if (blank.hasFinancialContent) score += 10;
  if (imageCountMatch) score += 15;

  return {
    similarityScore: score,
    structuralMatch: score >= 60,
    suggestions,
  };
}
