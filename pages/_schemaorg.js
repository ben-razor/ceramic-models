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
  const [idIndex, setIdIndex] = useState();
  const [fieldIndex, setFieldIndex] = useState();
  const [enteredType, setEnteredType] = useState('');
  const [type, setType] = useState('Class');
  const [typeSearchResults, setTypeSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState('');
  const [jsonSchema, setJSONSchema] = useState('');
  const [jsonSchemaWithFieldsChosen, setJSONSchemaWithFieldsChosen] = useState('');
  const [options, setOptions] = useState({ expanded: {}, selectedFields: {} });
  const [fieldsChosen, setFieldsChosen] = useState(false);
  const [editingField, setEditingField] = useState();

  const [showDescriptions, setShowDescriptions] = useState(false);
  const [useSubClasses, setUseSubClasses] = useState(false);
  const [recursionLevels, setRecursionLevels] = useState(0);

  useEffect(() => {
    (async() => {
      let { success , data: _data, error, idIndex: _idIndex, fieldIndex: _fieldIndex } = await getSchema();

      setDataLoaded(success);
      setData(_data);
      setDataLoadError(error);
      setIdIndex(_idIndex);
      setFieldIndex(_fieldIndex);
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
      let context = { idIndex, fieldIndex };
      let _jsonSchemaObj = jsonLdToJsonSchema(selectedObject, data, options, context);
      setJSONSchema(_jsonSchemaObj);
    }
  }, [selectedObject, data, options, idIndex, fieldIndex]);

  useEffect(() => {
    if(jsonSchema) {
      let _jsonSchema = JSON.parse(JSON.stringify(jsonSchema));
      _jsonSchema.properties = { };
      let fields = Object.keys(options.selectedFields);

      for(let path of fields) {
        let pathParts = path.split('/');
        copyObjectProperties(jsonSchema.properties, _jsonSchema.properties, pathParts);
      }

      setJSONSchemaWithFieldsChosen(_jsonSchema);
    }

  }, [jsonSchema, options.selectedFields]);

  const copyObjectProperties = function(origProperties, newProperties, fields) {
    let field = fields[0];

    if(field && origProperties[field]) {
      let origData = origProperties[field];

      if(origData) {
        newProperties[field] = {};
        let newData = newProperties[field];

        if(origData['type']) newData['type'] = origData['type'];
        if(origData['format']) newData['format'] = origData['format'];
        if(origData['description']) newData['description'] = origData['description'];
        if(origData['properties']) {
          newData['properties'] = {};
        }

        copyObjectProperties(origData.properties, newData.properties, fields.slice(1));
      }
    }
  }

  function markObjectProperties(object, path, field, value, context) {
    let level = context.level;
    let pathPart = path[level];

    if(pathPart && object[pathPart] && typeof object[pathPart] === 'object') {
      object[pathPart].field = value;
      context.level = context.level + 1;
      if(level < path.length) {
        markObjectProperties(object, path, field, value, context);
        context.level = context.level - 1;
      }
    }
  }

  function selectObject(name) {
    console.log(name);
    setSelectedObject(name);
  }

  function getDataPanel() {
    return <div className="sorgDataPanel">
      { !data && 'Data loading...' } 
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
      <input className={styles.csnObjectTypeSearch} type="text" value={searchQuery} 
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
            <div className={styles.csnTextEllipsis}> 
              {name}
            </div>
          </a>
          <div className={styles.searchResultDesc}>
            {processDescription(comment)}
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

  function goFieldsSelected() {
    setFieldsChosen(true);
  }

  function changeSettingShowDesc(val) {
    let newOptions = {...options};
    newOptions['showDescriptions'] = val;
    console.log(val);
    setShowDescriptions(val);
    setOptions(newOptions);
  }

  function changeSettingUseSubClasses(val) {
    let newOptions = {...options};
    newOptions['useSubClasses'] = val;
    setUseSubClasses(val);
    setOptions(newOptions);
  }

  function changeSettingRecursionLevels(val) {
    val = parseInt(val, 10);
    let newOptions = {...options};
    newOptions['recursionLevels'] = val;
    console.log('rec levels', val);
    setRecursionLevels(val);
    setOptions(newOptions);
  }
  
  function setExpanded(property, value) {
    let _options = { ...options };
    _options.expanded[property] = value;
    setOptions(_options);
  }

  function selectField(property, selected) {
    let _options = { ...options };
    if(selected) {
      _options.selectedFields[property] = selected;
    }
    else {
      delete _options.selectedFields[property];
    }
    setOptions(_options);

    setEditingField(property)

    console.log(options.selectedFields);
  }

  function processDescription(description) {
    if(description) {
      description = description.replace(/[\\]+/g," ")
    }
    return description;
  }

  function doPropertyDisplayRecursion(propertyUI, properties, options={}, context={}) {
    let level = context.recursionLevel;
    let propertyUIThisLevel = [];

    if(properties) {
      for(let property of Object.keys(properties)) {
        context.recursionPath.push(property);
        let propertyInfo = properties[property];
        let propertyPath = context.recursionPath.join('/');

        let hasChildProperties = propertyInfo.properties && 
                                 typeof propertyInfo.properties === 'object' &&
                                 Object.keys(propertyInfo.properties).length > 0;

        let isExpanded = options.expanded && options.expanded[propertyPath];

        propertyUIThisLevel.push(<div className={styles.csnSchemaProperty} key={property}>
          { hasChildProperties ? (
              <a onClick={ e => setExpanded(propertyPath, !isExpanded) } className={styles.csnSchemaExpander}>
                { !isExpanded ? <span>&#x25B2;</span> : <span>&#x25BC;</span> }
              </a>
            ) : (
              <span style={{opacity: 0}}>&#x25B2;</span> 
            )
          }
          <input type="checkbox" value={options.selectedFields[propertyPath]} onChange={e => selectField(propertyPath, e.target.checked)}></input>
          <span onClick={e => setEditingField(propertyPath)}>
            {property}
          </span>
        </div>);
        
        if(options.showDescriptions) {
          let propertyInfo = properties[property];
          let description = processDescription(propertyInfo['description']);
          if(description) {
            propertyUIThisLevel.push(<div>{description}</div>);
          }
        }

        let doRecurse = false;
        if(level < options.recursionLevels) {
          doRecurse = true;
        }
        if(hasChildProperties && doRecurse) {
          context.recursionLevel = level + 1;
          let propertyUINextLevel = [];
          doPropertyDisplayRecursion(propertyUINextLevel, propertyInfo.properties, options, context);
          

          let subListStyle = {display: 'block'};
          if(!isExpanded) {
            subListStyle = {display: 'none'}
          }
          propertyUIThisLevel.push(
            <div style={ subListStyle } className={styles.csnSchemaLevel + ' ' + styles['csnSchemaLevel' + context.recursionLevel]} key={property + context.recursionLevel}>
              {propertyUINextLevel}
            </div>
          );

          context.recursionLevel = context.recursionLevel - 1;
        }
        context.recursionPath.pop();
      }
    }

    propertyUI.push(propertyUIThisLevel);
   
    return propertyUI;
  }

  function getEditingFieldDetails(path) {
    if(jsonSchema && path) {
      let pathParts = path.split('/');
      console.log(pathParts);
      console.log(jsonSchema.properties);
      let curProperties = jsonSchema.properties;
      for(let part of pathParts) {
        if(curProperties[part].properties) {
          curProperties = curProperties[part].properties;
        }
      }
      return curProperties;
    }
  }

  function displaySchema(jsonSchema, options={}) {
    let propertyUI = [];

    let context = { 
      recursionLevel: 0,
      recursionPath: []
    };

    if(jsonSchema.properties) {
      doPropertyDisplayRecursion(propertyUI, jsonSchema.properties, options, context);
    }

    return <div>
      <h3>{jsonSchema['title']}</h3>
      <div>{processDescription(jsonSchema['description'])}</div>
      <div className={styles.csnJSONEditor}>
        <div className={styles.csnJSONPropEditor}>{propertyUI}</div>
        <div className={styles.csnJSONEditorDisplay}>
          { JSON.stringify(jsonSchemaWithFieldsChosen, null, 2).replace(/\\"/g, '"') } 
        </div>
      </div>
    </div>;
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

    let fieldDetails = getEditingFieldDetails(editingField);

    let schemaPage = <div className={styles.csnSchemaPage}>
      <div>
        <div className={styles.csnControlsPanel}>
          <button onClick={(e) => goBack()}>&lArr; Back</button>
          <button onClick={(e) => goFieldsSelected()}>Fields Selected &rArr;</button>
        </div>
        <div className={styles.csnSchemaContent}>
          <div className={styles.csnSchemaDisplay}>
            <div className={styles.csnJSON}>
              { displaySchema(jsonSchema, options) }
            </div>
          </div>
          <div className={styles.csnSchemaControls}>
            <h3>Schema Controls</h3>
            <form>
              <div className={styles.csnSchemaSettingRow}>
                <div className={styles.csnSchemaSettingLabel}>
                  Show descriptions:
                </div>
                <div className={styles.csnSchemaSettingControl}>
                  <input type="checkbox" value={showDescriptions} onChange={e => changeSettingShowDesc(e.target.checked)} />
                </div>
              </div>
              <div className={styles.csnSchemaSettingRow}>
                <div className={styles.csnSchemaSettingLabel}>
                  Use sub class fields:
                </div>
                <div className={styles.csnSchemaSettingControl}>
                  <input type="checkbox" value={useSubClasses} onChange={e => changeSettingUseSubClasses(e.target.checked)} />
                </div>
              </div>
              <div className={styles.csnSchemaSettingRow}>
                <div className={styles.csnSchemaSettingLabel}>
                  Recursion levels:
                </div>
                <div className={styles.csnSchemaSettingControl}>
                  <select value={recursionLevels} onChange={e => changeSettingRecursionLevels(e.target.value)}>
                    <option value="0">0</option>
                    <option value="1">1</option>
                  </select>
                </div>
              </div>
            </form>
            {(editingField && fieldDetails) && 
              <div>
                <h3>Property Controls</h3>
                <h4>
                  Property: {editingField}
                </h4>
                
                <div className={styles.csnSchemaSettingRow}>
                  <div className={styles.csnSchemaSettingLabel}>
                    Type
                  </div>
                  <div className={styles.csnSchemaSettingControl}>
                    <select value={fieldDetails.type} onChange={e => changeSettingRecursionLevels(e.target.value)}>
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="integer">Integer</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                </div>
 
                <div className={styles.csnSchemaSettingRow}>
                  <div className={styles.csnSchemaSettingLabel}>
                    Pattern 
                  </div>
                  <div className={styles.csnSchemaSettingControl}>
                    <input type="text" value={''} />
                  </div>
                </div>


                <div className={styles.csnSchemaSettingRow}>
                  <div className={styles.csnSchemaSettingLabel}>
                    Required 
                  </div>
                  <div className={styles.csnSchemaSettingControl}>
                    <input type="checkbox" onChange={e => changeSettingShowDesc(e.target.checked)} />
                  </div>
                </div>
      
              </div>
            }
          </div>
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
