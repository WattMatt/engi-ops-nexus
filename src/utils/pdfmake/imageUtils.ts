/**
 * PDFMake Image Utilities
 * Advanced image processing and optimization for PDF generation
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import html2canvas from 'html2canvas';

// ============================================================================
// Types
// ============================================================================

export interface ImageOptions {
  width?: number;
  height?: number;
  fit?: [number, number];
  alignment?: 'left' | 'center' | 'right';
  margin?: Margins;
  opacity?: number;
  link?: string;
}

export interface ImageCaptureOptions {
  scale?: number;
  format?: 'PNG' | 'JPEG';
  quality?: number;
  backgroundColor?: string;
  timeout?: number;
}

export interface ProcessedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: 'PNG' | 'JPEG';
  sizeBytes: number;
}

export interface ImageGridOptions {
  columns: number;
  gap?: number;
  itemWidth?: number;
  showCaptions?: boolean;
}

// ============================================================================
// Image Loading & Conversion
// ============================================================================

/**
 * Load an image from URL and convert to base64 data URL
 */
export const loadImageAsBase64 = async (
  url: string,
  options: { timeout?: number; format?: 'PNG' | 'JPEG'; quality?: number } = {}
): Promise<string> => {
  const { timeout = 10000, format = 'JPEG', quality = 0.85 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`Image load timeout: ${url}`));
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const dataUrl = format === 'JPEG'
          ? canvas.toDataURL('image/jpeg', quality)
          : canvas.toDataURL('image/png');
        
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
};

/**
 * Convert a File/Blob to base64 data URL
 */
export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
};

/**
 * Process and optimize an image for PDF inclusion
 */
export const processImage = async (
  source: string | File | Blob | HTMLCanvasElement,
  options: ImageCaptureOptions = {}
): Promise<ProcessedImage> => {
  const { format = 'JPEG', quality = 0.85 } = options;
  
  let canvas: HTMLCanvasElement;
  
  if (source instanceof HTMLCanvasElement) {
    canvas = source;
  } else if (source instanceof File || source instanceof Blob) {
    const dataUrl = await fileToBase64(source);
    const img = await loadImageElement(dataUrl);
    canvas = imageToCanvas(img);
  } else if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      const img = await loadImageElement(source);
      canvas = imageToCanvas(img);
    } else {
      const dataUrl = await loadImageAsBase64(source, options);
      const img = await loadImageElement(dataUrl);
      canvas = imageToCanvas(img);
    }
  } else {
    throw new Error('Invalid image source');
  }

  const dataUrl = format === 'JPEG'
    ? canvas.toDataURL('image/jpeg', quality)
    : canvas.toDataURL('image/png');

  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    format,
    sizeBytes: Math.round(dataUrl.length * 0.75), // Approximate base64 to bytes
  };
};

/**
 * Load an image element from data URL
 */
const loadImageElement = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image element'));
    img.src = dataUrl;
  });
};

/**
 * Convert an image element to canvas
 */
const imageToCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0);
  }
  
  return canvas;
};

// ============================================================================
// DOM Element Capture
// ============================================================================

/**
 * Capture any DOM element as an image for PDF
 */
export const captureElement = async (
  element: HTMLElement,
  options: ImageCaptureOptions = {}
): Promise<ProcessedImage> => {
  const {
    scale = 2,
    format = 'JPEG',
    quality = 0.85,
    backgroundColor = '#ffffff',
    timeout = 15000,
  } = options;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor,
    logging: false,
    imageTimeout: timeout,
    removeContainer: true,
  });

  const dataUrl = format === 'JPEG'
    ? canvas.toDataURL('image/jpeg', quality)
    : canvas.toDataURL('image/png');

  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    format,
    sizeBytes: Math.round(dataUrl.length * 0.75),
  };
};

/**
 * Capture element by ID
 */
