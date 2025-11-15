import { useEffect, useState } from 'react';
import { pdfjs } from 'react-pdf';

export interface ExtractedTextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  page: number;
  color?: string;
  bold?: boolean;
}

interface PDFTextExtractorProps {
  pdfUrl: string;
  currentPage: number;
  onTextExtracted: (items: ExtractedTextItem[]) => void;
  scale?: number;
}

export const PDFTextExtractor: React.FC<PDFTextExtractorProps> = ({
  pdfUrl,
  currentPage,
  onTextExtracted,
  scale = 1.0,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (!pdfUrl || isExtracting) return;

    // Add a small delay to avoid race conditions with PDF viewer
    const timer = setTimeout(() => {
      extractTextFromPage();
    }, 300);

    return () => clearTimeout(timer);
  }, [pdfUrl, currentPage]);

  const extractTextFromPage = async () => {
    setIsExtracting(true);
    try {
      const loadingTask = pdfjs.getDocument({
        url: pdfUrl,
        cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(currentPage);
      
      // Get text content with positions
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale });
      
      console.log(`[PDF Extract] Extracting ${textContent.items.length} items from page ${currentPage}`);
      
      const extractedItems: ExtractedTextItem[] = textContent.items
        .filter((item: any) => item.str && item.str.trim().length > 0)
        .map((item: any, index: number) => {
          const tx = item.transform;
          const x = tx[4] * scale;
          const y = (viewport.height - tx[5]) * scale; // Flip Y coordinate
          const fontSize = Math.abs(tx[0]) * scale;
          const width = item.width * scale;
          const height = item.height * scale;
          
          return {
            id: `pdf-text-${currentPage}-${index}`,
            text: item.str,
            x,
            y: y - fontSize, // Adjust Y to top of text
            width,
            height: fontSize * 1.2,
            fontSize,
            fontFamily: item.fontName || 'sans-serif',
            page: currentPage,
            bold: item.fontName?.toLowerCase().includes('bold'),
          } as ExtractedTextItem;
        });

      console.log(`[PDF Extract] Successfully extracted ${extractedItems.length} text elements`);
      onTextExtracted(extractedItems);
      
      // Clean up
      await page.cleanup();
      await pdf.cleanup();
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      onTextExtracted([]);
    } finally {
      setIsExtracting(false);
    }
  };

  return null;
};
