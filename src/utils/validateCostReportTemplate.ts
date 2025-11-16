import mammoth from "mammoth";

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingPlaceholders: string[];
  hasLoopSyntax: boolean;
}

const REQUIRED_PLACEHOLDERS = [
  "project_name",
  "project_number",
  "client_name",
  "report_number",
  "report_date",
  "electrical_contractor",
];

const REQUIRED_LOOPS = [
  { start: "{#categories}", end: "{/categories}" },
  { start: "{#variations}", end: "{/variations}" },
];

const NESTED_LOOPS = [
  { start: "{#line_items}", end: "{/line_items}", parent: "categories" },
];

export async function validateCostReportTemplate(
  file: File
): Promise<TemplateValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingPlaceholders: string[] = [];
  let hasLoopSyntax = false;

  try {
    // Read the file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text from Word document
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    // Check for required simple placeholders
    REQUIRED_PLACEHOLDERS.forEach((placeholder) => {
      const pattern = new RegExp(`{{\\s*${placeholder}\\s*}}`, "i");
      if (!pattern.test(text)) {
        missingPlaceholders.push(placeholder);
        warnings.push(`Missing placeholder: {{${placeholder}}}`);
      }
    });

    // Check for required loop syntax
    REQUIRED_LOOPS.forEach((loop) => {
      const hasStart = text.includes(loop.start);
      const hasEnd = text.includes(loop.end);

      if (!hasStart && !hasEnd) {
        errors.push(`Missing loop: ${loop.start}...${loop.end}`);
      } else if (!hasStart) {
        errors.push(`Missing loop start tag: ${loop.start}`);
      } else if (!hasEnd) {
        errors.push(`Missing loop end tag: ${loop.end}`);
      } else {
        hasLoopSyntax = true;
      }
    });

    // Check for nested loops
    NESTED_LOOPS.forEach((loop) => {
      const parentLoopExists = text.includes(`{#${loop.parent}}`);
      const hasStart = text.includes(loop.start);
      const hasEnd = text.includes(loop.end);

      if (parentLoopExists) {
        if (!hasStart && !hasEnd) {
          warnings.push(
            `Nested loop ${loop.start}...${loop.end} not found in {#${loop.parent}}`
          );
        } else if (!hasStart) {
          errors.push(`Missing nested loop start tag: ${loop.start}`);
        } else if (!hasEnd) {
          errors.push(`Missing nested loop end tag: ${loop.end}`);
        }
      }
    });

    // Check for common formatting issues
    const commonIssues = [
      { pattern: /\{\s+#/, message: "Found space after opening brace: '{ #' should be '{#'" },
      { pattern: /#\s+\w+\s*\}/, message: "Found space after hash: '{# tag}' should be '{#tag}'" },
      { pattern: /\{\{\s+\w+/, message: "Found space after opening braces: '{{ placeholder' should be '{{placeholder'" },
      { pattern: /\w+\s+\}\}/, message: "Found space before closing braces: 'placeholder }}' should be 'placeholder}}'" },
      { pattern: /\{#\w+\}\{\/\w+\}/, message: "Empty loop found - loops should contain content between start and end tags" },
    ];

    commonIssues.forEach(({ pattern, message }) => {
      if (pattern.test(text)) {
        errors.push(message);
      }
    });

    // Check for mismatched delimiters
    const openBraces = (text.match(/\{\{/g) || []).length;
    const closeBraces = (text.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(
        `Mismatched placeholder delimiters: ${openBraces} opening '{{' but ${closeBraces} closing '}}' found`
      );
    }

    const isValid = errors.length === 0 && missingPlaceholders.length === 0;

    return {
      isValid,
      errors,
      warnings,
      missingPlaceholders,
      hasLoopSyntax,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Failed to validate template: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      warnings: [],
      missingPlaceholders: [],
      hasLoopSyntax: false,
    };
  }
}
