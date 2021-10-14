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
  const [ceramic, setCeramic] = useState();
  const schema = props.schema;
  const setEncodedModel = props.setEncodedModel;

  useEffect(() => {
      (async () => {
        const newCeramic = new CeramicClient(API_URL);

        let resolver = {
          ...KeyDIDResolver.getResolver(newCeramic),
        }

        const did = new DID({ resolver })
        newCeramic.did = did;

        const seed = randomBytes(32)
        let provider = new Ed25519Provider(seed);

        newCeramic.did.setProvider(provider);
        console.log('auth start'); 
        await newCeramic.did.authenticate();
        console.log('Athenticated!'); 

        setCeramic(newCeramic);
      })();
  }, []);

  function getAppPanel() {
    return <div className={styles.csnApp}>
      Ceramic is loaded
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
        ceramic ?
        getAppPanel() : 
        getWaitingForDIDPanel()
      }
    </div>
  
  );
}

export default Ceramic;