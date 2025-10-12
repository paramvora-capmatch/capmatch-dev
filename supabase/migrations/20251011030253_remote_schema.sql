


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_borrower"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- This function is triggered when a new user's profile is created
    -- and their role is 'borrower'.
    IF NEW.role = 'borrower' THEN
        -- 1. Insert a corresponding record into the public.borrowers table
        --    This table holds borrower-specific, non-auth information.
        INSERT INTO public.borrowers (id, full_legal_name)
        VALUES (NEW.id, NEW.full_name);

        -- 2. Create a private storage bucket for the new borrower.
        --    The bucket is named after the borrower's user ID (UUID) for direct mapping.
        INSERT INTO storage.buckets (id, name, public, owner)
        VALUES (NEW.id::text, NEW.id::text, false, NEW.id);

        -- 3. Create a default 'borrower_docs' folder within the new bucket.
        --    An empty '.keep' file is inserted to create the folder structure,
        --    as Supabase Storage doesn't support empty folders.
        INSERT INTO storage.objects (bucket_id, name, owner, metadata)
        VALUES (NEW.id::text, 'borrower_docs/.keep', NEW.id, '{"mimetype": "text/plain"}');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_borrower"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'borrower'),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."borrowers" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "full_legal_name" "text",
    "primary_entity_name" "text",
    "primary_entity_structure" "text",
    "contact_phone" "text",
    "contact_address" "text",
    "bio_narrative" "text",
    "linkedin_url" "text",
    "website_url" "text",
    "years_cre_experience_range" "text",
    "asset_classes_experience" "text"[],
    "geographic_markets_experience" "text"[],
    "total_deal_value_closed_range" "text",
    "existing_lender_relationships" "text",
    "credit_score_range" "text",
    "net_worth_range" "text",
    "liquidity_range" "text",
    "bankruptcy_history" boolean DEFAULT false,
    "foreclosure_history" boolean DEFAULT false,
    "litigation_history" boolean DEFAULT false
);


ALTER TABLE "public"."borrowers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lenders" (
    "lender_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "asset_types" "text"[],
    "deal_types" "text"[],
    "capital_types" "text"[],
    "min_deal_size" numeric,
    "max_deal_size" numeric,
    "locations" "text"[],
    "preference_scope" "jsonb",
    "debt_ranges" "text"[]
);


ALTER TABLE "public"."lenders" OWNER TO "postgres";


ALTER TABLE "public"."lenders" ALTER COLUMN "lender_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."lenders_lender_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."principals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "borrower_profile_id" "uuid" NOT NULL,
    "principal_legal_name" "text" NOT NULL,
    "principal_role_default" "text",
    "principal_bio" "text",
    "principal_email" "text",
    "ownership_percentage" numeric,
    "credit_score_range" "text",
    "net_worth_range" "text",
    "liquidity_range" "text",
    "bankruptcy_history" boolean DEFAULT false,
    "foreclosure_history" boolean DEFAULT false,
    "pfs_document_id" "uuid"
);


ALTER TABLE "public"."principals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "full_name" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL
);


ALTER TABLE "public"."project_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_name" "text" DEFAULT 'New Project'::"text" NOT NULL,
    "asset_type" "text" DEFAULT ''::"text" NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "updated_at" timestamp with time zone,
    "assigned_advisor_user_id" "uuid",
    "property_address_street" "text",
    "property_address_city" "text",
    "property_address_state" "text",
    "property_address_county" "text",
    "property_address_zip" "text",
    "project_description" "text",
    "project_phase" "text",
    "loan_amount_requested" numeric,
    "loan_type" "text",
    "target_ltv_percent" numeric,
    "target_ltc_percent" numeric,
    "amortization_years" integer,
    "interest_only_period_months" integer,
    "interest_rate_type" "text",
    "target_close_date" "date",
    "use_of_proceeds" "text",
    "recourse_preference" "text",
    "purchase_price" numeric,
    "total_project_cost" numeric,
    "capex_budget" numeric,
    "property_noi_t12" numeric,
    "stabilized_noi_projected" numeric,
    "exit_strategy" "text",
    "business_plan_summary" "text",
    "market_overview_summary" "text",
    "equity_committed_percent" numeric,
    "project_status" "text" DEFAULT 'Draft'::"text",
    "completeness_percent" numeric DEFAULT 0,
    "internal_advisor_notes" "text",
    "borrower_progress" numeric DEFAULT 0,
    "project_progress" numeric DEFAULT 0
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


ALTER TABLE ONLY "public"."borrowers"
    ADD CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lenders"
    ADD CONSTRAINT "lenders_pkey" PRIMARY KEY ("lender_id");



ALTER TABLE ONLY "public"."principals"
    ADD CONSTRAINT "principals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_messages"
    ADD CONSTRAINT "project_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "on_new_borrower_profile" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_borrower"();



