// src/lib/entityStorage.ts
import { supabase } from '../../lib/supabaseClient';

/**
 * Creates a storage bucket for an entity if it doesn't exist
 */
export async function ensureEntityBucket(entityId: string): Promise<boolean> {
  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets?.some(bucket => bucket.id === entityId);

    if (bucketExists) {
      console.log(`[EntityStorage] Bucket ${entityId} already exists`);
      return true;
    }
    
    // Create the bucket
    const { error } = await supabase.storage.createBucket(entityId, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip'
      ]
    });
    
    if (error) {
      console.error(`[EntityStorage] Error creating bucket ${entityId}:`, error);
      return false;
    }
    
    console.log(`[EntityStorage] Successfully created bucket ${entityId}`);
    return true;
  } catch (error) {
    console.error(`[EntityStorage] Unexpected error creating bucket ${entityId}:`, error);
    return false;
  }
}

/**
 * Creates a project folder within an entity bucket
 */
export async function createProjectFolder(entityId: string, projectId: string): Promise<boolean> {
  try {
    // Ensure bucket exists first
    const bucketExists = await ensureEntityBucket(entityId);
    if (!bucketExists) {
      return false;
    }
    
    // Create .keep file to establish the folder
    const keepFilePath = `${projectId}/.keep`;
    
    const { error } = await supabase.storage
      .from(entityId)
      .upload(keepFilePath, new Blob([""]), {
        contentType: "text/plain",
        upsert: true // Use upsert to prevent errors if folder/file already exists
      });
    
    if (error) {
      console.error(`[EntityStorage] Error creating project folder ${projectId} in entity ${entityId}:`, error);
      return false;
    }
    
    console.log(`[EntityStorage] Successfully created project folder ${projectId} in entity ${entityId}`);
    return true;
  } catch (error) {
    console.error(`[EntityStorage] Unexpected error creating project folder:`, error);
    return false;
  }
}

/**
 * Creates a general borrower docs folder within an entity bucket
 */
export async function createBorrowerDocsFolder(entityId: string): Promise<boolean> {
  try {
    // Ensure bucket exists first
    const bucketExists = await ensureEntityBucket(entityId);
    if (!bucketExists) {
      return false;
    }
    
    // Create .keep file to establish the folder
    const keepFilePath = `borrower_docs/.keep`;
    
    const { error } = await supabase.storage
      .from(entityId)
      .upload(keepFilePath, new Blob([""]), {
        contentType: "text/plain",
        upsert: true // Use upsert to prevent errors if folder/file already exists
      });
    
    if (error) {
      console.error(`[EntityStorage] Error creating borrower_docs folder in entity ${entityId}:`, error);
      return false;
    }
    
    console.log(`[EntityStorage] Successfully created borrower_docs folder in entity ${entityId}`);
    return true;
  } catch (error) {
    console.error(`[EntityStorage] Unexpected error creating borrower_docs folder:`, error);
    return false;
  }
}

/**
 * Migrates documents from user bucket to entity bucket
 */
export async function migrateUserDocumentsToEntity(
  userId: string, 
  entityId: string, 
  projectId?: string
): Promise<boolean> {
  try {
    console.log(`[EntityStorage] Starting migration from user ${userId} to entity ${entityId}`);
    
    // Ensure entity bucket exists
    const bucketExists = await ensureEntityBucket(entityId);
    if (!bucketExists) {
      return false;
    }
    
    // List all files in user bucket
    const { data: files, error: listError } = await supabase.storage
      .from(userId)
      .list('', { limit: 1000 });
    
    if (listError) {
      console.error(`[EntityStorage] Error listing files in user bucket ${userId}:`, listError);
      return false;
    }
    
    if (!files || files.length === 0) {
      console.log(`[EntityStorage] No files found in user bucket ${userId}`);
      return true;
    }
    
    // Copy each file to entity bucket
    for (const file of files) {
      if (file.name === '.keep') continue; // Skip .keep files
      
      try {
        // Download from user bucket
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(userId)
          .download(file.name);
        
        if (downloadError) {
          console.error(`[EntityStorage] Error downloading ${file.name}:`, downloadError);
          continue;
        }
        
        // Determine target path
        const targetPath = projectId ? `${projectId}/${file.name}` : file.name;
        
        // Upload to entity bucket
        const { error: uploadError } = await supabase.storage
          .from(entityId)
          .upload(targetPath, fileData, {
            contentType: file.metadata?.mimetype || 'application/octet-stream',
            upsert: true
          });
        
        if (uploadError) {
          console.error(`[EntityStorage] Error uploading ${file.name} to entity bucket:`, uploadError);
          continue;
        }
        
        console.log(`[EntityStorage] Successfully migrated ${file.name} to entity bucket`);
      } catch (fileError) {
        console.error(`[EntityStorage] Error processing file ${file.name}:`, fileError);
        continue;
      }
    }
    
    console.log(`[EntityStorage] Migration completed for user ${userId} to entity ${entityId}`);
    return true;
  } catch (error) {
    console.error(`[EntityStorage] Unexpected error during migration:`, error);
    return false;
  }
}
