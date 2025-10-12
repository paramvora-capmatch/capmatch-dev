drop trigger if exists "on_new_borrower_profile" on "public"."profiles";

drop policy "Users can read messages for their projects" on "public"."project_messages";

drop policy "Users can send messages in their projects" on "public"."project_messages";

drop policy "Enable delete for own projects" on "public"."projects";

drop policy "Enable insert for own projects" on "public"."projects";

drop policy "Enable read access for own projects" on "public"."projects";

drop policy "Enable update for own projects" on "public"."projects";

-- Drop storage policies that depend on owner_id before dropping the column
DROP POLICY IF EXISTS "Advisor delete access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor insert access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor read access to assigned resources" ON "storage"."objects";
DROP POLICY IF EXISTS "Advisor update access to assigned resources" ON "storage"."objects";

alter table "public"."projects" drop constraint "projects_owner_id_fkey";

create table "public"."borrower_entities" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid
);


create table "public"."borrower_entity_members" (
    "id" uuid not null default gen_random_uuid(),
    "entity_id" uuid,
    "user_id" uuid,
    "role" text not null,
    "invited_by" uuid,
    "invited_at" timestamp with time zone default now(),
    "invite_token" text,
    "invite_expires_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "status" text not null default 'pending'::text,
    "project_permissions" jsonb default '[]'::jsonb,
    "invited_email" text
);


create table "public"."document_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "entity_id" uuid,
    "project_id" uuid,
    "document_path" text not null,
    "user_id" uuid,
    "granted_by" uuid,
    "granted_at" timestamp with time zone default now(),
    "permission_type" text not null
);


alter table "public"."borrowers" add column "custom_fields" jsonb default '[]'::jsonb;

alter table "public"."borrowers" add column "entity_id" uuid;

alter table "public"."borrowers" add column "last_synced_at" timestamp with time zone;

alter table "public"."borrowers" add column "master_profile_id" uuid;

alter table "public"."profiles" add column "active_entity_id" uuid;

alter table "public"."projects" drop column "owner_id";

alter table "public"."projects" add column "entity_id" uuid not null;

CREATE UNIQUE INDEX borrower_entities_pkey ON public.borrower_entities USING btree (id);

CREATE UNIQUE INDEX borrower_entity_members_entity_id_user_id_key ON public.borrower_entity_members USING btree (entity_id, user_id);

CREATE UNIQUE INDEX borrower_entity_members_invite_token_key ON public.borrower_entity_members USING btree (invite_token);

CREATE UNIQUE INDEX borrower_entity_members_pkey ON public.borrower_entity_members USING btree (id);

CREATE UNIQUE INDEX document_permissions_entity_id_project_id_document_path_use_key ON public.document_permissions USING btree (entity_id, project_id, document_path, user_id);

CREATE UNIQUE INDEX document_permissions_pkey ON public.document_permissions USING btree (id);

CREATE INDEX idx_borrower_entity_members_entity_id ON public.borrower_entity_members USING btree (entity_id);

CREATE INDEX idx_borrower_entity_members_invite_token ON public.borrower_entity_members USING btree (invite_token);

CREATE INDEX idx_borrower_entity_members_status ON public.borrower_entity_members USING btree (status);

CREATE INDEX idx_borrower_entity_members_user_id ON public.borrower_entity_members USING btree (user_id);

CREATE INDEX idx_borrowers_entity_id ON public.borrowers USING btree (entity_id);

CREATE INDEX idx_document_permissions_document_path ON public.document_permissions USING btree (document_path);

CREATE INDEX idx_document_permissions_entity_id ON public.document_permissions USING btree (entity_id);

CREATE INDEX idx_document_permissions_project_id ON public.document_permissions USING btree (project_id);

CREATE INDEX idx_document_permissions_user_id ON public.document_permissions USING btree (user_id);

CREATE INDEX idx_profiles_active_entity_id ON public.profiles USING btree (active_entity_id);