CREATE OR REPLACE TRIGGER "on_projects_update" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."borrowers"
    ADD CONSTRAINT "borrowers_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."principals"
    ADD CONSTRAINT "principals_borrower_profile_id_fkey" FOREIGN KEY ("borrower_profile_id") REFERENCES "public"."borrowers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_messages"
    ADD CONSTRAINT "project_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_messages"
    ADD CONSTRAINT "project_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Advisors and Admins can read all borrower profiles" ON "public"."borrowers" FOR SELECT USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['advisor'::"text", 'admin'::"text"])));



CREATE POLICY "Advisors and Admins can read all principals" ON "public"."principals" FOR SELECT USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['advisor'::"text", 'admin'::"text"])));



CREATE POLICY "Borrowers can manage their own principals" ON "public"."principals" USING (("auth"."uid"() = "borrower_profile_id")) WITH CHECK (("auth"."uid"() = "borrower_profile_id"));



CREATE POLICY "Borrowers can manage their own profile" ON "public"."borrowers" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable delete for own projects" ON "public"."projects" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Enable insert for own projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Enable read access for all users" ON "public"."lenders" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR ("role" = 'advisor'::"text")));



CREATE POLICY "Enable read access for assigned advisors and admins" ON "public"."projects" FOR SELECT USING ((("auth"."uid"() = "assigned_advisor_user_id") OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "Enable read access for own projects" ON "public"."projects" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Enable update for own projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can read messages for their projects" ON "public"."project_messages" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE (("projects"."owner_id" = "auth"."uid"()) OR ("projects"."assigned_advisor_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can send messages in their projects" ON "public"."project_messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE (("projects"."owner_id" = "auth"."uid"()) OR ("projects"."assigned_advisor_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."borrowers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lenders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."principals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."project_messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_borrower"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_borrower"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_borrower"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."borrowers" TO "anon";
GRANT ALL ON TABLE "public"."borrowers" TO "authenticated";
GRANT ALL ON TABLE "public"."borrowers" TO "service_role";



GRANT ALL ON TABLE "public"."lenders" TO "anon";
GRANT ALL ON TABLE "public"."lenders" TO "authenticated";
GRANT ALL ON TABLE "public"."lenders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."lenders_lender_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."lenders_lender_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."lenders_lender_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."principals" TO "anon";
GRANT ALL ON TABLE "public"."principals" TO "authenticated";
GRANT ALL ON TABLE "public"."principals" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_messages" TO "anon";
GRANT ALL ON TABLE "public"."project_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."project_messages" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


  create policy "Admin full access"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text))
with check ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text));



  create policy "Advisor delete access to assigned resources"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'advisor'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.id)::text = objects.path_tokens[1]) AND (p.assigned_advisor_user_id = auth.uid()) AND ((p.owner_id)::text = objects.bucket_id)))) OR ((path_tokens[1] = 'borrower_docs'::text) AND (EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.owner_id)::text = objects.bucket_id) AND (p.assigned_advisor_user_id = auth.uid()))))))));



  create policy "Advisor insert access to assigned resources"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'advisor'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.id)::text = objects.path_tokens[1]) AND (p.assigned_advisor_user_id = auth.uid()) AND ((p.owner_id)::text = objects.bucket_id)))) OR ((path_tokens[1] = 'borrower_docs'::text) AND (EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.owner_id)::text = objects.bucket_id) AND (p.assigned_advisor_user_id = auth.uid()))))))));



  create policy "Advisor read access to assigned resources"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'advisor'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.id)::text = objects.path_tokens[1]) AND (p.assigned_advisor_user_id = auth.uid()) AND ((p.owner_id)::text = objects.bucket_id)))) OR ((path_tokens[1] = 'borrower_docs'::text) AND (EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.owner_id)::text = objects.bucket_id) AND (p.assigned_advisor_user_id = auth.uid()))))))));



  create policy "Advisor update access to assigned resources"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'advisor'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.id)::text = objects.path_tokens[1]) AND (p.assigned_advisor_user_id = auth.uid()) AND ((p.owner_id)::text = objects.bucket_id)))) OR ((path_tokens[1] = 'borrower_docs'::text) AND (EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.owner_id)::text = objects.bucket_id) AND (p.assigned_advisor_user_id = auth.uid()))))))))
with check (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'advisor'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.id)::text = objects.path_tokens[1]) AND (p.assigned_advisor_user_id = auth.uid()) AND ((p.owner_id)::text = objects.bucket_id)))) OR ((path_tokens[1] = 'borrower_docs'::text) AND (EXISTS ( SELECT 1
   FROM projects p
  WHERE (((p.owner_id)::text = objects.bucket_id) AND (p.assigned_advisor_user_id = auth.uid()))))))));



  create policy "Borrower full access to own bucket"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using (((bucket_id = (auth.uid())::text) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'borrower'::text)))
with check (((bucket_id = (auth.uid())::text) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'borrower'::text)));



