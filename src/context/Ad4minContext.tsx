import { showNotification } from "@mantine/notifications";
import { Ad4mClient, ExceptionType } from "@perspect3vism/ad4m";
import { ExceptionInfo } from "@perspect3vism/ad4m/lib/src/runtime/RuntimeResolver";
import { createContext, useEffect, useState } from "react";
import { AD4M_ENDPOINT } from "../config";
import { buildAd4mClient } from "../util";

type State = {
  url: string;
  did: string;
  isInitialized: Boolean;
  isUnlocked: Boolean;
  loading: boolean;
  client: Ad4mClient | null;
  candidate: string;
  connected: boolean;
  connectedLaoding: boolean;
}

type ContextProps = {
  state: State;
  methods: {
    configureEndpoint: (str: string) => void,
    resetEndpoint: () => void
    handleTrustAgent: (str: string) => void,
    handleLogin: (login: Boolean, did: string) => void,
  };
}

const initialState: ContextProps = {
  state: {
    url: '',
    isInitialized: false,
    did: '',
    isUnlocked: false,
    client: null,
    loading: false,
    candidate: '',
    connected: false,
    connectedLaoding: true
  },
  methods: {
    configureEndpoint: () => null,
    resetEndpoint: () => null,
    handleTrustAgent: () => null,
    handleLogin: () => null 
  }
}

export const Ad4minContext = createContext(initialState);


export function Ad4minProvider({ children }: any) {
  const [state, setState] = useState(initialState.state);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    let localStorageURL = localStorage.getItem('url');

    if (!localStorageURL) {
      localStorageURL = params.get('ad4m') || AD4M_ENDPOINT;
    }
    
    localStorageURL = localStorageURL.includes('localhost') ? params.get('ad4m') : localStorageURL;
    localStorage.setItem('url', localStorageURL as string);

    setState((prev) => ({
      ...prev,
      url: localStorageURL as string
    }))
  }, [])

  useEffect(() => {
    const client = state.client!;
    const setConnected = (connected: boolean) => setState((prev) => ({
      ...prev,
      connected,
      connectedLaoding: false
    }));

    const checkConnection = async () => {
      return new Promise(async (resolve, reject) => {
        try {
          if (client) {
            const id = setTimeout(() => {
              setConnected(false);

              resolve(false)
            }, 2000)

            await client.runtime.hcAgentInfos(); // TODO runtime info is broken
            
            clearTimeout(id);

            console.log("get hc agent infos success.");
            setConnected(true);
            resolve(true)
          }
        } catch (err) {
          if (state.url) {
            showNotification({
              message: 'Cannot connect to the URL provided please check if the executor is running or pass a different URL',
              color: 'red',
              autoClose: false
            })
          }

          setConnected(false);
          resolve(false)
        }
      })
    }

    if (localStorage.getItem('url')) {
      checkConnection()
    } else {
      setConnected(false)
    }


    console.log("Check if ad4m service is connected.")
  }, [state.client, state.url]);

  useEffect(() => {
    const client = state.client!;
    const checkIfAgentIsInitialized = async () => {
      let status = await client?.agent.status();
      console.log("agent status in init: ", status);

      setState((prev) => ({
        ...prev,
        isInitialized: status.isInitialized!,
        isUnlocked: status.isUnlocked!
      }))

      handleLogin(status.isUnlocked, status.did ? status.did! : "");
    };

    if (client) {
      checkIfAgentIsInitialized();
    }

    console.log("Check if agent is initialized.")
  }, [state.client]);

  const handleLogin = (login: Boolean, did: string) => {
    const client = state.client!;
    setState((prev) => ({
      ...prev,
      isUnlocked: login,
      did: did,
      loading: false
    }))

    if (login) {
      client.runtime.addExceptionCallback((exception: ExceptionInfo) => {
        if (exception.type === ExceptionType.AgentIsUntrusted) {
          setState((prev) => ({
            ...prev, 
            candidate: exception.addon!
          }));
        }
        Notification.requestPermission()
          .then(response => {
            if (response === 'granted') {
              new Notification(exception.title, { body: exception.message })
            }
          });
        console.log(exception);
        return null
      })
    }
  }

  const handleTrustAgent = (candidate: string) => {
    setState((prev) => ({
      ...prev, 
      candidate
    }));
  }

  const configureEndpoint = (url: string) => {
    if (url) {
      setState((prev) => ({
        ...prev,
        url
      }))
  
      localStorage.setItem('url', url as string);
    }
  }

  const resetEndpoint = () => {
    setState((prev) => ({
      ...prev,
      url: ''
    }))

    localStorage.removeItem('url');
  }

  useEffect(() => {
    if (state.url) {
      const client = buildAd4mClient(state.url)
      
      setState((prev) => ({
        ...prev,
        client
      }));
    }
  }, [state.url])

  return (
    <Ad4minContext.Provider 
      value={{
        state,
        methods: {
          configureEndpoint,
          handleTrustAgent,
          resetEndpoint,
          handleLogin
        }
      }}
    >
      {children}
    </Ad4minContext.Provider>
  )
}

