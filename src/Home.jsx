import React, {  useState } from 'react';
import axios from 'axios';
import { FiUpload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const UploadContainer = styled.div`
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const Title = styled.h2`
  color: #2d3748;
  margin-bottom: 1.5rem;
  text-align: center;
  font-weight: 600;
`;

const UploadForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FileInputContainer = styled.div`
  position: relative;
  border: 2px dashed #cbd5e0;
  border-radius: 8px;
  padding: 2rem 1rem;
  text-align: center;
  transition: all 0.2s ease;
  background: #f8fafc;
  
  &:hover {
    border-color: #4299e1;
    background: #ebf8ff;
  }
`;

const FileInput = styled.input`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  opacity: 0;
  cursor: pointer;
`;

const UploadLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #4a5568;
  font-size: 1rem;
  cursor: pointer;
`;

const UploadIcon = styled(FiUpload)`
  font-size: 2rem;
  color: #4299e1;
`;

const SelectedFile = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: #edf2f7;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #2d3748;
`;

const SubmitButton = styled.button`
  background: #4299e1;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: #3182ce;
  }
  
  &:disabled {
    background: #a0aec0;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  
  &.success {
    background: #f0fff4;
    color: #38a169;
  }
  
  &.error {
    background: #fff5f5;
    color: #e53e3e;
  }
  
  &.info {
    background: #ebf8ff;
    color: #3182ce;
  }
`;

const FileInfo = styled.div`
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const FileInfoTitle = styled.h3`
  color: #2d3748;
  margin-bottom: 1rem;
  font-weight: 600;
`;

const FileInfoItem = styled.p`
  margin: 0.5rem 0;
  color: #4a5568;
  
  strong {
    color: #2d3748;
    font-weight: 500;
  }
`;

const Home = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ message: '', type: '' });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setUploadStatus({ message: '', type: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setUploadStatus({ message: 'Please select a file first', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      setUploadStatus({ message: 'Uploading your file...', type: 'info' });

      const response = await axios.post('https://sqa-task.com/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadStatus({ message: 'File uploaded successfully!', type: 'success' });
      setUploadedFile(response.data.file);

      console.log('Upload response:', response.data.processedData);


      // Navigate to tree view after successful upload, passing id as param
      navigate(`/tree`, { state: { processedData: response.data.processedData } });
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = error.response?.data?.error || 'Upload failed. Please try again.';
      setUploadStatus({ message: errorMessage, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <UploadContainer>
      <Title>File Upload</Title>

      <UploadForm onSubmit={handleSubmit}>
        <FileInputContainer>
          <FileInput
            type="file"
            id="file-upload"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx"
          />
          <UploadLabel htmlFor="file-upload">
            <UploadIcon />
            <span>Drag & drop files here or click to browse</span>
            {file && (
              <SelectedFile>
                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
              </SelectedFile>
            )}
          </UploadLabel>
        </FileInputContainer>

        <SubmitButton type="submit" disabled={!file || isUploading}>
          {isUploading ? 'Uploading...' : 'Upload File'}
        </SubmitButton>
      </UploadForm>

      {uploadStatus.message && (
        <StatusMessage className={uploadStatus.type}>
          {uploadStatus.type === 'success' ? (
            <FiCheckCircle />
          ) : (
            <FiAlertCircle />
          )}
          {uploadStatus.message}
        </StatusMessage>
      )}

      {uploadedFile && (
        <FileInfo>
          <FileInfoTitle>Uploaded File Details</FileInfoTitle>
          <FileInfoItem>
            <strong>Original Name:</strong> {uploadedFile.originalname}
          </FileInfoItem>
          <FileInfoItem>
            <strong>Saved As:</strong> {uploadedFile.filename}
          </FileInfoItem>
          <FileInfoItem>
            <strong>Size:</strong> {(uploadedFile.size / 1024).toFixed(2)} KB
          </FileInfoItem>
          <FileInfoItem>
            <strong>Type:</strong> {uploadedFile.mimetype}
          </FileInfoItem>
        </FileInfo>
      )}
    </UploadContainer>
  );
};

export default Home;