import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Uploads a file to Firebase Storage under projects/[projectId]/screenshots
 * @param file The file object to upload
 * @param projectId The associated project ID
 * @returns The public download URL for the file
 */
export async function uploadScreenshot(file: File, projectId: string): Promise<string> {
  if (!storage) throw new Error("Firebase storage not configured");
  
  const fileExtension = file.name.split(".").pop() || "png";
  const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
  
  // Create reference
  const storageRef = ref(storage, `projects/${projectId}/screenshots/${uniqueName}`);
  
  // Upload file
  const snapshot = await uploadBytes(storageRef, file);
  
  // Fetch URL
  return await getDownloadURL(snapshot.ref);
}
