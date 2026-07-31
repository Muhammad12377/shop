-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload to products bucket" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Admins can update objects in products bucket" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Admins can delete from products bucket" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Everyone can view objects in products bucket" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'products');
