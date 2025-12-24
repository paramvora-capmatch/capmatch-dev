"""Database connection and query functions using Supabase Python SDK."""

from supabase import create_client, Client
from supabase.client import ClientOptions
from typing import List, Dict, Any, Optional, Set
from datetime import date
import logging

logger = logging.getLogger(__name__)


class Database:
    """Database connection manager using Supabase client."""
    
    def __init__(self, supabase_url: str, supabase_key: str, *, skip_idempotency: bool = False):
        self.client: Client = create_client(
            supabase_url,
            supabase_key,
            options=ClientOptions(
                postgrest_client_timeout=30,  # Timeout for database queries in seconds
                storage_client_timeout=30,    # Timeout for storage operations in seconds
            )
        )
        self.skip_idempotency = skip_idempotency
    
    def get_users_with_digest_preferences(self) -> List[Dict[str, Any]]:
        """
        Get all users who should receive digest emails.
        This includes:
        1. Users with explicit digest preferences for email channel
        2. All other users (they'll get defaults: chat_message_sent and document_uploaded)
        
        Returns list of users with their email addresses.
        """
        # Get all users (we'll filter for email in Python)
        users_response = self.client.table('profiles').select(
            'id, email, full_name'
        ).execute()
        
        if not users_response.data:
            return []
        
        # Filter to only users with emails
        users_with_emails = [u for u in users_response.data if u.get('email')]
        
        # Get users with digest preferences
        digest_prefs_response = self.client.table('user_notification_preferences').select(
            'user_id'
        ).in_('channel', ['email', '*']).eq('status', 'digest').execute()
        
        digest_user_ids = {p['user_id'] for p in digest_prefs_response.data}
        
        # Get all users with any email preferences
        all_email_prefs_response = self.client.table('user_notification_preferences').select(
            'user_id'
        ).in_('channel', ['email', '*']).execute()
        
        users_with_email_prefs = {p['user_id'] for p in all_email_prefs_response.data}
        
        # Return users with digest prefs OR users without any email prefs
        result = []
        for user in users_with_emails:
            if (
                user['id'] in digest_user_ids or 
                user['id'] not in users_with_email_prefs
            ):
                result.append({
                    'user_id': user['id'],
                    'email': user['email'],
                    'full_name': user.get('full_name')
                })
        
        return result
    
    def get_unprocessed_events(
        self, 
        user_id: str, 
        digest_date: date,
        start_time: str,
        end_time: str
    ) -> List[Dict[str, Any]]:
        """
        Get all events from digest_date that should be in digest for this user
        and haven't been processed yet.
        
        Uses SQL filtering to exclude processed events at the database level.
        
        Returns events that:
        1. Occurred within the date range
        2. Haven't been processed for this user/date
        """
        if self.skip_idempotency:
            logger.debug(
                "[testing] SKIP_IDEMPOTENCY_CHECK true -> returning all domain events regardless of time"
            )
            query = self.client.table('domain_events').select('*')
            events_response = query.order('occurred_at', desc=False).execute()
            return events_response.data or []
        
        # Use RPC function or LEFT JOIN to filter processed events in SQL
        # This is more efficient than fetching all events and filtering in Python
        try:
            # Try using RPC function if available (more efficient)
            response = self.client.rpc(
                'get_unprocessed_digest_events',
                {
                    'p_user_id': user_id,
                    'p_digest_date': digest_date.isoformat(),
                    'p_start_time': start_time,
                    'p_end_time': end_time
                }
            ).execute()
            
            events = response.data or []
            logger.debug(
                "[idempotency] Found %d unprocessed events for user %s on %s (via RPC)",
                len(events),
                user_id,
                digest_date,
            )
            return events
        except Exception as e:
            # Fallback: query and filter in Python (original method)
            logger.debug(f"RPC function not available, using fallback method: {e}")
            
            query = self.client.table('domain_events').select('*')
            query = query.gte('occurred_at', start_time).lt('occurred_at', end_time)
            events_response = query.order('occurred_at', desc=False).execute()
            events = events_response.data or []
            
            # Get processed events for this user/date
            processed_response = self.client.table('email_digest_processed').select(
                'event_id'
            ).eq('user_id', user_id).eq('digest_date', digest_date.isoformat()).execute()
            
            processed_event_ids = {p['event_id'] for p in (processed_response.data or [])}
            
            # Filter out processed events
            filtered = [
                event for event in events
                if event['id'] not in processed_event_ids
            ]

            logger.debug(
                "[idempotency] Filtered %d/%d events for user %s on %s",
                len(events) - len(filtered),
                len(events),
                user_id,
                digest_date,
            )
            
            return filtered
    
    def get_event_recipients(self, event: Dict[str, Any]) -> Set[str]:
        """
        Get list of user IDs who should receive this event.
        Reuses logic from notify-fan-out: project access grants + org owners + thread participants.
        
        NOTE: For batch processing, use get_batch_event_recipients() instead.
        """
        recipients = set()
        logger.debug(
            "[recipients] event_id=%s type=%s project=%s thread=%s resource=%s actor=%s",
            event.get("id"),
            event.get("event_type"),
            event.get("project_id"),
            event.get("thread_id"),
            event.get("resource_id"),
            event.get("actor_id"),
        )
        
        # Get project access grants
        if event.get('project_id'):
            grants_response = self.client.table('project_access_grants').select(
                'user_id'
            ).eq('project_id', event['project_id']).execute()
            
            for grant in grants_response.data:
                if grant.get('user_id'):
                    recipients.add(grant['user_id'])
        
        # Get org owners if resource_id exists
        if event.get('resource_id'):
            # First get the resource's org_id
            resource_response = self.client.table('resources').select(
                'org_id'
            ).eq('id', event['resource_id']).single().execute()
            
            if resource_response.data and resource_response.data.get('org_id'):
                org_id = resource_response.data['org_id']
                owners_response = self.client.table('org_members').select(
                    'user_id'
                ).eq('org_id', org_id).eq('role', 'owner').execute()
                
                for owner in owners_response.data:
                    if owner.get('user_id'):
                        recipients.add(owner['user_id'])
        
        # Get thread participants if thread_id exists
        if event.get('thread_id'):
            participants_response = self.client.table('chat_thread_participants').select(
                'user_id'
            ).eq('thread_id', event['thread_id']).execute()
            
            for participant in participants_response.data:
                if participant.get('user_id'):
                    recipients.add(participant['user_id'])
        
        # Exclude actor
        if event.get('actor_id'):
            recipients.discard(event['actor_id'])
            logger.debug(
                "[recipients] removed actor %s from recipient list",
                event['actor_id']
            )
        
        logger.debug(
            "[recipients] final recipients for event %s: %s",
            event.get("id"),
            list(recipients),
        )
        return recipients
    
    def get_batch_event_recipients(self, events: List[Dict[str, Any]]) -> Dict[str, Set[str]]:
        """
        Batch query recipients for multiple events.
        
        Collects all unique project_ids, thread_ids, and resource_ids,
        then makes batch queries to build recipient maps.
        
        Args:
            events: List of domain events
            
        Returns:
            Dictionary mapping event_id to set of recipient user_ids
        """
        if not events:
            return {}
        
        # Collect unique IDs
        project_ids = set()
        thread_ids = set()
        resource_ids = set()
        event_actors = {}  # event_id -> actor_id
        
        for event in events:
            event_id = str(event.get('id'))
            if event.get('project_id'):
                project_ids.add(event['project_id'])
            if event.get('thread_id'):
                thread_ids.add(event['thread_id'])
            if event.get('resource_id'):
                resource_ids.add(event['resource_id'])
            if event.get('actor_id'):
                event_actors[event_id] = event['actor_id']
        
        # Initialize recipient map
        recipients_map: Dict[str, Set[str]] = {str(e.get('id')): set() for e in events}
        
        # Batch query 1: Project access grants
        if project_ids:
            try:
                grants_response = self.client.table('project_access_grants').select(
                    'project_id, user_id'
                ).in_('project_id', list(project_ids)).execute()
                
                # Build project -> users map
                project_users: Dict[str, Set[str]] = {}
                for grant in grants_response.data or []:
                    pid = grant.get('project_id')
                    uid = grant.get('user_id')
                    if pid and uid:
                        if pid not in project_users:
                            project_users[pid] = set()
                        project_users[pid].add(uid)
                
                # Apply to events
                for event in events:
                    event_id = str(event.get('id'))
                    pid = event.get('project_id')
                    if pid and pid in project_users:
                        recipients_map[event_id].update(project_users[pid])
            except Exception as e:
                logger.error(f"Error batch querying project access grants: {e}", exc_info=True)
        
        # Batch query 2: Thread participants
        if thread_ids:
            try:
                participants_response = self.client.table('chat_thread_participants').select(
                    'thread_id, user_id'
                ).in_('thread_id', list(thread_ids)).execute()
                
                # Build thread -> users map
                thread_users: Dict[str, Set[str]] = {}
                for participant in participants_response.data or []:
                    tid = participant.get('thread_id')
                    uid = participant.get('user_id')
                    if tid and uid:
                        if tid not in thread_users:
                            thread_users[tid] = set()
                        thread_users[tid].add(uid)
                
                # Apply to events
                for event in events:
                    event_id = str(event.get('id'))
                    tid = event.get('thread_id')
                    if tid and tid in thread_users:
                        recipients_map[event_id].update(thread_users[tid])
            except Exception as e:
                logger.error(f"Error batch querying thread participants: {e}", exc_info=True)
        
        # Batch query 3: Resources -> org_id -> org owners
        if resource_ids:
            try:
                # Get resources with org_ids
                resources_response = self.client.table('resources').select(
                    'id, org_id'
                ).in_('id', list(resource_ids)).execute()
                
                # Build resource -> org_id map
                resource_orgs: Dict[str, str] = {}
                org_ids = set()
                for resource in resources_response.data or []:
                    rid = resource.get('id')
                    oid = resource.get('org_id')
                    if rid and oid:
                        resource_orgs[rid] = oid
                        org_ids.add(oid)
                
                # Get org owners
                if org_ids:
                    owners_response = self.client.table('org_members').select(
                        'org_id, user_id'
                    ).in_('org_id', list(org_ids)).eq('role', 'owner').execute()
                    
                    # Build org -> users map
                    org_users: Dict[str, Set[str]] = {}
                    for owner in owners_response.data or []:
                        oid = owner.get('org_id')
                        uid = owner.get('user_id')
                        if oid and uid:
                            if oid not in org_users:
                                org_users[oid] = set()
                            org_users[oid].add(uid)
                    
                    # Apply to events
                    for event in events:
                        event_id = str(event.get('id'))
                        rid = event.get('resource_id')
                        if rid and rid in resource_orgs:
                            oid = resource_orgs[rid]
                            if oid in org_users:
                                recipients_map[event_id].update(org_users[oid])
            except Exception as e:
                logger.error(f"Error batch querying resource/org owners: {e}", exc_info=True)
        
        # Exclude actors from all events
        for event_id, actor_id in event_actors.items():
            if event_id in recipients_map:
                recipients_map[event_id].discard(actor_id)
        
        logger.debug(
            "[batch-recipients] Processed %d events, found recipients for %d events",
            len(events),
            sum(1 for r in recipients_map.values() if r)
        )
        
        return recipients_map
    
    def check_resource_access(self, user_id: str, resource_id: str) -> bool:
        """Check if user has view access to a resource using RPC function."""
        try:
            response = self.client.rpc(
                'can_view',
                {
                    'p_user_id': user_id,
                    'p_resource_id': resource_id
                }
            ).execute()
            
            return response.data if response.data else False
        except Exception as e:
            logger.warning(f"Error checking resource access for user {user_id}, resource {resource_id}: {e}")
            return False
    
    def check_resource_access_batch(self, user_id: str, resource_ids: List[str]) -> Dict[str, bool]:
        """
        Batch check resource access for multiple resources.
        
        Args:
            user_id: User ID to check access for
            resource_ids: List of resource IDs to check
            
        Returns:
            Dictionary mapping resource_id to access boolean
        """
        if not resource_ids:
            return {}
        
        # For now, check individually (could be optimized with batch RPC if available)
        # Most users with project access will have resource access, so this is a fallback
        access_map = {}
        for resource_id in resource_ids:
            try:
                access_map[resource_id] = self.check_resource_access(user_id, resource_id)
            except Exception as e:
                logger.warning(f"Error checking resource access for {resource_id}: {e}")
                access_map[resource_id] = False
        
        return access_map
    
    def get_project_names(self, project_ids: List[str]) -> Dict[str, str]:
        """Batch fetch project names."""
        if not project_ids:
            return {}
        
        response = self.client.table('projects').select(
            'id, name'
        ).in_('id', project_ids).execute()
        
        return {row['id']: row['name'] for row in response.data}
    
    def mark_events_processed(
        self, 
        events: List[Dict[str, Any]], 
        user_id: str, 
        digest_date: date
    ) -> None:
        """Mark events as processed in email_digest_processed table using bulk insert."""
        if not events:
            return

        if self.skip_idempotency:
            logger.debug(
                "[idempotency] Skipping mark_events_processed for user %s (testing mode)",
                user_id,
            )
            return
        
        # Prepare data for batch insert
        records = [
            {
                'event_id': event['id'],
                'user_id': user_id,
                'digest_date': digest_date.isoformat()
            }
            for event in events
        ]
        
        # Bulk insert with conflict handling
        try:
            # Use upsert with on_conflict to handle duplicates
            response = self.client.table('email_digest_processed').upsert(
                records,
                on_conflict='event_id,user_id,digest_date'
            ).execute()
            
            inserted = len(records)
            logger.info(f"Marked {inserted} events as processed for user {user_id} (bulk insert)")
        except Exception as e:
            # Fallback: try individual inserts (slower but more resilient)
            logger.warning(f"Bulk insert failed, falling back to individual inserts: {e}")
            inserted = 0
            for record in records:
                try:
                    self.client.table('email_digest_processed').upsert(
                        record,
                        on_conflict='event_id,user_id,digest_date'
                    ).execute()
                    inserted += 1
                except Exception:
                    # Ignore duplicate key errors (ON CONFLICT DO NOTHING behavior)
                    pass
            logger.info(f"Marked {inserted}/{len(records)} events as processed for user {user_id} (individual inserts)")