CREATE INDEX idx_projects_entity_id ON public.projects USING btree (entity_id);

alter table "public"."borrower_entities" add constraint "borrower_entities_pkey" PRIMARY KEY using index "borrower_entities_pkey";

alter table "public"."borrower_entity_members" add constraint "borrower_entity_members_pkey" PRIMARY KEY using index "borrower_entity_members_pkey";

alter table "public"."document_permissions" add constraint "document_permissions_pkey" PRIMARY KEY using index "document_permissions_pkey";

alter table "public"."borrower_entities" add constraint "borrower_entities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."borrower_entities" validate constraint "borrower_entities_created_by_fkey";

alter table "public"."borrower_entity_members" add constraint "borrower_entity_members_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES borrower_entities(id) ON DELETE CASCADE not valid;

alter table "public"."borrower_entity_members" validate constraint "borrower_entity_members_entity_id_fkey";

alter table "public"."borrower_entity_members" add constraint "borrower_entity_members_entity_id_user_id_key" UNIQUE using index "borrower_entity_members_entity_id_user_id_key";

alter table "public"."borrower_entity_members" add constraint "borrower_entity_members_invite_token_key" UNIQUE using index "borrower_entity_members_invite_token_key";

alter table "public"."borrower_entity_members" add constraint "borrower_entity_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) not valid;

alter table "public"."borrower_entity_members" validate constraint "borrower_entity_members_invited_by_fkey";

alter table "public"."borrower_entity_members" add constraint "borrower_entity_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text]))) not valid;

alter table "public"."borrower_entity_members" validate constraint "borrower_entity_members_role_check";

alter table "public"."borrower_entity_members" add constraint "borrower_entity_members_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'removed'::text]))) not valid;

alter table "public"."borrower_entity_members" validate constraint "borrower_entity_members_status_check";

alter table "public"."borrower_entity_members" add constraint "borrower_entity_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."borrower_entity_members" validate constraint "borrower_entity_members_user_id_fkey";

alter table "public"."borrowers" add constraint "borrowers_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES borrower_entities(id) not valid;

alter table "public"."borrowers" validate constraint "borrowers_entity_id_fkey";

alter table "public"."borrowers" add constraint "borrowers_master_profile_id_fkey" FOREIGN KEY (master_profile_id) REFERENCES borrowers(id) not valid;

alter table "public"."borrowers" validate constraint "borrowers_master_profile_id_fkey";

alter table "public"."document_permissions" add constraint "document_permissions_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES borrower_entities(id) ON DELETE CASCADE not valid;

alter table "public"."document_permissions" validate constraint "document_permissions_entity_id_fkey";

alter table "public"."document_permissions" add constraint "document_permissions_entity_id_project_id_document_path_use_key" UNIQUE using index "document_permissions_entity_id_project_id_document_path_use_key";

alter table "public"."document_permissions" add constraint "document_permissions_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) not valid;

alter table "public"."document_permissions" validate constraint "document_permissions_granted_by_fkey";

alter table "public"."document_permissions" add constraint "document_permissions_permission_type_check" CHECK ((permission_type = ANY (ARRAY['file'::text, 'folder'::text]))) not valid;

alter table "public"."document_permissions" validate constraint "document_permissions_permission_type_check";

alter table "public"."document_permissions" add constraint "document_permissions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."document_permissions" validate constraint "document_permissions_project_id_fkey";

alter table "public"."document_permissions" add constraint "document_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."document_permissions" validate constraint "document_permissions_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_active_entity_id_fkey" FOREIGN KEY (active_entity_id) REFERENCES borrower_entities(id) not valid;

alter table "public"."profiles" validate constraint "profiles_active_entity_id_fkey";

alter table "public"."projects" add constraint "projects_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES borrower_entities(id) not valid;

alter table "public"."projects" validate constraint "projects_entity_id_fkey";

set check_function_bodies = off;

