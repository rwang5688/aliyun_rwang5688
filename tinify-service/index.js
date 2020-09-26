const oss = require('ali-oss');
const tinify = require('tinify');
tinify.key = process.env.TINIFY_API_KEY;

function osseventtrigger(eventBuf, ctx, callback) {
    'use strict';
    console.log('Loading function ...');
    console.log('Received event:', eventBuf.toString());

    var event = JSON.parse(eventBuf);
    var ossEvent = event.events[0];

    // Required by OSS sdk: OSS region is prefixed with "oss-", e.g. "oss-cn-shanghai"
    var ossRegion = "oss-" + ossEvent.region;

    // Create oss client.
    var client = new oss({
        region: ossRegion,
        // Credentials can be retrieved from context
        accessKeyId: ctx.credentials.accessKeyId,
        accessKeySecret: ctx.credentials.accessKeySecret,
        stsToken: ctx.credentials.securityToken
    });

    // Bucket name is from OSS event
    client.useBucket(ossEvent.oss.bucket.name);

    // Processed images will be saved to processed/
    var newKey = ossEvent.oss.object.key.replace("source/", "processed/");

    // Get object
    console.log('Getting object: ', ossEvent.oss.object.key);
    client.get(ossEvent.oss.object.key).then(function (val) {
        console.log(ossEvent.oss.object.key);
        // Read object from buffer
        // Call tinify API to compress the image
        console.log('tinify API key: ', tinify.key);
        tinify.fromBuffer(val.content).toBuffer(function (err, resultData) {
            if (err) {
                console.error("Failed to resize");
                callback(err);
                return;
            }
            // Putting object back to OSS with the new key
            console.log('Putting object: ', newKey);
            client.put(newKey, resultData).then(function (val) {
                console.log('Put object:', val);
                callback(null, val);
                return;
            }).catch(function (err) {
                console.error('Failed to put object: %j', err);
                callback(err);
                return;
            });
        });
    }).catch(function (err) {
        console.error('Failed to get object: %j', err);
        callback(err);
        return;
    });
}


// entry points
module.exports = {
    osseventtrigger
};

