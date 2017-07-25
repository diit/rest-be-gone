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
  .delimiter('graphqlify$')
  .show()
  .log('Started interactive GraphQLify session, type \'help\' for commands');
