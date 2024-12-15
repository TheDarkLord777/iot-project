import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

const App = () => {
  // Piano key interface
  interface PianoKey {
    note: string;
    key: string;
    isBlack?: boolean;
  }

  // Piano keys configuration
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

  // MQTT configuration
  const mqttConfig = {
    host: '100.42.181.66',
    port: 9001,
    protocol: 'ws',
    clientId: `piano_client_${Math.random().toString(16).slice(2, 8)}`
  };

  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [keyPressTime, setKeyPressTime] = useState<number | null>(null);
  const [debug, setDebug] = useState<{note: string, duration: number}[]>([]);
  const [holdDuration, setHoldDuration] = useState<number | null>(null);

  useEffect(() => {
    // Create MQTT client
    const mqttClient = mqtt.connect(`${mqttConfig.protocol}://${mqttConfig.host}:${mqttConfig.port}`, {
      clientId: mqttConfig.clientId,
    });

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      mqttClient.subscribe('piano', (err) => {
        if (err) {
          console.error('Subscription error:', err);
        }
      });
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT error:', err);
    });

    mqttClient.on('message', (topic, message) => {
      console.log(`Received message on ${topic}:`, message.toString());
    });

    setClient(mqttClient);

    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, []);

  useEffect(() => {
    // Handle keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = pianoKeys.find(k => k.key === e.key.toLowerCase());
      if (key && client && !keyPressTime) { // Check if key isn't already pressed
        setActiveKey(key.note);
        setKeyPressTime(Date.now()); // Store full timestamp
        setHoldDuration(null); // Reset hold duration
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = pianoKeys.find(k => k.key === e.key.toLowerCase());
      if (key && client && keyPressTime) {
        // Always set duration to 500ms
        const duration = 500;
        setHoldDuration(duration);
        
        const noteData = {
          note: key.note,
          duration: duration
        };
        
        // Publish note to MQTT topic
        client.publish('piano', JSON.stringify(noteData), { qos: 1 }, (error) => {
          if (error) {
            console.error('MQTT publish error:', error);
          } else {
            console.log('Published message:', noteData);
          }
        });
        
        // Add to debug log
        setDebug(prev => [...prev, noteData]);
        setActiveKey(null);
        setKeyPressTime(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [client, keyPressTime]);

  // Styles
  const pianoStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      padding: '20px'
    },
    keyboard: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px'
    },
    key: (isBlack: boolean, isActive: boolean) => ({
      width: isBlack ? '30px' : '50px',
      height: isBlack ? '120px' : '200px',
      backgroundColor: isBlack ? (isActive ? '#333' : '#000') : (isActive ? '#eee' : '#fff'),
      border: '1px solid #000',
      margin: '0 2px',
      cursor: 'pointer',
      zIndex: isBlack ? 1 : 0,
      position: 'relative' as const,
      transition: 'all 0.1s ease-in-out',
      transform: isActive ? 'translateY(5px)' : 'translateY(0)',
      boxShadow: isActive ? 'none' : '0 5px 10px rgba(0,0,0,0.2)'
    }),
    debug: {
      maxHeight: '200px',
      overflowY: 'auto' as const,
      width: '100%',
      padding: '10px',
      backgroundColor: '#f5f5f5',
      borderRadius: '5px'
    }
  };

  const handlePianoClick = (note: string) => {
    if (client) {
      setActiveKey(note);
      setKeyPressTime(Date.now());
      setHoldDuration(null);
      
      const handleMouseUp = () => {
        // Always set duration to 500ms
        const duration = 500;
        setHoldDuration(duration);
        
        const noteData = {
          note: note,
          duration: duration
        };
        
        client.publish('piano', JSON.stringify(noteData), { qos: 1 }, (error) => {
          if (error) {
            console.error('MQTT publish error:', error);
          } else {
            console.log('Published message:', noteData);
          }
        });
        
        setDebug(prev => [...prev, noteData]);
        setActiveKey(null);
        setKeyPressTime(null);
        
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  return (
    <div style={pianoStyles.container}>
      <div style={pianoStyles.keyboard}>
        {pianoKeys.map((key) => (
          <div
            key={key.note}
            style={pianoStyles.key(key.isBlack || false, activeKey === key.note)}
            onMouseDown={() => handlePianoClick(key.note)}
          >
            <div>{key.note}</div>
            {activeKey === key.note && keyPressTime && (
              <div style={{fontSize: '12px', color: key.isBlack ? '#fff' : '#000'}}>
                500ms
              </div>
            )}
            {holdDuration && key.note === activeKey && (
              <div style={{fontSize: '12px', color: key.isBlack ? '#fff' : '#000'}}>
                Held: 500ms
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Debug Panel */}
      <div style={pianoStyles.debug}>
        <h3>Debug Log:</h3>
        {debug.map((entry, index) => (
          <div key={index}>
            Note: {entry.note} - Duration: {entry.duration}ms
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
