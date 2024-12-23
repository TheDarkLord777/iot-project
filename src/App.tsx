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

interface ActiveKey {
  startTime: number;
}

const App = () => {
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [activeKeys, setActiveKeys] = useState<Record<string, ActiveKey>>({});
  const [volume, setVolume] = useState<number>(50);
  const [clickSound] = useState(() => new Audio('/click.wav')); // Fixed file extension
  const [releaseSound] = useState(() => new Audio('/rel.wav')); // Fixed file extension

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

  const startNote = (note: string) => {
    if (!client) return;
    
    // Play click sound
    clickSound.currentTime = 0;
    clickSound.volume = volume / 100;
    clickSound.play().catch(err => console.error('Error playing click sound:', err));
    
    setActiveKeys((prev: Record<string, ActiveKey>) => ({
      ...prev,
      [note]: { startTime: Date.now() }
    }));
    
    // Send start note message
    const noteData = { note, action: 'start', volume };
    console.log('Publishing note start:', noteData);
    client.publish('piano', JSON.stringify(noteData), { qos: 1 });
  };

  const stopNote = (note: string) => {
    if (!client || !activeKeys[note]) return;

    // Play release sound
    releaseSound.currentTime = 0;
    releaseSound.volume = (volume / 100) * 0.7; // Slightly quieter on release
    releaseSound.play().catch(err => console.error('Error playing release sound:', err));

    const holdDuration = Date.now() - activeKeys[note].startTime;
    const noteData = { note, action: 'stop', duration: holdDuration };
    console.log('Publishing note stop:', noteData);
    client.publish('piano', JSON.stringify(noteData), { qos: 1 });

    setActiveKeys((prev: Record<string, ActiveKey>) => {
      const newKeys = { ...prev };
      delete newKeys[note];
      return newKeys;
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);

    if (client) {
      const volumeData = { volume: newVolume };
      console.log('Publishing volume:', volumeData);
      client.publish('piano', JSON.stringify(volumeData), { qos: 1 });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyObj = pianoKeys.find((k) => k.key === e.key.toLowerCase());
      if (keyObj && !activeKeys[keyObj.note]) startNote(keyObj.note);
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
  }, [client, activeKeys]);

  return (
    <div style={styles.scene}>
      <div style={styles.perspective}>
        <div style={styles.piano}>
          {pianoKeys.map((key) => {
            const isActive = !!activeKeys[key.note];
            return (
              <div
                key={key.note}
                style={{
                  ...styles.key,
                  ...styles.keyCommon,
                  ...(key.isBlack ? styles.blackKey : styles.whiteKey),
                  ...(isActive && (key.isBlack ? styles.activeBlackKey : styles.activeWhiteKey))
                }}
                onMouseDown={() => startNote(key.note)}
                onMouseUp={() => stopNote(key.note)}
                onMouseLeave={() => activeKeys[key.note] && stopNote(key.note)}
              >
                <div style={styles.keyFront}>{key.note}</div>
                <div style={styles.keyTop} />
                <div style={styles.keyLeft} />
                <div style={styles.keyRight} />
              </div>
            );
          })}
        </div>
      </div>

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

const styles: { [key: string]: React.CSSProperties } = {
  scene: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#1a1a1a',
    padding: '50px'
  },
  perspective: {
    perspective: '1000px',
    transformStyle: 'preserve-3d'
  },
  piano: {
    display: 'flex',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transform: 'rotateX(30deg)',
    padding: '20px',
    backgroundColor: '#333',
    borderRadius: '10px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
  },
  keyCommon: {
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'all 0.1s ease',
    cursor: 'pointer'
  },
  key: {
    width: '60px',
    height: '200px',
    margin: '0 2px'
  },
  whiteKey: {
    backgroundColor: '#fff',
    zIndex: 1,
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
  },
  blackKey: {
    backgroundColor: '#000',
    height: '120px',
    width: '40px',
    marginLeft: '-20px',
    marginRight: '-20px',
    zIndex: 2,
    transform: 'translateZ(20px)',
    boxShadow: '0 5px 15px rgba(0,0,0,0.5)'
  },
  activeWhiteKey: {
    backgroundColor: '#e6e6e6',
    transform: 'translateZ(-5px)',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  },
  activeBlackKey: {
    backgroundColor: '#333',
    transform: 'translateZ(15px)',
    boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
  },
  keyFront: {
    position: 'absolute',
    bottom: '10px',
    width: '100%',
    textAlign: 'center',
    color: '#666',
    fontSize: '12px'
  },
  keyTop: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'inherit',
    transform: 'rotateX(-90deg) translateZ(0)',
    transformOrigin: 'top'
  },
  keyLeft: {
    position: 'absolute',
    width: '10px',
    height: '100%',
    left: '-10px',
    backgroundColor: 'rgba(0,0,0,0.1)',
    transform: 'rotateY(90deg)',
    transformOrigin: 'right'
  },
  keyRight: {
    position: 'absolute',
    width: '10px',
    height: '100%',
    right: '-10px',
    backgroundColor: 'rgba(0,0,0,0.1)',
    transform: 'rotateY(-90deg)',
    transformOrigin: 'left'
  },
  sliderContainer: {
    marginTop: '50px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '20px',
    borderRadius: '10px'
  },
  slider: {
    width: '200px',
    appearance: 'none',
    height: '5px',
    background: '#555',
    borderRadius: '5px',
    outline: 'none'
  },
  sliderLabel: {
    color: '#fff',
    marginBottom: '10px',
    textAlign: 'center'
  }
};

export default App;
