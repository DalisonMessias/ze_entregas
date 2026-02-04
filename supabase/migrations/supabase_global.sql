-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_store_access_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  admin_id uuid NOT NULL,
  store_id uuid NOT NULL,
  store_name_snapshot text,
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_store_access_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_store_access_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.user_profiles(id),
  CONSTRAINT admin_store_access_logs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_name character varying NOT NULL,
  name text,
  key_token text,
  encrypted_key text NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.api_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  api_key_id uuid,
  user_id uuid,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  ip_address text,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT api_logs_pkey PRIMARY KEY (id),
  CONSTRAINT api_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id),
  CONSTRAINT api_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.app_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info'::text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT app_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.approved_streets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  city text NOT NULL,
  state text,
  neighborhood text,
  latitude numeric,
  longitude numeric,
  request_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT approved_streets_pkey PRIMARY KEY (id),
  CONSTRAINT approved_streets_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.street_requests(id)
);
CREATE TABLE public.available_cities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  state character varying NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ibge_code text,
  CONSTRAINT available_cities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.avatars (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  file_path text NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT avatars_pkey PRIMARY KEY (id),
  CONSTRAINT avatars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.blacklisted_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  email character varying UNIQUE,
  phone_number character varying UNIQUE,
  reason text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::blacklist_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blacklisted_users_pkey PRIMARY KEY (id),
  CONSTRAINT blacklisted_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.blitz_alerts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  city character varying,
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blitz_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT blitz_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.blocking_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  monthly_cancellation_limit integer DEFAULT 10,
  monthly_refusal_limit integer DEFAULT 30,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blocking_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blocking_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blocking_history_pkey PRIMARY KEY (id),
  CONSTRAINT blocking_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.catalog_base_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  category text,
  observations text,
  valor_sugerido numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  brand text,
  CONSTRAINT catalog_base_products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  store_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.chat_contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid,
  name text,
  phone_number text,
  CONSTRAINT chat_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT chat_contacts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.chat_conversation_orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid,
  attendant_id uuid,
  conversation_id text,
  position integer DEFAULT 0,
  CONSTRAINT chat_conversation_orders_pkey PRIMARY KEY (id),
  CONSTRAINT chat_conversation_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT chat_conversation_orders_attendant_id_fkey FOREIGN KEY (attendant_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid,
  conversation_id text,
  status text DEFAULT 'open'::text,
  unread_count integer DEFAULT 0,
  last_message_content text,
  last_message_timestamp timestamp with time zone,
  contact_name text,
  profile_pic_url text,
  customer_type text DEFAULT 'visitor'::text,
  priority text DEFAULT 'normal'::text,
  attendant_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  locked_by_agent_id uuid,
  locked_at timestamp with time zone,
  phone_number text,
  is_blocked boolean DEFAULT false,
  CONSTRAINT chat_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT chat_conversations_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT chat_conversations_attendant_id_fkey FOREIGN KEY (attendant_id) REFERENCES public.user_profiles(id),
  CONSTRAINT chat_conversations_locked_by_agent_id_fkey FOREIGN KEY (locked_by_agent_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sender_id uuid,
  receiver_id uuid,
  message text NOT NULL,
  order_id uuid,
  type USER-DEFINED NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  chat_id uuid,
  sender_type character varying DEFAULT 'user'::character varying,
  store_id uuid,
  conversation_id text,
  message_id text UNIQUE,
  content text,
  from_me boolean DEFAULT false,
  status text DEFAULT 'sent'::text,
  message_type text DEFAULT 'chat'::text,
  message_timestamp timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  client_message_id text,
  sender_name text,
  is_edited boolean DEFAULT false,
  edited_at timestamp with time zone,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id),
  CONSTRAINT chat_messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.user_profiles(id),
  CONSTRAINT chat_messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT chat_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.order_chats(id),
  CONSTRAINT chat_messages_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.chat_poll_votes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id text NOT NULL,
  option_index integer NOT NULL,
  voter_id text NOT NULL,
  voter_name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_poll_votes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL UNIQUE,
  session_id text,
  session_data jsonb,
  status text DEFAULT 'DISCONNECTED'::text,
  qr_code text,
  last_full_sync_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.city_districts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  city_id uuid NOT NULL,
  name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_districts_pkey PRIMARY KEY (id),
  CONSTRAINT city_districts_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.available_cities(id)
);
CREATE TABLE public.city_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  city_name character varying NOT NULL,
  state character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::city_request_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_email text,
  CONSTRAINT city_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.city_store_banner_assets (
  id text NOT NULL DEFAULT '1'::text,
  template_link text,
  canva_link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banner_assets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.city_store_banner_request_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  sender_id uuid,
  sender_role text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banner_request_messages_pkey PRIMARY KEY (id),
  CONSTRAINT city_store_banner_request_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.city_store_banner_requests(id),
  CONSTRAINT city_store_banner_request_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.city_store_banner_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  city_slug text NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN'::text,
  banner_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banner_requests_pkey PRIMARY KEY (id),
  CONSTRAINT city_store_banner_requests_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.city_store_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  link text,
  is_active boolean DEFAULT true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.city_store_highlight_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  city_slug text NOT NULL,
  amount_paid numeric NOT NULL,
  duration_days integer NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_highlight_orders_pkey PRIMARY KEY (id),
  CONSTRAINT city_store_highlight_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.city_store_highlight_settings (
  id text NOT NULL DEFAULT '1'::text,
  highlight_price numeric NOT NULL DEFAULT 99.00,
  highlight_duration_days integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  cancel_fee numeric NOT NULL DEFAULT 0.00,
  CONSTRAINT city_store_highlight_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.client_error_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  category character varying NOT NULL,
  message text NOT NULL,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT client_error_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cofrinho_settings (
  id text NOT NULL DEFAULT '1'::text,
  yield_frequency USER-DEFINED NOT NULL,
  interest_type USER-DEFINED NOT NULL,
  rate_percent numeric NOT NULL,
  min_lock_days integer NOT NULL,
  allow_early_withdrawal boolean NOT NULL,
  penalty_percent numeric NOT NULL,
  min_deposit numeric NOT NULL,
  formula_script text,
  change_policy USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cofrinho_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.collaborators (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  password_hash text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying,
  email character varying,
  function character varying DEFAULT 'waiter'::character varying,
  CONSTRAINT collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT collaborators_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['FIXED'::text, 'PERCENTAGE'::text, 'FREE_SHIPPING'::text])),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  max_discount_value numeric,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  user_usage_limit integer,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_platform_coupon boolean DEFAULT false,
  created_by uuid,
  CONSTRAINT coupons_pkey PRIMARY KEY (id),
  CONSTRAINT coupons_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT coupons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.delivery_ratings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  delivery_man_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_ratings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT delivery_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT delivery_ratings_delivery_man_id_fkey FOREIGN KEY (delivery_man_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.driver_manual_histories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  summary_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  count integer DEFAULT 0,
  total_value numeric DEFAULT 0.00,
  total_km numeric DEFAULT 0.00,
  CONSTRAINT driver_manual_histories_pkey PRIMARY KEY (id),
  CONSTRAINT driver_manual_histories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.driver_wallet_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  driver_id uuid NOT NULL,
  amount numeric NOT NULL,
  description text,
  type USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'COMPLETED'::transaction_status,
  related_request_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT driver_wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT driver_wallet_transactions_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.user_profiles(id),
  CONSTRAINT driver_wallet_transactions_related_request_id_fkey FOREIGN KEY (related_request_id) REFERENCES public.partner_requests(id)
);
CREATE TABLE public.driver_wallets (
  driver_id uuid NOT NULL,
  balance_decimal numeric NOT NULL DEFAULT 0.00,
  savings_balance_decimal numeric NOT NULL DEFAULT 0.00,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT driver_wallets_pkey PRIMARY KEY (driver_id),
  CONSTRAINT driver_wallets_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.fraud_alerts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type USER-DEFINED NOT NULL,
  description text,
  severity USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'OPEN'::fraud_alert_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fraud_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT fraud_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.identity_verifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  location_data jsonb,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::document_status,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT identity_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT identity_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.institutional_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  CONSTRAINT institutional_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.institutional_content_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  content_id uuid NOT NULL,
  storage_path text NOT NULL,
  alt_text character varying,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT institutional_content_images_pkey PRIMARY KEY (id),
  CONSTRAINT institutional_content_images_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.institutional_contents(id)
);
CREATE TABLE public.institutional_content_tags (
  content_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT institutional_content_tags_pkey PRIMARY KEY (content_id, tag_id),
  CONSTRAINT institutional_content_tags_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.institutional_contents(id),
  CONSTRAINT institutional_content_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.institutional_tags(id)
);
CREATE TABLE public.institutional_content_versions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  content_id uuid NOT NULL,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT institutional_content_versions_pkey PRIMARY KEY (id),
  CONSTRAINT institutional_content_versions_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.institutional_contents(id),
  CONSTRAINT institutional_content_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.institutional_contents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  page_key USER-DEFINED NOT NULL,
  title character varying NOT NULL,
  description text,
  slug character varying NOT NULL UNIQUE,
  status USER-DEFINED NOT NULL DEFAULT 'draft'::content_status,
  is_active boolean DEFAULT true,
  category_id uuid,
  author_id uuid,
  metadata jsonb,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT institutional_contents_pkey PRIMARY KEY (id),
  CONSTRAINT institutional_contents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.institutional_categories(id),
  CONSTRAINT institutional_contents_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.institutional_tags (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT institutional_tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.insurance_partners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_partners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.insurance_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  price_mensal numeric NOT NULL,
  features ARRAY DEFAULT '{}'::text[],
  is_popular boolean DEFAULT false,
  is_active boolean DEFAULT true,
  deductible_percent numeric DEFAULT 0,
  deductible_info text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.insurance_referral_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  city text NOT NULL,
  recommended_company text NOT NULL,
  status text DEFAULT 'PENDING'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_referral_requests_pkey PRIMARY KEY (id),
  CONSTRAINT insurance_referral_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.insurance_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text DEFAULT 'ACTIVE'::text,
  start_date timestamp with time zone,
  next_billing_date timestamp with time zone,
  auto_renew boolean DEFAULT true,
  payment_method_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT insurance_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT insurance_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.insurance_plans(id)
);
CREATE TABLE public.loan_audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  loan_id uuid,
  action character varying NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  performed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT loan_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT loan_audit_logs_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.partner_loans(id),
  CONSTRAINT loan_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.loan_installments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  loan_id uuid NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  status character varying DEFAULT 'PENDING'::character varying,
  paid_amount numeric DEFAULT 0,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT loan_installments_pkey PRIMARY KEY (id),
  CONSTRAINT loan_installments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.partner_loans(id)
);
CREATE TABLE public.loan_level_limits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  partner_level character varying NOT NULL,
  max_limit numeric NOT NULL DEFAULT 0,
  allow_negative_balance boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_type character varying NOT NULL DEFAULT 'DELIVERY'::character varying,
  max_installments integer NOT NULL DEFAULT 12,
  CONSTRAINT loan_level_limits_pkey PRIMARY KEY (id)
);
CREATE TABLE public.loan_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  interest_rate_monthly numeric NOT NULL DEFAULT 0,
  max_installments integer NOT NULL DEFAULT 1,
  max_amount numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  target_audience character varying DEFAULT 'BOTH'::character varying,
  CONSTRAINT loan_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.maintenance_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_enabled boolean NOT NULL DEFAULT false,
  title character varying NOT NULL DEFAULT 'Manutenção Programada'::character varying,
  message text NOT NULL DEFAULT 'Estamos realizando melhorias em nosso sistema. Voltaremos em breve!'::text,
  scheduled_downtime timestamp with time zone,
  estimated_recovery_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.marketing_designs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  template_id uuid,
  name text NOT NULL DEFAULT 'Sem título'::text,
  config jsonb NOT NULL,
  last_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT marketing_designs_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_designs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT marketing_designs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.marketing_templates(id)
);
CREATE TABLE public.marketing_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text NOT NULL,
  format text NOT NULL,
  config jsonb NOT NULL,
  thumbnail_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT marketing_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mediation_actions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  action_type text NOT NULL,
  description text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mediation_actions_pkey PRIMARY KEY (id),
  CONSTRAINT mediation_actions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.mediation_sessions(id)
);
CREATE TABLE public.mediation_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE'::text,
  current_step text DEFAULT 'INIT'::text,
  ai_memory jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mediation_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT mediation_sessions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.neighborhoods (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  city_id uuid NOT NULL,
  name character varying NOT NULL,
  api_external_id integer,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT neighborhoods_pkey PRIMARY KEY (id),
  CONSTRAINT neighborhoods_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.available_cities(id)
);
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  categories jsonb DEFAULT '["orders", "system", "promotions"]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.order_chats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL UNIQUE,
  user_id uuid,
  store_id uuid NOT NULL,
  status character varying DEFAULT 'active'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_chats_pkey PRIMARY KEY (id),
  CONSTRAINT order_chats_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT order_chats_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.order_reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  type character varying NOT NULL,
  description text,
  status character varying DEFAULT 'open'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_reports_pkey PRIMARY KEY (id),
  CONSTRAINT order_reports_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT order_reports_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  user_id uuid,
  status USER-DEFINED NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_price numeric NOT NULL,
  payment_method USER-DEFINED NOT NULL,
  shipping_address jsonb,
  payment_details jsonb,
  shipping_cost numeric,
  discount numeric DEFAULT 0,
  coupon_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  customer_name text,
  customer_phone text,
  observation text,
  origin text DEFAULT 'APP'::text,
  amount_paid numeric,
  change_amount numeric,
  custom_payment_label text,
  infinitepay_id text,
  infinitepay_url text,
  infinitepay_status text,
  infinitepay_metadata jsonb DEFAULT '{}'::jsonb,
  order_type text DEFAULT 'LOCAL'::text,
  collaborator_name text,
  delivery_mode text,
  driver_id uuid,
  coupon_id uuid,
  discount_value numeric DEFAULT 0,
  platform_subsidy_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'pending'::text,
  delivery_location_reference text,
  pickup_code text,
  delivery_code text,
  return_code text,
  is_mediation_active boolean DEFAULT false,
  is_location_delivery boolean DEFAULT false,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.user_profiles(id),
  CONSTRAINT orders_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id)
);
CREATE TABLE public.orders_collaborators (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  collaborator_id uuid,
  table_identifier character varying,
  status character varying DEFAULT 'opened'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  customer_name character varying,
  total_amount numeric DEFAULT 0,
  collaborator_name text,
  payment_status text DEFAULT 'pending'::text,
  CONSTRAINT orders_collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT orders_collaborators_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT orders_collaborators_collaborator_id_fkey FOREIGN KEY (collaborator_id) REFERENCES public.collaborators(id)
);
CREATE TABLE public.orders_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  product_id uuid,
  additional jsonb DEFAULT '[]'::jsonb,
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  observation text,
  CONSTRAINT orders_items_pkey PRIMARY KEY (id),
  CONSTRAINT orders_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders_collaborators(id),
  CONSTRAINT orders_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.orders_tickets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  order_id uuid,
  collaborator_order_id uuid,
  display_id integer NOT NULL DEFAULT nextval('orders_tickets_display_id_seq'::regclass),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  general_order_id uuid,
  payment_status text DEFAULT 'pending'::text,
  CONSTRAINT orders_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT orders_tickets_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT orders_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT orders_tickets_collaborator_order_id_fkey FOREIGN KEY (collaborator_order_id) REFERENCES public.orders_collaborators(id),
  CONSTRAINT orders_tickets_general_order_id_fkey FOREIGN KEY (general_order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.partner_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  document_type USER-DEFINED NOT NULL,
  file_url text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::document_status,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partner_documents_pkey PRIMARY KEY (id),
  CONSTRAINT partner_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.partner_fee_settings (
  id text NOT NULL DEFAULT '1'::text,
  global_tax_fixed numeric,
  global_tax_percent numeric,
  base_delivery_value numeric,
  base_delivery_km numeric,
  extra_km_value numeric,
  additional_stop_fee numeric,
  weekday integer,
  hour character varying,
  emergency_percentage numeric,
  emergency_cooldown_hours integer,
  emergency_enabled boolean DEFAULT false,
  super_store_monthly_fee numeric,
  association_fee numeric,
  emergency_message text,
  pos_min_value numeric,
  pos_max_value numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partner_fee_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.partner_levels (
  id text NOT NULL,
  display_name character varying NOT NULL,
  min_deliveries integer NOT NULL DEFAULT 0,
  min_rating numeric NOT NULL DEFAULT 0.0,
  store_discount_percent numeric NOT NULL DEFAULT 0.0,
  service_fee_reduction_percent numeric NOT NULL DEFAULT 0.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  delivery_price_extra_percent numeric DEFAULT 0.0,
  CONSTRAINT partner_levels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.partner_loans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  loan_type_id uuid,
  amount_requested numeric NOT NULL,
  amount_total numeric NOT NULL,
  installments_count integer NOT NULL,
  interest_rate_applied numeric NOT NULL,
  status character varying DEFAULT 'PENDING'::character varying,
  approved_at timestamp with time zone,
  approved_by uuid,
  rejected_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  disbursement_method character varying DEFAULT 'WALLET'::character varying,
  CONSTRAINT partner_loans_pkey PRIMARY KEY (id),
  CONSTRAINT partner_loans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT partner_loans_loan_type_id_fkey FOREIGN KEY (loan_type_id) REFERENCES public.loan_types(id),
  CONSTRAINT partner_loans_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.partner_payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  partner_id uuid NOT NULL,
  amount numeric NOT NULL,
  status USER-DEFINED NOT NULL,
  transaction_details jsonb,
  external_transaction_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partner_payments_pkey PRIMARY KEY (id),
  CONSTRAINT partner_payments_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.partner_ratings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  evaluator_id uuid,
  evaluated_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  direction text NOT NULL CHECK (direction = ANY (ARRAY['STORE_TO_PARTNER'::text, 'PARTNER_TO_STORE'::text, 'CUSTOMER_TO_STORE'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  customer_name text,
  CONSTRAINT partner_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT partner_ratings_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.user_profiles(id),
  CONSTRAINT partner_ratings_evaluated_id_fkey FOREIGN KEY (evaluated_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.partner_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  partner_id uuid,
  pickup_address text NOT NULL,
  delivery_address text NOT NULL,
  distance_km numeric NOT NULL,
  total_charged_store numeric NOT NULL,
  net_value_partner numeric NOT NULL,
  status USER-DEFINED NOT NULL,
  failure_reason text,
  delivery_code text,
  expires_at timestamp with time zone,
  fee_fixed numeric,
  fee_percent_value numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partner_requests_pkey PRIMARY KEY (id),
  CONSTRAINT partner_requests_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT partner_requests_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.payment_gateway_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  gateway_name text NOT NULL,
  operation_type text CHECK (operation_type = ANY (ARRAY['charge'::text, 'refund'::text, 'check_status'::text])),
  success boolean DEFAULT false,
  request_data jsonb DEFAULT '{}'::jsonb,
  response_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_gateway_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payment_gateway_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  gateway_name text NOT NULL UNIQUE CHECK (gateway_name = ANY (ARRAY['infinitepay'::text, 'mercadopago'::text, 'pix'::text])),
  is_active boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  credentials jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  fees jsonb DEFAULT '{"pix": 0, "credit_card": 0, "credit_card_installments": 0}'::jsonb,
  CONSTRAINT payment_gateway_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payout_settings (
  id text NOT NULL DEFAULT '1'::text,
  min_payout_amount numeric DEFAULT 0.00,
  automatic_payouts_enabled boolean DEFAULT false,
  payout_day_of_week USER-DEFINED,
  payout_time character varying,
  default_payout_method_type USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payout_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.platform_news (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text NOT NULL,
  icon_name character varying,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT platform_news_pkey PRIMARY KEY (id)
);
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  value text,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT platform_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.printer_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL UNIQUE,
  printer_width integer DEFAULT 80,
  paper_type text DEFAULT 'thermal'::text,
  margin_top integer DEFAULT 0,
  margin_bottom integer DEFAULT 0,
  margin_left integer DEFAULT 2,
  margin_right integer DEFAULT 2,
  font_size_base integer DEFAULT 12,
  auto_cut boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT printer_settings_pkey PRIMARY KEY (id),
  CONSTRAINT printer_settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.product_images_gallery (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_name text NOT NULL,
  category text NOT NULL,
  image_url text NOT NULL,
  subtitle text DEFAULT 'Imagem meramente ilustrativa'::text,
  is_ai_generated boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_images_gallery_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL,
  category_id uuid,
  store_id uuid,
  images ARRAY DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  stock_quantity integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  internal_code character varying,
  variations jsonb DEFAULT '[]'::jsonb,
  options jsonb DEFAULT '[]'::jsonb,
  availability jsonb DEFAULT '{}'::jsonb,
  observations text,
  origin_prefix character varying,
  category character varying,
  image_url text,
  base_product_id uuid,
  brand text,
  addon_group_id uuid,
  addon_options jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT products_base_product_id_fkey FOREIGN KEY (base_product_id) REFERENCES public.catalog_base_products(id),
  CONSTRAINT products_addon_group_id_fkey FOREIGN KEY (addon_group_id) REFERENCES public.store_addon_groups(id)
);
CREATE TABLE public.promotion_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotion_products_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id),
  CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.store_products(id)
);
CREATE TABLE public.promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['FIXED'::text, 'PERCENTAGE'::text, 'FREE_SHIPPING'::text])),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  applies_to_all_products boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotions_pkey PRIMARY KEY (id),
  CONSTRAINT promotions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.pwa_settings (
  id text NOT NULL DEFAULT '1'::text,
  display_name character varying,
  short_name character varying,
  description text,
  theme_color character varying,
  background_color character varying,
  start_url character varying,
  orientation character varying,
  language character varying,
  app_version integer,
  scope character varying DEFAULT '/'::character varying,
  icons jsonb DEFAULT '[]'::jsonb,
  screenshots jsonb DEFAULT '[]'::jsonb,
  shortcuts jsonb DEFAULT '[]'::jsonb,
  categories ARRAY DEFAULT ARRAY[]::text[],
  iarc_rating_id character varying,
  related_applications jsonb DEFAULT '[]'::jsonb,
  prefer_related_applications boolean DEFAULT false,
  custom_splash_screens jsonb DEFAULT '[]'::jsonb,
  status_bar_color character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  display character varying DEFAULT 'standalone'::character varying,
  CONSTRAINT pwa_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.qrcode_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  content text NOT NULL,
  scanned_at timestamp with time zone NOT NULL DEFAULT now(),
  status character varying DEFAULT 'SUCCESS'::character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qrcode_logs_pkey PRIMARY KEY (id),
  CONSTRAINT qrcode_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  code_used text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::referral_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.user_profiles(id),
  CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.sales_simulations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  sale_value numeric NOT NULL,
  fee_payer text NOT NULL,
  gross_value numeric NOT NULL,
  net_value numeric NOT NULL,
  fees numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sales_simulations_pkey PRIMARY KEY (id),
  CONSTRAINT sales_simulations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.saved_routes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  waypoints ARRAY NOT NULL DEFAULT ARRAY[]::text[],
  distance numeric,
  duration numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT saved_routes_pkey PRIMARY KEY (id),
  CONSTRAINT saved_routes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.score_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_key text NOT NULL UNIQUE,
  label text NOT NULL,
  impact_value integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT score_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.score_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  event_key text,
  reason text,
  impact integer,
  previous_score integer,
  new_score integer NOT NULL,
  order_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  admin_id uuid,
  diff integer NOT NULL DEFAULT 0,
  old_score integer NOT NULL DEFAULT 0,
  CONSTRAINT score_history_pkey PRIMARY KEY (id),
  CONSTRAINT score_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT score_history_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.shop_platform_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shop_platform_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shop_platform_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL,
  category_id uuid,
  images ARRAY DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  stock_quantity integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shop_platform_products_pkey PRIMARY KEY (id),
  CONSTRAINT shop_platform_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.shop_platform_categories(id)
);
CREATE TABLE public.shop_settings (
  id text NOT NULL DEFAULT '1'::text,
  is_shop_enabled boolean DEFAULT false,
  shop_name character varying,
  shop_city character varying,
  banner_title character varying,
  banner_subtitle character varying,
  banner_tag character varying,
  shipping_origin_cep character varying,
  free_shipping_threshold numeric,
  payment_methods jsonb DEFAULT '{"pix": false, "boleto": false, "credit_card": false}'::jsonb,
  coupons ARRAY DEFAULT ARRAY[]::jsonb[],
  social_media jsonb,
  company_info jsonb,
  support_phone character varying,
  support_hours_start character varying,
  support_hours_end character varying,
  support_status_override USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  infinitepay_handle text,
  infinitepay_webhook_secret text,
  google_gemini_api_key text,
  open_route_service_api_key text,
  main_store_id uuid,
  CONSTRAINT shop_settings_pkey PRIMARY KEY (id),
  CONSTRAINT shop_settings_main_store_id_fkey FOREIGN KEY (main_store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.slides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  link text,
  display_days integer DEFAULT 7,
  target_audience text NOT NULL CHECK (target_audience = ANY (ARRAY['drivers'::text, 'merchants'::text, 'both'::text, 'public'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone,
  CONSTRAINT slides_pkey PRIMARY KEY (id)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.store_addon_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['SINGLE'::text, 'MULTIPLE'::text])),
  min integer NOT NULL DEFAULT 0,
  max integer NOT NULL DEFAULT 1,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_addon_groups_pkey PRIMARY KEY (id),
  CONSTRAINT store_addon_groups_store_id_fkey FOREIGN KEY (store_id) REFERENCES auth.users(id)
);
CREATE TABLE public.store_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_addons_pkey PRIMARY KEY (id),
  CONSTRAINT store_addons_store_id_fkey FOREIGN KEY (store_id) REFERENCES auth.users(id)
);
CREATE TABLE public.store_collaborators (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  username character varying NOT NULL,
  password_hash text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT store_collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT store_collaborators_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_coupons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  code text NOT NULL,
  description text,
  discount_type text DEFAULT 'PERCENTAGE'::text,
  discount_value numeric DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  max_discount_value numeric,
  usage_limit integer,
  user_usage_limit integer DEFAULT 1,
  usage_count integer DEFAULT 0,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT store_coupons_pkey PRIMARY KEY (id),
  CONSTRAINT store_coupons_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_daily_reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  report_date timestamp with time zone NOT NULL DEFAULT now(),
  total_orders integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  total_delivery_fees numeric DEFAULT 0,
  orders_summary jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_daily_reports_pkey PRIMARY KEY (id),
  CONSTRAINT store_daily_reports_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_delivery_partners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  fee numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_delivery_partners_pkey PRIMARY KEY (id),
  CONSTRAINT store_delivery_partners_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT store_delivery_partners_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_delivery_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL UNIQUE,
  delivery_mode text NOT NULL DEFAULT 'FIXED'::text,
  fixed_fee numeric DEFAULT 0.00,
  allow_outside_city boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  delivery_time_min integer DEFAULT 30,
  delivery_time_max integer DEFAULT 60,
  is_pickup_enabled boolean DEFAULT true,
  is_own_delivery_enabled boolean DEFAULT false,
  own_delivery_mode text DEFAULT 'FIXED'::text,
  radius_km numeric DEFAULT 0,
  is_partner_delivery_enabled boolean DEFAULT false,
  CONSTRAINT store_delivery_settings_pkey PRIMARY KEY (id),
  CONSTRAINT store_delivery_settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_neighborhood_fees (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  neighborhood_name text NOT NULL,
  fee numeric NOT NULL DEFAULT 0.00,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_neighborhood_fees_pkey PRIMARY KEY (id),
  CONSTRAINT store_neighborhood_fees_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_partners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT store_partners_pkey PRIMARY KEY (id),
  CONSTRAINT store_partners_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT store_partners_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  internal_code character varying,
  variations jsonb DEFAULT '[]'::jsonb,
  options jsonb DEFAULT '[]'::jsonb,
  availability jsonb DEFAULT '{}'::jsonb,
  observations text,
  origin_prefix character varying,
  category_id uuid,
  addon_options jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT store_products_pkey PRIMARY KEY (id),
  CONSTRAINT store_products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT store_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.store_promotions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  discount_type text DEFAULT 'PERCENTAGE'::text,
  discount_value numeric DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  applies_to_all_products boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT store_promotions_pkey PRIMARY KEY (id),
  CONSTRAINT store_promotions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_quick_replies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  trigger text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT store_quick_replies_pkey PRIMARY KEY (id),
  CONSTRAINT store_quick_replies_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_shipping_rules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  rule_type USER-DEFINED NOT NULL,
  value numeric NOT NULL,
  threshold numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_shipping_rules_pkey PRIMARY KEY (id),
  CONSTRAINT store_shipping_rules_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_stickers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_favorite boolean DEFAULT false,
  CONSTRAINT store_stickers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.store_tables (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  identifier text NOT NULL,
  qr_code_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_tables_pkey PRIMARY KEY (id),
  CONSTRAINT store_tables_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_virtual_cards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  name character varying NOT NULL,
  card_number text NOT NULL,
  card_last_four character varying NOT NULL,
  expiration_date character varying NOT NULL,
  cvv character varying NOT NULL,
  card_holder character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::card_status,
  spending_limit_percent numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_virtual_cards_pkey PRIMARY KEY (id),
  CONSTRAINT store_virtual_cards_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_wallet_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  amount numeric NOT NULL,
  description text,
  type USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'COMPLETED'::transaction_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT store_wallet_transactions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.store_wallets (
  store_id uuid NOT NULL,
  balance_decimal numeric NOT NULL DEFAULT 0.00,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_wallets_pkey PRIMARY KEY (store_id),
  CONSTRAINT store_wallets_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.street_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  street_name text NOT NULL,
  city text NOT NULL,
  state text,
  neighborhood text,
  reference text,
  latitude numeric,
  longitude numeric,
  status text NOT NULL DEFAULT 'PENDING'::text,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT street_requests_pkey PRIMARY KEY (id),
  CONSTRAINT street_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.streets_cache (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  city_display_name character varying NOT NULL UNIQUE,
  streets_list ARRAY NOT NULL DEFAULT ARRAY[]::text[],
  neighborhoods_list ARRAY NOT NULL DEFAULT ARRAY[]::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT streets_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.support_claims (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  user_email character varying,
  type text NOT NULL,
  description text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'open'::claim_status,
  admin_response text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  attachments ARRAY DEFAULT ARRAY[]::text[],
  CONSTRAINT support_claims_pkey PRIMARY KEY (id),
  CONSTRAINT support_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.system_maintenance (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  is_active boolean,
  start_time text,
  end_time text,
  message text,
  CONSTRAINT system_maintenance_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_tips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message text NOT NULL,
  target_role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_tips_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_backups (
  user_id uuid NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_backups_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_backups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  lat double precision,
  lng double precision,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_locations_pkey PRIMARY KEY (id),
  CONSTRAINT user_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  type text DEFAULT 'info'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  read boolean DEFAULT false,
  link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT user_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text UNIQUE,
  name text,
  phone_number text,
  cpf text UNIQUE,
  city text,
  avatar_url text,
  is_available boolean DEFAULT false,
  vehicle_type USER-DEFINED,
  vehicle_plate text,
  vehicle_model text,
  vehicle_year text,
  verification_status text DEFAULT 'NOT_SUBMITTED'::text,
  partner_level text,
  is_active boolean DEFAULT true,
  is_super_store boolean DEFAULT false,
  association_code text UNIQUE,
  share_phone_offline boolean DEFAULT false,
  role USER-DEFINED DEFAULT 'delivery_person'::user_role,
  status USER-DEFINED DEFAULT 'active'::user_status,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  last_known_location USER-DEFINED,
  bank_details jsonb,
  automatic_payouts_enabled boolean DEFAULT false,
  preferred_payout_method_type USER-DEFINED,
  contact_email text,
  opening_hours text,
  address_zip text,
  address_street text,
  address_number text,
  address_district text,
  address_state text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  store_name text,
  store_document text,
  address text,
  cover_url text,
  store_logo_url text,
  store_address_zip text,
  store_address_street text,
  store_address_number text,
  store_address_district text,
  store_address_city text,
  store_address_state text,
  store_address_complement text,
  is_open boolean DEFAULT false,
  store_slug text,
  city_slug text,
  preparation_time integer DEFAULT 0,
  preparation_time_min integer DEFAULT 0,
  preparation_time_max integer DEFAULT 0,
  super_store_expiration timestamp with time zone,
  score integer DEFAULT 50,
  refusal_count_monthly integer DEFAULT 0,
  cancellation_count_monthly integer DEFAULT 0,
  monthly_reset_date timestamp with time zone DEFAULT (date_trunc('month'::text, now()) + '1 mon'::interval),
  pix_key text,
  store_category_id uuid,
  description text,
  ratings_count integer DEFAULT 0,
  ratings_sum integer DEFAULT 0,
  receive_orders_via_platform boolean DEFAULT true,
  receive_orders_via_whatsapp boolean DEFAULT false,
  whatsapp_number text,
  config jsonb DEFAULT '{}'::jsonb,
  receive_orders_via_chat boolean DEFAULT false,
  chat_number text,
  is_currently_open boolean DEFAULT true,
  pix_key_type text DEFAULT 'CPF'::text,
  daily_fixed_value numeric DEFAULT 0.00,
  daily_goal numeric DEFAULT 0.00,
  today_transactions jsonb DEFAULT '[]'::jsonb,
  saved_filters jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_store_category_id_fkey FOREIGN KEY (store_category_id) REFERENCES public.institutional_categories(id)
);
CREATE TABLE public.user_saved_routes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text,
  items jsonb DEFAULT '[]'::jsonb,
  origin_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_saved_routes_pkey PRIMARY KEY (id),
  CONSTRAINT user_saved_routes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid,
  previous_status text,
  new_status text NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT user_status_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT user_status_history_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_terminal_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  terminal_id uuid NOT NULL,
  amount numeric NOT NULL,
  status character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_offline_sync boolean DEFAULT false,
  merchant_user_id uuid NOT NULL,
  payer_id uuid,
  user_id uuid NOT NULL,
  type text DEFAULT 'SALE'::text,
  method text,
  metadata jsonb DEFAULT '{}'::jsonb,
  description text,
  payer_name text,
  CONSTRAINT user_terminal_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_terminal FOREIGN KEY (terminal_id) REFERENCES public.user_terminals(id),
  CONSTRAINT fk_merchant_user FOREIGN KEY (merchant_user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT fk_payer_user FOREIGN KEY (payer_id) REFERENCES public.user_profiles(id),
  CONSTRAINT user_terminal_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_terminals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  terminal_id text UNIQUE,
  api_key text UNIQUE,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::terminal_status,
  activated_at timestamp with time zone NOT NULL DEFAULT now(),
  deactivated_at timestamp with time zone,
  label character varying,
  fee_payer USER-DEFINED DEFAULT 'MERCHANT'::fee_payer_type,
  pin_code text,
  auto_lock_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_terminals_pkey PRIMARY KEY (id),
  CONSTRAINT user_terminals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'COMPLETED'::text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.work_shifts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  partner_id uuid NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  status USER-DEFINED NOT NULL,
  breaks ARRAY DEFAULT ARRAY[]::jsonb[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT work_shifts_pkey PRIMARY KEY (id),
  CONSTRAINT work_shifts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.ze_assistant_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL UNIQUE,
  is_enabled boolean DEFAULT false,
  ai_enabled boolean DEFAULT true,
  rules_enabled boolean DEFAULT true,
  can_create_orders boolean DEFAULT false,
  can_delivery boolean DEFAULT false,
  can_pickup boolean DEFAULT false,
  greeting_message text DEFAULT 'Olá! Sou o Zé, assistente virtual desta loja. Como posso ajudar?'::text,
  fallback_message text DEFAULT 'Desculpe, não entendi. Vou transferir você para um atendente humano.'::text,
  auto_handoff_on_confusion boolean DEFAULT true,
  max_confusion_attempts integer DEFAULT 2,
  response_delay_ms integer DEFAULT 1000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  whatsapp_sort_preference text DEFAULT 'recent'::text,
  instruction_closed_store text DEFAULT 'Olá! No momento estamos fechados, mas deixe sua mensagem que responderemos assim que abrirmos.'::text,
  assistant_name text DEFAULT 'Zé'::text,
  chat_sort_preference character varying DEFAULT 'recent'::character varying,
  CONSTRAINT ze_assistant_config_pkey PRIMARY KEY (id),
  CONSTRAINT ze_assistant_config_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.ze_assistant_conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id text NOT NULL,
  store_id uuid NOT NULL,
  customer_phone text,
  customer_name text,
  is_assistant_active boolean DEFAULT true,
  handoff_to_human boolean DEFAULT false,
  handoff_at timestamp with time zone,
  handoff_reason text,
  context_data jsonb DEFAULT '{}'::jsonb,
  summary text,
  confusion_count integer DEFAULT 0,
  last_interaction_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ze_assistant_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT ze_assistant_conversations_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.ze_assistant_knowledge_base (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  content_type USER-DEFINED NOT NULL,
  title character varying,
  content text NOT NULL,
  structured_data jsonb,
  embeddings jsonb,
  relevance_score numeric DEFAULT 1.0,
  is_active boolean DEFAULT true,
  last_synced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ze_assistant_knowledge_base_pkey PRIMARY KEY (id),
  CONSTRAINT ze_assistant_knowledge_base_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.ze_assistant_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid,
  conversation_id character varying,
  message_input text,
  response_output text,
  used_ai boolean DEFAULT false,
  sentiment character varying,
  processing_time_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ze_assistant_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ze_assistant_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  message_id text,
  message_text text NOT NULL,
  response_text text,
  response_type USER-DEFINED DEFAULT 'HYBRID'::ze_assistant_response_type,
  confidence_score numeric,
  rule_id uuid,
  processing_time_ms integer,
  was_successful boolean DEFAULT true,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ze_assistant_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ze_assistant_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ze_assistant_conversations(id),
  CONSTRAINT ze_assistant_messages_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.ze_assistant_rules(id)
);
CREATE TABLE public.ze_assistant_orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  order_id uuid,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address jsonb,
  items jsonb NOT NULL,
  order_type USER-DEFINED NOT NULL,
  total_amount numeric,
  delivery_fee numeric,
  payment_method text,
  confirmed_by_customer boolean DEFAULT false,
  confirmed_at timestamp with time zone,
  status text DEFAULT 'PENDING'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ze_assistant_orders_pkey PRIMARY KEY (id),
  CONSTRAINT ze_assistant_orders_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ze_assistant_conversations(id)
);
CREATE TABLE public.ze_assistant_rules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  rule_type USER-DEFINED NOT NULL DEFAULT 'CUSTOM'::ze_assistant_rule_type,
  store_id uuid,
  name character varying NOT NULL,
  description text,
  trigger_keywords ARRAY NOT NULL,
  response_template text NOT NULL,
  priority integer DEFAULT 100,
  is_active boolean DEFAULT true,
  match_mode character varying DEFAULT 'contains'::character varying,
  variables jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ze_assistant_rules_pkey PRIMARY KEY (id),
  CONSTRAINT ze_assistant_rules_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.zebank_cards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  card_number text NOT NULL,
  card_last_four character varying NOT NULL,
  expiration_date character varying NOT NULL,
  cvv character varying NOT NULL,
  card_holder character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::card_status,
  spending_limit_percent numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT zebank_cards_pkey PRIMARY KEY (id),
  CONSTRAINT zebank_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);