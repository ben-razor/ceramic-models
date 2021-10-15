export async function getSchema() {
    let success = false;
    let error = '';
    let data;
    let idIndex;
    let fieldIndex;

    try {
        let r = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld');
        data = await r.json();
        ({ idIndex, fieldIndex } = generateIndexes(data));
        success = true;
    }
    catch(e) {
        error = e;
    }

    return { success, data, error, idIndex, fieldIndex };
}

function generateIndexes(data) {
    let graph = data.graph;
    let idIndex = {};
    let fieldIndex = {};
    let i = 0;

    for(let record of graph) {
        let id = record['@id'];
        idIndex[id] = i;
        fieldIndex[id] = [];
        i++;
    }

    for(let record of graph) {
        let id = record['@id'];
        let domainIncludes = record['domainIncludes'];

        if(Array.isArray(domainIncludes)) {
            for(let field of domainIncludes) {
                let fieldId = field['@id'];
                fieldIndex[fieldId].push(id);
            }
        }
        else {
            let fieldId = domainIncludes['@id'];
            fieldIndex[fieldId].push(id);
        }
    }

    return { idIndex, fieldIndex };
}

/**
 * Some fields in jsonld can be either single valued or array.
 * 
 * If you want to find schemas with a specific name in the domain includes, 
 * this function helps you to do that. 
 *    
 * "schema:domainIncludes": {
        "@id": "schema:MenuItem"
      },

      "schema:domainIncludes": [
        {
            "@id": "schema:SizeSpecification"
        },
        {
            "@id": "schema:MenuItem"
        }
      ],
 * @param {jsonld field value} elem 
 * @param {a callback that the field value will be passed to} predicateCallback 
 * @returns 
 */
export function matchItemOrArray(elem, predicateCallback) {
    if(Array.isArray(elem)) {
        for(let item of elem) {
            if(predicateCallback(item)) {
                return true;
            }
        }
    }
    else if(typeof elem === 'object') {
        for(let k of Object.keys(elem)) {
            if(typeof elem[k] === 'string') {
                if(predicateCallback(elem)) {
                    return true;
                }
            }
        }
    }
    else {
        if(predicateCallback(elem)) return true;
    }
}

function getSubclassFields(startSubClass, data, options, context={}) {
    let initSubClassID = startSubClass['@id'];
    let initSubClassName = initSubClassID.split(':')[1];

    let {baseItem, fields, subClasses} = getObjectFeatures(initSubClassName, data, options);

    context.subClassFields = {};
    context.subClassFields[initSubClassID] = fields;

    let allSubClassFields = fields;

    for(let subClass of subClasses) {
        let nextSubClass = subClass;
        while(nextSubClass) {
            let nextSubClassID = nextSubClass['@id'];
            let nextSubClassName = nextSubClassID.split(':')[1];
            let {baseItem: nextBaseItem, fields: nextFields, subClasses: newNextSubclasses} = getObjectFeatures(nextSubClassName, data, options);
            allSubClassFields = allSubClassFields.concat(nextFields);
            // TODO: There can be multiple base classes, this only supports the first one for the moment
            nextSubClass = newNextSubclasses[0];
            context.subClassFields[nextSubClassID] = nextFields;
        }
    }

    return allSubClassFields;
}

export function getObjectFeatures(objectName, data, options, context={}) {
    let graph = data["@graph"];
    let schemaSelector = `schema:${objectName}`;
    let baseItem;

    if(context.idIndex) {
        let itemIndex = context.idIndex[schemaSelector];
        baseItem = graph[itemIndex];
    }
    else {
        baseItem = graph.filter(x => x['@id'] === schemaSelector)[0];
    }

    let fields;
    if(baseItem) {
        if(context.fieldIndex) {
            let itemIndexes = context.idIndex[schemaSelector];
            fields = [];
            for(let itemIndex in itemIndexes) {
                fields.push(graph[itemIndex]);
            }
        }
        else {
            fields = graph.filter(x => matchItemOrArray(x["schema:domainIncludes"], val => {
                if(val) {
                    return val['@id'] === schemaSelector;
                }
            }));
        }
    }

    let subClass = baseItem['rdfs:subClassOf'];
    let subClasses = subClass;
    if(!Array.isArray(subClass)) {
        subClasses = [subClass];
    }

    return { baseItem, fields, subClasses };
}

/**
 * Convert an object that was created from jsonld to json schema format.
 * 
 * @param {object} jsonLdObj 
 * @param {object} data           The json data obj from schema.org
 * @param {object} options 
 * @param {object} context        An object for passing info down the tree
 */
