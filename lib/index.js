'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var GraphQLSchema = 'GraphQLSchema';
var GraphQLObjectType = 'GraphQLObjectType';

/* GraphQL Scalars */
var GraphQLInt = 'Int';
var GraphQLFloat = 'Float';
var GraphQLString = 'String';
var GraphQLBoolean = 'Boolean';
var GraphQLID = 'ID';

/* Wrapping types */

function GraphQLNonNull(type) {
  return type + '!';
}

function GraphQLList(type) {
  return '[' + type + ']';
}

var NativeStringType = 'string';
var NativeArrayType = 'array';
var NativeObjectType = 'object';
var NativeNullType = 'null';
var NativeNumberType = 'number';
var NativeBooleanType = 'boolean';
var NativeUndefinedType = 'undefined';

// Not needed but included for testing (REMOVE FOR PROD)

var _require = require('./templates'),
    schemaTemplate = _require.schemaTemplate,
    typeTemplate = _require.typeTemplate,
    scalarTypeTemplate = _require.scalarTypeTemplate,
    scalarTypeTemplateWithoutResolve = _require.scalarTypeTemplateWithoutResolve,
    objectTypeTemplate = _require.objectTypeTemplate,
    queryTemplateWithArgs = _require.queryTemplateWithArgs;

var types = [];
var customTypeMap = {};
var rootTypes = [];
var fields = [];

