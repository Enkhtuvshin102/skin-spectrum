
-- Trade requests: peer-to-peer buy/sell coordination (no bots, no custody)
CREATE TYPE public.trade_status AS ENUM ('pending', 'confirmed', 'completed', 'declined', 'cancelled');

CREATE TABLE public.trade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_steam_id text NOT NULL,
  seller_steam_id text NOT NULL,
  price_cents integer NOT NULL,
  status public.trade_status NOT NULL DEFAULT 'pending',
  buyer_message text,
  seller_trade_url text,
  buyer_trade_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX idx_trade_requests_listing ON public.trade_requests(listing_id);
CREATE INDEX idx_trade_requests_buyer ON public.trade_requests(buyer_steam_id, created_at DESC);
CREATE INDEX idx_trade_requests_seller ON public.trade_requests(seller_steam_id, created_at DESC);
CREATE UNIQUE INDEX uniq_active_trade_per_buyer_listing
  ON public.trade_requests(listing_id, buyer_steam_id)
  WHERE status IN ('pending', 'confirmed');

-- Server-only writes via supabaseAdmin; reads filtered server-side via session.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_requests TO authenticated;
GRANT ALL ON public.trade_requests TO service_role;

ALTER TABLE public.trade_requests ENABLE ROW LEVEL SECURITY;

-- Block direct public/anon reads — all access goes through server fns.
CREATE POLICY "no_direct_read_trade_requests"
  ON public.trade_requests
  FOR SELECT
  TO public
  USING (false);

CREATE TRIGGER trade_requests_touch
BEFORE UPDATE ON public.trade_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime for trade status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_requests;
