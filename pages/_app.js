import '../styles/globals.css'
import styles from '../styles/App.module.css'
import CeramicClient from '@ceramicnetwork/http-client';
import { useEffect, useState, Fragment } from 'react';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { ThreeIdConnect,  EthereumAuthProvider } from '@3id/connect'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { DID } from 'dids'
import DataModels from './components/DataModels';
import SchemaOrg from './_schemaorg';

const API_URL = 'https://ceramic-clay.3boxlabs.com';

function MyApp() {

  return (
    <div className="csn-app">
      <SchemaOrg />
    </div>
  
  );
}

export default MyApp;
