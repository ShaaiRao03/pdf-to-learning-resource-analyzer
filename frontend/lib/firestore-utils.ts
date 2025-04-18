import { db } from "@/lib/firebase";
import { doc, setDoc, collection } from "firebase/firestore";

// Create user document and subcollection on signup
export async function createUserInFirestore({ uid, email, name }: { uid: string, email: string, name?: string }) {
  // Create the user document in the users collection
  const userDocRef = doc(db, "users", uid);
  await setDoc(userDocRef, {
    email,
    name: name || null,
    createdAt: new Date().toISOString(),
  });
  // Firestore subcollections are created automatically when you write to them.
}

// Example: Add a PDF to the user's pdfs subcollection
export async function addPdfForUser(uid: string, pdfData: { filename: string; [key: string]: any }) {
  const userDocRef = doc(db, "users", uid);
  const pdfsRef = collection(userDocRef, "pdfs");
  const pdfDocRef = doc(pdfsRef, pdfData.filename); // Use filename as doc id, or use addDoc for auto id
  await setDoc(pdfDocRef, pdfData);
}

// Example: Add a resource to a PDF's resources subcollection
export async function addResourceToPdf(uid: string, pdfId: string, resource: { resourceID: string; resources_details: any }) {
  const userDocRef = doc(db, "users", uid);
  const pdfsRef = collection(userDocRef, "pdfs");
  const pdfDocRef = doc(pdfsRef, pdfId);
  const resourcesRef = collection(pdfDocRef, "resources");
  const resourceDocRef = doc(resourcesRef, resource.resourceID);
  await setDoc(resourceDocRef, resource);
}
