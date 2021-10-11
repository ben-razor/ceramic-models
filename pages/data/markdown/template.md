# {{title}} DataModel

DataModel implementation of the **{{title}}** schema and definition.

## Installation

```sh
npm install -D @datamodels/{{slug}}
```

## Rationale

{{description}}

## Schemas

### [BasicProfile](./schemas/BasicProfile.json)

The Basic Profile schema defines the format of a document that contains the properties listed below. Properties not defined in the schema _cannot_ be included in the Basic Profile, however the schema can always be updated via a new CIP.

| Property           | Description                    | Value                                                                                  | Max Size | Required | Example                      |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------------------- | -------- | -------- | ---------------------------- |
{{fields}}
| `name`             | a name                         | string                                                                                 | 150 char | optional | Mary Smith                   |
| `image`            | an image                       | Image sources                                                                          |          | optional |                              |
| `description`      | a short description            | string                                                                                 | 420 char | optional | This is my cool description. |
| `emoji`            | an emoji                       | unicode                                                                                | 2 char   | optional | 🔢                           |
| `background`       | a background image (3:1 ratio) | Image sources                                                                          |          | optional |                              |
| `birthDate`        | a date of birth                | [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)                                     | 10 char  | optional | 1990-04-24                   |
| `url`              | a url                          | string                                                                                 | 240 char | optional | http://ceramic.network       |
| `gender`           | a gender                       | string                                                                                 | 42 char  | optional | female                       |
| `homeLocation`     | a place of residence           | string                                                                                 | 140 char | optional | Berlin                       |
| `residenceCountry` | a country of residence         | [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)                 | 2 char   | optional | DE                           |
| `nationalities`    | nationalities                  | array of [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) values | 2 char   | optional | CN                           |
| `affiliations`     | affiliations                   | array of strings                                                                       | 240 char | optional | Ceramic Ecosystem Alliance   |

## License

Dual licensed under MIT and Apache 2