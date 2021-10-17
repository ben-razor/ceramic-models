import CeramicClient from '@ceramicnetwork/http-client';
import { useEffect, useState } from 'react';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { ThreeIdConnect,  EthereumAuthProvider } from '@3id/connect'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { DataModel } from '@glazed/datamodel'
import { DIDDataStore } from '@glazed/did-datastore';
import { DID } from 'dids'

import { ModelManager } from '@glazed/devtools'
import { model as basicProfileModel } from '@datamodels/identity-profile-basic'
import { model as cryptoAccountsModel } from '@datamodels/identity-accounts-crypto'
import { model as webAccountsModel } from '@datamodels/identity-accounts-web'

function DataModels(props) {
    const [published, setPublished] = useState();
    const [schemaURL, setSchemaURL] = useState();
    const [basicProfile, setBasicProfile] = useState();
    const [creatingEncodedModel, setCreatingEncodedModel] = useState();
    const [error, setError] = useState();
    const ceramic = props.ceramic;
    const schema = props.schema;
    const setEncodedModel = props.setEncodedModel;


    useEffect(() => {
        if(ceramic && schema) {
            (async() => {
                try {
                    let modelName = schema.title;
                    let modelNameLCFirst = modelName.charAt(0).toLowerCase() + modelName.slice(1); 

                    const manager = new ModelManager(ceramic);
                    console.log('Pre create');
                    await manager.createSchema(modelName, JSON.stringify(schema));

                    console.log('Pre publish');
                    const publishedModel  = await manager.toPublished();
                    const model = new DataModel({ ceramic,  model: publishedModel });
                    const schemaURL = model.getSchemaURL('BasicSkill');
                    console.log('post getSchema');

                    console.log('SCHEMA URL', schemaURL);
                    let definition = {
                        name: modelNameLCFirst,
                        description: schema.description, 
                        schema: schemaURL
                    }
                    await manager.createDefinition(modelNameLCFirst, definition);
                    
                    let modelJSON = manager.toJSON();
                    console.log('model json', modelJSON);

                    setEncodedModel(modelJSON);
                }
                catch(e) {
                    console.log(e);
                    setError(e.message);
                }
            })();
        }
    }, [ceramic, setPublished, schema, setEncodedModel]);

    return <div className="data-models">
        {
            error && <div>
                <h3>
                    Error creating encoded model:
                </h3>
                <p>
                    {error}
                </p>
            </div>
        }
    </div>
}

export default DataModels;