import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, projectId, folderId, fileName, folderName } = await req.json();
    
    if (!action) {
      throw new Error("action is required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user has permission
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    ).auth.getUser(jwt);
    if (userError) throw new Error("Authentication failed");

    let result;

    switch (action) {
      case 'create_folder':
        if (!projectId || !folderName) {
          throw new Error("projectId and folderName are required for create_folder");
        }
        result = await createFolder(supabaseAdmin, user.id, projectId, folderId, folderName);
        break;

      case 'delete_file':
        if (!fileName) {
          throw new Error("fileName is required for delete_file");
        }
        result = await deleteFile(supabaseAdmin, user.id, fileName);
        break;

      case 'delete_folder':
        if (!folderId) {
          throw new Error("folderId is required for delete_folder");
        }
        result = await deleteFolder(supabaseAdmin, user.id, folderId);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[manage-documents] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function createFolder(supabaseAdmin: any, userId: string, projectId: string, parentFolderId: string | null, folderName: string) {
  // Get the project docs root resource
  const { data: docsRoot, error: docsRootError } = await supabaseAdmin
    .from('resources')
    .select('id')
    .eq('project_id', projectId)
    .eq('resource_type', 'PROJECT_DOCS_ROOT')
    .single();

  if (docsRootError) {
    throw new Error(`Failed to find project docs root: ${docsRootError.message}`);
  }

  const parentId = parentFolderId || docsRoot.id;

  // Create the folder resource
  const { data: folderResource, error: folderResourceError } = await supabaseAdmin
    .from('resources')
    .insert({
      project_id: projectId,
      parent_id: parentId,
      resource_type: 'FOLDER',
      name: folderName
    })
    .select()
    .single();

  if (folderResourceError) {
    throw new Error(`Failed to create folder: ${folderResourceError.message}`);
  }

  return folderResource;
}

async function deleteFile(supabaseAdmin: any, userId: string, fileName: string) {
  // Get the file resource to get the storage path
  const { data: fileResource, error: fileResourceError } = await supabaseAdmin
    .from('resources')
    .select('storage_path, org_id')
    .eq('name', fileName)
    .single();

  if (fileResourceError) {
    throw new Error(`Failed to find file resource: ${fileResourceError.message}`);
  }

  // Delete from storage if storage path exists
  if (fileResource.storage_path) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(fileResource.org_id)
      .remove([fileResource.storage_path]);

    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
      // Continue with resource deletion even if storage deletion fails
    }
  }

  // Delete the resource
  const { error: deleteError } = await supabaseAdmin
    .from('resources')
    .delete()
    .eq('name', fileName);

  if (deleteError) {
    throw new Error(`Failed to delete file resource: ${deleteError.message}`);
  }

  return { success: true };
}

async function deleteFolder(supabaseAdmin: any, userId: string, folderId: string) {
  // Check if folder has children
  const { data: children, error: childrenError } = await supabaseAdmin
    .from('resources')
    .select('id')
    .eq('parent_id', folderId);

  if (childrenError) {
    throw new Error(`Failed to check folder children: ${childrenError.message}`);
  }

  if (children && children.length > 0) {
    throw new Error('Cannot delete folder with contents. Please delete all files and subfolders first.');
  }

  // Delete the folder resource
  const { error: deleteError } = await supabaseAdmin
    .from('resources')
    .delete()
    .eq('id', folderId);

  if (deleteError) {
    throw new Error(`Failed to delete folder resource: ${deleteError.message}`);
  }

  return { success: true };
}
