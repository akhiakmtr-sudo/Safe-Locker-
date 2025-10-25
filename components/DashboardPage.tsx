
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

import { FileType, ManagedFile } from '../types';
import { ImageIcon, VideoIcon, DocumentIcon, AudioIcon, OtherIcon, DownloadIcon, DeleteIcon, UploadIcon, FolderIcon, ArrowLeftIcon, SpinnerIcon } from './icons';

interface DashboardPageProps {
  user: User;
}

const getFileType = (file: File): FileType => {
    const type = file.type;
    if (type.startsWith('image/')) return FileType.Photos;
    if (type.startsWith('video/')) return FileType.Videos;
    if (type.startsWith('audio/')) return FileType.Songs;
    if (type === 'application/pdf' || type.startsWith('text/') || type.includes('document')) return FileType.Document;
    return FileType.Others;
};

const FileIcon: React.FC<{ type: FileType }> = ({ type }) => {
    const iconProps = { className: "w-6 h-6 mr-3 text-gray-500 dark:text-gray-400 flex-shrink-0" };
    switch (type) {
        case FileType.Photos: return <ImageIcon {...iconProps} />;
        case FileType.Videos: return <VideoIcon {...iconProps} />;
        case FileType.Document: return <DocumentIcon {...iconProps} />;
        case FileType.Songs: return <AudioIcon {...iconProps} />;
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

const FolderItem: React.FC<{ category: FileType; count: number; icon: React.ReactNode; onClick: () => void; }> = ({ category, count, icon, onClick }) => (
    <div onClick={onClick} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
        <div className="text-indigo-500 dark:text-indigo-400 mb-3">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{category}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{count} item{count !== 1 ? 's' : ''}</p>
    </div>
);

const categoryIcons: Record<FileType, React.ReactNode> = {
    [FileType.Photos]: <ImageIcon className="w-12 h-12" />,
    [FileType.Videos]: <VideoIcon className="w-12 h-12" />,
    [FileType.Document]: <DocumentIcon className="w-12 h-12" />,
    [FileType.Songs]: <AudioIcon className="w-12 h-12" />,
    [FileType.Others]: <FolderIcon className="w-12 h-12" />,
};

const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FileType | null>(null);

  const filesCollectionRef = useMemo(() => collection(db, 'files'), []);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const q = query(filesCollectionRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const userFiles = querySnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<ManagedFile, 'id'>),
        id: doc.id
      }));
      // Sort files client-side to avoid needing a composite index in Firestore
      userFiles.sort((a, b) => a.name.localeCompare(b.name));
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
  
  const folderCategories = Object.values(FileType);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p className="text-center text-gray-600 dark:text-gray-400">Loading your files...</p></div>;
  }
  
  if (selectedCategory) {
    const filesInCategory = groupedFiles[selectedCategory] || [];
    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center mb-6">
                <button onClick={() => setSelectedCategory(null)} className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors -ml-2">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 ml-2">{selectedCategory}</h2>
            </div>
            {filesInCategory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filesInCategory.map(file => (
                        <FileItem key={file.id} file={file} onDelete={handleDeleteFile} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <FolderIcon className="mx-auto w-16 h-16 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-200">This folder is empty</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload some files to see them here.</p>
                </div>
            )}
        </main>
    )
  }

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
                        <div key={name} className="flex items-center justify-between p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{name}</span>
                            <SpinnerIcon className="text-gray-500 dark:text-gray-400" />
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Folders</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {folderCategories.map(category => (
                    <FolderItem
                        key={category}
                        category={category}
                        count={groupedFiles[category]?.length || 0}
                        icon={categoryIcons[category]}
                        onClick={() => setSelectedCategory(category)}
                    />
                ))}
            </div>
        </div>
      </main>
  );
};

export default DashboardPage;