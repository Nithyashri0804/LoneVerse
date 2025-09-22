import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

interface DocumentFile {
  name: string;
  size: number;
  type: string;
  file: File;
  uploading: boolean;
  uploaded: boolean;
  ipfsHash?: string;
  error?: string;
}

interface IPFSDocumentUploadProps {
  onDocumentsChange: (documents: { name: string; ipfsHash: string }[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  title?: string;
  description?: string;
}

const IPFSDocumentUpload: React.FC<IPFSDocumentUploadProps> = ({
  onDocumentsChange,
  maxFiles = 5,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'],
  title = 'Upload Collateral Documents',
  description = 'Upload documents that prove your collateral ownership and value'
}) => {
  const { account } = useWallet();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFiles = (files: File[]) => {
    if (documents.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newDocuments: DocumentFile[] = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      uploading: false,
      uploaded: false,
    }));

    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const uploadToIPFS = async (document: DocumentFile) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }

    const formData = new FormData();
    formData.append('file', document.file);
    formData.append('uploaderAddress', account);
    formData.append('fileName', document.name);
    formData.append('fileType', document.type);

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ipfs/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload to IPFS');
    }

    const result = await response.json();
    return result.ipfsHash;
  };

  const handleUploadAll = async () => {
    if (!account) {
      alert('Please connect your wallet first');
      return;
    }

    setIsUploading(true);
    const uploadPromises = documents
      .filter(doc => !doc.uploaded && !doc.uploading)
      .map(async (document) => {
        const docIndex = documents.indexOf(document);
        
        try {
          // Update document status to uploading
          setDocuments(prev => prev.map((doc, i) => 
            i === docIndex ? { ...doc, uploading: true, error: undefined } : doc
          ));

          const ipfsHash = await uploadToIPFS(document);

          // Update document status to uploaded
          setDocuments(prev => prev.map((doc, i) => 
            i === docIndex 
              ? { ...doc, uploading: false, uploaded: true, ipfsHash }
              : doc
          ));

          return { name: document.name, ipfsHash };
        } catch (error: any) {
          console.error(`Error uploading ${document.name}:`, error);
          
          // Update document status with error
          setDocuments(prev => prev.map((doc, i) => 
            i === docIndex 
              ? { ...doc, uploading: false, error: error.message }
              : doc
          ));

          return null;
        }
      });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result !== null) as { name: string; ipfsHash: string }[];
      
      // Update parent component with successful uploads
      const allSuccessfulUploads = documents
        .filter(doc => doc.uploaded && doc.ipfsHash)
        .map(doc => ({ name: doc.name, ipfsHash: doc.ipfsHash! }));
      
      onDocumentsChange([...allSuccessfulUploads, ...successfulUploads]);
      
      if (successfulUploads.length > 0) {
        alert(`Successfully uploaded ${successfulUploads.length} document(s) to IPFS`);
      }
    } catch (error) {
      console.error('Error in batch upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
    
    // Update parent component with remaining uploaded documents
    const remainingUploads = documents
      .filter((doc, i) => i !== index && doc.uploaded && doc.ipfsHash)
      .map(doc => ({ name: doc.name, ipfsHash: doc.ipfsHash! }));
    
    onDocumentsChange(remainingUploads);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openIPFSGateway = (ipfsHash: string) => {
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    window.open(gatewayUrl, '_blank');
  };

  const uploadedCount = documents.filter(doc => doc.uploaded).length;
  const uploadingCount = documents.filter(doc => doc.uploading).length;
  const errorCount = documents.filter(doc => doc.error).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Upload size={20} />
          <span>{title}</span>
        </h3>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive 
            ? 'border-blue-400 bg-blue-900/10' 
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
          className="hidden"
        />
        
        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-white text-lg font-medium">
          Drop files here or click to browse
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Accepted formats: {acceptedTypes.join(', ')}
        </p>
        <p className="text-gray-400 text-sm">
          Maximum {maxFiles} files, up to 10MB each
        </p>
      </div>

      {/* Upload Status */}
      {documents.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <span className="text-white font-medium">{documents.length} file(s) selected</span>
              {uploadedCount > 0 && (
                <span className="text-green-400 text-sm">{uploadedCount} uploaded</span>
              )}
              {uploadingCount > 0 && (
                <span className="text-blue-400 text-sm">{uploadingCount} uploading</span>
              )}
              {errorCount > 0 && (
                <span className="text-red-400 text-sm">{errorCount} failed</span>
              )}
            </div>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || documents.every(doc => doc.uploaded || doc.uploading)}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Upload All'}
            </button>
          </div>

          {/* File List */}
          <div className="space-y-2">
            {documents.map((document, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <File size={16} className="text-gray-400" />
                  <div>
                    <div className="text-white text-sm font-medium">{document.name}</div>
                    <div className="text-gray-400 text-xs">
                      {formatFileSize(document.size)}
                      {document.ipfsHash && (
                        <span className="ml-2 text-blue-400">
                          • IPFS: {document.ipfsHash.slice(0, 12)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {document.uploaded && document.ipfsHash && (
                    <button
                      onClick={() => openIPFSGateway(document.ipfsHash!)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                      title="View on IPFS"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  
                  {document.uploading && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span className="text-blue-400 text-xs">Uploading...</span>
                    </div>
                  )}
                  
                  {document.uploaded && (
                    <CheckCircle size={16} className="text-green-400" />
                  )}
                  
                  {document.error && (
                    <div className="flex items-center space-x-2" title={document.error}>
                      <AlertCircle size={16} className="text-red-400" />
                      <span className="text-red-400 text-xs">Failed</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => removeDocument(index)}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IPFS Info */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-900/20 rounded-lg">
            <Upload className="text-blue-400" size={16} />
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">IPFS Storage</h4>
            <p className="text-gray-400 text-xs mt-1">
              Your documents are stored on IPFS (InterPlanetary File System) for decentralized, 
              permanent storage. Each document receives a unique hash that's recorded on the blockchain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPFSDocumentUpload;