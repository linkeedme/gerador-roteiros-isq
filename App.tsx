
import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ChannelWorkspace } from './components/ChannelWorkspace';
import { Channel } from './types';

function App() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary selection:text-black">
      {selectedChannel ? (
        <ChannelWorkspace 
          channel={selectedChannel} 
          onBack={() => setSelectedChannel(null)} 
        />
      ) : (
        <Dashboard 
          onSelectChannel={setSelectedChannel}
        />
      )}
    </div>
  );
}

export default App;
