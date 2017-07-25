const inputObj = JSON.parse(`{
    "id": 438457,
    "is_dead": false,
    "name": "Hopsta La Vista",
    "tags": "hopsta la vista beer ale canada ontario longslice brewery inc can",
    "is_discontinued": false,
    "price_in_cents": 315,
    "regular_price_in_cents": 315,
    "limited_time_offer_savings_in_cents": 0,
    "limited_time_offer_ends_on": null,
    "bonus_reward_miles": 0,
    "bonus_reward_miles_ends_on": null,
    "stock_type": "LCBO",
    "primary_category": "Beer",
    "secondary_category": "Ale",
    "origin": "Canada, Ontario",
    "package": "473 mL can",
    "package_unit_type": "can",
    "package_unit_volume_in_milliliters": 473,
    "total_package_units": 1,
    "volume_in_milliliters": 473,
    "alcohol_content": 650,
    "price_per_liter_of_alcohol_in_cents": 1024,
    "price_per_liter_in_cents": 665,
    "inventory_count": 2709,
    "inventory_volume_in_milliliters": 1281357,
    "inventory_price_in_cents": 853335,
    "sugar_content": null,
    "producer_name": "Longslice Brewery Inc",
    "released_on": "2016-11-23",
    "has_value_added_promotion": false,
    "has_limited_time_offer": false,
    "has_bonus_reward_miles": false,
    "is_seasonal": false,
    "is_vqa": false,
    "is_ocb": false,
    "is_kosher": false,
    "value_added_promotion_description": null,
    "description": null,
    "serving_suggestion": "Serve with a burger topped with caramelized onions, or grilled shrimp and guacamole.",
    "tasting_note": "Gold medal winner at the 2015 Ontario Brewing Awards. In the glass, a hazy copper colour, with a generous lacy head. A rich malty nose is punctuated by forward hops character, contributing citrus and herbal notes. Round and balanced on the palate, with toasty and malty flavours leading to a lengthy and refreshing finish.",
    "updated_at": "2017-07-24T14:29:25.337Z",
    "image_thumb_url": "https://dx5vpyka4lqst.cloudfront.net/products/438457/images/thumb.png",
    "image_url": "https://dx5vpyka4lqst.cloudfront.net/products/438457/images/full.jpeg",
    "varietal": "American Ipa",
    "style": "Medium & Hoppy",
    "tertiary_category": "India Pale Ale (IPA)",
    "sugar_in_grams_per_liter": null,
    "clearance_sale_savings_in_cents": 0,
    "has_clearance_sale": false,
    "product_no": 438457
}`);

// const schemaMap = {
//     string: "String",
//     number: "Int",
//     boolean: "Boolean",
//     object: "String" // default fallback
// }

// let schema = '';

// for (var item in inputObj) {
//   // console.log(`${item}: ${schemaMap[typeof inputObj[item]]}\n`)
//   schema += `${item}: ${schemaMap[typeof inputObj[item]]}\n`
// }

// console.log(schema)

let vorpal = require('vorpal')(),
    duckCount = 0,
    wabbitCount = 0;

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
        let requestBody = `{
            "id": 438457,
            "is_dead": false,
            "name": "Hopsta La Vista",
            "tags": "hopsta la vista beer ale canada ontario longslice brewery inc can",
            "is_discontinued": false,
            "price_in_cents": 315,
            "regular_price_in_cents": 315,
            "limited_time_offer_savings_in_cents": 0,
            "limited_time_offer_ends_on": null,
            "bonus_reward_miles": 0,
            "bonus_reward_miles_ends_on": null,
            "stock_type": "LCBO",
            "primary_category": "Beer",
            "secondary_category": "Ale",
            "origin": "Canada, Ontario",
            "package": "473 mL can",
            "package_unit_type": "can",
            "package_unit_volume_in_milliliters": 473,
            "total_package_units": 1,
            "volume_in_milliliters": 473,
            "alcohol_content": 650,
            "price_per_liter_of_alcohol_in_cents": 1024,
            "price_per_liter_in_cents": 665,
            "inventory_count": 2709,
            "inventory_volume_in_milliliters": 1281357,
            "inventory_price_in_cents": 853335,
            "sugar_content": null,
            "producer_name": "Longslice Brewery Inc",
            "released_on": "2016-11-23",
            "has_value_added_promotion": false,
            "has_limited_time_offer": false,
            "has_bonus_reward_miles": false,
            "is_seasonal": false,
            "is_vqa": false,
            "is_ocb": false,
            "is_kosher": false,
            "value_added_promotion_description": null,
            "description": null,
            "serving_suggestion": "Serve with a burger topped with caramelized onions, or grilled shrimp and guacamole.",
            "tasting_note": "Gold medal winner at the 2015 Ontario Brewing Awards. In the glass, a hazy copper colour, with a generous lacy head. A rich malty nose is punctuated by forward hops character, contributing citrus and herbal notes. Round and balanced on the palate, with toasty and malty flavours leading to a lengthy and refreshing finish.",
            "updated_at": "2017-07-24T14:29:25.337Z",
            "image_thumb_url": "https://dx5vpyka4lqst.cloudfront.net/products/438457/images/thumb.png",
            "image_url": "https://dx5vpyka4lqst.cloudfront.net/products/438457/images/full.jpeg",
            "varietal": "American Ipa",
            "style": "Medium & Hoppy",
            "tertiary_category": "India Pale Ale (IPA)",
            "sugar_in_grams_per_liter": null,
            "clearance_sale_savings_in_cents": 0,
            "has_clearance_sale": false,
            "product_no": 438457
        }`;

        let requestBodyNormalized = JSON.parse(requestBody);

        this.log('Scanning complete, parsing...');

        for (var item in requestBodyNormalized) {
            schemaCount += 1;
            schema += `\t${item}: ${schemaMap[typeof requestBodyNormalized[item]]}\n`
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

vorpal
  .delimiter('graphqlify$')
  .show()
  .log('Started interactive GraphQLify session, type \'help\' for commands');