export function jsonLdToJsonSchema(objectName, data, options, context={}) {
    let {baseItem, fields: ownFields, subClasses} = getObjectFeatures(objectName, data, options);

    let fields = ownFields;

    // TODO: This only supports one base class, there can be multiple
    if(subClasses) {
        let subClass = subClasses[0];
        if(subClass['@id']) {
            getSubclassFields(subClass, data, options, context);

            if(options.subClassSelections) {
                for(let id of Object.keys(options.subClassSelections)) {
                    if(context.subClassFields[id]) {
                        fields = fields.concat(context.subClassFields[id]);
                    }
                }
            }
        }
    }

    let comment = baseItem['rdfs:comment'];
    if(typeof comment === 'object') {
        comment = JSON.stringify(comment);
    }

    let jsonSchemaObj = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": objectName,
        "description": comment,
        "type": "object",
        "properties": {

        },
        "definitions": {

        }
    }

    for(let field of fields) {
        let fieldId = field['@id'];
        let subObjectName = fieldId.split(':')[1];
        let {baseItem: baseItemSub, fields: fieldsSub, subClass: subClassSub} = getObjectFeatures(subObjectName, data, options, context);

        let rangeIncludes = baseItemSub['schema:rangeIncludes'];

        let type = '';
        let rangeIncludeId = '';
        let comment = '';

        // TODO Get multiple range includes (more than one option for field type)
        if(rangeIncludes) {
            let rangeInclude = rangeIncludes;
            if(Array.isArray(rangeInclude)) {
                let i = 0;
                rangeInclude = rangeIncludes[i];
            }
            rangeIncludeId = rangeInclude['@id'];
            let rangeIncludeName = rangeIncludeId.split(':')[1];
            let {baseItem: baseItemRange, fields: fieldsRange, subClass: subClassRange} = getObjectFeatures(rangeIncludeName, data, options, context);
            comment = baseItemRange['rdfs:comment'];

            type = rangeIncludeId;
            if(Array.isArray(baseItemRange['@type']) && baseItemRange['@type'].includes("schema:DataType")) {
                type = baseItemRange['rdfs:label'].toLowerCase();
            }
        }

        let jsonSchemaType = 'object';
        let format;

        if(type) {
            if(type === 'text') {
                jsonSchemaType = 'string';
            }
            else if(type === 'datetime') {
                jsonSchemaType = 'string';
                format = 'date-time';
            }
            else if(type === 'time') {
                jsonSchemaType = 'string';
                format = 'time';
            }
            else if(type === 'date') {
                jsonSchemaType = 'string';
                format = 'date';
            }
        }

        let propertyObj = {
            'type': jsonSchemaType
        };

        if(jsonSchemaType === 'object') {
            let recursionLevel = context?.recursionLevel || 0;
            context.recursionPath = context?.recursionPath || [fieldId];
            let fullyRecursed = true;

            if(options.recursionLevels && recursionLevel < options.recursionLevels) {
                fullyRecursed = false;
            }

            if(fullyRecursed) {
                propertyObj['properties'] = fieldId;
            }
            
            else {
                let propertyRangeIncludes = field['schema:rangeIncludes'];
                let propertyId;
                if(Array.isArray(propertyRangeIncludes)) {
                    propertyId = propertyRangeIncludes[0]['@id'];
                }
                else {
                    propertyId = propertyRangeIncludes['@id'];
                }
                let propertyName = propertyId.split(':')[1];

                context.recursionLevel = recursionLevel + 1;
                context.recursionPath.push(propertyId);
                let propertySchemaObj = jsonLdToJsonSchema(propertyName, data, options, context);
                context.recursionLevel = context.recursionLevel - 1;

                if(propertySchemaObj && propertySchemaObj.properties) {
                    propertyObj['properties'] = propertySchemaObj.properties;
                }
                else {
                    propertyObj['properties'] = propertyId;
                }
                context.recursionPath.pop();
            }

       }

        if(comment && typeof comment === 'string') {
            if(options.showDescriptions) {
                propertyObj['description'] = comment;
            }
        }

        if(format) {
            propertyObj['format'] = format;
        }

        jsonSchemaObj["properties"][subObjectName] = propertyObj;
    }

    return jsonSchemaObj;
}

/**
 * Find jsonld objects based on the @type field.
 * 
 * @param {string} type Class|Property or name of another schema
 */
export function getByType(type, data) {
    let graph = data["@graph"];
    let items = graph.filter(x => {
        let typeField = x['@type'];
        if(typeField) {
            let matchResult = matchItemOrArray(typeField, item => {
                let typeParts = item.split(':');
                let name;
                if(typeParts.length > 1) {
                    name = item.split(':').slice(1)[0];
                }
                if(name === type) return true;
                else return false;
            });
            return matchResult;
        }
    });
    return items;
}

async function run(method) {
    let { success, data, error } = await getSchema();

    if(success) {
        if(method === 'getTopLevel') {

        }
    }
}

export function jstr(val) {
    return JSON.stringify(val);
}


