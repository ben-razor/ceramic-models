import styles from '../styles/App.module.css'
import CeramicClient from '@ceramicnetwork/http-client';
import { useEffect, useState, Fragment } from 'react';
import Image from 'next/image';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { ThreeIdConnect,  EthereumAuthProvider } from '@3id/connect'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { DID } from 'dids'
import DataModels from './components/DataModels';
import { getSchema, getByType, transformObject, matchItemOrArray, getObjectFeatures, jsonLdToJsonSchema } from './components/JsonLd';
import { prettyPrintJson } from 'pretty-print-json';

const API_URL = 'https://ceramic-clay.3boxlabs.com';
const MAX_RESULTS = 20;

function SchemaOrg() {
  const [dataLoaded, setDataLoaded] = useState();
  const [dataLoadError, setDataLoadError] = useState();
  const [data, setData] = useState();
  const [enteredType, setEnteredType] = useState('');
  const [type, setType] = useState('Class');
  const [typeSearchResults, setTypeSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState('');
  const [jsonSchema, setJSONSchema] = useState('');
  const [options, setOptions] = useState({});

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
          let idMatch = matchItemOrArray(x['@id'], val => val.toLowerCase().includes(searchQuery))

          let descMatch = matchItemOrArray(x['rdfs:comment'], val => {
            if(typeof val === 'string') {
              return val.toLowerCase().includes(searchQuery)
            }
          });
          return idMatch || descMatch;
        })
      }

      setTypeSearchResults(_typeSearchResults);
    }
  }, [data, type, searchQuery]);

  useEffect(() => {
    if(selectedObject && data) {
      let _jsonSchemaObj = jsonLdToJsonSchema(selectedObject, data, options);
      setJSONSchema(_jsonSchemaObj);
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
      <input type="text" value={searchQuery} 
             onChange={e => setSearchQuery(e.target.value.toLowerCase())} 
             placeholder="Search Object Type..." />
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
        <div className={styles.searchResult} key={name}>
          <a onClick={e => selectObject(name)} className={styles.searchResultName}>
            <div>
              {name}
            </div>
          </a>
          <div className={styles.searchResultDesc}>
            {comment}
          </div>
        </div>
      )
    }
    let foundResults = typeSearchResults.length > 0;

    return <div className={styles.sorgTypeSearchPanel}>
      <div>
        { getSearchForm() }
      </div>
      <div className="sorgTypeSearchResults">
        { typeSearchResultsUI }
      </div>
    </div>
  }

  function goBack() {
    setJSONSchema('');
    setSelectedObject('');
  }

  function getPageContent() {
    let content;

    let searchPage = <div className="csnSearchPage">
      <div>
        {getDataPanel()}
      </div>
      <div>
        {getTypeSearchPanel()}
      </div>
    </div>;

    let schemaPage = <div className={styles.csnSchemaPage}>
      <div>
        <div className={styles.csnControlsPanel}>
          <button onClick={(e) => goBack()}>&lArr; Back</button>
        </div>
        <div className={styles.csnJSON}>
          { JSON.stringify(jsonSchema, null, 2).replace(/\\"/g, '"') } 
        </div>
      </div>
    </div>;

    if(jsonSchema) {
      content = schemaPage;
    }
    else {
      content = searchPage;
    }

    return content;
  }

  return (
    <div className={styles.csnApp}> 
      <div className={styles.csnHeader}>
        <h1 className={styles.csnTitle}>
          AZULEJO
        </h1>
        <div>
          <Image alt="Ceramic Logo" src="/azulejo/ceramic-logo-200x200-1.png" width="32" height="32" />
        </div>
        <h2 className={styles.csnSubTitle}>
          schema.org &rArr; JSON Schema &rArr; Ceramic Data Models
        </h2>
      </div>
      <div className={styles.csnContent}>
        { getPageContent() }
      </div>
   </div>
  );
}

export default SchemaOrg;
