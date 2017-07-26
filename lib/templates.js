"use strict";

var schemaTemplate = function schemaTemplate(fields, types) {
  return "\n// So Long, and Thanks for All the Fish\ntype Query {\n" + fields + "\n}\n\n" + types + "\n";
};

var queryTemplateWithArgs = function queryTemplateWithArgs(name, // field name
type, // GraphQL Type
args, // mapped args
resolve // resolve method
) {
  return "\n  " + name + ": {\n    type: " + type + ",\n    args: {" + args + "},\n    resolve: " + resolve + "\n  }\n";
};

var typeTemplate = function typeTemplate(type, name, fields) {
  return "\n" + type + " {\n" + fields + "\n}\n";
};

var scalarTypeTemplate = function scalarTypeTemplate(name, type) {
  return "  " + name + ": " + type;
};

var scalarTypeTemplateWithoutResolve = function scalarTypeTemplateWithoutResolve(name, type) {
  return "\n  " + name + ": {\n    description: 'enter your description',\n    type: " + type + "\n  }\n";
};

var objectTypeTemplate = function objectTypeTemplate(name, resolve) {
  return "\n" + name + ": {\n  description: 'enter your description',\n  type: " + name + "Type,\n  // TODO: Implement resolver for " + name + "Type\n  resolve: () => (" + resolve + "),\n}\n";
};

module.exports = {
  schemaTemplate: schemaTemplate,
  typeTemplate: typeTemplate,
  scalarTypeTemplate: scalarTypeTemplate,
  scalarTypeTemplateWithoutResolve: scalarTypeTemplateWithoutResolve,
  objectTypeTemplate: objectTypeTemplate,
  queryTemplateWithArgs: queryTemplateWithArgs
};