create or replace view "public"."active_entity_members" as  SELECT bem.id,
    bem.entity_id,
    bem.user_id,
    bem.role,
    bem.invited_by,
    bem.invited_at,
    bem.accepted_at,
    bem.status,
    p.email AS user_email,
    p.full_name AS user_name,
    be.name AS entity_name
   FROM ((borrower_entity_members bem
     JOIN borrower_entities be ON ((bem.entity_id = be.id)))
     LEFT JOIN profiles p ON ((bem.user_id = p.id)))
  WHERE (bem.status = 'active'::text);


CREATE OR REPLACE FUNCTION public.get_user_entity_role(entity_uuid uuid, user_uuid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT role FROM borrower_entity_members 
    WHERE entity_id = entity_uuid 
    AND user_id = user_uuid 
    AND status = 'active'
    LIMIT 1
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_entity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Create a private storage bucket for the new entity
    INSERT INTO storage.buckets (id, name, public, owner)
    VALUES (NEW.id::text, NEW.id::text, false, NEW.created_by);

    -- Create a default 'borrower_docs' folder within the new bucket
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (NEW.id::text, 'borrower_docs/.keep', NEW.created_by, '{"mimetype": "text/plain"}');

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_entity_member(entity_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM borrower_entity_members 
    WHERE entity_id = entity_uuid 
    AND user_id = user_uuid 
    AND status = 'active'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_entity_owner(entity_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM borrower_entity_members 
    WHERE entity_id = entity_uuid 
    AND user_id = user_uuid 
    AND role = 'owner' 
    AND status = 'active'
  );
END;
$function$
;

create or replace view "public"."pending_invites" as  SELECT bem.id,
    bem.entity_id,
    bem.user_id,
    bem.role,
    bem.invited_by,
    bem.invited_at,
    bem.invite_token,
    bem.invite_expires_at,
    p.email AS user_email,
    p.full_name AS user_name,
    be.name AS entity_name,
    inviter.email AS inviter_email,
    inviter.full_name AS inviter_name
   FROM (((borrower_entity_members bem
     JOIN borrower_entities be ON ((bem.entity_id = be.id)))
     LEFT JOIN profiles p ON ((bem.user_id = p.id)))
     LEFT JOIN profiles inviter ON ((bem.invited_by = inviter.id)))
  WHERE (bem.status = 'pending'::text);


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_borrower()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Insert into borrowers table when a borrower profile is created
  insert into public.borrowers (id, entity_id)
  values (
    new.id,
    null -- Will be set later when entity is created
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

grant delete on table "public"."borrower_entities" to "anon";

grant insert on table "public"."borrower_entities" to "anon";

grant references on table "public"."borrower_entities" to "anon";

grant select on table "public"."borrower_entities" to "anon";

grant trigger on table "public"."borrower_entities" to "anon";

grant truncate on table "public"."borrower_entities" to "anon";

grant update on table "public"."borrower_entities" to "anon";

grant delete on table "public"."borrower_entities" to "authenticated";

grant insert on table "public"."borrower_entities" to "authenticated";

grant references on table "public"."borrower_entities" to "authenticated";

grant select on table "public"."borrower_entities" to "authenticated";

grant trigger on table "public"."borrower_entities" to "authenticated";

grant truncate on table "public"."borrower_entities" to "authenticated";

grant update on table "public"."borrower_entities" to "authenticated";

grant delete on table "public"."borrower_entities" to "service_role";

grant insert on table "public"."borrower_entities" to "service_role";

grant references on table "public"."borrower_entities" to "service_role";

grant select on table "public"."borrower_entities" to "service_role";

grant trigger on table "public"."borrower_entities" to "service_role";

grant truncate on table "public"."borrower_entities" to "service_role";

grant update on table "public"."borrower_entities" to "service_role";

grant delete on table "public"."borrower_entity_members" to "anon";

grant insert on table "public"."borrower_entity_members" to "anon";

grant references on table "public"."borrower_entity_members" to "anon";

grant select on table "public"."borrower_entity_members" to "anon";

grant trigger on table "public"."borrower_entity_members" to "anon";

grant truncate on table "public"."borrower_entity_members" to "anon";

grant update on table "public"."borrower_entity_members" to "anon";

grant delete on table "public"."borrower_entity_members" to "authenticated";

grant insert on table "public"."borrower_entity_members" to "authenticated";

grant references on table "public"."borrower_entity_members" to "authenticated";

grant select on table "public"."borrower_entity_members" to "authenticated";

grant trigger on table "public"."borrower_entity_members" to "authenticated";

grant truncate on table "public"."borrower_entity_members" to "authenticated";

grant update on table "public"."borrower_entity_members" to "authenticated";

grant delete on table "public"."borrower_entity_members" to "service_role";

grant insert on table "public"."borrower_entity_members" to "service_role";

grant references on table "public"."borrower_entity_members" to "service_role";

grant select on table "public"."borrower_entity_members" to "service_role";

grant trigger on table "public"."borrower_entity_members" to "service_role";

grant truncate on table "public"."borrower_entity_members" to "service_role";

grant update on table "public"."borrower_entity_members" to "service_role";

grant delete on table "public"."document_permissions" to "anon";

grant insert on table "public"."document_permissions" to "anon";

grant references on table "public"."document_permissions" to "anon";

grant select on table "public"."document_permissions" to "anon";

grant trigger on table "public"."document_permissions" to "anon";

grant truncate on table "public"."document_permissions" to "anon";

grant update on table "public"."document_permissions" to "anon";

grant delete on table "public"."document_permissions" to "authenticated";

grant insert on table "public"."document_permissions" to "authenticated";

grant references on table "public"."document_permissions" to "authenticated";

grant select on table "public"."document_permissions" to "authenticated";

grant trigger on table "public"."document_permissions" to "authenticated";

grant truncate on table "public"."document_permissions" to "authenticated";

grant update on table "public"."document_permissions" to "authenticated";

grant delete on table "public"."document_permissions" to "service_role";

grant insert on table "public"."document_permissions" to "service_role";

grant references on table "public"."document_permissions" to "service_role";

grant select on table "public"."document_permissions" to "service_role";

grant trigger on table "public"."document_permissions" to "service_role";

grant truncate on table "public"."document_permissions" to "service_role";

grant update on table "public"."document_permissions" to "service_role";

create policy "Owners can update entities"
on "public"."borrower_entities"
as permissive
for update
to public
using ((id IN ( SELECT borrower_entity_members.entity_id
   FROM borrower_entity_members
  WHERE ((borrower_entity_members.user_id = auth.uid()) AND (borrower_entity_members.role = 'owner'::text) AND (borrower_entity_members.status = 'active'::text)))));


create policy "Users can create entities"
on "public"."borrower_entities"
as permissive
for insert
to public
with check ((created_by = auth.uid()));


create policy "Users can read their entities"
on "public"."borrower_entities"
as permissive
for select
to public
using ((id IN ( SELECT borrower_entity_members.entity_id
   FROM borrower_entity_members
  WHERE ((borrower_entity_members.user_id = auth.uid()) AND (borrower_entity_members.status = 'active'::text)))));


create policy "Members can read entity members"
on "public"."borrower_entity_members"
as permissive
for select
to public
using ((entity_id IN ( SELECT borrower_entity_members_1.entity_id
   FROM borrower_entity_members borrower_entity_members_1
  WHERE ((borrower_entity_members_1.user_id = auth.uid()) AND (borrower_entity_members_1.status = 'active'::text)))));


create policy "Owners can manage members"
on "public"."borrower_entity_members"
as permissive
for all
to public
using ((entity_id IN ( SELECT borrower_entity_members_1.entity_id
   FROM borrower_entity_members borrower_entity_members_1
  WHERE ((borrower_entity_members_1.user_id = auth.uid()) AND (borrower_entity_members_1.role = 'owner'::text) AND (borrower_entity_members_1.status = 'active'::text)))));


create policy "Users can accept their own invites"
on "public"."borrower_entity_members"
as permissive
for update
to public
using (((user_id = auth.uid()) AND (status = 'pending'::text)));


create policy "Entity members can read borrower profiles"
on "public"."borrowers"
as permissive
for select
to public
using ((entity_id IN ( SELECT be.id
   FROM (borrower_entities be
     JOIN borrower_entity_members bem ON ((be.id = bem.entity_id)))
  WHERE ((bem.user_id = auth.uid()) AND (bem.status = 'active'::text)))));


create policy "Entity owners can update borrower profiles"
on "public"."borrowers"
as permissive
for update
to public
using ((entity_id IN ( SELECT be.id
   FROM (borrower_entities be
     JOIN borrower_entity_members bem ON ((be.id = bem.entity_id)))
  WHERE ((bem.user_id = auth.uid()) AND (bem.role = 'owner'::text) AND (bem.status = 'active'::text)))));


create policy "Owners can manage permissions"
on "public"."document_permissions"
as permissive
for all
to public
using ((entity_id IN ( SELECT borrower_entity_members.entity_id
   FROM borrower_entity_members
  WHERE ((borrower_entity_members.user_id = auth.uid()) AND (borrower_entity_members.role = 'owner'::text) AND (borrower_entity_members.status = 'active'::text)))));


create policy "Users can read their permissions"
on "public"."document_permissions"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "Entity members can read project messages"
on "public"."project_messages"
as permissive
for select
to public
using ((project_id IN ( SELECT p.id
   FROM ((projects p
     JOIN borrower_entities be ON ((p.entity_id = be.id)))
     JOIN borrower_entity_members bem ON ((be.id = bem.entity_id)))
  WHERE ((bem.user_id = auth.uid()) AND (bem.status = 'active'::text)))));


create policy "Entity members can send project messages"
on "public"."project_messages"
as permissive
for insert
to public
with check ((project_id IN ( SELECT p.id
   FROM ((projects p
     JOIN borrower_entities be ON ((p.entity_id = be.id)))
     JOIN borrower_entity_members bem ON ((be.id = bem.entity_id)))
  WHERE ((bem.user_id = auth.uid()) AND (bem.status = 'active'::text)))));


create policy "Entity members can read projects"
on "public"."projects"
as permissive
for select
to public
using ((entity_id IN ( SELECT be.id
   FROM (borrower_entities be
     JOIN borrower_entity_members bem ON ((be.id = bem.entity_id)))
  WHERE ((bem.user_id = auth.uid()) AND (bem.status = 'active'::text)))));


create policy "Entity owners can delete projects"
on "public"."projects"
as permissive
for delete
to public
using ((entity_id IN ( SELECT be.id
   FROM (borrower_entities be
     JOIN borrower_entity_members bem ON ((be.id = bem.entity_id)))
  WHERE ((bem.user_id = auth.uid()) AND (bem.role = 'owner'::text) AND (bem.status = 'active'::text)))));


create policy "Entity owners can insert projects"
on "public"."projects"
as permissive
for insert
to public
with check ((entity_id IN ( SELECT be.id
   FROM (borrower_entities be
     JOIN borrower_entity_members bem ON ((be.id = bem.entity_id)))
  WHERE ((bem.user_id = auth.uid()) AND (bem.role = 'owner'::text) AND (bem.status = 'active'::text)))));


create policy "Entity owners can update projects"
on "public"."projects"
as permissive
for update
to public
using ((entity_id IN ( SELECT be.id
   FROM (borrower_entities be
     JOIN borrower_entity_members bem ON ((be.id = bem.entity_id)))
  WHERE ((bem.user_id = auth.uid()) AND (bem.role = 'owner'::text) AND (bem.status = 'active'::text)))));


create policy "Users can read their own projects"
on "public"."projects"
as permissive
for select
to public
using ((entity_id IN ( SELECT borrower_entity_members.entity_id
   FROM borrower_entity_members
  WHERE ((borrower_entity_members.user_id = auth.uid()) AND (borrower_entity_members.status = 'active'::text)))));


create policy "Users can update their own projects"
on "public"."projects"
as permissive
for update
to public
using ((entity_id IN ( SELECT borrower_entity_members.entity_id
   FROM borrower_entity_members
  WHERE ((borrower_entity_members.user_id = auth.uid()) AND (borrower_entity_members.status = 'active'::text)))));


CREATE TRIGGER on_new_entity_created AFTER INSERT ON public.borrower_entities FOR EACH ROW EXECUTE FUNCTION handle_new_entity();

CREATE TRIGGER update_borrower_entities_updated_at BEFORE UPDATE ON public.borrower_entities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_new_borrower_profile AFTER INSERT ON public.profiles FOR EACH ROW WHEN ((new.role = 'borrower'::text)) EXECUTE FUNCTION handle_new_borrower();

-- Recreate storage policies using the new RBAC system
create policy "Advisor delete access to assigned resources"
on "storage"."objects"
as permissive
for delete
to authenticated
using (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'advisor'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
   JOIN borrower_entities be ON p.entity_id = be.id
  WHERE (((p.id)::text = objects.path_tokens[1]) AND (p.assigned_advisor_user_id = auth.uid()) AND ((be.id)::text = objects.bucket_id)))) OR ((path_tokens[1] = 'borrower_docs'::text) AND (EXISTS ( SELECT 1
   FROM projects p
   JOIN borrower_entities be ON p.entity_id = be.id
  WHERE (((be.id)::text = objects.bucket_id) AND (p.assigned_advisor_user_id = auth.uid()))))))));

