alter table "public"."projects" add constraint "projects_assigned_advisor_user_id_fkey" FOREIGN KEY (assigned_advisor_user_id) REFERENCES profiles(id) not valid;

alter table "public"."projects" validate constraint "projects_assigned_advisor_user_id_fkey";

create policy "Assigned advisor can read project messages"
on "public"."project_messages"
as permissive
for select
to authenticated
using ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.assigned_advisor_user_id = auth.uid()))));


create policy "Assigned advisor can send project messages"
on "public"."project_messages"
as permissive
for insert
to authenticated
with check ((project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.assigned_advisor_user_id = auth.uid()))));



