SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict oPiap18bobj5LfmlShZ9XGKIg02Cc0X3nf9bDJfqqgr4F9Xvv3MLCFDq67PmW2R

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', '40d8fd2c-38c5-4176-a25c-e933b6d37413', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"aryan@owner1.com","user_id":"f85936ae-02c2-4006-9065-59caf2ad26cb","user_phone":""}}', '2025-10-29 13:13:17.490273+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e86c3d08-d085-4def-bca4-3ed0f01dd5a1', '{"action":"login","actor_id":"f85936ae-02c2-4006-9065-59caf2ad26cb","actor_name":"New User","actor_username":"aryan@owner1.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-29 13:13:17.636332+00', ''),
	('00000000-0000-0000-0000-000000000000', '412e9432-468b-4b2d-9de7-3ed0a05525c4', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"aryan@member1.com","user_id":"2a15e662-00ed-4dad-a1d0-2ff0a6a70a10","user_phone":""}}', '2025-10-29 13:14:17.506056+00', ''),
	('00000000-0000-0000-0000-000000000000', '34cdbc89-e0b4-4f82-8ded-5c2679545771', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"aryan@member2.com","user_id":"ae072ba4-9c7b-443f-a7a3-d742ab0412d7","user_phone":""}}', '2025-10-29 13:14:50.196319+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'f85936ae-02c2-4006-9065-59caf2ad26cb', 'authenticated', 'authenticated', 'aryan@owner1.com', '$2a$10$Jc1wtO.NBUGN6Q3r2G7b../dNHiC2J.GCF54NNHbfkPkcRUDkQdCu', '2025-10-29 13:13:17.491051+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-10-29 13:13:17.636715+00', '{"provider": "email", "providers": ["email"]}', '{"full_name": "New User", "email_verified": true}', NULL, '2025-10-29 13:13:17.488971+00', '2025-10-29 13:13:17.638101+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', 'authenticated', 'authenticated', 'aryan@member1.com', '$2a$10$K3xUwRJZ.hRGMqt1NURY1uUDU0EWCwOKxoGew7.VB.wEdGuAQptHa', '2025-10-29 13:14:17.506643+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "dasf", "email_verified": true}', NULL, '2025-10-29 13:14:17.505186+00', '2025-10-29 13:14:17.50692+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'ae072ba4-9c7b-443f-a7a3-d742ab0412d7', 'authenticated', 'authenticated', 'aryan@member2.com', '$2a$10$cAtsSzhyRVzQmkmo8nxWF.vkY.CGmJKksDROawybd4Y2v./0tzS6u', '2025-10-29 13:14:50.196889+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "asdf", "email_verified": true}', NULL, '2025-10-29 13:14:50.19556+00', '2025-10-29 13:14:50.19714+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('f85936ae-02c2-4006-9065-59caf2ad26cb', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '{"sub": "f85936ae-02c2-4006-9065-59caf2ad26cb", "email": "aryan@owner1.com", "email_verified": false, "phone_verified": false}', 'email', '2025-10-29 13:13:17.489801+00', '2025-10-29 13:13:17.489816+00', '2025-10-29 13:13:17.489816+00', '33e43d3d-8295-4396-835e-4548c4f2023a'),
	('2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', '2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', '{"sub": "2a15e662-00ed-4dad-a1d0-2ff0a6a70a10", "email": "aryan@member1.com", "email_verified": false, "phone_verified": false}', 'email', '2025-10-29 13:14:17.505685+00', '2025-10-29 13:14:17.505701+00', '2025-10-29 13:14:17.505701+00', '46cf22a2-7fd6-4dea-9cd4-356d1222df52'),
	('ae072ba4-9c7b-443f-a7a3-d742ab0412d7', 'ae072ba4-9c7b-443f-a7a3-d742ab0412d7', '{"sub": "ae072ba4-9c7b-443f-a7a3-d742ab0412d7", "email": "aryan@member2.com", "email_verified": false, "phone_verified": false}', 'email', '2025-10-29 13:14:50.195993+00', '2025-10-29 13:14:50.196009+00', '2025-10-29 13:14:50.196009+00', '31dfa06a-89c1-42d3-bb1b-7ab5ed64619a');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id") VALUES
	('c3015b0b-b8eb-42f8-b2c8-cf41a48a15e9', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:17.636741+00', '2025-10-29 13:13:17.636741+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '172.67.203.138', NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('c3015b0b-b8eb-42f8-b2c8-cf41a48a15e9', '2025-10-29 13:13:17.638318+00', '2025-10-29 13:13:17.638318+00', 'password', 'f2391b1d-c0c1-4a00-92b9-fce5082f4171');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, 'i4xjuhy5fdlu', 'f85936ae-02c2-4006-9065-59caf2ad26cb', false, '2025-10-29 13:13:17.63745+00', '2025-10-29 13:13:17.63745+00', NULL, 'c3015b0b-b8eb-42f8-b2c8-cf41a48a15e9');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: orgs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."orgs" ("id", "created_at", "updated_at", "name", "entity_type") VALUES
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', '2025-10-29 13:13:17.504359+00', '2025-10-29 13:13:17.504359+00', 'New User''s Organization', 'borrower');


