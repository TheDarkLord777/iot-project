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
    protocol: 'ws', // Changed to ws since we're using WebSocket
    clientId: `piano_client_${Math.random().toString(16).slice(2, 8)}`
  };

  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [debug, setDebug] = useState<{note: string, timestamp: number}[]>([]);

  useEffect(() => {
    // Create MQTT client
    const mqttClient = mqtt.connect(`${mqttConfig.protocol}://${mqttConfig.host}:${mqttConfig.port}`, {
      clientId: mqttConfig.clientId,
    });

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      // Subscribe to piano topic
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
      if (key && client) {
        setActiveKey(key.note);
        const noteData = {
          note: key.note,
          timestamp: Date.now()
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
      }
    };

    const handleKeyUp = () => {
      setActiveKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [client]); // Added client to dependency array

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
      const noteData = {
        note: note,
        timestamp: Date.now()
      };
      
      // Publish note to MQTT topic when clicking piano
      client.publish('piano', JSON.stringify(noteData), { qos: 1 }, (error) => {
        if (error) {
          console.error('MQTT publish error:', error);
        } else {
          console.log('Published message:', noteData);
        }
      });
      
      // Add to debug log
      setDebug(prev => [...prev, noteData]);
      
      // Reset active key after a short delay
      setTimeout(() => setActiveKey(null), 200);
    }
  };

  return (
    <div style={pianoStyles.container}>
      <div style={pianoStyles.keyboard}>
        {pianoKeys.map((key) => (
          <div
            key={key.note}
            style={pianoStyles.key(key.isBlack || false, activeKey === key.note)}
            onClick={() => handlePianoClick(key.note)}
          >
            <div>{key.note}</div>
          </div>
        ))}
      </div>
      
      {/* Debug Panel */}
      <div style={pianoStyles.debug}>
        <h3>Debug Log:</h3>
        {debug.map((entry, index) => (
          <div key={index}>
            Note: {entry.note} - Time: {new Date(entry.timestamp).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
