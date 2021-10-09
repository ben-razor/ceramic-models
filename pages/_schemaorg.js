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
  const [enteredType, setEnteredType] = useState('');
  const [type, setType] = useState('');
  const [typeSearchResults, setTypeSearchResults] = useState([]);

  useEffect(() => {
    (async() => {
      let { success, data, error } = await getSchema();

      setDataLoaded(success);
      setData(data);
      setDataLoadError(error);

    })();

  }, []);

  useEffect(() => {
    if(data && type) {
      let _typeSearchResults = getByType(type, data);
      setTypeSearchResults(_typeSearchResults);
    }
  }, [data, type]);

  function getDataPanel() {
    return <div className="sorgDataPanel">
      { dataLoaded ? 'Loaded' : 'Data not loaded' } 
    </div>;
  }

  function handleTypeFormSubmit(e) {
    setType(enteredType);
    e.preventDefault();
  }

  function jstr(val) {
    return JSON.stringify(val);
  }

  function getTypeSearchPanel() {
    let typeSearchResultsUI = [];
    for(let val of typeSearchResults) {
      typeSearchResultsUI.push(
        <div className="sorgTypeSearchResult">
          { jstr(val) }
        </div>
      )
    }
    return <div className="sorgTypeSearchPanel">
      <form onSubmit={handleTypeFormSubmit}>
        <label>
          Object type:
          <input type="text" value={enteredType} onChange={e => setEnteredType(e.target.value)} />
        </label>
        <input type="submit" value="Go" />
      </form>
      <div className="sorgTypeSearchResults">
        { typeSearchResultsUI }
      </div>
    </div>
  }

  return (
    <div className={styles.csnApp}> 
      Schema Org!
      <div>
        {getDataPanel()}
      </div>
      <div>
        {getTypeSearchPanel()}
      </div>
    </div>
  );
}

export default SchemaOrg;
