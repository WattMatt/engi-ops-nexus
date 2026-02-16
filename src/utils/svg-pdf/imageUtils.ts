/**
 * Image utility for SVG-to-PDF engine
 * Centralized image-to-base64 conversion
 */

/**
 * Convert image URL to base64 data URL
 */
export const imageToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('Image blob is empty');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result || result.length < 50) {
          reject(new Error('Invalid image data'));
        } else {
          resolve(result);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    // Return a 1x1 transparent pixel to prevent PDF crash if image fails
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
};
