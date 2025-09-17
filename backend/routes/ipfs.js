import express from 'express';
import multer from 'multer';
import axios from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only certain file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Pinata API configuration (free IPFS pinning service)
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_BASE_URL = 'https://api.pinata.cloud';

/**
 * Upload file to IPFS via Pinata
 */
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      // Fallback: return a mock hash for development
      const mockHash = 'Qm' + crypto.randomBytes(22).toString('base64').replace(/[+/]/g, '').substring(0, 44);
      console.log('IPFS keys not configured, returning mock hash:', mockHash);
      
      return res.json({
        ipfsHash: mockHash,
        size: req.file.size,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        url: `https://ipfs.io/ipfs/${mockHash}`
      });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
      customPinPolicy: {
        regions: [
          {
            id: 'FRA1',
            desiredReplicationCount: 2
          }
        ]
      }
    });
    formData.append('pinataOptions', pinataOptions);

    const pinataMetadata = JSON.stringify({
      name: req.file.originalname,
      keyvalues: {
        uploadedBy: 'loanverse',
        uploadDate: new Date().toISOString(),
        fileType: req.file.mimetype
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    res.json({
      ipfsHash: response.data.IpfsHash,
      size: response.data.PinSize,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      url: `https://ipfs.io/ipfs/${response.data.IpfsHash}`
    });

  } catch (error) {
    console.error('IPFS upload error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to upload to IPFS',
      details: error.response?.data?.error || error.message
    });
  }
});

/**
 * Get file metadata from IPFS hash
 */
router.get('/metadata/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return res.json({
        ipfsHash: hash,
        url: `https://ipfs.io/ipfs/${hash}`,
        status: 'available'
      });
    }

    const response = await axios.get(
      `${PINATA_BASE_URL}/data/pinList?hashContains=${hash}`,
      {
        headers: {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        }
      }
    );

    if (response.data.rows.length > 0) {
      const fileData = response.data.rows[0];
      res.json({
        ipfsHash: hash,
        size: fileData.size,
        pinDate: fileData.date_pinned,
        metadata: fileData.metadata,
        url: `https://ipfs.io/ipfs/${hash}`,
        status: 'pinned'
      });
    } else {
      res.json({
        ipfsHash: hash,
        url: `https://ipfs.io/ipfs/${hash}`,
        status: 'not_found'
      });
    }

  } catch (error) {
    console.error('IPFS metadata error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get IPFS metadata',
      details: error.response?.data?.error || error.message
    });
  }
});

/**
 * Unpin file from IPFS (remove from Pinata)
 */
router.delete('/unpin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return res.json({ message: 'File unpin simulated (no keys configured)' });
    }

    await axios.delete(
      `${PINATA_BASE_URL}/pinning/unpin/${hash}`,
      {
        headers: {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        }
      }
    );

    res.json({ message: 'File unpinned successfully' });

  } catch (error) {
    console.error('IPFS unpin error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to unpin from IPFS',
      details: error.response?.data?.error || error.message
    });
  }
});

export default router;