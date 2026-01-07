-- =============================================================================
-- Migration: Enable RLS and Cleanup Duplicate Indexes
-- Description: Fixes Supabase linter security (RLS) and performance issues
-- =============================================================================

-- =============================================================================
-- PART 1: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================
-- Note: Since this is a Django backend that manages authentication and 
-- authorization through the application layer, we enable RLS but create 
-- policies that allow the service role (used by Django) full access.
-- Direct PostgREST/anonymous access will be blocked.

-- Django Core Tables
ALTER TABLE IF EXISTS public.django_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.django_content_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.django_admin_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.django_session ENABLE ROW LEVEL SECURITY;

-- Auth Tables (Django's built-in + custom)
ALTER TABLE IF EXISTS public.auth_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_app_user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_app_user_user_permissions ENABLE ROW LEVEL SECURITY;

-- Profile App
ALTER TABLE IF EXISTS public.profile_app_profile ENABLE ROW LEVEL SECURITY;

-- Weather App
ALTER TABLE IF EXISTS public.weather_app_weathercode ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weather_app_savedlocation ENABLE ROW LEVEL SECURITY;

-- Schedule App
ALTER TABLE IF EXISTS public.schedule_app_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_app_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_app_eventoccurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_app_eventattachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_app_eventcategory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_app_remindertemplate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_app_reminder ENABLE ROW LEVEL SECURITY;

-- Financials App
ALTER TABLE IF EXISTS public.financials_app_financialaccount ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financials_app_accountsnapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financials_app_cashflowentry ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financials_app_accountgroup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financials_app_accountgroup_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financials_app_financialssnapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financials_app_financialsmilestone ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financials_app_changelog ENABLE ROW LEVEL SECURITY;

-- Subscriptions App
ALTER TABLE IF EXISTS public.subscriptions_app_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions_app_subscriptioncharge ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions_app_subscriptionusagesignal ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions_app_subscriptionalert ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions_app_subscriptionalertevent ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions_app_subscriptioninsightsnapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions_app_paymentmethod ENABLE ROW LEVEL SECURITY;

-- Travel App
ALTER TABLE IF EXISTS public.travel_app_exchangeratecache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.travel_app_trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.travel_app_packinglist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.travel_app_itinerary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.travel_app_itineraryactivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.travel_app_packingitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.travel_app_travelgoal ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.travel_app_tripdocument ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.travel_app_tripexpense ENABLE ROW LEVEL SECURITY;

-- Stocks App (if exists)
ALTER TABLE IF EXISTS public.stocks_app_transaction ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PART 2: CREATE RLS POLICIES FOR SERVICE ROLE ACCESS
-- =============================================================================
-- These policies allow the service_role (used by Django backend) full access
-- while blocking direct anonymous/authenticated PostgREST access.
-- This is the recommended pattern for backend-managed applications.

-- Helper function to create standard service role policies
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'django_migrations',
        'django_content_type',
        'django_admin_log',
        'django_session',
        'auth_permission',
        'auth_group',
        'auth_group_permissions',
        'auth_app_user',
        'auth_app_user_groups',
        'auth_app_user_user_permissions',
        'profile_app_profile',
        'weather_app_weathercode',
        'weather_app_savedlocation',
        'schedule_app_calendar',
        'schedule_app_event',
        'schedule_app_eventoccurrence',
        'schedule_app_eventattachment',
        'schedule_app_eventcategory',
        'schedule_app_remindertemplate',
        'schedule_app_reminder',
        'financials_app_financialaccount',
        'financials_app_accountsnapshot',
        'financials_app_cashflowentry',
        'financials_app_accountgroup',
        'financials_app_accountgroup_accounts',
        'financials_app_financialssnapshot',
        'financials_app_financialsmilestone',
        'financials_app_changelog',
        'subscriptions_app_subscription',
        'subscriptions_app_subscriptioncharge',
        'subscriptions_app_subscriptionusagesignal',
        'subscriptions_app_subscriptionalert',
        'subscriptions_app_subscriptionalertevent',
        'subscriptions_app_subscriptioninsightsnapshot',
        'subscriptions_app_paymentmethod',
        'travel_app_exchangeratecache',
        'travel_app_trip',
        'travel_app_packinglist',
        'travel_app_itinerary',
        'travel_app_itineraryactivity',
        'travel_app_packingitem',
        'travel_app_travelgoal',
        'travel_app_tripdocument',
        'travel_app_tripexpense',
        'stocks_app_transaction'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- Check if table exists before creating policy
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            -- Drop existing policies if any (to make migration idempotent)
            EXECUTE format('DROP POLICY IF EXISTS "Service role has full access to %I" ON public.%I', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Postgres role has full access to %I" ON public.%I', tbl, tbl);
            
            -- Create policy for service_role (Supabase service key)
            EXECUTE format(
                'CREATE POLICY "Service role has full access to %I" ON public.%I
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true)',
                tbl, tbl
            );
            
            -- Create policy for postgres role (direct database connections like Django)
            EXECUTE format(
                'CREATE POLICY "Postgres role has full access to %I" ON public.%I
                FOR ALL
                TO postgres
                USING (true)
                WITH CHECK (true)',
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- PART 3: DROP DUPLICATE INDEXES
-- =============================================================================
-- Keep the most descriptive/meaningful index name, drop the others

-- financials_app_accountsnapshot duplicate indexes
-- Keep: financials__account_e4cba2_idx, Drop: networth_ap_account_5b69f2_idx
DROP INDEX IF EXISTS public.networth_ap_account_5b69f2_idx;

-- Keep: financials__created_4b53ed_idx, Drop: networth_ap_created_1f2b28_idx
DROP INDEX IF EXISTS public.networth_ap_created_1f2b28_idx;

-- Keep: financials__recorde_616f7c_idx, Drop: networth_ap_recorde_b3271f_idx, networth_app_accountsnapshot_recorded_at_b2a638b7
DROP INDEX IF EXISTS public.networth_ap_recorde_b3271f_idx;
DROP INDEX IF EXISTS public.networth_app_accountsnapshot_recorded_at_b2a638b7;

-- financials_app_cashflowentry duplicate indexes
-- Keep: financials__owner_i_074bd0_idx, Drop: networth_ap_owner_i_7186a9_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_7186a9_idx;

-- Keep: financials__owner_i_878e1b_idx, Drop: networth_ap_owner_i_2b7aff_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_2b7aff_idx;

-- Keep: financials__owner_i_4e0cbf_idx, Drop: networth_ap_owner_i_11b625_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_11b625_idx;

-- financials_app_changelog duplicate indexes
-- Keep: financials__owner_i_17d1f7_idx, Drop: networth_ap_owner_i_d34b8e_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_d34b8e_idx;

-- Keep: financials__owner_i_d16388_idx, Drop: networth_ap_owner_i_b2ecc6_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_b2ecc6_idx;

-- Keep: financials__snapsho_e385d1_idx, Drop: networth_ap_snapsho_c7d8d2_idx, networth_app_changelog_snapshot_to_id_0ae9fd68
DROP INDEX IF EXISTS public.networth_ap_snapsho_c7d8d2_idx;
DROP INDEX IF EXISTS public.networth_app_changelog_snapshot_to_id_0ae9fd68;

-- financials_app_financialaccount duplicate indexes
-- Keep: financials__owner_i_b8cd68_idx, Drop: networth_ap_owner_i_466179_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_466179_idx;

-- Keep: financials__owner_i_c816ef_idx, Drop: networth_ap_owner_i_6ab814_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_6ab814_idx;

-- Keep: financials__owner_i_673deb_idx, Drop: networth_ap_owner_i_48da52_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_48da52_idx;

-- financials_app_financialsmilestone duplicate indexes
-- Keep: financials__owner_i_47f7f9_idx, Drop: networth_ap_owner_i_854694_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_854694_idx;

-- Keep: financials__owner_i_0d42c7_idx, Drop: networth_ap_owner_i_f52012_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_f52012_idx;

-- financials_app_financialssnapshot duplicate indexes
-- Keep: financials__owner_i_696648_idx, Drop: networth_ap_owner_i_22b0a0_idx
DROP INDEX IF EXISTS public.networth_ap_owner_i_22b0a0_idx;

-- subscriptions_app_subscriptioncharge duplicate indexes
-- Keep: subscriptio_charged_d6d78d_idx, Drop: subscriptions_app_subscriptioncharge_charged_at_46027c58
DROP INDEX IF EXISTS public.subscriptions_app_subscriptioncharge_charged_at_46027c58;

-- =============================================================================
-- PART 4: VERIFICATION COMMENTS
-- =============================================================================
-- After running this migration:
-- 1. All 47 tables will have RLS enabled
-- 2. Service role and postgres role will have full access (for Django backend)
-- 3. Anonymous and authenticated PostgREST users will be blocked by default
-- 4. 16 duplicate indexes will be removed for better performance
-- 
-- The Django backend will continue to work normally because it connects
-- as the postgres user which has the full access policy.
