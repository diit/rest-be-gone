// @flow
import invariant from 'invariant';

export type NativeType = string;
export type GraphQLType = string | null;
export type CustomGraphQLTypeName = string;

export type TypeTokenMap = {
  [field: string]: TypeToken
}

export type TypeToken = {
  key: string;
  nativeType: string;
  nullable: boolean;
  list: boolean;
  rootGraphQLType: GraphQLType;
  type?: GraphQLType;
  customType?: boolean;
  schema?: string;
  fieldsType?: GraphQLType;
  nestedSchema?: TypeTokenMap;
  fields?: TypeTokenMap | null;
}

const GraphQLSchema: GraphQLType = 'GraphQLSchema';
const GraphQLObjectType: GraphQLType = 'GraphQLObjectType';

/* GraphQL Scalars */
const GraphQLInt: GraphQLType = 'Int';
const GraphQLFloat: GraphQLType = 'Float';
const GraphQLString: GraphQLType = 'String';
const GraphQLBoolean: GraphQLType = 'Boolean';
const GraphQLID: GraphQLType = 'ID';

/* Wrapping types */

function GraphQLNonNull(type: GraphQLType): GraphQLType {
  return `${type}!`
}

function GraphQLList(type: GraphQLType): GraphQLType {
  return `[${type}]`
}

const NativeStringType: NativeType = 'string';
const NativeArrayType: NativeType = 'array';
const NativeObjectType: NativeType = 'object';
const NativeNullType: NativeType = 'null';
const NativeNumberType: NativeType = 'number';
const NativeBooleanType: NativeType = 'boolean';
const NativeUndefinedType: NativeType = 'undefined';

// Not needed but included for testing (REMOVE FOR PROD)
const {
  schemaTemplate,
  typeTemplate,
  scalarTypeTemplate,
  scalarTypeTemplateWithoutResolve,
  objectTypeTemplate,
  queryTemplateWithArgs,
} = require('./templates');


const types = [];
const customTypeMap = {};
const rootTypes = []
const fields = []

function isCustomGraphQLType(type: GraphQLType): boolean {
  return !(
    type === GraphQLInt ||
    type === GraphQLFloat ||
    type === GraphQLString ||
    type === GraphQLBoolean ||
    type === GraphQLID ||
    type === null
  )
}


/**
 * Creates a custom type name. Splits words
 * in the name based on whitespace, underscores, and
 * dashes and then creates a capitalizied map
 * of those words and returns a joined string with
 * "Type" appended.
 *
 * @example
 * > createCustomType('user_information')
 * > UserInformationType
 */

function createCustomTypeName(
  type: string,
  parent?: TypeToken | null
): CustomGraphQLTypeName {
  const parentType = parent ? parent.key : null;
  let words: string[] = type.split(/\W|_|\-/);
  if (parentType) words.unshift(parentType);
  words = words.map(word => word[0].toUpperCase() + word.slice(1));
  return `${words.join('')}Type`;
}


function getNativeType(value: any) : NativeType {
  if (value === null) return NativeNullType;
  if (Array.isArray(value)) return NativeArrayType;
  switch (typeof value) {
    case 'string':
      return NativeStringType;
    case 'number':
      return NativeNumberType;
    case 'boolean':
      return NativeBooleanType;
    case 'undefined':
      return NativeUndefinedType;
    case 'object':
      return NativeObjectType;
  }
  throw new Error(
    `getNativeType(...): unable to parse type of ${value}`
  )
}

function getGraphQLType(key: string, value: any): GraphQLType {
  if (key.toUpperCase() === 'ID') {
    return GraphQLID
  }
  if (Array.isArray(value)) {
    const headType = getGraphQLType('', value[0]);
    return GraphQLList(headType)
  }

  if (value === null) {
    return null
  }

  switch(typeof value) {
    case 'boolean':
      return GraphQLBoolean
    case 'string':
      return GraphQLString
    case 'object':
      return GraphQLObjectType
    case 'number':
      return value % 1 == 0
        ? GraphQLInt
        : GraphQLFloat
  }
  return null
}


function getGraphQlTypeFromArray(
  key: string,
  arr: any[]
): GraphQLType {
  let headGraphQLType = getGraphQLType('', arr[0])
  for (let i = 0; i < arr.length; i++) {
    const itemGraphQLType = getGraphQLType('', arr[i])
    invariant(
      headGraphQLType === itemGraphQLType,
      'getGraphQlTypeFromArray(...): expected every item in ' +
      'the array to have the same type, found types %s, %s',
      headGraphQLType,
      itemGraphQLType
    );
  }

  if (headGraphQLType === GraphQLObjectType) {
    headGraphQLType = createCustomTypeName(key)
  }

  return headGraphQLType
}

