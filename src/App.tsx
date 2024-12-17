import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

interface PianoKey {
  note: string;
  key: string;
  isBlack?: boolean;
}

const pianoKeys: PianoKey[] = [
  { note: 'do', key: 'a' },
  { note: 'do#', key: 'w', isBlack: true },
  { note: 're', key: 's' },
  { note: 're#', key: 'e', isBlack: true },
  { note: 'mi', key: 'd' },
  { note: 'fa', key: 'f' },
  { note: 'fa#', key: 't', isBlack: true },
  { note: 'so', key: 'g' },
  { note: 'so#', key: 'y', isBlack: true },
  { note: 'la', key: 'h' },
  { note: 'la#', key: 'u', isBlack: true },
  { note: 'si', key: 'j' }
];

const mqttConfig = {
  host: '100.42.181.66',
  port: 9001,
  protocol: 'ws',
  clientId: `piano_client_${Math.random().toString(16).slice(2, 8)}`
};

const App = () => {
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [holdDuration, setHoldDuration] = useState<number>(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [debug, setDebug] = useState<{ note: string; duration: number }[]>([]);

  // 1. MQTT ulanish
  useEffect(() => {
    const mqttClient = mqtt.connect(`${mqttConfig.protocol}://${mqttConfig.host}:${mqttConfig.port}`, {
      clientId: mqttConfig.clientId,
    });
    mqttClient.on('connect', () => {
      console.log('MQTT connected');
      mqttClient.subscribe('piano', (err) => err && console.error(err));
    });
    mqttClient.on('error', (err) => console.error('MQTT error:', err));
    setClient(mqttClient);
    
    // Fixed cleanup function
    return () => {
      mqttClient.end();
    };
  }, []);

  // 2. Yordamchi funksiyalar
  const startNote = (note: string) => {
    if (!client || intervalId) return;
    setActiveKey(note);
    setHoldDuration(0);
    const newInterval = setInterval(() => {
      setHoldDuration((prev) => prev + 10); // 10ms
    }, 10);
    setIntervalId(newInterval);
  };

  const stopNote = (note: string) => {
    if (!intervalId || !client) return;
    clearInterval(intervalId);
    setIntervalId(null);

    const noteData = { note, duration: holdDuration };
    client.publish('piano', JSON.stringify(noteData), { qos: 1 });
    setDebug((prev) => [...prev, noteData]);

    setActiveKey(null);
    setHoldDuration(0);
  };

  // 3. Klaviatura hodisalari
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyObj = pianoKeys.find((k) => k.key === e.key.toLowerCase());
      if (keyObj) startNote(keyObj.note);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const keyObj = pianoKeys.find((k) => k.key === e.key.toLowerCase());
      if (keyObj) stopNote(keyObj.note);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [client, intervalId, holdDuration]);

  // 4. Mishka hodisalari (div ustida)
  const handleMouseDown = (note: string) => startNote(note);
  const handleMouseUp = (note: string) => stopNote(note);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex' }}>
        {pianoKeys.map((key) => {
          const isActive = activeKey === key.note;
          return (
            <div
              key={key.note}
              style={{
                width: key.isBlack ? '30px' : '50px',
                height: key.isBlack ? '120px' : '200px',
                backgroundColor: key.isBlack ? (isActive ? '#333' : '#000') : (isActive ? '#eee' : '#fff'),
                border: '1px solid #000',
                margin: '0 2px',
                cursor: 'pointer',
                transition: 'all 0.1s',
                transform: isActive ? 'translateY(4px)' : 'none'
              }}
              onMouseDown={() => handleMouseDown(key.note)}
              onMouseUp={() => handleMouseUp(key.note)}
            >
              <div>{key.note}</div>
              {isActive && <div style={{ fontSize: '12px' }}>{holdDuration}ms</div>}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '20px', width: '300px', maxHeight: '200px', overflowY: 'auto' }}>
        <h3>Debug Log:</h3>
        {debug.map((entry, idx) => (
          <div key={idx}>
            Note: {entry.note} - Duration: {entry.duration}ms
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
