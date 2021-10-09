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
    else {
        if(predicateCallback(elem)) return true;
    }
}

export function transformObject(objectName, data) {
    let graph = data["@graph"];
    let schemaSelector = `schema:${objectName}`;

    let baseItem = graph.filter(x => x['@id'] === schemaSelector);

    let fields;
    if(baseItem) {
        fields = graph.filter(x => matchItemOrArray(x["schema:domainIncludes"], x => x['@id'] === schemaSelector));
    }

    let subClass = baseItem['rdfs:subClassOf'];

    return { baseItem, fields, subClass };
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


