import { useEffect, useState } from 'react';
import { pdfjs } from 'react-pdf';

export interface ExtractedImage {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface ExtractedShape {
  id: string;
  type: 'line' | 'rect' | 'path';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  page: number;
  path?: string; // SVG path for complex shapes
}

interface PDFVisualExtractorProps {
  pdfUrl: string;
  currentPage: number;
  onImagesExtracted: (images: ExtractedImage[]) => void;
  onShapesExtracted: (shapes: ExtractedShape[]) => void;
  scale?: number;
}

export const PDFVisualExtractor: React.FC<PDFVisualExtractorProps> = ({
  pdfUrl,
  currentPage,
  onImagesExtracted,
  onShapesExtracted,
  scale = 1.0,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (!pdfUrl || isExtracting) return;
    extractVisualsFromPage();
  }, [pdfUrl, currentPage]);

  const extractVisualsFromPage = async () => {
    setIsExtracting(true);
    try {
      const loadingTask = pdfjs.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      // Extract images
      const operatorList = await page.getOperatorList();
      const images: ExtractedImage[] = [];
      const shapes: ExtractedShape[] = [];
      
      let imageIndex = 0;
      let shapeIndex = 0;
      let currentX = 0;
      let currentY = 0;
      let currentTransform = [1, 0, 0, 1, 0, 0]; // Identity matrix
      
      console.log(`[Visual Extract] Processing ${operatorList.fnArray.length} operations`);

      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        const args = operatorList.argsArray[i];

        // Track transformation matrix
        if (fn === pdfjs.OPS.transform) {
          currentTransform = args[0];
        }

        // Extract images
        if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
          try {
            const imageName = args[0];
            const objs = page.objs;
            
            await new Promise<void>((resolve) => {
              objs.get(imageName, (imageData: any) => {
                if (imageData) {
                  const canvas = document.createElement('canvas');
                  canvas.width = imageData.width;
                  canvas.height = imageData.height;
                  const ctx = canvas.getContext('2d');
                  
                  if (ctx && imageData.data) {
                    const imgData = ctx.createImageData(imageData.width, imageData.height);
                    imgData.data.set(imageData.data);
                    ctx.putImageData(imgData, 0, 0);
                    
                    const x = currentTransform[4] * scale;
                    const y = (viewport.height - currentTransform[5]) * scale;
                    const width = imageData.width * scale * 0.5;
                    const height = imageData.height * scale * 0.5;
                    
                    images.push({
                      id: `pdf-image-${currentPage}-${imageIndex++}`,
                      dataUrl: canvas.toDataURL(),
                      x,
                      y: y - height,
                      width,
                      height,
                      page: currentPage,
                    });
                  }
                }
                resolve();
              });
            });
          } catch (err) {
            console.warn('Error extracting image:', err);
          }
        }

        // Extract rectangles
        if (fn === pdfjs.OPS.rectangle) {
          const [x, y, width, height] = args;
          shapes.push({
            id: `pdf-rect-${currentPage}-${shapeIndex++}`,
            type: 'rect',
            x: (x + currentTransform[4]) * scale,
            y: (viewport.height - (y + currentTransform[5] + height)) * scale,
            width: width * scale,
            height: height * scale,
            strokeColor: '#000000',
            strokeWidth: 1,
            page: currentPage,
          });
        }

        // Extract lines
        if (fn === pdfjs.OPS.moveTo) {
          currentX = args[0];
          currentY = args[1];
        }
        
        if (fn === pdfjs.OPS.lineTo) {
          const x2 = args[0];
          const y2 = args[1];
          shapes.push({
            id: `pdf-line-${currentPage}-${shapeIndex++}`,
            type: 'line',
            x: (currentX + currentTransform[4]) * scale,
            y: (viewport.height - (currentY + currentTransform[5])) * scale,
            width: (x2 - currentX) * scale,
            height: (y2 - currentY) * scale,
            strokeColor: '#000000',
            strokeWidth: 1,
            page: currentPage,
          });
          currentX = x2;
          currentY = y2;
        }
      }

      console.log(`[Visual Extract] Found ${images.length} images, ${shapes.length} shapes`);
      onImagesExtracted(images);
      onShapesExtracted(shapes);
    } catch (error) {
      console.error('Error extracting visuals from PDF:', error);
      onImagesExtracted([]);
      onShapesExtracted([]);
    } finally {
      setIsExtracting(false);
    }
  };

  return null;
};
