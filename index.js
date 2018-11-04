var proxy = require("anyproxy");

module.exports = function () {
    //create cert when you want to use https features
    //please manually trust this rootCA when it is the first time you run it
    !proxy.utils.certMgr.ifRootCAFileExists() && proxy.utils.certMgr.generateRootCA(function () {

    });
    var options = {
        type: "http",
        port: 8001,
        webInterface: {
            enable: true,
            webPort: 8002
        },
        throttle: 10000,
        rule: require("./lib/rule_wechat_spider.js"),
        dbFile: null,  // optional, save request data to a specified file, will use in-memory db if not specified
        silent: false, //optional, do not print anything into terminal. do not set it when you are still debugging.
        forceProxyHttps: true
    };
    var server = new proxy.ProxyServer(options);
    server.start();
};
