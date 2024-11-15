require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { startAssemblyAIStream, transcribeFile } = require('./services/assemblyAI.js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


app.post('/transcribe-file', async (req, res) => {
  try {
    const { fileUrl } = req.body;
    const transcript = await transcribeFile(fileUrl);
    res.json(transcript);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

wss.on('connection', (ws) => {
  console.log('Client connected to server');
  let assemblyAIConnection = null;

  ws.on('message', (audioChunk) => {
    console.log('Received audio chunk of size:', audioChunk.length);
    
    if (!assemblyAIConnection || assemblyAIConnection.readyState !== WebSocket.OPEN) {
      console.log('Creating new AssemblyAI connection');
      assemblyAIConnection = startAssemblyAIStream((transcript, language, speaker) => {
        console.log('Received transcript:', transcript);
        if (transcript && transcript.trim() !== '') {
          ws.send(JSON.stringify({ language, original: transcript, speaker }));
        }
      });
    }
    
    if (assemblyAIConnection.readyState === WebSocket.OPEN) {
      const audioBase64 = audioChunk.toString('base64');
      const message = JSON.stringify({ audio_data: audioBase64 });
      assemblyAIConnection.send(message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (assemblyAIConnection) {
      assemblyAIConnection.close();
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});