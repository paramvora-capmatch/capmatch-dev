// src/hooks/useStorage.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { FileObject } from "@supabase/storage-js";

export const useStorage = (
	bucketId: string | null,
	folderPath: string = ""
) => {
	const [files, setFiles] = useState<FileObject[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const listFiles = useCallback(async () => {
		if (!bucketId) return;
		setIsLoading(true);
		setError(null);
		try {
			const { data: files, error } = await supabase.storage
				.from(bucketId)
				.list(folderPath, {
					limit: 100,
					offset: 0,
					sortBy: { column: "name", order: "asc" },
				});

			if (error) throw error;
			// Filter out the placeholder .keep file
			setFiles(files?.filter((file) => file.name !== ".keep") || []);
		} catch (e) {
			setError(e.message);
			console.error("Error listing files:", e);
		} finally {
			setIsLoading(false);
		}
	}, [bucketId, folderPath]);

	useEffect(() => {
		listFiles();
	}, [listFiles]);

	const uploadFile = async (file: File) => {
		if (!bucketId) {
			setError("Bucket ID is not available.");
			return null;
		}
		setIsLoading(true);
		setError(null);
		try {
			const filePath = folderPath
				? `${folderPath}/${file.name}`
				: file.name;
			const { data, error } = await supabase.storage
				.from(bucketId)
				.upload(filePath, file, {
					cacheControl: "3600",
					upsert: true, // Overwrite if exists
				});

			if (error) throw error;
			await listFiles(); // Refresh file list
			return data;
		} catch (e) {
			setError(e.message);
			console.error("Error uploading file:", e);
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	const downloadFile = async (fileName: string) => {
		if (!bucketId) {
			setError("Bucket ID is not available.");
			return;
		}
		try {
			const filePath = folderPath
				? `${folderPath}/${fileName}`
				: fileName;
			const { data, error } = await supabase.storage
				.from(bucketId)
				.download(filePath);
			if (error) throw error;

			const url = URL.createObjectURL(data);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (e) {
			setError(e.message);
			console.error("Error downloading file:", e);
		}
	};

	const deleteFile = async (fileName: string) => {
		if (!bucketId) {
			setError("Bucket ID is not available.");
			return;
		}
		setIsLoading(true);
		setError(null);
		try {
			const filePath = folderPath
				? `${folderPath}/${fileName}`
				: fileName;
			const { error } = await supabase.storage
				.from(bucketId)
				.remove([filePath]);
			if (error) throw error;
			await listFiles(); // Refresh file list
		} catch (e) {
			setError(e.message);
			console.error("Error deleting file:", e);
		} finally {
			setIsLoading(false);
		}
	};

	return {
		files,
		isLoading,
		error,
		listFiles,
		uploadFile,
		downloadFile,
		deleteFile,
	};
};
