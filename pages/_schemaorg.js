import styles from '../styles/App.module.css'
import CeramicClient from '@ceramicnetwork/http-client';
import { useEffect, useState, Fragment } from 'react';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { ThreeIdConnect,  EthereumAuthProvider } from '@3id/connect'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { DID } from 'dids'
import DataModels from './components/DataModels';
import { getSchema, getByType, transformObject, matchItemOrArray } from './components/JsonLd';

const API_URL = 'https://ceramic-clay.3boxlabs.com';

function SchemaOrg() {
  const [dataLoaded, setDataLoaded] = useState();
  const [dataLoadError, setDataLoadError] = useState();
  const [data, setData] = useState();

  useEffect(() => {
    (async() => {
      let { success, data, error } = await getSchema();

      setDataLoaded(success);
      setData(data);
      setDataLoadError(error);

    })();

  }, []);

  function getDataPanel() {
    return <div className="sorgDataPanel">
      { dataLoaded ? 'Loaded' : 'Data not loaded' } 
    </div>;
  }

  return (
    <div className={styles.csnApp}> 
      Schema Org!
      <div>
        {getDataPanel()}
      </div>
    </div>
  );
}

export default SchemaOrg;
