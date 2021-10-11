import styles from '../styles/App.module.css'
import CeramicClient from '@ceramicnetwork/http-client';
import { useEffect, useState, useCallback, Fragment } from 'react';
import Image from 'next/image';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { ThreeIdConnect,  EthereumAuthProvider } from '@3id/connect'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { DID } from 'dids'
import DataModels from './components/DataModels';
import { getSchema, getByType, transformObject, matchItemOrArray, getObjectFeatures, jsonLdToJsonSchema } from './components/JsonLd';
import { prettyPrintJson } from 'pretty-print-json';
import camelToKebabCase from "camel-to-kebab";

const API_URL = 'https://ceramic-clay.3boxlabs.com';
const MAX_RESULTS = 20;


const validPropertiesAllTypes = ['type', 'required'];

const validTypeProperties = {
  'string': ['pattern', 'minLength', 'maxLength'],
  'number': ['minimum', 'maximum'],
  'integer': ['minimum', 'maximum'],
  'boolean': [],
  'array': ['minItems', 'maxItems']
}

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
  const [options, setOptions] = useState({ expanded: {} });
  const [creatingModel, setCreatingModel] = useState(false);
  const [editingField, setEditingField] = useState();
  const [editingProperties, setEditingProperties] = useState({});
  const [editedProperties, setEditedProperties] = useState({});
  const [allEditedProperties, setAllEditedProperties] = useState({});
  const [selectedFields, setSelectedFields] = useState({});

  const [showDescriptions, setShowDescriptions] = useState(false);
  const [showMainDescription, setShowMainDescription] = useState(false);
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
      let fields = Object.keys(selectedFields);

      for(let path of fields) {
        let pathParts = path.split('/');
        copyObjectProperties(jsonSchema.properties, _jsonSchema.properties, pathParts);
      }

      for(let editedPropertyPath of Object.keys(allEditedProperties)) {
        let editedProps = allEditedProperties[editedPropertyPath];
        overwriteSchemaProperties(_jsonSchema, editedProps);
      }

      if(!options.showMainDescription) {
        delete _jsonSchema['description'];
      }
      
      setJSONSchemaWithFieldsChosen(_jsonSchema);
    }

  }, [jsonSchema, selectedFields, allEditedProperties ]);

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

  function overwriteSchemaProperties(schema, details) {
    let path = details.path;

    if(schema && path) {
      let pathParts = path.split('/');
      console.log(pathParts);
      console.log(schema.properties);
      let curProperties = schema.properties;

      for(let part of pathParts) {
        if(curProperties[part]) {
          if(curProperties[part].properties) {
            curProperties = curProperties[part].properties;
          }
          else {
            curProperties = curProperties[part];
          }
        }
      }

      if(curProperties) { 
        Object.keys(curProperties).forEach(function(key) { delete curProperties[key]; });
        for(let k of Object.keys(details)) {
          let type = details['type'];
          let validTypeProps = validTypeProperties[type] || [];

          if(k !== 'path') {
            if(k === 'required') {
              if(!schema.required) {
                curProperties.required = [];
              }
              curProperties.required.push(pathParts.slice(-1)[0]);
            }
            else {
              let prop = details[k];
              if(validPropertiesAllTypes.includes(k) || validTypeProps.includes(k)) {
                curProperties[k] = details[k];
              }
            }
          }
        }
      }
    }
  }

  const getCurrentProperties = useCallback((path) => {
    if(jsonSchema && path) {
      let pathParts = path.split('/');
      console.log(pathParts);
      console.log(jsonSchema.properties);
      let curProperties = jsonSchema.properties;
      for(let part of pathParts) {
        if(curProperties[part]) {
          if(curProperties[part].properties) {
            curProperties = curProperties[part].properties;
          }
        }
      }
      return curProperties;
    }
  }, [ jsonSchema ])

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
          <div onClick={e => selectObject(name)} className={styles.searchResultName}>
            <div className={styles.csnTextEllipsis}> 
              {name}
            </div>
          </div>
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
    setEditingField('');
    setEditingProperties({});
    setEditedProperties({});
    setAllEditedProperties({});
    setCreatingModel(false);
  }

  function goBackEditModel() {
    setCreatingModel(false);
  }

  function goCreateModel() {
    setCreatingModel(true);
  }

  function changeSettingShowMainDesc(val) {
    let newOptions = {...options};
    newOptions['showMainDescription'] = val;
    console.log(val);
    setShowMainDescription(val);
    setOptions(newOptions);
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
    let _selectedFields = {...selectedFields};
    if(selected) {
      _selectedFields[property] = selected;
    }
    else {
      delete _selectedFields[property];
    }
    setSelectedFields(_selectedFields);
    setEditingField(property)
  }

  useEffect(() => {
    if(editingField) {
      if(!allEditedProperties[editingField]) {
        let currentProperties = getCurrentProperties(editingField);
        if(currentProperties && currentProperties[editingField]) {
          setEditingProperties({
            type: currentProperties[editingField].type
          })
        }
      }
      else {
        setEditingProperties({...allEditedProperties[editingField]});
      }
    }
  }, [editingField, getCurrentProperties, allEditedProperties])

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
          <input type="checkbox" value={selectedFields[propertyPath]} onChange={e => selectField(propertyPath, e.target.checked)}></input>
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

  function displaySchemaForCreateModel(jsonSchema, options={}) {
    let propertyUI = [];

    let context = { 
      recursionLevel: 0,
      recursionPath: []
    };

    return <div>
      <h3>Data Model: {jsonSchema['title']}</h3>
      <div>{processDescription(jsonSchema['description'])}</div>
      <div className={styles.csnJSONEditor}>
        <div className={styles.csnJSONPropEditor}>{propertyUI}</div>
        <div className={styles.csnJSONEditorModelDisplay}>
          { JSON.stringify(jsonSchemaWithFieldsChosen, null, 2).replace(/\\"/g, '"') } 
        </div>
      </div>
    </div>;
  }

  function submitPropertyEdits(e) {
    let details = {...editingProperties};
    details.path = editingField;
    setEditedProperties(details);
    let _allEditedProperties = JSON.parse(JSON.stringify(allEditedProperties));
    _allEditedProperties[editingField] = details;
    setAllEditedProperties(_allEditedProperties);
    e.preventDefault();
  }

  function handlePropertyEdited(field, value) {
    let _editingProperties = {...editingProperties};
    _editingProperties[field] = value;
    setEditingProperties(_editingProperties);
  }

  function getPropertyEditFields(type) {
    let editFields;

    if(type === 'string') {
      editFields = <div className={styles.csnSchemaEditFields}>
        <div className={styles.csnSchemaSettingRow}>
          <div className={styles.csnSchemaSettingLabel}>
            Pattern 
          </div>
          <div className={styles.csnSchemaSettingControl}>
            <input type="text" value={editingProperties.pattern} onChange={e => handlePropertyEdited('pattern', e.target.value)} />
          </div>
        </div>

        <div className={styles.csnSchemaSettingRow}>
          <div className={styles.csnSchemaSettingLabel}>
            MinLength 
          </div>
          <div className={styles.csnSchemaSettingControl}>
            <input type="text" value={editingProperties.minLength} onChange={e => handlePropertyEdited('minLength', e.target.value)} />
          </div>
        </div>

        <div className={styles.csnSchemaSettingRow}>
          <div className={styles.csnSchemaSettingLabel}>
            MaxLength 
          </div>
          <div className={styles.csnSchemaSettingControl}>
            <input type="text" value={editingProperties.maxLength} onChange={e => handlePropertyEdited('maxLength', e.target.value)} />
          </div>
        </div>
      </div>
    }
    else if(type === 'number' || type === 'integer') {
      editFields = <div className={styles.csnSchemaEditFields}>
        <div className={styles.csnSchemaSettingRow}>
          <div className={styles.csnSchemaSettingLabel}>
            Minimum
          </div>
          <div className={styles.csnSchemaSettingControl}>
            <input type="text" value={editingProperties.minimum} onChange={e => handlePropertyEdited('minimum', e.target.value)} />
          </div>
        </div>

        <div className={styles.csnSchemaSettingRow}>
          <div className={styles.csnSchemaSettingLabel}>
            Maximum
          </div>
          <div className={styles.csnSchemaSettingControl}>
            <input type="text" value={editingProperties.maximum} onChange={e => handlePropertyEdited('maximum', e.target.value)} />
          </div>
        </div>
      </div>
    }
    else if(type === 'array') {
      editFields = <div className={styles.csnSchemaEditFields}>
        <div className={styles.csnSchemaSettingRow}>
          <div className={styles.csnSchemaSettingLabel}>
            Min Items 
          </div>
          <div className={styles.csnSchemaSettingControl}>
            <input type="text" value={editingProperties.minItems} onChange={e => handlePropertyEdited('minItems', e.target.value)} />
          </div>
        </div>

        <div className={styles.csnSchemaSettingRow}>
          <div className={styles.csnSchemaSettingLabel}>
            Max Items
          </div>
          <div className={styles.csnSchemaSettingControl}>
            <input type="text" value={editingProperties.maxItems} onChange={e => handlePropertyEdited('maxItems', e.target.value)} />
          </div>
        </div>
      </div>
    }

    return editFields;
  }

  function getSchemaPage() {
    let currentProperties = getCurrentProperties(editingField);

    let schemaPage = <div className={styles.csnSchemaPage}>
      <div>
        <div className={styles.csnControlsPanel}>
          <button onClick={(e) => goBack()}>&lArr; Back</button>
          <button onClick={(e) => goCreateModel()}>Create Data Model &rArr;</button>
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

              {/*
              <div className={styles.csnSchemaSettingRow}>
                <div className={styles.csnSchemaSettingLabel}>
                  Show descriptions:
                </div>
                <div className={styles.csnSchemaSettingControl}>
                  <input type="checkbox" value={showDescriptions} onChange={e => changeSettingShowDesc(e.target.checked)} />
                </div>
              </div>
              */}

              <div className={styles.csnSchemaSettingRow}>
                <div className={styles.csnSchemaSettingLabel}>
                  Use sub class fields:
                </div>
                <div className={styles.csnSchemaSettingControl}>
                  <input type="checkbox" value={useSubClasses} onChange={e => changeSettingUseSubClasses(e.target.checked)} />
                </div>
              </div>
              {/*
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
              */}
             
            </form>
            {(editingField && currentProperties) && 
              <div>
                <h3>Property Controls</h3>
                <h4>
                  Property: {editingField}
                </h4>
                
                <form onSubmit={e => submitPropertyEdits(e)}>
                  <div className={styles.csnSchemaSettingRow}>
                    <div className={styles.csnSchemaSettingLabel}>
                      Type
                    </div>
                    <div className={styles.csnSchemaSettingControl}>
                      <select value={editingProperties.type || currentProperties.type} onChange={e => handlePropertyEdited('type', e.target.value)}>
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="integer">Integer</option>
                        <option value="boolean">Boolean</option>
                        <option value="array">Array</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.csnSchemaSettingRow}>
                    <div className={styles.csnSchemaSettingLabel}>
                      Required 
                    </div>
                    <div className={styles.csnSchemaSettingControl}>
                      <input type="checkbox" onChange={e => handlePropertyEdited('required', e.target.checked)} />
                    </div>
                  </div>

                  { getPropertyEditFields(editingProperties.type) }

                  <input type="submit" name="submit" value="Update Schema" />
                </form>
                      
              </div>
            }
          </div>
        </div>
      </div>
    </div>;

    return schemaPage;
  }

  function getLink(href, text) {
    return <a href={href} target="_blank" rel="noreferrer">{text}</a>
  }

  function getCreateModelPage() {
    let title = jsonSchema['title'];
    let kebab = camelToKebabCase(title);

    let createModelPage = <div className={styles.csnSchemaPage}>
      <div>
        <div className={styles.csnControlsPanel}>
          <button onClick={(e) => goBackEditModel()}>&lArr; Back</button>
        </div>
        <div className={styles.csnModelContent}>
          <div className={styles.csnModelDisplay}>
            <div className={styles.csnJSON}>
              { displaySchemaForCreateModel(jsonSchema, options) }
            </div>
          </div>
          <div className={styles.csnModelControls}>
            <h3>Ceramic Data Model</h3>
            <p>
              Ceramic Data Models are schemas along with some metadata and supporting documents to make interacting with the schemas easier.
            </p>
            <p>
              They are wrapped in npm packages so that they can be easily reused within different applications.
            </p>
            <p>
              Community Data Models are stored in a {getLink("https://github.com/ceramicstudio/datamodels", "Github Repository")}.
            </p>
            <h3>Creating Your Data Model</h3>
            <div><b>(Prerequisite: Know Github forks and pull requests)</b></div>
            <h4>Initializing</h4>
            <ol>
              <li>Read the {getLink("https://github.com/ceramicstudio/datamodels/blob/main/CONTRIBUTING.md", "Contribution Guide")}</li>
              <li>Fork/Clone the {getLink("https://github.com/ceramicstudio/datamodels", "Data Model Repository")}</li>
              <li>Copy folder <b>datamodels/identity-profile-basic</b> to <b>datamodels/{kebab}</b></li>
            </ol>
            <h4>Updating</h4>
            <ol>
              <li>Switch to the new <b>datamodels/{kebab}</b> folder</li>
              <li>Copy the new <b>README.md</b> over README.md</li>
              <li>Copy the new <b>{title}.json</b> into schmas/{title}.json</li>
              <li>Delete <b>schemas/BasicProfile.json</b></li>
              <li>Update package.json with the new model details</li>
              <li>Do some magic to make types/{title}.d.ts and src/model.ts appear</li>
            </ol>
          </div>
        </div>
      </div>
    </div>;

    return createModelPage;
  }

  function getSearchPage() {
    let searchPage = <div className="csnSearchPage">
      <div>
        {getDataPanel()}
      </div>
      <div>
        {getTypeSearchPanel()}
      </div>
    </div>;

    return searchPage;
  }

  function getPageContent() {
    let content;
    if(jsonSchema) {
      if(creatingModel) {
        content = getCreateModelPage();
      }
      else {
        content = getSchemaPage();
      }
    }
    else {
      content = getSearchPage();
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