function isCustomGraphQLType(type) {
  return !(type === GraphQLInt || type === GraphQLFloat || type === GraphQLString || type === GraphQLBoolean || type === GraphQLID || type === null);
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

function createCustomTypeName(type, parent) {
  var parentType = parent ? parent.key : null;
  var words = type.split(/\W|_|\-/);
  if (parentType) words.unshift(parentType);
  words = words.map(function (word) {
    return word[0].toUpperCase() + word.slice(1);
  });
  return words.join('') + 'Type';
}

function getNativeType(value) {
  if (value === null) return NativeNullType;
  if (Array.isArray(value)) return NativeArrayType;
  switch (typeof value === 'undefined' ? 'undefined' : _typeof(value)) {
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
  throw new Error('getNativeType(...): unable to parse type of ' + value);
}

function getGraphQLType(key, value) {
  if (key.toUpperCase() === 'ID') {
    return GraphQLID;
  }
  if (Array.isArray(value)) {
    var headType = getGraphQLType('', value[0]);
    return GraphQLList(headType);
  }

  if (value === null) {
    return null;
  }

  switch (typeof value === 'undefined' ? 'undefined' : _typeof(value)) {
    case 'boolean':
      return GraphQLBoolean;
    case 'string':
      return GraphQLString;
    case 'object':
      return GraphQLObjectType;
    case 'number':
      return value % 1 == 0 ? GraphQLInt : GraphQLFloat;
  }
  return null;
}

function getGraphQlTypeFromArray(key, arr) {
  var headGraphQLType = getGraphQLType('', arr[0]);
  for (var i = 0; i < arr.length; i++) {
    var itemGraphQLType = getGraphQLType('', arr[i]);
    (0, _invariant2.default)(headGraphQLType === itemGraphQLType, 'getGraphQlTypeFromArray(...): expected every item in ' + 'the array to have the same type, found types %s, %s', headGraphQLType, itemGraphQLType);
  }

  if (headGraphQLType === GraphQLObjectType) {
    headGraphQLType = createCustomTypeName(key);
  }

  return headGraphQLType;
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
function createTypeToken(key, value, parent) {
  var list = false;
  var nullable = false;
  var rootGraphQLType = getGraphQLType(key, value);
  var fields = null;
  var nativeType = getNativeType(value);

  /* Parse array item(s) type */
  if (nativeType === NativeArrayType) {
    list = true;
    rootGraphQLType = getGraphQlTypeFromArray(key, value);
  }

  /* Queue a new type for creation */
  if (nativeType === NativeObjectType) {
    rootGraphQLType = createCustomTypeName(key, parent);
  }

  if (nativeType === NativeNullType) {
    nullable = true;
  }

  var token = {
    key: key,
    nativeType: nativeType,
    rootGraphQLType: rootGraphQLType,
    nullable: nullable,
    list: list,
    fields: fields
  };
  return token;
}

function createTypeTokensMap(fields, parent) {
  var typeTokenMap = Object.create(null);
  var keys = Object.keys(fields);
  for (var i = 0; i < keys.length; i++) {
    var _key = keys[i];
    var _field = fields[_key];
    var token = createTypeToken(_key, _field, parent);

    if (isCustomGraphQLType(token.rootGraphQLType)) {
      token.fields = token.list ? createTypeTokensMap(_field[0], token) : createTypeTokensMap(_field, token);
      token.customType = true;
    }
    typeTokenMap[_key] = token;
  }
  return typeTokenMap;
}

function validateTypeTokenMaps(previous, next) {
  var previousKeys = Object.keys(previous);
  var nextKeys = Object.keys(next);
  var keys = previousKeys.length > nextKeys.length ? previousKeys : nextKeys;
  for (var i = 0; i < keys.length; i++) {
    var _key2 = keys[i];
    var previousToken = previous[_key2];
    var nextToken = next[_key2];

    if (previousToken.rootGraphQLType !== nextToken.rootGraphQLType) {
      var _nullable = previousToken.nullable || nextToken.nullable;
      var _type = previousToken.rootGraphQLType || nextToken.rootGraphQLType;
      var _nativeType = previousToken.nativeType === NativeNullType ? nextToken.nativeType === NativeNullType ? NativeNullType : nextToken.nativeType : previousToken.nativeType;
      var _list = previousToken.list || nextToken.list;
      var _fields = previousToken.fields || nextToken.fields;

      nextToken.nullable = _nullable;
      nextToken.rootGraphQLType = _type;
      nextToken.nativeType = _nativeType;
      nextToken.list = _list;
      nextToken.fields = _fields;
    }
  }
  return next;
}

function buildTypeTokenAST(data) {
  var typeTokenAST = void 0;
  if (Array.isArray(data)) {
    typeTokenAST = data.map(function (datum) {
      return createTypeTokensMap(datum);
    });
    typeTokenAST = typeTokenAST.reduce(validateTypeTokenMaps);
  } else {
    typeTokenAST = createTypeTokensMap(data);
  }

  return typeTokenAST;
}

function applyListTypeWrapper(token) {
  if (token.list) {
    token.type = GraphQLList(token.rootGraphQLType);
  }
  return token;
}

function applyNonNullWrapper(token) {
  var type = token.type || token.rootGraphQLType;
  token.type = token.nullable ? type : GraphQLNonNull(type);
  return token;
}

function applyTypeWrappers(tokens) {
  for (var _key3 in tokens) {
    var token = tokens[_key3];
    applyListTypeWrapper(token);
    applyNonNullWrapper(token);
  }
  return tokens;
}

function createSchemasFromTokenMap(tokenMap) {
  var types = [];
  for (var _key4 in tokenMap) {
    var token = tokenMap[_key4];
    if (token.customType && token.fields) {
      var typedFields = applyTypeWrappers(token.fields);
      var fieldSchema = mapFieldsToScalarTemplate(typedFields).join('\n');
      token.fieldsType = typeTemplate(token.rootGraphQLType, _key4, fieldSchema);
      if (token.fields) {
        token.nestedSchema = createSchemasFromTokenMap(token.fields);
      }
    }

    token.schema = scalarTypeTemplate(_key4, token.type);
  }
  return tokenMap;
}

function mapFieldsToScalarTemplate(fields) {
  var types = [];
  for (var _key5 in fields) {
    var _field2 = fields[_key5];
    types.push(scalarTypeTemplate(_key5, _field2.type));
  }
  return types;
}

function createRootSchema(AST) {
  for (var _key6 in AST) {
    var _schema = AST[_key6];
    if (_schema.customType) {
      rootTypes.push(_schema.fieldsType);
      if (_schema.nestedSchema) {
        createRootSchema(_schema.nestedSchema);
      }
    }
    fields.push(_schema.schema);
  }
  var root = schemaTemplate(fields.join('\n'), rootTypes.join(''));
  return root;
}

/*
 * Long Term Plan:
 *  - Build AST (done by json-to-graphql?)
 *  - Reduce / Normalize into set of unique data shapes (done by json-to-graphql?)
 *  - Convert AST into GraphQL schema (TODO)
 *  - More output options, file, piping etc.
 */

var vorpal = require('vorpal')();
var request = require('request');

var schemaMap = {
  string: "String",
  number: "Int",
  boolean: "Boolean",
  object: "String" // default fallback
};

var finalSchema = '';

function generateType(ref, jsonBlock, cb) {
  var schema = '',
      schemaCount = 0,
      nestedData = {
    found: false,
    jsonBlock: null
  };

  for (var item in jsonBlock) {
    if (jsonBlock[item] !== null && _typeof(jsonBlock[item]) === 'object') {
      nestedData.found = true;
      nestedData.jsonBlock = jsonBlock[item];
    }
    schemaCount += 1;
    schema += '\t' + item + ': ' + schemaMap[_typeof(jsonBlock[item])] + '\n';
  }

  ref.log('Converted ' + schemaCount + ' fields...');
  ref.log(schema);

  ref.prompt({
    type: 'input',
    name: 'noun',
    message: 'What is this resource (ie. Product, User)? '
  }, function (result) {
    ref.log('Okay, ' + result.noun + ' it is!');

    schema = 'type ' + result.noun + ' {\n' + schema + '}';
    finalSchema += '\n' + schema + '\n';

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

vorpal.command('start', 'GraphQLify -u, --url REST URL.').option('-u, --url <url>', 'URL of REST API you want to graphqlify').action(function (args, callback) {
  var _this = this;

  this.log('Scanning: ', args.options.url);
  request.get(args.options.url, function (error, response, body) {
    var requestBody = JSON.parse(body);

    _this.log('Scanning complete, parsing...');

    generateType(_this, requestBody, function (schema) {
      _this.log('===============================');
      _this.log(schema);
      _this.log('===============================');
      callback();
    });
  });
});

vorpal.command('start-beta', 'GraphQLify -u, --url REST URL.').option('-u, --url <url>', 'URL of REST API you want to graphqlify').action(function (args, callback) {
  var _this2 = this;

  this.log('Scanning: ', args.options.url);
  request.get(args.options.url, function (error, response, body) {
    var requestBody = JSON.parse(body);

    _this2.log('Scanning complete, parsing...');

    var typeTokenAST = buildTypeTokenAST(requestBody); // TODO: Convert to GraphQL SCHEMA types not js types
    // this.log(typeTokenAST);
    var tokenMap = applyTypeWrappers(typeTokenAST); // TODO: Convert to GraphQL SCHEMA types not js types
    // this.log(tokenMap);
    var schema = createSchemasFromTokenMap(tokenMap); // TODO: Replace this function w/ our own to generate correct schema
    // this.log(schema);
    var rootSchema = createRootSchema(schema); // TODO: Is this needed?
    _this2.log(rootSchema);

    callback();
  });
});

vorpal.delimiter('graphqlify$').show().log('Started interactive GraphQLify session, type \'help\' for commands');