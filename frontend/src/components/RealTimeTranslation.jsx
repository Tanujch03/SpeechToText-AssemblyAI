// client/src/components/RealTimeTranscription.jsx
import { useState, useEffect, useRef } from 'react';

const BACKEND_EXPRESS_PORT = 'ws://localhost:8080';

function RealTimeTranscription() {
  const [transcriptions, setTranscriptions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      wsRef.current = new WebSocket(BACKEND_EXPRESS_PORT);

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received from server:', data);
          if (data.original && data.original.trim() !== '') {
            setTranscriptions(prev => [...prev, {
              ...data,
              speaker: data.speaker || 'Unknown Speaker'
            }]);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      wsRef.current.onopen = () => {
        setStatus('Connected to server');
        startAudioCapture();
      };

      wsRef.current.onerror = (error) => {
        setStatus('Error: ' + error.message);
      };

      wsRef.current.onclose = () => {
        setStatus('Disconnected from server');
      };
    } else {
      stopRecording();
    }

    return stopRecording;
  }, [isRecording]);

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start(250);
      setStatus('Recording started');

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && e.data.size > 0) {
          wsRef.current.send(e.data);
        }
      };
    } catch (error) {
      setStatus('Microphone error: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setStatus('Recording stopped');
  };

  const handleFileTranscription = async () => {
    try {
      const response = await fetch(`${BACKEND_EXPRESS_PORT.replace('ws', 'http')}/transcribe-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl }),
      });
      
      const transcript = await response.json();
      
      // Add file transcription results
      if (transcript.utterances) {
        const fileTranscriptions = transcript.utterances.map(utterance => ({
          original: utterance.text,
          speaker: `Speaker ${utterance.speaker}`,
          language: 'en'
        }));
        setTranscriptions(prev => [...prev, ...fileTranscriptions]);
      }
    } catch (error) {
      setStatus('File transcription error: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Live Transcription</h2>
      
      <div className="mb-4 text-sm text-gray-600">{status}</div>
      
      {/* Live Recording Controls */}
      <button
        onClick={() => setIsRecording(prev => !prev)}
        className={`px-4 py-2 rounded-full text-white ${
          isRecording ? 'bg-red-500' : 'bg-green-500'
        } mb-6`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {/* File Transcription Controls */}
      <div className="mb-6 w-full max-w-2xl flex gap-2">
        <input
          type="text"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="Enter file URL to transcribe"
          className="flex-1 px-4 py-2 rounded border"
        />
        <button
          onClick={handleFileTranscription}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Transcribe File
        </button>
      </div>

      {/* Transcriptions Display */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6 space-y-4">
        {transcriptions.length > 0 ? (
          transcriptions.map((entry, index) => (
            <div
              key={index}
              className="border-b border-gray-200 pb-4 mb-4 last:mb-0 last:border-none"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-blue-600">
                  {entry.speaker}
                </span>
              </div>
              <p className="text-lg text-gray-600">{entry.original}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">
            {isRecording ? 'Listening...' : 'Press Start Recording to begin'}
          </p>
        )}
      </div>
    </div>
  );
}

export default RealTimeTranscription;