export const captureElementById = async (
  elementId: string,
  options: ImageCaptureOptions = {}
): Promise<ProcessedImage | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element not found: ${elementId}`);
    return null;
  }
  return captureElement(element, options);
};

/**
 * Capture multiple elements in parallel
 */
export const captureMultipleElements = async (
  elementIds: string[],
  options: ImageCaptureOptions = {}
): Promise<Map<string, ProcessedImage>> => {
  const results = new Map<string, ProcessedImage>();
  
  const promises = elementIds.map(async (id) => {
    const image = await captureElementById(id, options);
    if (image) {
      results.set(id, image);
    }
  });

  await Promise.all(promises);
  return results;
};

// ============================================================================
// pdfmake Content Builders
// ============================================================================

/**
 * Create a pdfmake image content object
 */
export const createImageContent = (
  dataUrl: string,
  options: ImageOptions = {}
): Content => {
  const { width, height, fit, alignment = 'center', margin, opacity, link } = options;

  const content: Record<string, any> = {
    image: dataUrl,
    alignment,
  };

  if (width) content.width = width;
  if (height) content.height = height;
  if (fit) content.fit = fit;
  if (margin) content.margin = margin;
  if (opacity !== undefined) content.opacity = opacity;
  if (link) content.link = link;

  return content as Content;
};

/**
 * Create a captioned image (image with text below)
 */
export const createCaptionedImage = (
  dataUrl: string,
  caption: string,
  options: ImageOptions & { captionStyle?: Record<string, any> } = {}
): Content => {
  const { captionStyle, ...imageOptions } = options;

  return {
    stack: [
      createImageContent(dataUrl, imageOptions),
      {
        text: caption,
        fontSize: 8,
        italics: true,
        color: '#666666',
        alignment: options.alignment || 'center',
        margin: [0, 4, 0, 0] as Margins,
        ...captionStyle,
      },
    ],
    margin: options.margin,
  };
};

/**
 * Create an image grid layout
 */
export const createImageGrid = (
  images: Array<{ dataUrl: string; caption?: string }>,
  options: ImageGridOptions = { columns: 2 }
): Content => {
  const { columns, gap = 10, itemWidth, showCaptions = true } = options;
  
  // Calculate item width based on columns if not specified
  const calcWidth = itemWidth || Math.floor((515 - (gap * (columns - 1))) / columns);
  
  const rows: Content[][] = [];
  let currentRow: Content[] = [];

  images.forEach((img, index) => {
    const imageContent = showCaptions && img.caption
      ? createCaptionedImage(img.dataUrl, img.caption, { width: calcWidth })
      : createImageContent(img.dataUrl, { width: calcWidth });

    currentRow.push(imageContent);

    if (currentRow.length === columns || index === images.length - 1) {
      // Pad the row if needed
      while (currentRow.length < columns) {
        currentRow.push({ text: '' });
      }
      rows.push([...currentRow]);
      currentRow = [];
    }
  });

  return {
    table: {
      widths: Array(columns).fill('*'),
      body: rows,
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => gap / 2,
      paddingRight: () => gap / 2,
      paddingTop: () => gap / 2,
      paddingBottom: () => gap / 2,
    },
  };
};

/**
 * Create a full-width banner image
 */
export const createBannerImage = (
  dataUrl: string,
  options: { height?: number; overlay?: { text: string; style?: Record<string, any> } } = {}
): Content => {
  const { height = 150, overlay } = options;

  if (overlay) {
    return {
      stack: [
        {
          image: dataUrl,
          width: 515, // Full page width minus margins
          height,
        },
        {
          absolutePosition: { x: 40, y: -height / 2 },
          text: overlay.text,
          fontSize: 24,
          bold: true,
          color: '#ffffff',
          ...overlay.style,
        },
      ],
    };
  }

  return {
    image: dataUrl,
    width: 515,
    height,
  };
};

// ============================================================================
// Image Optimization
// ============================================================================

/**
 * Resize an image to maximum dimensions while maintaining aspect ratio
 */
export const resizeImage = async (
  dataUrl: string,
  maxWidth: number,
  maxHeight: number,
  options: { format?: 'PNG' | 'JPEG'; quality?: number } = {}
): Promise<string> => {
  const { format = 'JPEG', quality = 0.85 } = options;
  
  const img = await loadImageElement(dataUrl);
  
  let { width, height } = img;
  
  // Calculate new dimensions
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.drawImage(img, 0, 0, width, height);
  
  return format === 'JPEG'
    ? canvas.toDataURL('image/jpeg', quality)
    : canvas.toDataURL('image/png');
};

/**
 * Compress an image to target size (in bytes)
 */
export const compressImageToSize = async (
  dataUrl: string,
  targetSizeBytes: number,
  options: { minQuality?: number; maxIterations?: number } = {}
): Promise<string> => {
  const { minQuality = 0.3, maxIterations = 10 } = options;
  
  let quality = 0.9;
  let result = dataUrl;
  let iterations = 0;
  
  while (result.length * 0.75 > targetSizeBytes && quality > minQuality && iterations < maxIterations) {
    const img = await loadImageElement(result);
    const canvas = imageToCanvas(img);
    result = canvas.toDataURL('image/jpeg', quality);
    quality -= 0.1;
    iterations++;
  }
  
  return result;
};

/**
 * Get image dimensions from data URL
 */
export const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
};

// ============================================================================
// Chart-Specific Utilities
// ============================================================================

/**
 * Capture a Recharts chart element with optimized settings
 */
export const captureRechartsChart = async (
  elementId: string,
  options: { title?: string; format?: 'PNG' | 'JPEG' } = {}
): Promise<{ image: ProcessedImage; title?: string } | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Chart element not found: ${elementId}`);
    return null;
  }

  // Wait for any animations
  await new Promise(resolve => setTimeout(resolve, 500));

  const image = await captureElement(element, {
    scale: 2,
    format: options.format || 'PNG',
    quality: 0.95,
    backgroundColor: '#ffffff',
  });

  return {
    image,
    title: options.title,
  };
};

/**
 * Build chart content for pdfmake with title and optional description
 */
export const buildChartContent = (
  processedImage: ProcessedImage,
  options: {
    title?: string;
    description?: string;
    width?: number;
    alignment?: 'left' | 'center' | 'right';
  } = {}
): Content[] => {
  const { title, description, width = 450, alignment = 'center' } = options;
  
  const content: Content[] = [];

  if (title) {
    content.push({
      text: title,
      fontSize: 12,
      bold: true,
      color: '#1e3a8a',
      margin: [0, 10, 0, 5] as Margins,
    });
  }

  if (description) {
    content.push({
      text: description,
      fontSize: 9,
      color: '#666666',
      margin: [0, 0, 0, 8] as Margins,
    });
  }

  content.push({
    image: processedImage.dataUrl,
    width,
    alignment,
    margin: [0, 0, 0, 15] as Margins,
  });

  return content;
};
