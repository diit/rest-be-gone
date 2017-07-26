const schemaTemplate = (fields, types) => `
// So Long, and Thanks for All the Fish
type Query {
${fields}
}

${types}
`

const queryTemplateWithArgs = (
  name,     // field name
  type,     // GraphQL Type
  args,     // mapped args
  resolve   // resolve method
) => `
  ${name}: {
    type: ${type},
    args: {${args}},
    resolve: ${resolve}
  }
`

const typeTemplate = (type, name, fields) => `
${type} {
${fields}
}
`

const scalarTypeTemplate = (name, type) => {
  return `  ${name}: ${type}`
}

const scalarTypeTemplateWithoutResolve = (name, type) => `
  ${name}: {
    description: 'enter your description',
    type: ${type}
  }
`

const objectTypeTemplate = (name, resolve) => `
${name}: {
  description: 'enter your description',
  type: ${name}Type,
  // TODO: Implement resolver for ${name}Type
  resolve: () => (${resolve}),
}
`

module.exports = {
  schemaTemplate,
  typeTemplate,
  scalarTypeTemplate,
  scalarTypeTemplateWithoutResolve,
  objectTypeTemplate,
  queryTemplateWithArgs,
}