--
-- Data for Name: borrower_resumes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."borrower_resumes" ("id", "org_id", "content", "created_at", "updated_at") VALUES
	('cc56fc54-3343-4b4e-a673-78b4163cdf83', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', '{}', '2025-10-29 13:13:17.569219+00', '2025-10-29 13:13:17.569219+00');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "created_at", "updated_at", "full_name", "email", "app_role", "active_org_id") VALUES
	('f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:17.500361+00', '2025-10-29 13:13:17.578098+00', 'New User', 'aryan@owner1.com', 'borrower', '42e192f3-f3c8-4738-b6ae-9a04283c6a45'),
	('2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', '2025-10-29 13:14:17.50896+00', '2025-10-29 13:14:17.512333+00', 'dasf', 'aryan@member1.com', 'borrower', '42e192f3-f3c8-4738-b6ae-9a04283c6a45'),
	('ae072ba4-9c7b-443f-a7a3-d742ab0412d7', '2025-10-29 13:14:50.199057+00', '2025-10-29 13:14:50.202058+00', 'asdf', 'aryan@member2.com', 'borrower', '42e192f3-f3c8-4738-b6ae-9a04283c6a45');


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."projects" ("id", "created_at", "updated_at", "name", "owner_org_id", "assigned_advisor_id") VALUES
	('d231b8bc-2239-4365-87a1-dc67bd795604', '2025-10-29 13:13:17.54112+00', '2025-10-29 13:13:17.54112+00', 'My First Project', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', NULL);


--
-- Data for Name: chat_threads; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."chat_threads" ("id", "project_id", "topic", "created_at") VALUES
	('84e4cd09-38a8-4f73-ba0b-189ac762bf60', 'd231b8bc-2239-4365-87a1-dc67bd795604', 'General', '2025-10-29 13:13:17.564001+00');


--
-- Data for Name: chat_thread_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."chat_thread_participants" ("thread_id", "user_id", "created_at") VALUES
	('84e4cd09-38a8-4f73-ba0b-189ac762bf60', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:17.565846+00'),
	('84e4cd09-38a8-4f73-ba0b-189ac762bf60', '2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', '2025-10-29 13:14:17.518396+00'),
	('84e4cd09-38a8-4f73-ba0b-189ac762bf60', 'ae072ba4-9c7b-443f-a7a3-d742ab0412d7', '2025-10-29 13:14:50.207947+00');


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."resources" ("id", "org_id", "project_id", "parent_id", "resource_type", "name", "created_at", "updated_at", "current_version_id") VALUES
	('89fd9994-86c9-4653-bf07-66035e507ead', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604', NULL, 'PROJECT_RESUME', 'My First Project Resume', '2025-10-29 13:13:17.554774+00', '2025-10-29 13:13:17.554774+00', NULL),
	('0d03c059-0c16-44ba-9468-bc8fee6934d1', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604', NULL, 'PROJECT_DOCS_ROOT', 'My First Project Documents', '2025-10-29 13:13:17.557205+00', '2025-10-29 13:13:17.557205+00', NULL),
	('6a20f3f2-dbde-4a11-ba26-7179571e897d', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604', NULL, 'BORROWER_RESUME', 'My First Project Borrower Resume', '2025-10-29 13:13:17.571908+00', '2025-10-29 13:13:17.571908+00', NULL),
	('f74def96-dd01-48bd-906e-9cdd4b98d8bd', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604', NULL, 'BORROWER_DOCS_ROOT', 'My First Project Borrower Documents', '2025-10-29 13:13:17.5744+00', '2025-10-29 13:13:17.5744+00', NULL),
	('fdc22544-f26b-4e08-abad-abe911db207d', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604', '0d03c059-0c16-44ba-9468-bc8fee6934d1', 'FILE', 'Aryan Jain - Resume.pdf', '2025-10-29 13:13:32.077107+00', '2025-10-29 13:13:32.116384+00', 'bfd663b7-e7e3-4148-a68f-34b0fb98c0e0'),
	('39190120-d52a-4827-a7e1-1183ab93e732', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604', '0d03c059-0c16-44ba-9468-bc8fee6934d1', 'FILE', 'Financial Sample for Power BI.xlsx', '2025-10-29 13:13:37.646462+00', '2025-10-29 13:13:37.682389+00', '33606e9c-5163-49d7-b0ec-a166c5f53017'),
	('774e9350-1474-432c-b12c-3fb6e01401a4', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604', '0d03c059-0c16-44ba-9468-bc8fee6934d1', 'FILE', 'TrumpCreditMemoOMExample.pdf', '2025-10-29 13:13:43.238311+00', '2025-10-29 13:13:43.325621+00', 'fae6b2ee-fc19-4ef0-8ed5-f03adebc0c99');


--
-- Data for Name: document_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."document_versions" ("id", "resource_id", "version_number", "storage_path", "created_by", "created_at", "changes_url", "metadata", "status") VALUES
	('bfd663b7-e7e3-4148-a68f-34b0fb98c0e0', 'fdc22544-f26b-4e08-abad-abe911db207d', 1, 'd231b8bc-2239-4365-87a1-dc67bd795604/project-docs/fdc22544-f26b-4e08-abad-abe911db207d/v1_Aryan Jain - Resume.pdf', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:32.082801+00', NULL, NULL, 'active'),
	('33606e9c-5163-49d7-b0ec-a166c5f53017', '39190120-d52a-4827-a7e1-1183ab93e732', 1, 'd231b8bc-2239-4365-87a1-dc67bd795604/project-docs/39190120-d52a-4827-a7e1-1183ab93e732/v1_Financial Sample for Power BI.xlsx', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:37.655321+00', NULL, NULL, 'active'),
	('fae6b2ee-fc19-4ef0-8ed5-f03adebc0c99', '774e9350-1474-432c-b12c-3fb6e01401a4', 1, 'd231b8bc-2239-4365-87a1-dc67bd795604/project-docs/774e9350-1474-432c-b12c-3fb6e01401a4/v1_TrumpCreditMemoOMExample.pdf', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:43.245586+00', NULL, NULL, 'active');


--
-- Data for Name: invites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."invites" ("id", "org_id", "invited_by", "invited_email", "role", "token", "status", "expires_at", "accepted_at", "created_at", "project_grants", "org_grants") VALUES
	('cbc7532e-fd7e-4058-b01a-f0efddb0c3c6', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'f85936ae-02c2-4006-9065-59caf2ad26cb', 'aryan@member1.com', 'member', '601c3dc5-39a8-4d51-92a2-8fe3082c0644', 'accepted', '2025-11-05 13:14:04.293548+00', '2025-10-29 13:14:17.52+00', '2025-10-29 13:14:04.293548+00', '[{"projectId": "d231b8bc-2239-4365-87a1-dc67bd795604", "permissions": [{"permission": "view", "resource_type": "PROJECT_RESUME"}, {"permission": "view", "resource_type": "PROJECT_DOCS_ROOT"}], "fileOverrides": [{"permission": "none", "resource_id": "fdc22544-f26b-4e08-abad-abe911db207d"}]}]', NULL),
	('7f2c6c7c-6a3d-4a97-af40-9bf972950566', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'f85936ae-02c2-4006-9065-59caf2ad26cb', 'aryan@member2.com', 'member', '7112f7e3-6209-41d4-99da-e45a5f2d37e0', 'accepted', '2025-11-05 13:14:39.349317+00', '2025-10-29 13:14:50.21+00', '2025-10-29 13:14:39.349317+00', '[{"projectId": "d231b8bc-2239-4365-87a1-dc67bd795604", "permissions": [{"permission": "view", "resource_type": "PROJECT_RESUME"}, {"permission": "view", "resource_type": "PROJECT_DOCS_ROOT"}], "fileOverrides": [{"permission": "none", "resource_id": "774e9350-1474-432c-b12c-3fb6e01401a4"}]}]', NULL);


--
-- Data for Name: project_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: org_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."org_members" ("org_id", "user_id", "role", "created_at") VALUES
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'f85936ae-02c2-4006-9065-59caf2ad26cb', 'owner', '2025-10-29 13:13:17.535617+00'),
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', '2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', 'member', '2025-10-29 13:14:17.510466+00'),
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'ae072ba4-9c7b-443f-a7a3-d742ab0412d7', 'member', '2025-10-29 13:14:50.20065+00');


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."permissions" ("resource_id", "user_id", "permission", "granted_by", "created_at") VALUES
	('0d03c059-0c16-44ba-9468-bc8fee6934d1', 'f85936ae-02c2-4006-9065-59caf2ad26cb', 'edit', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:17.560693+00'),
	('89fd9994-86c9-4653-bf07-66035e507ead', 'f85936ae-02c2-4006-9065-59caf2ad26cb', 'edit', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:17.562611+00'),
	('f74def96-dd01-48bd-906e-9cdd4b98d8bd', 'f85936ae-02c2-4006-9065-59caf2ad26cb', 'edit', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:17.576793+00'),
	('89fd9994-86c9-4653-bf07-66035e507ead', '2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', 'view', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:14:17.51376+00'),
	('0d03c059-0c16-44ba-9468-bc8fee6934d1', '2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', 'view', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:14:17.51376+00'),
	('fdc22544-f26b-4e08-abad-abe911db207d', '2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', 'none', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:14:17.515861+00'),
	('89fd9994-86c9-4653-bf07-66035e507ead', 'ae072ba4-9c7b-443f-a7a3-d742ab0412d7', 'view', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:14:50.203534+00'),
	('0d03c059-0c16-44ba-9468-bc8fee6934d1', 'ae072ba4-9c7b-443f-a7a3-d742ab0412d7', 'view', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:14:50.203534+00'),
	('774e9350-1474-432c-b12c-3fb6e01401a4', 'ae072ba4-9c7b-443f-a7a3-d742ab0412d7', 'none', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:14:50.205368+00');


--
-- Data for Name: project_access_grants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."project_access_grants" ("id", "project_id", "org_id", "user_id", "granted_by", "created_at") VALUES
	('dbda757e-d24b-4328-a585-0219cad8b432', 'd231b8bc-2239-4365-87a1-dc67bd795604', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'f85936ae-02c2-4006-9065-59caf2ad26cb', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:17.558626+00'),
	('65d62f77-acd9-4b66-ad47-f651280e0bb2', 'd231b8bc-2239-4365-87a1-dc67bd795604', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', '2a15e662-00ed-4dad-a1d0-2ff0a6a70a10', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:14:17.51376+00'),
	('a88bfb51-2773-421d-ac12-84002f49dfa8', 'd231b8bc-2239-4365-87a1-dc67bd795604', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'ae072ba4-9c7b-443f-a7a3-d742ab0412d7', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:14:50.203534+00');


--
-- Data for Name: project_resumes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."project_resumes" ("id", "project_id", "content", "created_at", "updated_at", "version_number", "status", "created_by") VALUES
	('b0f4960f-dbb8-4ad6-a1be-89dc0a4b9ead', 'd231b8bc-2239-4365-87a1-dc67bd795604', '{}', '2025-10-29 13:13:17.543482+00', '2025-10-29 13:13:17.543482+00', 1, 'active', 'f85936ae-02c2-4006-9065-59caf2ad26cb');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', NULL, '2025-10-29 13:13:17.509779+00', '2025-10-29 13:13:17.509779+00', false, false, 52428800, '{application/pdf,image/jpeg,image/png,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/zip,text/plain;charset=UTF-8}', NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "cache_control", "bucket_id_namespace", "tenant_id") VALUES
	('ebd39556-fd96-4e6b-a57a-91029dba766d', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/borrower-docs/.keep', NULL, '2025-10-29 13:13:17.529977+00', '2025-10-29 13:13:17.529977+00', '2025-10-29 13:13:17.529977+00', '{"eTag": "\"d41d8cd98f00b204e9800998ecf8427e\"", "size": 0, "mimetype": "text/plain", "cacheControl": "max-age=3600", "lastModified": "2025-10-29T13:13:17.525Z", "contentLength": 0, "httpStatusCode": 200}', 'd82f0218-1ac9-4c73-b56b-02a8db7b2921', NULL, '{}', 2),
	('52dbd579-b7c4-49ba-a6c1-7255e2bcb624', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/project-docs/.keep', NULL, '2025-10-29 13:13:17.551582+00', '2025-10-29 13:13:17.551582+00', '2025-10-29 13:13:17.551582+00', '{"eTag": "\"d41d8cd98f00b204e9800998ecf8427e\"", "size": 0, "mimetype": "text/plain", "cacheControl": "max-age=3600", "lastModified": "2025-10-29T13:13:17.549Z", "contentLength": 0, "httpStatusCode": 200}', '54ad5982-f271-4a6c-9efe-7446179d9531', NULL, '{}', 2),
	('20dc9ebc-86fd-4ab8-9cd3-8b04de3676a1', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/fdc22544-f26b-4e08-abad-abe911db207d/v1_Aryan Jain - Resume.pdf', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:32.104971+00', '2025-10-29 13:13:32.104971+00', '2025-10-29 13:13:32.104971+00', '{"eTag": "\"f25a0529b60a63a37b294c04f4d07426\"", "size": 116521, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2025-10-29T13:13:32.101Z", "contentLength": 116521, "httpStatusCode": 200}', 'adb0252c-4442-4665-841d-9b347b8bc745', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '{}', 3),
	('785934c8-6020-423c-a24e-f40c73cf634c', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/39190120-d52a-4827-a7e1-1183ab93e732/v1_Financial Sample for Power BI.xlsx', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:37.671172+00', '2025-10-29 13:13:37.671172+00', '2025-10-29 13:13:37.671172+00', '{"eTag": "\"2144cb2ec4ebbc8cd508d8cf02c04bd2\"", "size": 83418, "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "cacheControl": "max-age=3600", "lastModified": "2025-10-29T13:13:37.669Z", "contentLength": 83418, "httpStatusCode": 200}', '825a1adb-1073-486b-b428-facea06af6ac', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '{}', 3),
	('cd8d5fda-720c-4e79-94b9-85622018f4f4', '42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/774e9350-1474-432c-b12c-3fb6e01401a4/v1_TrumpCreditMemoOMExample.pdf', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '2025-10-29 13:13:43.310951+00', '2025-10-29 13:13:43.310951+00', '2025-10-29 13:13:43.310951+00', '{"eTag": "\"7f81f3d3a6d050d35ad4f710dc3e5d84\"", "size": 5097468, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2025-10-29T13:13:43.288Z", "contentLength": 5097468, "httpStatusCode": 200}', 'c517ba81-415c-41fa-a2e4-2cc3a2f8f880', 'f85936ae-02c2-4006-9065-59caf2ad26cb', '{}', 3);


--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."prefixes" ("bucket_id", "name", "created_at", "updated_at") VALUES
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/borrower-docs', '2025-10-29 13:13:17.529977+00', '2025-10-29 13:13:17.529977+00'),
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/project-docs', '2025-10-29 13:13:17.551582+00', '2025-10-29 13:13:17.551582+00'),
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/project-docs/fdc22544-f26b-4e08-abad-abe911db207d', '2025-10-29 13:13:32.104971+00', '2025-10-29 13:13:32.104971+00'),
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/project-docs/39190120-d52a-4827-a7e1-1183ab93e732', '2025-10-29 13:13:37.671172+00', '2025-10-29 13:13:37.671172+00'),
	('42e192f3-f3c8-4738-b6ae-9a04283c6a45', 'd231b8bc-2239-4365-87a1-dc67bd795604/project-docs/774e9350-1474-432c-b12c-3fb6e01401a4', '2025-10-29 13:13:43.310951+00', '2025-10-29 13:13:43.310951+00');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, true);


--
-- Name: message_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."message_attachments_id_seq"', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."notifications_id_seq"', 1, false);


--
-- Name: project_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."project_messages_id_seq"', 1, false);


--
-- Name: version_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."version_number_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict oPiap18bobj5LfmlShZ9XGKIg02Cc0X3nf9bDJfqqgr4F9Xvv3MLCFDq67PmW2R

RESET ALL;
