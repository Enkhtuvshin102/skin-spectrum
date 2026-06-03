DROP POLICY IF EXISTS "Public read seller profiles" ON public.seller_profiles;

CREATE POLICY "No direct public read of seller_profiles"
  ON public.seller_profiles FOR SELECT
  USING (false);

CREATE OR REPLACE VIEW public.seller_profiles_public
WITH (security_invoker = on) AS
SELECT steam_id, persona_name, avatar, profile_url, created_at, updated_at
FROM public.seller_profiles;

GRANT SELECT ON public.seller_profiles_public TO anon, authenticated;