create policy "Advisor insert access to assigned resources"
on "storage"."objects"
as permissive
for insert
to authenticated
with check (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'advisor'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
   JOIN borrower_entities be ON p.entity_id = be.id
  WHERE (((p.id)::text = objects.path_tokens[1]) AND (p.assigned_advisor_user_id = auth.uid()) AND ((be.id)::text = objects.bucket_id)))) OR ((path_tokens[1] = 'borrower_docs'::text) AND (EXISTS ( SELECT 1
   FROM projects p
   JOIN borrower_entities be ON p.entity_id = be.id
  WHERE (((be.id)::text = objects.bucket_id) AND (p.assigned_advisor_user_id = auth.uid()))))))));

create policy "Advisor read access to assigned resources"
on "storage"."objects"
as permissive
for select
to authenticated
using (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'advisor'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
   JOIN borrower_entities be ON p.entity_id = be.id
  WHERE (((p.id)::text = objects.path_tokens[1]) AND (p.assigned_advisor_user_id = auth.uid()) AND ((be.id)::text = objects.bucket_id)))) OR ((path_tokens[1] = 'borrower_docs'::text) AND (EXISTS ( SELECT 1
   FROM projects p
   JOIN borrower_entities be ON p.entity_id = be.id
  WHERE (((be.id)::text = objects.bucket_id) AND (p.assigned_advisor_user_id = auth.uid()))))))));

create policy "Advisor update access to assigned resources"
on "storage"."objects"
as permissive
for update
to authenticated
using (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'advisor'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
   JOIN borrower_entities be ON p.entity_id = be.id
  WHERE (((p.id)::text = objects.path_tokens[1]) AND (p.assigned_advisor_user_id = auth.uid()) AND ((be.id)::text = objects.bucket_id)))) OR ((path_tokens[1] = 'borrower_docs'::text) AND (EXISTS ( SELECT 1
   FROM projects p
   JOIN borrower_entities be ON p.entity_id = be.id
  WHERE (((be.id)::text = objects.bucket_id) AND (p.assigned_advisor_user_id = auth.uid()))))))));


