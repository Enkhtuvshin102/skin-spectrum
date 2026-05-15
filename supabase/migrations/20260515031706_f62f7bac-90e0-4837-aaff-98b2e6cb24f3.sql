
-- Enums
DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('active', 'unavailable', 'removed', 'sold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seller profiles (keyed by Steam ID, no Supabase auth users involved)
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  steam_id      text PRIMARY KEY,
  persona_name  text NOT NULL,
  avatar        text,
  profile_url   text,
  trade_url     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Listings
CREATE TABLE IF NOT EXISTS public.listings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          text NOT NULL,
  steam_id          text NOT NULL REFERENCES public.seller_profiles(steam_id) ON DELETE CASCADE,
  market_hash_name  text NOT NULL,
  name              text NOT NULL,
  weapon            text NOT NULL,
  skin_name         text NOT NULL,
  exterior          text,
  wear_code         text,
  float_value       numeric,
  rarity            text NOT NULL,
  rarity_color_hex  text,
  image             text NOT NULL,
  stickers          jsonb NOT NULL DEFAULT '[]'::jsonb,
  inspect_link      text,
  stat_trak         boolean NOT NULL DEFAULT false,
  souvenir          boolean NOT NULL DEFAULT false,
  price_cents       integer NOT NULL CHECK (price_cents >= 0),
  status            public.listing_status NOT NULL DEFAULT 'active',
  last_validated_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate active listings for the same asset
CREATE UNIQUE INDEX IF NOT EXISTS listings_active_asset_unique
  ON public.listings (steam_id, asset_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS listings_status_created_idx
  ON public.listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_market_hash_idx
  ON public.listings (market_hash_name);
CREATE INDEX IF NOT EXISTS listings_steam_id_idx
  ON public.listings (steam_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS seller_profiles_touch ON public.seller_profiles;
CREATE TRIGGER seller_profiles_touch BEFORE UPDATE ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS listings_touch ON public.listings;
CREATE TRIGGER listings_touch BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS: public read, no public writes (all writes go through server fns w/ service role)
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read seller profiles" ON public.seller_profiles;
CREATE POLICY "Public read seller profiles" ON public.seller_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read listings" ON public.listings;
CREATE POLICY "Public read listings" ON public.listings
  FOR SELECT USING (true);

-- Realtime
ALTER TABLE public.listings REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'listings';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.listings';
  END IF;
END $$;
