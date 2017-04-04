var db = require('./db.js'),
    fs = require('fs');

var csvFile = process.cwd() + '/wechat.csv';

var getFormatDate = function (date) {
  return date.getFullYear() + '-' + 
    ("0" + (date.getMonth() + 1)).slice(-2) + '-' + 
    ("0" + (date.getDate() + 1)).slice(-2) + ' ' +
    ("0" + date.getHours()).slice(-2) + ':' +
    ("0" + date.getMinutes()).slice(-2) + ':' +
    ("0" + date.getSeconds()).slice(-2);
}

var saveAll = function() {
  var headers = [
    'accountName',
    'author',
    'title',
    'contentUrl',
    'cover',
    'digest',
    'multiIdx',
    'sourceUrl',
    'createTime'
  ];
  fs.writeFileSync(csvFile, headers.join(',') + "\n", {flag: 'a'});
  var posts = db.all().then(function(posts) {
    posts.forEach(function(post) {
      post = post.get();
      var createTime = getFormatDate(post.createTime);
      var columns = [
        post.accountName,
        post.author,
        post.title,
        post.contentUrl,
        post.cover,
        post.digest,
        post.multiIdx,
        post.sourceUrl,
        createTime
      ];
      fs.writeFile(csvFile, columns.join(',') + "\n", {flag: 'a'}, function(error) {
        if (error) {
          console.log(error);
        }
        });
    });
  });
}

module.exports = {
  saveAll: saveAll
};

// saveAll();