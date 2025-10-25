import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

import { FileType, ManagedFile } from '../types';
import { ImageIcon, VideoIcon, DocumentIcon, AudioIcon, OtherIcon, DownloadIcon, DeleteIcon, UploadIcon } from './icons';

interface DashboardPageProps {
  user: User;
}

const getFileType = (file: File): FileType => {
    const type = file.type;
    if (type.startsWith('image/')) return FileType.Image;
    if (type.startsWith('video/')) return FileType.Video;
    if (type.startsWith('audio/')) return FileType.Audio;
    if (type === 'application/pdf' || type.startsWith('text/') || type.includes('document')) return FileType.Document;
    return FileType.Other;
};

const FileIcon: React.FC<{ type: FileType }> = ({ type }) => {
    const iconProps = { className: "w-6 h-6 mr-3 text-gray-500 dark:text-gray-400 flex-shrink-0" };
    switch (type) {
        case FileType.Image: return <ImageIcon {...iconProps} />;
        case FileType.Video: return <VideoIcon {...iconProps} />;
        case FileType.Document: return <DocumentIcon {...iconProps} />;
        case FileType.Audio: return <AudioIcon {...iconProps} />;
        default: return <OtherIcon {...iconProps} />;
    }
};

const FileItem: React.FC<{ file: ManagedFile, onDelete: (file: ManagedFile) => void }> = ({ file, onDelete }) => (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center truncate min-w-0">
            <FileIcon type={file.type} />
            <div className="truncate">
                <span className="font-medium text-gray-800 dark:text-gray-200 block truncate">{file.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-2 pl-2">
            <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.name} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <DownloadIcon />
            </a>
            <button onClick={() => onDelete(file)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <DeleteIcon />
            </button>
        </div>
    </div>
);


const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const filesCollectionRef = useMemo(() => collection(db, 'files'), []);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const q = query(filesCollectionRef, where("userId", "==", user.uid), orderBy("name"));
      const querySnapshot = await getDocs(q);
      const userFiles = querySnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<ManagedFile, 'id'>),
        id: doc.id
      }));
      setFiles(userFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      alert("Could not fetch your files.");
    } finally {
      setIsLoading(false);
    }
  }, [user, filesCollectionRef]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadFiles = useCallback(async (filesToUpload: File[]) => {
      if (filesToUpload.length === 0) return;

      const currentUploads = filesToUpload.map(f => f.name);
      setUploadingFiles(prev => [...prev, ...currentUploads]);

      const uploadPromises = filesToUpload.map(async file => {
          try {
              const fileId = crypto.randomUUID();
              const storagePath = `files/${user.uid}/${fileId}-${file.name}`;
              const storageRef = ref(storage, storagePath);

              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);

              const newFileDoc: Omit<ManagedFile, 'id'> = {
                  name: file.name,
                  type: getFileType(file),
                  size: file.size,
                  url,
                  userId: user.uid,
                  storagePath,
              };
              await addDoc(filesCollectionRef, newFileDoc);
          } catch (error) {
              console.error("Error uploading file:", file.name, error);
              alert(`Failed to upload ${file.name}`);
          }
      });

      await Promise.all(uploadPromises);
      setUploadingFiles(prev => prev.filter(name => !currentUploads.includes(name)));
      await fetchFiles();

  }, [user.uid, filesCollectionRef, fetchFiles]);
  
  const handleDeleteFile = useCallback(async (file: ManagedFile) => {
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`)) return;
    try {
        const storageRef = ref(storage, file.storagePath);
        await deleteObject(storageRef);
        const fileDocRef = doc(db, 'files', file.id);
        await deleteDoc(fileDocRef);
        setFiles(prevFiles => prevFiles.filter(f => f.id !== file.id));
    } catch (error) {
        console.error("Error deleting file:", error);
        alert("Failed to delete the file.");
    }
  }, []);

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(dragging);
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleUploadFiles(Array.from(e.dataTransfer.files));
  }, [handleUploadFiles]);
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleUploadFiles(Array.from(e.target.files || []));
      e.target.value = '';
  };

  const groupedFiles = useMemo(() => {
    return files.reduce((acc, file) => {
        if (!acc[file.type]) acc[file.type] = [];
        acc[file.type].push(file);
        return acc;
    }, {} as Record<FileType, ManagedFile[]>);
  }, [files]);
  
  const fileCategories = Object.values(FileType);
  const hasFiles = files.length > 0;

  return (
    <main className="p-4 sm:p-6 lg:p-8">
        <div 
          onDragOver={(e) => handleDragEvents(e, true)}
          onDragEnter={(e) => handleDragEvents(e, true)}
          onDragLeave={(e) => handleDragEvents(e, false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-300 ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600'}`}
        >
          <div className="flex flex-col items-center">
            <UploadIcon />
            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Drag & drop files here</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">or</p>
            <label htmlFor="file-upload" className="mt-2 cursor-pointer rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <span>Select files</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileInputChange} />
            </label>
          </div>
        </div>

        {uploadingFiles.length > 0 && (
            <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Uploading...</h2>
                <div className="space-y-2">
                    {uploadingFiles.map(name => (
                        <div key={name} className="flex items-center p-3 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse">
                            <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{name}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="mt-8 space-y-8">
            {isLoading ? (
                <p className="text-center text-gray-600 dark:text-gray-400">Loading your files...</p>
            ) : !hasFiles && uploadingFiles.length === 0 ? (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">No files yet. Drag and drop to upload!</p>
            ) : (
                fileCategories.map(category => (
                    groupedFiles[category] && groupedFiles[category].length > 0 && (
                        <section key={category}>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">{category}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedFiles[category].map(file => (
                                    <FileItem key={file.id} file={file} onDelete={handleDeleteFile} />
                                ))}
                            </div>
                        </section>
                    )
                ))
            )}
        </div>
      </main>
  );
};

export default DashboardPage;
