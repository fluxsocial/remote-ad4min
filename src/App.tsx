import Header from './components/Header';
import Login from './components/Login';
import './App.css';
import { useContext } from 'react';
import { Stack } from '@mantine/core';
import TrustAgent from './components/TrustAgent';
import Navigation from './components/Navigation';
import Auth from './components/Auth'
import { Ad4minContext } from './context/Ad4minContext';
import { AgentProvider } from './context/AgentContext';
import { Route, Routes} from 'react-router-dom';
import Splashscreen from './components/Splashscreen';
import Perspectives from './components/Perspectives';
import Profile from './components/Profile';
import Language from './components/Language';
import Settings from './components/Settings';
import { Connect } from './components/Connect';

const App = () => {
  const {state: {
    candidate, did, auth
  }, methods: {
    handleTrustAgent,
  }} = useContext(Ad4minContext);

  return (
    <div className="App">
      <Routes>
        <Route path="/splashscreen" element={<Splashscreen />} />
        <Route path="/login" element={
          <Stack align="center" spacing="xl" style={{margin: "auto"}}>
            <Header />
            <AgentProvider>
              <Login />
            </AgentProvider>
          </Stack>
        }/>
        <Route path="/" element={<Navigation did={did} />}>
          <Route path="profile" element={<Profile did={did} />} />
          <Route path="language" element={<Language />} />
          <Route path="perspective" element={<Perspectives />} />
          <Route path="settings" element={
            <AgentProvider>
              <Settings />
            </AgentProvider>
            }
          />
        </Route>
        <Route path="/connect" element={<Connect />}
      />
      </Routes>
      {candidate && <TrustAgent candidate={candidate} handleTrustAgent={handleTrustAgent} />}
      {auth && <Auth />}
    </div>
  );
}

export default App;