var Sequelize = require('sequelize');
const Op = Sequelize.Op

const sequelize = new Sequelize('wechat_spider', 'root', 'root', {
    host: '192.168.99.100',
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
    operatorsAliases: false
});
/**
 * 定义文章表结构
 * @type {Model}
 */
var Post = sequelize.define('Post', {
    fileid: {type: Sequelize.STRING}, //文章id
    biz: Sequelize.STRING, //每个账号的唯有标记，base64
    appmsgid: Sequelize.STRING, //每个账号一个文章的 ID，注意，这里不是全局唯一的，多个账号可能重复
    accountName: Sequelize.STRING, //公众号名称，比如 赤兔金马奖
    author: Sequelize.STRING, //作者名称，比如 金马
    title: Sequelize.STRING,
    cover: Sequelize.STRING(1024),
    contentUrl: {type: Sequelize.STRING(1024)},
    digest: Sequelize.TEXT,
    idx: Sequelize.INTEGER, //多篇文章的时候的排序，第一篇是 1，第二篇是 2
    sourceUrl: Sequelize.STRING(1024),
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
 * @param author
 * @param biz
 * @param appmsgid
 * @param title
 * @param contentUrl
 * @param cover
 * @param digest
 * @param idx
 * @param sourceUrl
 * @param createTime
 */
var insertOne = function (id, fileid, author, biz, appmsgid, title, contentUrl, cover, digest, idx, sourceUrl, createTime) {
    sequelize.sync().then(function () {
        return Post.create({
            id: id,
            fileid: fileid,
            author: author,
            biz: biz,
            appmsgid: appmsgid,
            title: title,
            contentUrl: contentUrl.replace(/\\\//g, "/"),
            cover: cover.replace(/\\\//g, "/"),
            digest: digest.replace("&nbsp;", " "),
            idx: idx,
            sourceUrl: sourceUrl.replace(/\\\//g, "/"),
            createTime: createTime
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
 * @param appmsgid
 * @param idx
 * @param updateObject
 * @returns {Promise.<TResult>}
 */
var updateOne = function (biz, appmsgid, idx, updateObject) {
    return Post.update(updateObject, {
            where: {
                biz: biz,
                appmsgid: appmsgid,
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
 * @param appmsgid
 * @param nonce
 * @param callback
 * @returns {Promise.<TResult>|*}
 */
var getNextUnupdatedPostContentUrl = function (appmsgid, nonce, callback) {
    return Post.findOne({
        where: {
            readNum: 0,
            appmsgid: {
                [Op.ne]: appmsgid
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