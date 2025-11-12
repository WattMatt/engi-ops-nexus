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
}

interface PDFTextExtractorProps {
  pdfUrl: string;
  currentPage: number;
  onTextExtracted: (items: ExtractedTextItem[]) => void;
}

export const PDFTextExtractor: React.FC<PDFTextExtractorProps> = ({
  pdfUrl,
  currentPage,
  onTextExtracted,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (!pdfUrl || isExtracting) return;

    extractTextFromPage();
  }, [pdfUrl, currentPage]);

  const extractTextFromPage = async () => {
    setIsExtracting(true);
    try {
      const loadingTask = pdfjs.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(currentPage);
      
      // Get text content with positions
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      
      const extractedItems: ExtractedTextItem[] = textContent.items.map((item: any, index: number) => {
        const tx = item.transform;
        const x = tx[4];
        const y = viewport.height - tx[5]; // Flip Y coordinate
        const width = item.width;
        const height = item.height;
        const fontSize = Math.abs(tx[0]); // Font size from transform matrix
        
        return {
          id: `text-${currentPage}-${index}`,
          text: item.str,
          x,
          y,
          width,
          height,
          fontSize,
          fontFamily: item.fontName || 'sans-serif',
          page: currentPage,
        };
      }).filter((item: ExtractedTextItem) => item.text.trim().length > 0);

      onTextExtracted(extractedItems);
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      onTextExtracted([]);
    } finally {
      setIsExtracting(false);
    }
  };

  return null; // This is a utility component, no UI
};
