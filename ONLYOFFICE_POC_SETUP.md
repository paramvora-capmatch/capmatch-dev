# OnlyOffice Document Editor POC Setup

This document outlines how to set up and test the OnlyOffice document editing proof of concept.

## Prerequisites

1. Docker installed on your machine
2. Node.js and npm (already set up for Next.js)
3. Port 8080 available for OnlyOffice Document Server

## Setup Steps

### 1. Configure Environment Variables

Create a `.env.local` file in the root of your project if you haven't already. You can copy the example file:

```bash
cp .env.example .env.local
```

Make sure the `ONLYOFFICE_JWT_SECRET` in your `.env.local` is a strong, random secret. For this example, we'll use the one from your file: `jup42HdwbkhSYhNXnoohsTsBTjB15y8W`.

### 2. Start OnlyOffice Document Server

You must start the OnlyOffice Docker container with the **same JWT secret** that is in your `.env.local` file.

First, stop and remove any existing `onlyoffice` container:
```bash
docker rm -f onlyoffice
```

Then, run the new container with JWT enabled and the secret configured. Replace `your_jwt_secret_here` with the actual secret from your `.env.local` file:

```bash
docker run -i -t -d -p 8080:80 --name onlyoffice \
    -e JWT_ENABLED=true \
    -e JWT_SECRET=your_jwt_secret_here \
    onlyoffice/documentserver
```

This command tells the OnlyOffice server to enable token validation (`JWT_ENABLED=true`) and what secret to use for that validation (`JWT_SECRET=...`).

This will:
- Download the OnlyOffice Document Server image (if not already downloaded)
- Start the server on port 8080
- Run it in detached mode

**Verify it's running:**
```bash
docker ps | grep onlyoffice
```

You should see the container running.

**Check OnlyOffice is accessible:**
Open http://localhost:8080 in your browser. You should see the OnlyOffice welcome page.

### 3. Start Your Next.js Application

```bash
npm run dev
```

### 4. Access the POC Page

Navigate to: http://localhost:3000/document-editor-poc

## Testing the POC

### Basic Workflow

1. **Prepare Sample Documents**
   - Ensure you have `sample.docx`, `sample.xlsx`, `sample.pptx`, and `sample.pdf` files in the `/public/samples` directory of your project.

2. **Edit Documents**
   - On the POC page, a list of the sample documents will be displayed.
   - Click "Edit Document" on any file to open it in the OnlyOffice editor.
   - The OnlyOffice editor will open in the same page
   - Make changes to the document
   - Changes are auto-saved by OnlyOffice. Check your Next.js application console to see callback logs when a document is saved.

3. **Close Editor**
   - Click "Close Editor" to return to the document list
   - You can then edit another document.

### Supported File Formats

- **Documents**: DOC, DOCX, TXT
- **Spreadsheets**: XLS, XLSX, CSV
- **Presentations**: PPT, PPTX
- **PDFs**: PDF (view mode only by default)

## How It Works

### Current POC Implementation

```
1. User uploads file → Stored in browser memory (blob URL)
2. User clicks "Edit" → OnlyOffice loads file from blob URL
3. User makes changes → OnlyOffice auto-saves
4. OnlyOffice calls callback → API logs the save event
```

### Production Implementation (Next Steps)

```
1. User uploads file → Stored in Supabase Storage
2. Backend generates signed URL → Temporary secure access
3. User clicks "Edit" → OnlyOffice loads via signed URL
4. User makes changes → OnlyOffice auto-saves
5. OnlyOffice calls callback → Backend receives edited file
6. Backend saves to Supabase → Creates new version record
7. Optional: Trigger AI analysis on changes
```

## Troubleshooting

### OnlyOffice not loading
- Ensure Docker container is running: `docker ps`
- Check port 8080 is accessible: http://localhost:8080
- Restart container: `docker restart onlyoffice`

### Documents not opening
- Check browser console for errors
- Verify file format is supported
- Ensure OnlyOffice API script loaded (check Network tab)

### Callback errors
- Check Next.js console for callback logs
- Verify the callback URL is accessible from OnlyOffice
- For production, ensure proper CORS headers

## Docker Management Commands

```bash
# Stop OnlyOffice container
docker stop onlyoffice

# Start OnlyOffice container
docker start onlyoffice

# Remove OnlyOffice container
docker rm -f onlyoffice

# View OnlyOffice logs
docker logs onlyoffice

# View OnlyOffice logs (follow mode)
docker logs -f onlyoffice
```

## Next Steps for Production

1. **Integrate with Supabase Storage**
   - Upload documents to Supabase buckets
   - Generate signed URLs for OnlyOffice access
   - Implement version control

2. **Enhance Callback Handling**
   - Download edited files from OnlyOffice
   - Save new versions to Supabase
   - Track document history

3. **Add Collaboration Features**
   - Real-time user presence
   - Comment threads
   - Change tracking

4. **Security & Permissions**
   - Implement RBAC for document access
   - JWT tokens for OnlyOffice authentication
   - Audit logging

5. **AI Integration**
   - Analyze document changes
   - Extract key information
   - Generate summaries