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
  const [holdStartTime, setHoldStartTime] = useState<number | null>(null); // Start time
  const [volume, setVolume] = useState<number>(50); // Default volume

  // ✅ MQTT ulanish
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

    return () => {
      mqttClient.end();
    };
  }, []);

  // ✅ Nota Boshqarish
  const startNote = (note: string) => {
    if (!client || activeKey === note) return;
    setActiveKey(note);
    setHoldStartTime(Date.now());
    console.log(`Note started: ${note}`);
  };

  const stopNote = (note: string) => {
    if (!client || activeKey !== note || holdStartTime === null) return;

    const holdDuration = Date.now() - holdStartTime; // Calculate hold duration
    const noteData = { note, duration: holdDuration };
    console.log('Publishing note:', noteData);
    client.publish('piano', JSON.stringify(noteData), { qos: 1 });

    setActiveKey(null);
    setHoldStartTime(null);
  };

  // ✅ Ovoz Balandligini O'zgartirish
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);

    if (client) {
      const volumeData = { volume: newVolume };
      console.log('Publishing volume:', volumeData);
      client.publish('piano', JSON.stringify(volumeData), { qos: 1 });
    }
  };

  // ✅ Klaviatura Boshqaruvi
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyObj = pianoKeys.find((k) => k.key === e.key.toLowerCase());
      if (keyObj && !activeKey) startNote(keyObj.note);
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
  }, [client, activeKey, holdStartTime]);

  return (
    <div style={styles.scene}>
      {/* 🎹 Piano Keys */}
      <div style={styles.piano}>
        {pianoKeys.map((key) => {
          const isActive = activeKey === key.note;
          return (
            <div
              key={key.note}
              style={{
                ...styles.key,
                backgroundColor: key.isBlack ? (isActive ? '#555' : '#000') : (isActive ? '#ccc' : '#fff'),
                transform: key.isBlack
                  ? 'translateY(-10px) rotateX(20deg)'
                  : 'rotateX(20deg)'
              }}
              onMouseDown={() => startNote(key.note)}
              onMouseUp={() => stopNote(key.note)}
            >
              {key.note}
            </div>
          );
        })}
      </div>

      {/* 🎚️ Volume Slider */}
      <div style={styles.sliderContainer}>
        <h3 style={styles.sliderLabel}>Volume: {volume}</h3>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          style={styles.slider}
        />
      </div>
    </div>
  );
};

// ✅ Styles
const styles: { [key: string]: React.CSSProperties } = {
  scene: { display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100vh' },
  piano: { display: 'flex', justifyContent: 'center' },
  key: { width: '50px', height: '200px', textAlign: 'center', lineHeight: '200px' },
  sliderContainer: { marginTop: '20px' },
  slider: { width: '200px' },
  sliderLabel: { marginTop: '10px' }
};

export default App;
