import styles from '../styles/App.module.css'
import CeramicClient from '@ceramicnetwork/http-client';
import { useEffect, useState, Fragment } from 'react';
import Image from 'next/image';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { ThreeIdConnect,  EthereumAuthProvider } from '@3id/connect'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { DID } from 'dids'
import DataModels from './components/DataModels';
import { getSchema, getByType, transformObject, matchItemOrArray, getObjectFeatures } from './components/JsonLd';

const API_URL = 'https://ceramic-clay.3boxlabs.com';

function SchemaOrg() {
  const [dataLoaded, setDataLoaded] = useState();
  const [dataLoadError, setDataLoadError] = useState();
  const [data, setData] = useState();
  const [enteredType, setEnteredType] = useState('');
  const [type, setType] = useState('Class');
  const [typeSearchResults, setTypeSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState('');

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

      if(searchQuery) {
        _typeSearchResults = _typeSearchResults.filter(x => {
          let idMatch = matchItemOrArray(x['@id'], val => val.includes(searchQuery))

          console.log(x['rdfs:comment'], 'type: ', typeof x['rdfs:comment']);
          let descMatch = matchItemOrArray(x['rdfs:comment'], val => {
            return val.includes(searchQuery)
          });
          return idMatch || descMatch;
        })
      }

      setTypeSearchResults(_typeSearchResults);
    }
  }, [data, type, searchQuery]);

  useEffect(() => {
    if(selectedObject && data) {
      let { baseItem, fields, subClass } = getObjectFeatures(selectedObject, data)
      console.log(baseItem);
      console.log(fields);
      console.log(subClass);
    }
  }, [selectedObject, data]);

  function selectObject(name) {
    console.log(name);
    setSelectedObject(name);
  }

  function getDataPanel() {
    return <div className="sorgDataPanel">
      { !dataLoaded && 'Data not loaded' } 
    </div>;
  }

  function handleTypeFormSubmit(e) {
    setType(enteredType);
    e.preventDefault();
  }

  function jstr(val) {
    return JSON.stringify(val);
  }

  function getTypeSearchForm() {
    return <form onSubmit={handleTypeFormSubmit}>
      <label>
        Object type:
        <input type="text" value={enteredType} onChange={e => setEnteredType(e.target.value)} />
      </label>
      <input type="submit" value="Go" />
    </form>;
  }

  function getSearchForm() {
    return <form onSubmit={handleTypeFormSubmit}>
      <label>
        Search:
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </label>
      <input type="submit" value="Go" />
    </form>;
  }

  function getTypeSearchPanel() {
    let typeSearchResultsUI = [];
    for(let val of typeSearchResults) {
      let id = val['@id'];
      let name = id.split(':')[1];
      let comment = val['rdfs:comment'];
      if(typeof comment === 'object') {
        comment = jstr(comment);
      }
      typeSearchResultsUI.push(
        <div className={styles.searchResult}>
          <div className={styles.searchResultName}>
            <a onClick={e => selectObject(name)}>{name}</a>
          </div>
          <div className={styles.searchResultDesc}>
            {comment}
          </div>
        </div>
      )
    }
    let foundResults = typeSearchResults.length > 0;

    return <div className="sorgTypeSearchPanel">
      <div>
        { getSearchForm() }
      </div>
      <div className="sorgTypeSearchResults">
        { typeSearchResultsUI }
      </div>
    </div>
  }

  function getSelectedObject() {

  }

  return (
    <div className={styles.csnApp}> 
      <div className={styles.csnHeader}>
        <div>
          <Image alt="Ceramic Logo" src="/azulejo/ceramic-logo-200x200-1.png" width="50" height="50" />
        </div>
        <h1 className={styles.csnTitle}>
          AZULEJO
        </h1>
      </div>
      <div className={styles.csnContent}>
        <div>
          {getDataPanel()}
        </div>
        <div>
          {getTypeSearchPanel()}
        </div>
  
      </div>
   </div>
  );
}

export default SchemaOrg;
