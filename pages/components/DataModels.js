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
    const ceramic = props.ceramic;
    const schema = props.schema;

    useEffect(() => {
        if(ceramic && schema) {
            (async() => {
                let modelName = schema.title;
                const manager = new ModelManager(ceramic)
                console.log('B CREATE SCHEMA')
                await manager.createSchema(modelName, schema);
                console.log('A CREATE SCHEMA') 
                
                let modelJSON = manager.toJSON();
                console.log('model json', modelJSON);

                /*
                const publishedModel = await manager.toPublished();                 
                setPublished(publishedModel);

                const model = new DataModel({ ceramic,  model: publishedModel});
                const schemaURL = model.getSchemaURL(modelName);
                const dataStore = new DIDDataStore({ ceramic, model });
                await dataStore.set('basicProfile', { record: 'content' }); 
                const basicProfile = await dataStore.get('basicProfile');
                */

                // setSchemaURL(schemaURL);
                setBasicProfile(JSON.stringify(modelJSON));
            })();
        }
    }, [ceramic, setPublished, schema]);

    return <div className="data-models">
        <h2>Tests On Data Models</h2>
        <div>
            Published:
            {JSON.stringify(published)}
        </div>
        <div>
            Schema URL: {schemaURL}
        </div>
        <div>
            Basic Profile: {basicProfile}
        </div>
    </div>
}

export default DataModels;