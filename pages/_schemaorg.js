import styles from '../styles/App.module.css'
import { useEffect, useState, useCallback, Fragment } from 'react';
import Image from 'next/image';
import SearchPage from './components/SearchPage';
import { getSchema, getByType, transformObject, matchItemOrArray, getObjectFeatures, jsonLdToJsonSchema, jstr } from '../lib/JsonLd';
import camelToKebabCase from "camel-to-kebab";
import template from './data/markdown/template.md';
import modelTemplate from './data/templates/model_ts.txt';
import packageJSONTemplate from './data/templates/package_json.txt';
import Ceramic from './Ceramic';

const API_URL = 'https://ceramic-clay.3boxlabs.com';
const MAX_RESULTS = 20;

const validPropertiesAllTypes = ['type', 'required', 'description'];

const validTypeProperties = {
  'string': ['pattern', 'format', 'minLength', 'maxLength'],
  'number': ['minimum', 'maximum'],
  'integer': ['minimum', 'maximum'],
  'boolean': [],
  'array': ['minItems', 'maxItems'],
  'object': ['properties']
}

const markdownTableRow = '| `{{name}}` | {{desc}} | {{type}} | {{max_size}} | {{optional}} | {{example}} |';

function SchemaOrg() {
  const [dataLoaded, setDataLoaded] = useState();
  const [dataLoadError, setDataLoadError] = useState();
  const [data, setData] = useState();
  const [idIndex, setIdIndex] = useState();
  const [fieldIndex, setFieldIndex] = useState();
  const [enteredType, setEnteredType] = useState('');
  const [type, setType] = useState('Class');
  const [selectedObject, setSelectedObject] = useState('');
  const [jsonSchema, setJSONSchema] = useState('');
  const [jsonSchemaWithFieldsChosen, setJSONSchemaWithFieldsChosen] = useState('');
  const [jsonSchemaWithManualEdits, setJSONSchemaWithManualEdits] = useState('');
  const [jsonSchemaEditingText, setJSONSchemaEditingText] = useState('');
  const [options, setOptions] = useState({ expanded: {}, subClassSelections: {} });
  const [subClassFields, setSubClassFields] = useState({});
  const [creatingModel, setCreatingModel] = useState(false);
  const [editingField, setEditingField] = useState();
  const [editingProperties, setEditingProperties] = useState({});
  const [editedProperties, setEditedProperties] = useState({});
  const [allEditedProperties, setAllEditedProperties] = useState({});
  const [selectedProperties, setSelectedProperties] = useState({});
  const [modelTab, setModelTab] = useState('schema');
  const [ceramicEnabled, setCeramicEnabled] = useState();
  const [encodedModel, setEncodedModel] = useState();
  const [author, setAuthor] = useState('');
  const [version, setVersion] = useState('');
  const [keywords, setKeywords] = useState('');
  const [replacedPackageJSON, setReplacedPackageJSON] = useState('');
  const [schemaManuallyEdited, setSchemaManuallyEdited] = useState(false);
  const [schemaErrors, setSchemaErrors] = useState('');

  const [origTitle, setOrigTitle] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [showDescriptions, setShowDescriptions] = useState(false);
  const [showMainDescription, setShowMainDescription] = useState(true);
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

  function copyObj(o) {
    return JSON.parse(JSON.stringify(o));
  }

  useEffect(() => {
    if(selectedObject && data) {
      let context = { idIndex, fieldIndex };
      let _jsonSchemaObj = jsonLdToJsonSchema(selectedObject, data, options, context);
      setSubClassFields(copyObj(context.subClassFields));
      setJSONSchema(_jsonSchemaObj);
      if(_jsonSchemaObj.title !== origTitle) {
        setOrigTitle(_jsonSchemaObj.title);
        setTitle(_jsonSchemaObj.title);
        setDescription(_jsonSchemaObj.description);
      }
    }
  }, [selectedObject, data, options, idIndex, fieldIndex, origTitle]);

  const copyObjectProperties = useCallback((origProperties, newProperties, fields) => {
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
  }, []);

  const niceStringify = useCallback((json) => {
    return JSON.stringify(json, null, 2).replace(/\\"/g, '"');
  }, []);

  useEffect(() => {
    if(jsonSchema) {
      let _jsonSchema = JSON.parse(JSON.stringify(jsonSchema));
      _jsonSchema.properties = { };
      let fields = Object.keys(selectedProperties);

      for(let path of fields) {
        let pathParts = path.split('/');
        copyObjectProperties(jsonSchema.properties, _jsonSchema.properties, pathParts);
      }

      for(let editedPropertyPath of Object.keys(allEditedProperties)) {
        let editedProps = allEditedProperties[editedPropertyPath];
        overwriteSchemaProperties(_jsonSchema, editedProps);
      }

      _jsonSchema['title'] = title;
      _jsonSchema['description'] = description;

      if(!showMainDescription) {
        delete _jsonSchema['description'];
      }
      else {
        _jsonSchema['description'] = _jsonSchema['description'].substr(0, 200);
      }
      
      setJSONSchemaWithFieldsChosen(_jsonSchema);
      setJSONSchemaWithManualEdits(_jsonSchema);
      setJSONSchemaEditingText(niceStringify(_jsonSchema));
    }

  }, [jsonSchema, selectedProperties, allEditedProperties, title, description, copyObjectProperties, showMainDescription, niceStringify ]);

  function overwriteSchemaProperties(schema, details) {
    let path = details.path;

    if(schema && path) {
      let pathParts = path.split('/');
      let curProperties = schema.properties;

      for(let part of pathParts) {
        if(curProperties[part]) {
          curProperties = curProperties[part];
        }
        else {
          curProperties = null;
        }
      }

      if(curProperties) { 
        Object.keys(curProperties).forEach(function(key) { 
          if(key !== 'description') {
            delete curProperties[key]; 
          }
        });
        for(let k of Object.keys(details)) {
          let type = details['type'];
          let validTypeProps = validTypeProperties[type] || [];
          let prop = details[k];

          if(k !== 'path') {
            if(k === 'required' && prop === true) {
              if(!schema.required) {
                schema.required = [];
              }
              schema.required.push(pathParts.slice(-1)[0]);
            }
            else {
              if(validPropertiesAllTypes.includes(k) || validTypeProps.includes(k)) {
                if(details[k]) {
                  curProperties[k] = details[k];
                }
              }
            }
          }
        }
      }
    }
  }

  const getCurrentProperties = useCallback((path, giveFullInfo=false) => {
    if(jsonSchema && path) {
      let pathParts = path.split('/');
      console.log(pathParts);
      console.log(jsonSchema.properties);
      let curProperties = jsonSchema.properties;
      let fullInfo = {};
      for(let part of pathParts) {
        if(curProperties[part]) {
          if(curProperties[part].properties) {
            curProperties = curProperties[part].properties;
            fullInfo = curProperties[part];
          }
        }
      }
      let ret = giveFullInfo ? fullInfo : curProperties;
      return ret;
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

  function getTypeSearchForm() {
    return <form onSubmit={handleTypeFormSubmit}>
      <label>
        Object type:
        <input type="text" value={enteredType} onChange={e => setEnteredType(e.target.value)} />
      </label>
      <input type="submit" value="Go" />
    </form>;
  }

 function goBack() {
    setJSONSchema('');
    setSelectedObject('');
    setSelectedProperties({});
    setEditingField('');
    setEditingProperties({});
    setEditedProperties({});
    setAllEditedProperties({});
    setCreatingModel(false);
    let _options = {...options};
    _options.subClassSelections = {};
    setOptions(_options);
  }

  function goBackEditModel() {
    setCreatingModel(false);
    setJSONSchemaEditingText(niceStringify(jsonSchema));
    setSchemaErrors('');
  }

  function goCreateModel() {
    setCreatingModel(true);
    setModelTab('schema');
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

  function selectProperty(property, selected) {
    let _selectedProperties = {...selectedProperties};
    if(selected) {
      _selectedProperties[property] = selected;
    }
    else {
      delete _selectedProperties[property];
    }
    setSelectedProperties(_selectedProperties);
    setEditingField(property)
  }

  useEffect(() => {
    if(editingField) {
      if(allEditedProperties[editingField]) {
        setEditingProperties({...allEditedProperties[editingField]});
      }
      else {
        let currentProperties = jsonSchema.properties[editingField];
        if(currentProperties) {
          let initProperties = initAllProperties(currentProperties.type);
          setEditingProperties(initProperties);
        }
      }
    }
  }, [editingField, jsonSchema, allEditedProperties])

  useEffect(() => {
    if(jsonSchemaEditingText) {

      try {
        JSON.parse(jsonSchemaEditingText);
        setSchemaManuallyEdited(true);
        setSchemaErrors();
      }
      catch(e) {
        setSchemaManuallyEdited(false);
        setSchemaErrors(e.message);
      }
    }
  }, [jsonSchemaWithFieldsChosen, jsonSchemaEditingText, niceStringify]);

  const updateModel = function(e) {
    try {
      let _jsonSchemaWithManualEdits = JSON.parse(jsonSchemaEditingText);
      setJSONSchemaWithManualEdits(_jsonSchemaWithManualEdits);
      setSchemaManuallyEdited(false);
    }
    catch(e) {
      setSchemaManuallyEdited(false);
      setSchemaErrors(e.message);
    }
  }

  function initAllProperties(type) {
    let initProperties = {
      type: type
    }

    for(let prop of validTypeProperties[type]) {
      initProperties[prop] = '';
    }
    return initProperties;
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
          <input type="checkbox" checked={selectedProperties[propertyPath]} onChange={e => selectProperty(propertyPath, e.target.checked)}></input>
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

    let numProps = Object.keys(jsonSchema.properties).length;

    if(numProps === 0) {
      propertyUI = <div>
        <h4>{title} has no properties.</h4>
        <p>Select a Sub Class to add sub class properties.</p>
      </div>
    }

    return <div>
      <h3><input type="text" className={styles.csnModelTitle} value={title} onChange={e => setTitle(e.target.value)} /></h3>
      <div>
        <textarea type="text" className={styles.csnModelDescription} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className={styles.csnJSONEditor}>
        <div className={styles.csnJSONPropEditor}>{propertyUI}</div>
        <div className={styles.csnJSONEditorDisplay}>
          { JSON.stringify(jsonSchemaWithManualEdits, null, 2).replace(/\\"/g, '"') } 
        </div>
      </div>
    </div>;
  }

  function copyToClipboard(val) {
    navigator.clipboard.writeText(val);
  }
  
  function displaySchemaForCreateModel(jsonSchema, options={}) {
    return <div className={styles.csnJSONEditorContainer}>
      {schemaErrors &&
        <div className={styles.csnJSONEditorErrors}>
          {schemaErrors}
        </div>
      }
      <div className={styles.csnJSONEditor}>
        <div className={styles.csnClipboard} onClick={e => copyOutputToClipboard(e, 'schema')}>
          <Image alt="Clipboard Icon" title="Copy to clipboard" src="/azulejo/copy-50x50-1.png" width="32" height="32" />
        </div>
        <textarea className={styles.csnJSONEditorModelDisplay} id="outputSchema" value={jsonSchemaEditingText} onChange={e => setJSONSchemaEditingText(e.target.value)}>
          { JSON.stringify(jsonSchema, null, 2).replace(/\\"/g, '"') } 
        </textarea>
      </div>
    </div>;
  }

  function submitPropertyEdits(e) {
    let details = {...editingProperties};
    details.path = editingField;

    // TODO: This is a fudge until sub object editing is implemented
    if(details.type === 'object') {
      details.properties = {};
    }

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

  useEffect(() => {
    console.log('type changed');
    let newType = editingProperties.type;

    if(!allEditedProperties[editingField]) {
      
    }

  }, [editingProperties.type])

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
            Format
          </div>
          <div className={styles.csnSchemaSettingControl}>
            <select value={editingProperties.format} onChange={e => handlePropertyEdited('format', e.target.value)}>
              <option value="">None</option>
              <option value="date-time">date-time</option>
              <option value="uri">uri</option>
              <option value="email">email</option>
              <option value="hostvalue">hostvalue</option>
              <option value="ipv4">ipv4 address</option>
              <option value="ipv6">ipv6 address</option>
            </select>
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
    else if(type === 'object') {
      editFields = <div>
        <div className={styles.csnSchemaSettingRow}>
          <div className={styles.csnSchemaSettingLabel}>
            Properties
          </div>
          <div className={styles.csnSchemaSettingControl}>
            <input type="text" value={'{}'} disabled onChange={e => {}}/>
          </div>
        </div>
        <h4>Editing of sub objects is not implemented.</h4>
        <h4>They can be added after the schema is created.</h4>
      </div>
    }

    return editFields;
  }

  function changeSettingSubClassSelection(id, checked) {
    let _options = {...options};
    let _subClassSelections = {..._options.subClassSelections};

    if(checked) {
      _subClassSelections[id] = true;
    }
    else {
      delete _subClassSelections[id];
    }

    _options.subClassSelections = _subClassSelections;

    setOptions(_options);
  }

  function getSubClassSelector() {
    let subClassLines = [];

    for(let subClassID of Object.keys(subClassFields)) {
      let propertyName = subClassID.split(':')[1];
      let subClassLine = <div className={styles.csnSchemaSettingRow}>
        <div className={styles.csnSchemaSettingLabel}>
          {propertyName}
        </div>
        <div className={styles.csnSchemaSettingControl}>
          <input type="checkbox" checked={options.subClassSelections[subClassID]} 
                 onChange={e => changeSettingSubClassSelection(subClassID, e.target.checked)} />
        </div>
      </div>;

      subClassLines.push(subClassLine);
    }

    return subClassLines;
  }

  function getSchemaPage() {
    let currentProperties = getCurrentProperties(editingField);

    console.log('CP', editingProperties);
    console.log('type', editingProperties.type);
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
            <form>

              {
              <div className={styles.csnSchemaSettingRow}>
                <div className={styles.csnSchemaSettingLabel}>
                  Property descriptions
                </div>
                <div className={styles.csnSchemaSettingControl}>
                  <input type="checkbox" checked={showDescriptions} onChange={e => changeSettingShowDesc(e.target.checked)} />
                </div>
              </div>
              }

              <h3>Use Sub Class</h3>
              { getSubClassSelector() }

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
                      <select value={editingProperties.type} onChange={e => handlePropertyEdited('type', e.target.value)}>
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="integer">Integer</option>
                        <option value="boolean">Boolean</option>
                        <option value="array">Array</option>
                        <option value="object">Object</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.csnSchemaSettingRow}>
                    <div className={styles.csnSchemaSettingLabel}>
                      Required  
                    </div>
                    <div className={styles.csnSchemaSettingControl}>
                      <input type="checkbox" checked={editingProperties.required} onChange={e => handlePropertyEdited('required', e.target.checked)} />
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

  const replaceTemplate = useCallback((type, template, jsonSchema, extraInfo={}) => {
    let title = jsonSchema['title'];
    let titleLCFirst = title.charAt(0).toLowerCase() + title.slice(1);
    let description = jsonSchema['description'];
    let requiredFields = jsonSchema['required'] || [];
    let kebab = camelToKebabCase(title);
    let replacedTemplate = template.replaceAll('{{title}}', title);
    replacedTemplate = replacedTemplate.replaceAll('{{titleLCFirst}}', titleLCFirst);
    replacedTemplate = replacedTemplate.replaceAll('{{slug}}', kebab);
    replacedTemplate = replacedTemplate.replaceAll('{{kebab}}', kebab);
    replacedTemplate = replacedTemplate.replaceAll('{{description}}', description);

    if(extraInfo.author) {
      replacedTemplate = replacedTemplate.replaceAll('{{author}}', author);
    }

    if(extraInfo.version) {
      replacedTemplate = replacedTemplate.replaceAll('{{version}}', version);
    }

    if(extraInfo.keywords) {
      replacedTemplate = replacedTemplate.replaceAll('{{keywords_array}}', extraInfo.keywords);
    }

    let properties;

    if(jsonSchema['definitions'] && Object.keys(jsonSchema['definitions']).length) {
      // TODO: Support multiple definitions
      let definitionKey = Object.keys(jsonSchema['definitions'])[0];
      properties = jsonSchema['definitions'][definitionKey]['properties'];
    }
    else {
      properties = jsonSchema['properties'];
    }

    let fields = [];

    for(let name of Object.keys(properties)) {
      let props = properties[name];
      let desc = props.description || '';
      let type = props.type || '';
      let maxSize = '';
      let required = (requiredFields.includes(name)).toString();
      let example = '';
      
      let propLine = `${name}|${desc}|${type}|${maxSize}|${required}|${example}|`;
      fields.push(propLine);
    }

    if(type === 'modelTS') {
      if(extraInfo.encodedModel) {
        let encodedModelJSON = JSON.stringify(extraInfo.encodedModel, null, 2);
        let unquotedEncodedModel = encodedModelJSON.replace(/"([^"]+)":/g, '$1:');
        unquotedEncodedModel = unquotedEncodedModel.replaceAll('"', "'");
        replacedTemplate = replacedTemplate.replaceAll('{{encodedModel}}', 
          unquotedEncodedModel
        );
      }
    }

    replacedTemplate = replacedTemplate.replaceAll('{{fields}}', fields.join('\n'));

    return replacedTemplate;
  }, [author, version]);

  function copyOutputToClipboard(e, type, extraInfo={}) {
    console.log('copy', type);
    if(type === 'schema') {
      let content = jsonSchemaEditingText;
      copyToClipboard(content);
    }
    else if(type === 'readme') {
      let replacedTemplate = replaceTemplate(type, template, jsonSchemaWithManualEdits, extraInfo);
      copyToClipboard(replacedTemplate);
    }
    else if(type === 'packageJSON') {
      let replacedTemplate = replacePackageJSON();
      copyToClipboard(replacedTemplate);
    }
    else if(type === 'modelTS') {
      let replacedModelTS = replaceTemplate('modelTS', modelTemplate, jsonSchemaWithManualEdits, {
        'encodedModel': encodedModel}
      );
      copyToClipboard(replacedModelTS);
    }
    e.stopPropagation();
    e.preventDefault();
  }

  const replacePackageJSON = useCallback(() => {
      let keywordArray = keywords.split(',').map(x => x.trim());
      let keywordArrayJSON = JSON.stringify(keywordArray);
      let extraInfo = {
        'author': author,
        'version': version,
        'keywords': keywordArrayJSON
      }
      let _replacedPackageJSON = replaceTemplate('packageJSON', packageJSONTemplate, jsonSchemaWithManualEdits, extraInfo);
      return _replacedPackageJSON;
  }, [author, version, jsonSchemaWithManualEdits, keywords, replaceTemplate]);

  useEffect(() => {
    if(jsonSchemaWithManualEdits) {
      let _replacedPackageJSON = replacePackageJSON();
      setReplacedPackageJSON(_replacedPackageJSON);
    }

  }, [ jsonSchemaWithManualEdits, replacePackageJSON, setReplacedPackageJSON, author, version, keywords, replaceTemplate])

  function getCreateModelPage() {
    let kebab = camelToKebabCase(title);

    console.log(modelTemplate);
    console.log(packageJSONTemplate);

    let replacedTemplate = replaceTemplate('readme', template, jsonSchemaWithManualEdits);
    let replacedModelTS = replaceTemplate('modelTS', modelTemplate, jsonSchemaWithManualEdits, {
      'encodedModel': encodedModel}
    );

    let createModelPage = <div className={styles.csnSchemaPage}>
      <div>
        <div className={styles.csnControlsPanel}>
          <button onClick={(e) => goBackEditModel()}>&lArr; Back</button>
        </div>
        <div className={styles.csnModelContent}>
          <div className={styles.csnModelDisplay}>
            <div className={styles.csnJSON}>
              <div className={styles.csnModelDisplayHeading}>
                <h3>Data Model: {title}</h3>

                <div className={styles.csnModelDispayHeadingControls}>
                  { (schemaManuallyEdited && !schemaErrors) &&
                    <button onClick={e => updateModel(e)}>Update Model</button>
                  }
                </div>
              </div>
              <div>{description}</div>
              <div className={styles.csnModelTabs}>
                <div onClick={() => setModelTab('schema')} className={styles.csnModelTab + ' ' + (modelTab === 'schema' && styles.csnModelTabSelected)}>
                  {title}.json
                </div>
                <div onClick={() => setModelTab('readme')} className={styles.csnModelTab + ' ' + (modelTab === 'readme' && styles.csnModelTabSelected)}>
                  README.md
                </div>
                <div onClick={() => setModelTab('packageJSON')} className={styles.csnModelTab + ' ' + (modelTab === 'packageJSON' && styles.csnModelTabSelected)}>
                  package.json
                </div>
                <div onClick={() => setModelTab('modelTS')} className={styles.csnModelTab + ' ' + (modelTab === 'modelTS' && styles.csnModelTabSelected)}>
                  model.ts
                </div>
              </div>
              <div className={styles.csnModelPanel} style={ { display: (modelTab === 'schema' ? 'block' : 'none'), position: 'relative' }}>
                { displaySchemaForCreateModel(jsonSchemaWithManualEdits, options) }
              </div>
              <div style={ { display: (modelTab === 'readme' ? 'block' : 'none'), position: 'relative' }}>
                <div className={styles.csnClipboard} onClick={e => copyOutputToClipboard(e, 'readme')}>
                  <Image alt="Clipboard Icon" title="Copy to clipboard" src="/azulejo/copy-50x50-1.png" width="32" height="32" />
                </div>
                <pre className={styles.csnMarkdownDisplay} id="outputReadme" onClick={e => copyOutputToClipboard(e, 'readme')}>
                  {replacedTemplate}
                </pre>
              </div>
              <div style={ { display: (modelTab === 'packageJSON' ? 'block' : 'none'), position: 'relative' }}>
                <div className={styles.csnPackageJSONEditor}>
                  <div className={styles.csnPackageJSONControls}>
                    <input type="text" value={author} placeholder="Author" onChange={e => setAuthor(e.target.value)} />
                    <input type="text" value={version} placeholder="Version (e.g. 0.0.1)" onChange={e => setVersion(e.target.value)} />
                    <input type="text" value={keywords} placeholder="Keywords" onChange={e => setKeywords(e.target.value)} />
                  </div>
                  <div className={styles.csnPackageJSONViewer}>
                    <div className={styles.csnClipboard} onClick={e => copyOutputToClipboard(e, 'packageJSON')}>
                      <Image alt="Clipboard Icon" title="Copy to clipboard" src="/azulejo/copy-50x50-1.png" width="32" height="32" />
                    </div>
                    <pre className={styles.csnMarkdownDisplay} onClick={e => copyOutputToClipboard(e, 'packageJSON')}>
                      {replacedPackageJSON}
                    </pre>
                  </div>
                </div>
              </div>
              <div style={ { display: (modelTab === 'modelTS' ? 'block' : 'none'), position: 'relative' }}>
                <div className={styles.csnClipboard} onClick={e => copyOutputToClipboard(e, 'modelTS')}>
                  <Image alt="Clipboard Icon" title="Copy to clipboard" src="/azulejo/copy-50x50-1.png" width="32" height="32" />
                </div>
                <pre className={styles.csnMarkdownDisplay} onClick={e => copyOutputToClipboard(e, 'modelTS')}>
                  {replacedModelTS}
                </pre>
              </div>
            </div>
          </div>
          <div className={styles.csnModelControls}>
          
            <h3>Creating Your Data Model</h3>

            <Ceramic schema={jsonSchemaWithManualEdits} setEncodedModel={setEncodedModel} />

            <div><b>(Prerequisite: Know git fork, clone, branch, and pull request)</b></div>
            <h4>Initializing</h4>
            <ol>
              <li>Read the {getLink("https://github.com/ceramicstudio/datamodels/blob/main/CONTRIBUTING.md", "Contribution Guide")}</li>
              <li>Fork the {getLink("https://github.com/ceramicstudio/datamodels", "Data Model Repository")}</li>
              <li>git clone git@github.com:your-username/datamodels.git</li>
              <li>git checkout -b {kebab}</li>
              <li>cd datamodels</li>
              <li>yarn # pray for successful outcome</li>
              <li>cp -R <b>packages/identity-profile-basic</b> <b>packages/{kebab}</b></li>
            </ol>
            <h4>Updating</h4>
            <ol>
              <li>cd <b>packages/{kebab}</b></li>
              <li>Copy the new <b>README.md</b> over README.md</li>
              <li>Copy <b>{title}.json</b> into <b>schemas/{title}.json</b></li>
              <li>yarn types</li>
              <li>Copy the new <b>package.json</b> over package.json</li>
              <li>Copy the new <b>model.ts</b> over src/model.ts</li>
              <li>Delete <b>schemas/BasicProfile.json</b></li>
            </ol>
            <h4>Finally</h4>
            <ol>
              <li>cd to the **datamodels** root</li>
              <li>yarn</li>
              <li>yarn prepare</li>
              <li>Create a pull request on the {getLink("https://github.com/ceramicstudio/datamodels", "Data Model Repository")}</li>
            </ol>

          </div>
        </div>
      </div>
    </div>;

    return createModelPage;
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
      content = <SearchPage type={type} styles={styles} setType={setType} selectObject={selectObject}
                            data={data} processDescription={processDescription} />;
    }

    return content;
  }

  return (
    <div className={styles.csnApp}> 
      <div className={styles.csnHeader}>
        <div className={styles.csnMenu}>
          <div className={styles.csnMenuItem}>
            <a href="https://azulejo-docs.web.app/" target="_blank" rel="noreferrer">Documentation</a>
          </div>
        </div>
        <h1 className={styles.csnTitle}>
          AZULEJO
        </h1>
        <div>
          <Image alt="Ceramic Logo" src="/azulejo/azulejo-logo-200x200-1.png" width="32" height="32" />
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