/**
 * Creates a token representing the potential
 * GraphQL and native type for a JSON field.
 * If the native type is `NativeNullType` we
 * mark the field as nullable.
 *
 * Nullable fields will not be wrapped in
 * `GraphQLNonNull` if `nonNullByDefault` is
 * set to true.
 *
 */
function createTypeToken(
  key: string,
  value: any,
  parent: ?TypeToken
) : TypeToken {
  let list = false
  let nullable = false
  let rootGraphQLType = getGraphQLType(key, value)
  let fields = null
  const nativeType = getNativeType(value)

  /* Parse array item(s) type */
  if (nativeType === NativeArrayType) {
    list = true
    rootGraphQLType = getGraphQlTypeFromArray(key, value)
  }

  /* Queue a new type for creation */
  if (nativeType === NativeObjectType) {
    rootGraphQLType = createCustomTypeName(key, parent)
  }

  if (nativeType === NativeNullType) {
    nullable = true
  }

  const token = {
    key,
    nativeType,
    rootGraphQLType,
    nullable,
    list,
    fields
  }
  return token
}

function createTypeTokensMap(fields, parent): TypeTokenMap {
  const typeTokenMap = Object.create(null);
  const keys = Object.keys(fields);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const field = fields[key]
    const token = createTypeToken(key, field, parent)

    if (isCustomGraphQLType(token.rootGraphQLType)) {
      token.fields = token.list
           ? createTypeTokensMap(field[0], token)
           : createTypeTokensMap(field, token)
      token.customType = true
    }
    typeTokenMap[key] = token;
  }
  return typeTokenMap
}

function validateTypeTokenMaps(previous, next): TypeTokenMap {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  const keys = previousKeys.length > nextKeys.length
        ? previousKeys
        : nextKeys
  for (var i = 0; i < keys.length; i++) {
    const key = keys[i]
    const previousToken = previous[key]
    const nextToken = next[key]

    if (
      previousToken.rootGraphQLType
      !== nextToken.rootGraphQLType
    ) {
      const nullable = (
        previousToken.nullable ||
        nextToken.nullable
      );
      const type = (
        previousToken.rootGraphQLType ||
        nextToken.rootGraphQLType
      )
      const nativeType = previousToken.nativeType === NativeNullType
            ? nextToken.nativeType === NativeNullType
              ? NativeNullType : nextToken.nativeType
            : previousToken.nativeType
      const list = previousToken.list || nextToken.list
      const fields = previousToken.fields || nextToken.fields

      nextToken.nullable = nullable
      nextToken.rootGraphQLType = type
      nextToken.nativeType = nativeType
      nextToken.list = list
      nextToken.fields = fields
    }

  }
  return next
}


function buildTypeTokenAST(data): TypeTokenMap {
  let typeTokenAST;
  if (Array.isArray(data)) {
    typeTokenAST = data.map(datum => createTypeTokensMap(datum))
    typeTokenAST = typeTokenAST.reduce(validateTypeTokenMaps)
  } else {
    typeTokenAST = createTypeTokensMap(data)
  }

  return typeTokenAST

}

function applyListTypeWrapper(token: TypeToken): TypeToken {
  if (token.list) {
    token.type = GraphQLList(token.rootGraphQLType)
  }
  return token
}

function applyNonNullWrapper(token: TypeToken): TypeToken {
  const type = token.type || token.rootGraphQLType
  token.type = token.nullable
      ? type
      : GraphQLNonNull(type)
  return token;
}


function applyTypeWrappers(tokens: TypeTokenMap): TypeTokenMap {
  for (let key in tokens) {
    const token = tokens[key];
    applyListTypeWrapper(token);
    applyNonNullWrapper(token);
  }
  return tokens;
}

function createSchemasFromTokenMap(tokenMap: TypeTokenMap) {
  const types = []
  for (let key in tokenMap) {
    const token: TypeToken = tokenMap[key]
    if (token.customType && token.fields) {
      const typedFields = applyTypeWrappers(token.fields)
      const fieldSchema = mapFieldsToScalarTemplate(typedFields).join('\n')
      token.fieldsType = typeTemplate(
        token.rootGraphQLType,
        key,
        fieldSchema
     )
     if (token.fields) {
      token.nestedSchema = createSchemasFromTokenMap(token.fields)
     }
    }

    token.schema = scalarTypeTemplate(key, token.type)

  }
  return tokenMap
}

