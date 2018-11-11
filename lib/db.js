const Sequelize = require('sequelize');
const config = require('../config');

const Op = Sequelize.Op

const sequelize = new Sequelize(config.db.database, config.db.username, config.db.password, config.db.options);

/**
 * 定义文章表结构
 * @type {Model}
 */
var Post = sequelize.define('Post', {
    newsId: {type: Sequelize.STRING}, // 图文id
    fileId: {type: Sequelize.STRING}, // 图文中文章id，可能为0
    biz: Sequelize.STRING, //每个账号的唯有标记，base64
    mid: Sequelize.STRING, //每个账号一个文章的 ID，注意，这里不是全局唯一的，多个账号可能重复
    accountName: Sequelize.STRING, //公众号名称，比如 赤兔金马奖
    author: Sequelize.STRING, //作者名称，比如 金马
    title: Sequelize.STRING,
    idx: Sequelize.INTEGER, //多篇文章的时候的排序，第一篇是 1，第二篇是 2
    sourceUrl: Sequelize.STRING(1024),
    cover: Sequelize.STRING(1024),
    contentUrl: {type: Sequelize.STRING(1024)},
    contentUrlSign: {type: Sequelize.STRING, unique: true},
    digest: Sequelize.TEXT,
    createTime: Sequelize.DATE,
    readNum: {type: Sequelize.INTEGER, defaultValue: 0}, //阅读数
    likeNum: {type: Sequelize.INTEGER, defaultValue: 0}, //点赞数
    rewardNum: {type: Sequelize.INTEGER, defaultValue: 0}, //赞赏数
    electedCommentNum: {type: Sequelize.INTEGER, defaultValue: 0} //选出来的回复数
}, {
    tableName: 'posts'
});
/**
 * 插入文章相关信息
 * @param newsId
 * @param fileId
 * @param author
 * @param biz
 * @param mid
 * @param title
 * @param contentUrl
 * @param contentUrlSign
 * @param cover
 * @param digest
 * @param idx
 * @param sourceUrl
 * @param createTime
 */
var insertOne = function (post) {
    sequelize.sync().then(function () {
        return Post.create({
            newsId: post.newsId,
            fileId: post.fileId,
            author: post.author,
            biz: post.biz,
            mid: post.mid,
            title: post.title,
            contentUrl: post.contentUrl,
            sourceUrl: post.sourceUrl,
            contentUrlSign: post.contentUrlSign,
            cover: post.cover,
            digest: post.digest,
            idx: post.idx,
            createTime: post.createTime
        })
    }).then(function (post) {
        console.log("Insert success ");
    }).catch(function (error) {
        console.log("Insert failed: " + error);
    });
};
/**
 * 更新文章记录，补全相关信息
 * @param biz
 * @param mid
 * @param idx
 * @param updateObject
 * @returns {Promise.<TResult>}
 */
var updateOne = function (biz, mid, idx, updateObject) {
    return Post.update(updateObject, {
            where: {
                biz: biz,
                mid: mid,
                idx: idx
            }
        }
    ).then(function () {
        console.log("update count success");
    }).catch(function (error) {
        console.log("Update failed: " + error);
    });
};

var all = function () {
    return Post.findAll();
};

/**
 * 找到没有更新阅读数的
 * @param mid
 * @param nonce
 * @param callback
 * @returns {Promise.<TResult>|*}
 */
var getNextUnupdatedPostContentUrl = function (mid, nonce, callback) {
    return Post.findOne({
        where: {
            readNum: 0,
            mid: {
                [Op.ne]: mid
            }
        }
    }).then(function (post) {
        var contentUrl = '';
        if (post) {
            contentUrl = post.contentUrl;
        }
        callback(contentUrl, nonce);
    });
}

module.exports = {
    insertOne: insertOne,
    updateOne: updateOne,
    all: all,
    getNextUnupdatedPostContentUrl: getNextUnupdatedPostContentUrl,
};