import { showNotification } from "@mantine/notifications";
import { Ad4mClient, ExceptionType } from "@perspect3vism/ad4m";
import { ExceptionInfo } from "@perspect3vism/ad4m/lib/src/runtime/RuntimeResolver";
import { createContext, useCallback, useEffect, useState } from "react";
import { buildAd4mClient } from "../util";

type State = {
  url: string;
  token: string;
  did: string;
  isInitialized: Boolean;
  isUnlocked: Boolean;
  loading: boolean;
  client: Ad4mClient | null;
  candidate: string;
  auth: string;
  connected: boolean;
  connectedLaoding: boolean;
}

type ContextProps = {
  state: State;
  methods: {
    configureEndpoint: (url: string, token: string) => void,
    resetEndpoint: () => void
    handleTrustAgent: (str: string) => void,
    handleLogin: (client: Ad4mClient, login: Boolean, did: string) => void,
  };
}

const initialState: ContextProps = {
  state: {
    url: '',
    token: '',
    isInitialized: false,
    did: '',
    isUnlocked: false,
    client: null,
    loading: false,
    candidate: '',
    auth: '',
    connected: false,
    connectedLaoding: false,
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


  const checkConnection = useCallback(async (url: string, client: Ad4mClient): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (client) {
          const id = setTimeout(() => {
            resolve('')
          }, 1000);

          await client.agent.status(); // TODO runtime info is broken
          clearTimeout(id);

          console.log("get hc agent infos success.");

          resolve(url)
        }
      } catch (err) {
        if (url) {
          showNotification({
            message: 'Cannot connect to the URL provided please check if the executor is running or pass a different URL',
            color: 'red',
            autoClose: false
          })
        }

        resolve('')
      }
    })
  }, [])

  const handleLogin = useCallback((client: Ad4mClient, login: Boolean, did: string) => {
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
        if (exception.type === ExceptionType.CapabilityRequested) {
          setState((prev) => ({
            ...prev,
            auth: exception.addon!
          }))
        }
        Notification.requestPermission()
          .then(response => {
            if (response === 'granted') {
              new Notification(exception.title, { body: exception.message })
            }
          });
        console.log(exception);

        
        // TODO popup the browser tab if rquest comes in.
        // appWindow.setFocus();

        return null
      })
    }
  }, []);

  const checkIfAgentIsInitialized = useCallback(async (client: Ad4mClient) => {
    console.log("Check if agent is initialized.", client)

    let status = await client?.agent.status();
    console.log("agent status in init: ", status);

    handleLogin(client, status.isUnlocked, status.did ? status.did! : "");

    return status;
  }, [handleLogin]);

  const connect = useCallback(async (url: string, token: string) => {
    const client = buildAd4mClient(url, token);
    try {
      await checkConnection(url, client);

      const { isInitialized, isUnlocked } = await checkIfAgentIsInitialized(client);

      console.log("isUnlocked flag: ", isUnlocked);

      setState(prev => ({
        ...prev,
        client,
        url,
        token,
        isInitialized,
        isUnlocked,
        connected: true,
        connectedLaoding: false
      }));

      localStorage.setItem('url', url as string);
      localStorage.setItem('token', token as string);
    } catch (e) {
      console.log('err', e)

      showNotification({
        message: 'Cannot connect to the URL provided please check if the executor is running or pass a different URL',
        color: 'red',
        autoClose: false
      });
    }
  }, [checkConnection, checkIfAgentIsInitialized])

  useEffect(() => {
    let localStorageURL = localStorage.getItem('url');
    let token = localStorage.getItem('token');

    if (localStorageURL && token) {
      connect(localStorageURL, token);
    }
  }, [checkConnection, checkIfAgentIsInitialized, connect]);

  const handleTrustAgent = (candidate: string) => {
    setState((prev) => ({
      ...prev,
      candidate
    }));
  }

  const configureEndpoint = async (url: string, token: string) => {
    if (url && token) {
      setState((prev) => ({
        ...prev,
        url,
        token,
      }));

      await connect(url, token)
    }
  }

  const resetEndpoint = () => {
    setState((prev) => ({
      ...prev,
      url: '',
      connected: false
    }))

    localStorage.removeItem('url');
  }

  useEffect(() => {
    const build = async () => {
      const client = buildAd4mClient(state.url, state.token)

      setState((prev) => ({
        ...prev,
        client
      }));
    }
    if (state.url) {
      console.log('gggg 0', state.url);
      build();
    }
  }, [state.url, state.token])

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

