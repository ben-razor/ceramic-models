# Azulejo - Schema.org | Ceramic Data Models

This repository presents an application for creating [Data Models](https://developers.ceramic.network/tools/glaze/datamodel/) for [Ceramic Network](https://ceramic.network/) using data from Schema.org to bootstrap the process.

Try the [Online Demo](https://ceramic-models.vercel.app/)

Check out the [Demo Video](https://youtu.be/2beg-w2BoBc).

Created for a [Gitcoin Hackathon](https://gitcoin.co/issue/ceramicnetwork/ceramic/81/100026724)

## About Ceramic

Ceramic is a platform for storing and sharing streams of data.

Examples of streams are a social media feed, a list of transactions, and a collaborative document. Anything where changes are made over time.

The Ceramic system is designed to provide [Self-Sovereign Identity](https://en.wikipedia.org/wiki/Self-sovereign_identity) and data.

In Ceramic you control your own identities and the data that is recorded with them. This is in contrast to social media companies, who control your feed; a centralized bank, that controls your transactions, or a cloud provider like Google/AWS that controls your documents. 

The system is also decentralized, providing censorship resistance.

## Data Models

Ceramic uses **Data Models** to allow new applications to build on existing data.

Data Models are essentially a collection of schemas, which describe the format of data that can be stored, along with some metadata such as a human readable name to make interacting with the schemas easier.

They are wrapped in npm packages so that they can be easily reused within different applications.

## Limitations

Only the basic features from Schema.org are currently implemented. Enhancements would include:

* Adding upport for nested objects
* Generation of arrays / collections of the created schema object
* Multiple subclasses not fully implemented
* Multiple options for type not implemented
* Enum types and more advanced JSON schema features not implemented

## Useful Links

### Ceramic

[Ceramic Data Models Registry](https://github.com/ceramicstudio/datamodels)

[Data Models Contribution Guidelines](https://github.com/ceramicstudio/datamodels/blob/38cdd10596b1da80ecf61f8f384d91d630a3022e/CONTRIBUTING.md)

[Example Basic Models Schema](https://github.com/ceramicstudio/datamodels/blob/main/packages/identity-profile-basic/schemas/BasicProfile.json)

[CIP 11 Data Model Definitions](https://github.com/ceramicnetwork/CIP/blob/main/CIPs/CIP-11/CIP-11.md)

### JSON Schemas

[JSON Schema](https://json-schema.org/learn/getting-started-step-by-step.html)

[JSON Resume Schema](https://jsonresume.org/schema/)

[Schema.org Developers](https://schema.org/docs/developers.html)

[Schema.org Example Action](https://schema.org/AcceptAction)

[https://schema.org/version/latest/schemaorg-current-https.jsonld](https://schema.org/version/latest/schemaorg-current-https.jsonld)

### JSON LD to JSON Schema Resources

https://github.com/ceramicnetwork/ceramic/issues/81#issuecomment-940386623

## Running The Development Version

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
