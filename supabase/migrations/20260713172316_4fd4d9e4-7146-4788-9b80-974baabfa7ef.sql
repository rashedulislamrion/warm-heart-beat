
DROP POLICY IF EXISTS "Review photos are viewable by authenticated" ON storage.objects;
CREATE POLICY "Review photos are viewable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'review-photos');

DROP POLICY IF EXISTS "Users upload own review photos" ON storage.objects;
CREATE POLICY "Users upload own review photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'review-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update own review photos" ON storage.objects;
CREATE POLICY "Users update own review photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own review photos" ON storage.objects;
CREATE POLICY "Users delete own review photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
