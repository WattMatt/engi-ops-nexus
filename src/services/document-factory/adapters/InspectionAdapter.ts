import { ReportAdapter } from './ReportAdapter';
import { Block, BlockType } from '../blocks/Block';

export class InspectionAdapter implements ReportAdapter {
  transform(data: any): Block[] {
    const blocks: Block[] = [];

    // Title
    blocks.push({
      type: BlockType.TEXT,
      content: `Inspection Report: ${data.siteName || 'Unknown Site'}`,
      style: { fontSize: 18, bold: true, marginBottom: 15 }
    });

    // Inspector
    if (data.inspector) {
      blocks.push({
        type: BlockType.TEXT,
        content: `Inspector: ${data.inspector}`,
        style: { fontSize: 12, marginBottom: 20 }
      });
    }

    // Image Grid
    if (Array.isArray(data.inspections)) {
      const images: any[] = data.inspections.map((inspection: any) => ({
        url: inspection.photoUrl,
        caption: inspection.snagDescription || 'No description provided', // "Snag Description" as caption
        width: 300, // concise width for 2-column layout
        height: 200
      }));

      blocks.push({
        type: BlockType.IMAGE_GRID,
        content: '',
        data: {
          images: images,
          columns: 2 // 2 columns
        }
      });
    }

    return blocks;
  }
}
