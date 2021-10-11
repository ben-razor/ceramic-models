# Ceramic Data Models

This repository expolores [Data Models](https://developers.ceramic.network/tools/glaze/datamodel/) of the [Ceramic Network](https://ceramic.network/).

## Using Ceramic

Ceramic is a platform for storing and sharing streams of data.

Examples of streams are a social media feed, a list of transactions, and a collaborative document. Anything where changes are made over time.

The Ceramic system is designed to provide [Self-Sovereign Identity](https://en.wikipedia.org/wiki/Self-sovereign_identity) and data.

In Ceramic you control your own identities and the data that is recorded with them. This is in contrast to social media companies, who control your feed; a centralized bank, that controls your transactions, or a cloud provider like Google/AWS that controls your documents. 

The system is also decentralized, providing censorship resistance.

## Data Models

Ceramic uses **Data Models** to allow new applications to build on existing data.

Data Models are essentially a collection of schemas, which describe the format of data that can be stored, along with some metadata such as a human readable name to make interacting with the schemas easier.

They are wrapped in npm packages so that they can be easily reused within different applications.

## Useful Links

### Ceramic

[Ceramic Data Models Registry](https://github.com/ceramicstudio/datamodels)

[Data Models Contribution Guidelines](https://github.com/ceramicstudio/datamodels/blob/38cdd10596b1da80ecf61f8f384d91d630a3022e/CONTRIBUTING.md)

[Example Basic Models Schema](https://github.com/ceramicstudio/datamodels/blob/main/packages/identity-profile-basic/schemas/BasicProfile.json)

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
