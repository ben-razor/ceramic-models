import styles from '../styles/App.module.css'
import CeramicClient from '@ceramicnetwork/http-client';
import { useEffect, useState, Fragment } from 'react';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import KeyDIDResolver from 'key-did-resolver';
import { Ed25519Provider } from 'key-did-provider-ed25519'; 
import { ThreeIdConnect,  EthereumAuthProvider } from '@3id/connect'
import { randomBytes } from '@stablelib/random'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { DID } from 'dids'
import DataModels from './components/DataModels';

const API_URL = 'https://ceramic-clay.3boxlabs.com';

function Ceramic(props) {
  const [testDoc, setTestDoc] = useState();
  const [streamId, setStreamId] = useState();
  const [ceramic, setCeramic] = useState();
  const [ethAddresses, setEthAddresses] = useState();
  const [ethereum, setEthereum] = useState();
  const schema = props.schema;
  const setEncodedModel = props.setEncodedModel;

  useEffect(() => {
    if(window.ethereum) {
      setEthereum(window.ethereum);
      (async() => {
        try {
          const addresses = await window.ethereum.request({ method: 'eth_requestAccounts'})
          setEthAddresses(addresses);
        }
        catch(e) { 
          console.log(e);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if(ethereum && ethAddresses) {
      (async () => {
        const newCeramic = new CeramicClient(API_URL);

        let providerMethod = 'did';
        let resolver;

        if(providerMethod === 'did') {
          resolver = {
            ...KeyDIDResolver.getResolver(newCeramic),
          }
        }
        else {
          resolver = {
            ...ThreeIdResolver.getResolver(newCeramic),
          }
        }
        const did = new DID({ resolver })
        newCeramic.did = did;

        let provider;
        if(providerMethod === 'did') {
          const seed = randomBytes(32)
          provider = new Ed25519Provider(seed);
        }
        else {
          const threeIdConnect = new ThreeIdConnect()
          const authProvider = new EthereumAuthProvider(ethereum, ethAddresses[0]);
          await threeIdConnect.connect(authProvider);
          provider = await threeIdConnect.getDidProvider();
        }

        newCeramic.did.setProvider(provider);
        console.log('auth start'); 
        await newCeramic.did.authenticate();
        console.log('Athenticated!'); 

        setCeramic(newCeramic);
      })();
    }
  }, [ethereum, ethAddresses]);

  function getEthNeededPanel() {
    return <div className="csn-eth-panel">
      <div className="csn-eth-message">You need ethereum</div>
      <div className="csn-eth-metamask-message">Get <a href="https://metamask.io/" target="_blank" rel="noreferrer">MetaMask</a></div>
    </div>;
  }

  function getWaitingForEthPanel() {
    return <div className="csn-no-eth-accounts">
      Waiting for Ethereum accounts...
    </div>;
  }

  function getAppPanel() {
    return <div className={styles.csnApp}>
      <h1>Ceramic is loaded</h1>
      <div>
        <DataModels ceramic={ceramic} schema={schema} setEncodedModel={setEncodedModel} />
      </div>
    </div>;
  }

  function getWaitingForDIDPanel() {
    return <div className="csn-waiting-for-did">
      Waiting for a decentralized ID...
    </div>
  }

  return (
    <div className="csn-app">
      { 
        ethereum ? 
        (
          ethAddresses ?  
          (
            ceramic ?
            getAppPanel() : 
            getWaitingForDIDPanel()
          ) 
          :
          getWaitingForEthPanel() 
        )
        :
        getEthNeededPanel()
      }
    </div>
  
  );
}

export default Ceramic;