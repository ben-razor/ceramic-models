export async function getSchema() {
    let success = false;
    let error = '';
    let data;

    try {
        let r = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld');
        data = await r.json();
        success = true;
    }
    catch(e) {
        error = e;
    }

    return { success, data, error };
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

export function getObjectFeatures(objectName, data) {
    let graph = data["@graph"];
    let schemaSelector = `schema:${objectName}`;

    let baseItem = graph.filter(x => x['@id'] === schemaSelector)[0];

    let fields;
    if(baseItem) {
        fields = graph.filter(x => matchItemOrArray(x["schema:domainIncludes"], val => {
            if(val) {
                return val['@id'] === schemaSelector;
            }
        }));
    }

    let subClass = baseItem['rdfs:subClassOf'];

    return { baseItem, fields, subClass };
}

/**
 * Convert an object that was created from jsonld to json schema format.
 * 
 * @param {object} jsonLdObj 
 * @param {object} options 
 */
export function jsonLdToJsonSchema(objectName, data, options) {
    let {baseItem, fields, subClass} = getObjectFeatures(objectName, data);

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
        let subObjectName = field['@id'].split(':')[1];
        console.log(subObjectName);
        let {baseItem: baseItemSub, fields: fieldsSub, subClass: subClassSub} = getObjectFeatures(subObjectName, data);

        let rangeIncludes = baseItemSub['schema:rangeIncludes'];

        let type = '';

        // TODO Get multiple range includes (more than one option for field type)
        if(rangeIncludes) {
            let rangeInclude = rangeIncludes;
            if(Array.isArray(rangeInclude)) {
                let i = 0;
                rangeInclude = rangeIncludes[i];
            }
            let rangeIncludeId = rangeInclude['@id'];
            let rangeIncludeName = rangeIncludeId.split(':')[1];
            let {baseItem: baseItemRange, fields: fieldsRange, subClass: subClassRange} = getObjectFeatures(rangeIncludeName, data);

            type = rangeIncludeId;
            if(Array.isArray(baseItemRange['@type']) && baseItemRange['@type'].includes("schema:DataType")) {
                type = baseItemRange['rdfs:label'];
            }
        }

        jsonSchemaObj["properties"][subObjectName] = JSON.stringify(type);
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


