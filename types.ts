export enum FileType {
  Image = 'Images',
  Video = 'Videos',
  Document = 'Documents',
  Audio = 'Audio',
  Other = 'Other',
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
