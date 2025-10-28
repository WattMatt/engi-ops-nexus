import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a PDF file to Supabase Storage
 */
export async function uploadPdfFile(
  userId: string,
  file: File
): Promise<{ path: string; url: string }> {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const filePath = `${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from("floor-plans")
    .upload(filePath, file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("floor-plans")
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
  };
}

/**
 * Get a signed URL for a PDF file
 */
export async function getPdfUrl(path: string): Promise<string> {
  const { data } = supabase.storage.from("floor-plans").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a PDF file from storage
 */
export async function deletePdfFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from("floor-plans").remove([path]);

  if (error) {
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}
