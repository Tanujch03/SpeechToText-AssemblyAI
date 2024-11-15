require('dotenv').config();
const WebSocket = require('ws');
const { AssemblyAI } = require('assemblyai');


const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY 
});

function startAssemblyAIStream(onTranscription) {
  console.log('Starting AssemblyAI connection...');
  
  const assemblyWS = new WebSocket(
    'wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000',
    {
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY
      }
    }
  );


  const config = {
    audio_data: '',
    speaker_labels: true, 
    sample_rate: 16000
  };

  assemblyWS.on('open', () => {
    console.log('Connected to AssemblyAI');

    assemblyWS.send(JSON.stringify(config));
  });

  assemblyWS.on('message', (message) => {
    try {
      const response = JSON.parse(message);
      console.log('AssemblyAI response:', response);
      
      if (response.message_type === 'FinalTranscript') {
        console.log('Final transcript received:', response);
        
   
        const speakerInfo = response.speaker || 'Speaker';
        const transcriptText = response.text;
        
        onTranscription(transcriptText, response.language || 'en', speakerInfo);
      }
    } catch (err) {
      console.error('Error parsing AssemblyAI response:', err);
    }
  });

  assemblyWS.on('error', (error) => {
    console.error('AssemblyAI WebSocket Error:', error);
  });

  assemblyWS.on('close', () => {
    console.log('AssemblyAI connection closed');
  });

  return assemblyWS;
}


async function transcribeFile(fileUrl) {
  try {
    const data = {
      audio: fileUrl,
      speaker_labels: true
    };

    const transcript = await client.transcripts.transcribe(data);
    return transcript;
  } catch (error) {
    console.error('Error transcribing file:', error);
    throw error;
  }
}

module.exports = { 
  startAssemblyAIStream,
  transcribeFile 
};
