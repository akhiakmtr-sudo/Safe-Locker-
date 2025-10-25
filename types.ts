export enum FileType {
  Photos = 'Photos',
  Videos = 'Videos',
  Document = 'Document',
  Songs = 'Songs',
  Others = 'Others',
}

export interface ManagedFile {
  id: string; // Firestore document ID
  name: string;
  type: FileType;
  size: number;
  url: string; // Download URL from Storage
  userId: string; // UID of the user who uploaded it
  storagePath: string; // Path in Firebase Storage
}
