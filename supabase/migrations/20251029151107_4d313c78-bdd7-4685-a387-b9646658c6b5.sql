
-- Add DELETE policy for profiles table
-- Admins need to be able to remove user profiles

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
