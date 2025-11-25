import html2canvas from 'html2canvas';

/**
 * Converts a DOM element to a base64 image
 */
export const captureComponentAsImage = async (
  elementId: string,
  options?: {
    scale?: number;
    backgroundColor?: string;
  }
): Promise<string> => {
  const element = document.getElementById(elementId);
  
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    scale: options?.scale || 2,
    backgroundColor: options?.backgroundColor || '#ffffff',
    logging: false,
    useCORS: true,
  });

  return canvas.toDataURL('image/png');
};

/**
 * Converts multiple components to images
 */
export const captureMultipleComponents = async (
  elementIds: string[],
  options?: {
    scale?: number;
    backgroundColor?: string;
  }
): Promise<Record<string, string>> => {
  const images: Record<string, string> = {};
  
  for (const id of elementIds) {
    try {
      images[id] = await captureComponentAsImage(id, options);
    } catch (error) {
      console.error(`Failed to capture component ${id}:`, error);
    }
  }
  
  return images;
};

/**
 * Export data to CSV format
 */
export const exportToCSV = (
  data: any[],
  filename: string,
  headers?: string[]
) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const csvHeaders = headers || Object.keys(data[0]);
  const csvRows = data.map(row => 
    csvHeaders.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );

  const csvContent = [
    csvHeaders.join(','),
    ...csvRows
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
