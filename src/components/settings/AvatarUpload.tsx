import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userName: string;
  onUploadComplete?: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  userName,
  onUploadComplete,
  size = "lg",
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      setUploading(true);

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split("/").slice(-2).join("/");
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      // Upload new avatar
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Profile picture updated successfully");
      onUploadComplete?.(publicUrl);
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    try {
      setUploading(true);

      // Delete from storage
      const path = avatarUrl.split("/").slice(-2).join("/");
      const { error: deleteError } = await supabase.storage
        .from("avatars")
        .remove([path]);

      if (deleteError) throw deleteError;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(null);
      toast.success("Profile picture removed");
      onUploadComplete?.("");
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      toast.error(error.message || "Failed to remove image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-2xl">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        <Label
          htmlFor="avatar-upload"
          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-white" />
          )}
        </Label>
        
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
      </div>

      <div className="flex gap-2">
        <Label htmlFor="avatar-upload">
          <Button variant="outline" size="sm" disabled={uploading} asChild>
            <span>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </>
              )}
            </span>
          </Button>
        </Label>
        
        {avatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={uploading}
          >
            Remove
          </Button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        Recommended: Square image, at least 200x200px
        <br />
        Max size: 5MB
      </p>
    </div>
  );
}
