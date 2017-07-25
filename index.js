const vorpal = require('vorpal')();
const request = require('request');

const schemaMap = {
    string: "String",
    number: "Int",
    boolean: "Boolean",
    object: "String" // default fallback
};

vorpal
    .command('start', 'GraphQLify -u, --url REST URL.')
    .option('-u, --url <url>', 'URL of REST API you want to graphqlify')
    .action(function(args, callback) {
        const self = this;
        let schema = '', schemaCount = 0;

        this.log('Scanning: ', args.options.url);
        request.get(args.options.url, (error, response, body) => {
            let requestBody = JSON.parse(body).result; //.result is for debug, should recurse

            this.log('Scanning complete, parsing...');

            for (var item in requestBody) {
                // if (typeof requestBody[item] !== null && typeof requestBody[item] === object ) {

                // }
                schemaCount += 1;
                schema += `\t${item}: ${schemaMap[typeof requestBody[item]]}\n`
            }

            this.log(`Converted ${schemaCount} fields...`);

            this.prompt({
                type: 'input',
                name: 'noun',
                message: 'What is this resource (ie. Product, User)? '
            }, function (result) {
                self.log(`Okay, ${result.noun} it is!`);
                self.log('===============================')
                self.log(`type ${result.noun} {\n${schema}}`);
                self.log('===============================')
                callback();
            });
        });
    });

vorpal
  .delimiter('graphqlify$')
  .show()
  .log('Started interactive GraphQLify session, type \'help\' for commands');
