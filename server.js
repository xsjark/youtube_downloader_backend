require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
var admin = require("firebase-admin");

// Enable CORS
server.use(
  cors({
    origin: "*",
  })
);

const serviceAccount = {
    "type": "service_account",
    "project_id": "chakra-reservation",
    "private_key_id":process.env.PRIVATE_KEY_ID,
    "private_key":process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    "universe_domain":"googleapis.com",
    "client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-tfdw6%40chakra-reservation.iam.gserviceaccount.com",
    "client_email":"firebase-adminsdk-tfdw6@chakra-reservation.iam.gserviceaccount.com",
    "client_id":"101195416801658280025",
    "auth_uri":"https://accounts.google.com/o/oauth2/auth",
    "token_uri":"https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
  };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const server = express();
const port = 3000;


// Get the absolute path to the storage folder
const storagePath = path.join(__dirname, 'storage');

// Ensure the storage folder exists, if not, create it
if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath);
}

server.use(express.json());

server.post('/download', async (req, res) => {
    try {
      const idToken = req.headers.authorization?.split('Bearer ')[1];
      if (!idToken) {
        return res.status(401).send('Unauthorized');
      }
  
      // Verify the ID token using Firebase Admin SDK
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      // User is authenticated, proceed with the download
      
      const videoUrl = req.body.url;
      const info = await ytdl.getInfo(videoUrl);
      const format = ytdl.chooseFormat(info.formats, { filter: 'audioandvideo' });
  
      if (!format) {
        return res.status(400).send('Error: No audio format found');
      }
  
      const filePath = path.join(storagePath, 'audio.mp3');
  
      ytdl(videoUrl, { format: format })
        .pipe(fs.createWriteStream(filePath))
        .on('finish', () => {
          res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
          res.sendFile(filePath);
        });
    } catch (error) {
      if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        return res.status(401).send('Invalid token');
      }
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  

server.get('/download-file', (req, res) => {
    const filePath = path.join(storagePath, 'audio.mp3');
    res.download(filePath, 'audio.mp3', (err) => {
        if (err) {
            console.error('Error:', err);
            res.status(500).send('Internal Server Error');
        } else {
            console.log('File downloaded successfully');
        }
    });
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
