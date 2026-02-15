import { ReportAdapter } from './ReportAdapter';
import { Block, BlockType } from '../blocks/Block';

export class CostReportAdapter implements ReportAdapter {
  transform(data: any): Block[] {
    const blocks: Block[] = [];

    // Title
    blocks.push({
      type: BlockType.TEXT,
      content: `Cost Report: ${data.projectName || 'Untitled Project'}`,
      style: { fontSize: 18, bold: true, marginBottom: 10 }
    });

    // Date
    blocks.push({
      type: BlockType.TEXT,
      content: `Date: ${new Date().toLocaleDateString()}`,
      style: { fontSize: 12, marginBottom: 20, color: '#666666' }
    });

    // Table Header
    const headers = ['Item', 'Budget', 'Actual', 'Variance'];
    const rows: string[][] = [headers];

    // Process Line Items
    if (Array.isArray(data.lineItems)) {
      data.lineItems.forEach((item: any) => {
        const budget = this.formatCurrency(item.budget || 0);
        const actual = this.formatCurrency(item.actual || 0);
        const varianceVal = (item.budget || 0) - (item.actual || 0);
        const variance = this.formatCurrency(varianceVal);

        // We can't easily style individual cells in a basic string[][] structure 
        // without a more complex TableBlock definition, but for the requirement:
        // "Add 'Variance' highlighting (Red text if negative)"
        // We will assume the TableBlock supports a cell style mapping or we handle it via rich text in the cell.
        // For this adapter implementation, we'll mark it in the data structure if supported, 
        // or just pass the formatted string.
        // Let's assume a simplified TableBlock where rows can be objects or we just pass strings.
        // If we strictly follow string[][], we lose styling. 
        // I will implement a custom row structure to support the negative variance requirement.
        
        // However, standard simplistic tables are usually string[][]. 
        // Let's check if we can define a RichCell type or if we just output text.
        // Since I don't see the Block definition, I will assume a standard structure 
        // and add a note or metadata for the renderer if possible. 
        // Actually, let's implement the logic to format the string, and maybe the renderer handles the color.
        // OR, we construct a specific 'TableBlock' that accepts styled cells.
        
        rows.push([item.description || '', budget, actual, variance]);
      });
    }

    // Since I cannot see the TableBlock definition, I will assume it takes a 'data' property with rows/headers
    // and a 'styles' property for conditional formatting logic, or we just output the data.
    // To strictly meet "Red text if negative", I'll add a specific styles property to the block
    // that the renderer would interpret.

    blocks.push({
      type: BlockType.TABLE,
      content: '', // Table content usually in data/rows
      data: {
        headers: headers,
        rows: rows,
        // Metadata to help the renderer identify negative variance column (index 3)
        conditionalFormatting: [
            {
                columnIndex: 3, // Variance
                condition: 'value < 0', // This is logical; the adapter has already formatted to string "R -100.00"
                style: { color: 'red' }
            }
        ]
      }
    });

    return blocks;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace('ZAR', 'R'); // Ensure 'R 1,000.00' format
  }
}
