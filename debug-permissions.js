// Debug script to check permissions and project visibility
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPermissions() {
  try {
    console.log('=== Debugging Permissions and Project Visibility ===\n');

    // 1. Check if we can see projects directly
    console.log('1. Checking projects table access...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*');
    
    if (projectsError) {
      console.error('❌ Projects query failed:', projectsError);
    } else {
      console.log('✅ Projects query successful:', projects?.length || 0, 'projects found');
      if (projects && projects.length > 0) {
        console.log('   Sample project:', projects[0]);
      }
    }

    // 2. Check resources table
    console.log('\n2. Checking resources table access...');
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('*');
    
    if (resourcesError) {
      console.error('❌ Resources query failed:', resourcesError);
    } else {
      console.log('✅ Resources query successful:', resources?.length || 0, 'resources found');
      if (resources && resources.length > 0) {
        console.log('   Sample resource:', resources[0]);
      }
    }

    // 3. Check org_members table
    console.log('\n3. Checking org_members table access...');
    const { data: orgMembers, error: orgMembersError } = await supabase
      .from('org_members')
      .select('*');
    
    if (orgMembersError) {
      console.error('❌ Org members query failed:', orgMembersError);
    } else {
      console.log('✅ Org members query successful:', orgMembers?.length || 0, 'members found');
      if (orgMembers && orgMembers.length > 0) {
        console.log('   Sample member:', orgMembers[0]);
      }
    }

    // 4. Check profiles table
    console.log('\n4. Checking profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Profiles query failed:', profilesError);
    } else {
      console.log('✅ Profiles query successful:', profiles?.length || 0, 'profiles found');
      if (profiles && profiles.length > 0) {
        console.log('   Sample profile:', profiles[0]);
      }
    }

    // 5. Test permission functions
    console.log('\n5. Testing permission functions...');
    if (profiles && profiles.length > 0 && orgMembers && orgMembers.length > 0) {
      const testUserId = profiles[0].id;
      const testOrgId = orgMembers[0].org_id;
      
      console.log(`   Testing with user: ${testUserId}, org: ${testOrgId}`);
      
      // Test get_user_role
      const { data: userRole, error: roleError } = await supabase
        .rpc('get_user_role', { p_user_id: testUserId, p_org_id: testOrgId });
      
      if (roleError) {
        console.error('❌ get_user_role failed:', roleError);
      } else {
        console.log('✅ get_user_role result:', userRole);
      }

      // Test can_view on a resource
      if (resources && resources.length > 0) {
        const testResourceId = resources[0].id;
        const { data: canView, error: canViewError } = await supabase
          .rpc('can_view', { p_user_id: testUserId, p_resource_id: testResourceId });
        
        if (canViewError) {
          console.error('❌ can_view failed:', canViewError);
        } else {
          console.log('✅ can_view result:', canView);
        }
      }
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Run the debug script
debugPermissions();