function mapFieldsToScalarTemplate(fields) {
  const types = []
  for (let key in fields) {
    const field = fields[key]
    types.push(scalarTypeTemplate(key, field.type))
  }
  return types;
}

function createRootSchema(AST) {
  for (let key in AST) {
    const schema = AST[key]
    if (schema.customType) {
      rootTypes.push(schema.fieldsType)
      if (schema.nestedSchema) {
        createRootSchema(schema.nestedSchema)
      }
    }
    fields.push(schema.schema)
  }
  /*
   * Note: Only include root level fields here, currently is all
   */
  const root = schemaTemplate(fields.join('\n'), rootTypes.join(''))
  return root
}


/*
 * Long Term Plan:
 *  - Build AST (done by json-to-graphql?)
 *  - Reduce / Normalize into set of unique data shapes (done by json-to-graphql?)
 *  - Convert AST into GraphQL schema (TODO)
 *  - More output options, file, piping etc.
 */


const vorpal = require('vorpal')();
const request = require('request');

const schemaMap = {
    string: "String",
    number: "Int",
    boolean: "Boolean",
    object: "String" // default fallback
};

let finalSchema = '';

function generateType(ref, jsonBlock, cb) {
    let schema = '', schemaCount = 0, nestedData = {
        found: false,
        jsonBlock: null
    };

    for (var item in jsonBlock) {
        if (jsonBlock[item] !== null && typeof jsonBlock[item] === 'object') {
            nestedData.found = true;
            nestedData.jsonBlock= jsonBlock[item];
        }
        schemaCount += 1;
        schema += `\t${item}: ${schemaMap[typeof jsonBlock[item]]}\n`
    }

    ref.log(`Converted ${schemaCount} fields...`);
    ref.log(schema)

    ref.prompt({
        type: 'input',
        name: 'noun',
        message: 'What is this resource (ie. Product, User)? '
    }, function (result) {
        ref.log(`Okay, ${result.noun} it is!`);

        schema = `type ${result.noun} {\n${schema}}`;
        finalSchema += `\n${schema}\n`

        if (nestedData.found) {
            ref.prompt({
                type: 'confirm',
                name: 'confirm',
                message: 'We found some nested data, create multiple types? '
            }, function (result) {
                if (result.confirm) {
                    ref.log('Okay, hold on to your hat, here we go...');
                    generateType(ref, nestedData.jsonBlock, cb);
                }
            });
        } else {
            cb(finalSchema);
        }
    });
}

vorpal
    .command('start', 'GraphQLify -u, --url REST URL.')
    .option('-u, --url <url>', 'URL of REST API you want to graphqlify')
    .action(function(args, callback) {
        this.log('Scanning: ', args.options.url);
        request.get(args.options.url, (error, response, body) => {
            let requestBody = JSON.parse(body);

            this.log('Scanning complete, parsing...');

            generateType(this, requestBody, schema => {
                this.log('===============================')
                this.log(schema);
                this.log('===============================')
                callback()
            });
        });
    });

vorpal
    .command('start-beta', 'GraphQLify -u, --url REST URL.')
    .option('-u, --url <url>', 'URL of REST API you want to graphqlify')
    .action(function(args, callback) {
        this.log('Scanning: ', args.options.url);
        request.get(args.options.url, (error, response, body) => {
            let requestBody = JSON.parse(body);

            this.log('Scanning complete, parsing...');

            const typeTokenAST = buildTypeTokenAST(requestBody); // TODO: Convert to GraphQL SCHEMA types not js types
            // this.log(typeTokenAST);
            const tokenMap = applyTypeWrappers(typeTokenAST); // TODO: Convert to GraphQL SCHEMA types not js types
            // this.log(tokenMap);
            const schema = createSchemasFromTokenMap(tokenMap); // TODO: Replace this function w/ our own to generate correct schema
            // this.log(schema);
            const rootSchema = createRootSchema(schema); // TODO: Is this needed?
            this.log(rootSchema);

            callback();
        });
    });

vorpal
  .delimiter('rest-be-gone$')
  .show()
  .log('Started interactive Rest-Be-Gone session, type \'help\' for commands');
