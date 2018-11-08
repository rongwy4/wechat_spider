var Promise = require("promise");
var db = require('./db.js');
//下一动作的间隔时间
let DELAY = 10000;

module.exports = {
    /**
     * 将文章列表string转为json
     * @param rawList
     */
    getPosts: function (rawList) {
        var list = JSON.parse(rawList);
        return list.list;
    },
    /**
     * 批量保存文章列表
     * @param rawList
     */
    savePosts: function (rawList) {
        var that = this;
        var list = this.getPosts(rawList);
        list.forEach(function (item) {
            //没有文章返回
            if (item["app_msg_ext_info"] === undefined) {
                return;
            }
            var idx = 1;
            var msgInfo = item.app_msg_ext_info;
            var datetime = item.comm_msg_info.datetime;
            msgInfo.idx = idx;
            msgInfo.datetime = datetime;
            msgInfo.id = item.comm_msg_info.id;
            msgInfo.fileid = item.app_msg_ext_info.fileid;

            that.writePost(msgInfo);
            // 多图文包含在主列表中
            if (item["app_msg_ext_info"]["multi_app_msg_item_list"] === undefined) {
                return;
            }
            var multiList = item["app_msg_ext_info"]["multi_app_msg_item_list"];
            multiList.forEach(function (item) {
                item.idx = ++idx;
                item.datetime = datetime;
                item.id = item.comm_msg_info.id;
                that.writePost(item);
            });
        })
    },

    /**
     * 处理key=value&key2=value2参数对，转为数组[key,value]
     * @param input
     * @param splitBy
     * @returns {[*,*]}
     */
    splitOnce: function (input, splitBy) {
        var i = input.indexOf(splitBy);
        return [input.slice(0, i), input.slice(i + 1)];
    },

    /**
     * url参数key value转为map
     * @param qstr
     * @returns {{}}
     */
    parseQuery: function (qstr) {
        var query = {};
        var a = qstr.split('&');
        for (var i = 0; i < a.length; i++) {
            var b = this.splitOnce(a[i], '=');
            query[b[0]] = b[1] || '';
        }
        return query;
    },

    /**
     * 返回url中参数对string
     * @param webUrl
     * @returns {string}
     */
    getRawQuery: function (webUrl) {
        var url = require('url');
        var parsedUrl = url.parse(webUrl);
        var query = parsedUrl.query;
        query = this.parseQuery(query);
        delete query.frommsgid;
        delete query.count;
        delete query.f;
        var result = '';
        for (var key in query) {
            if (query.hasOwnProperty(key)) {
                result += key + '=' + query[key] + '&';
            }
        }

        return result;
    },

    /**
     * 从url中获取biz参数，代表公众号
     * @param url
     * @returns {*}
     */
    getBizFromUrl: function (url) {
        var rawQuery = this.getRawQuery(url);
        var parsedQuery = this.parseQuery(rawQuery);
        return parsedQuery.__biz;
    },
    /**
     * 获取url中idx参数
     * @param url
     * @returns {*|number}
     */
    getIdxFromUrl: function (url) {
        var rawQuery = this.getRawQuery(url);
        var parsedQuery = this.parseQuery(rawQuery);
        return parsedQuery.idx;
    },
    /**
     * 获取url中的msgid
     * @param url
     * @returns {*}
     */
    getMidFromUrl: function (url) {
        var rawQuery = this.getRawQuery(url);
        var parsedQuery = this.parseQuery(rawQuery);
        if (parsedQuery.mid) {
            return parsedQuery.mid;
        } else if (parsedQuery['amp;mid']) {
            return parsedQuery['amp;mid']
        } else if (parsedQuery['amp;amp;mid']) {
            return parsedQuery['amp;amp;mid']
        } else {
            return parsedQuery.appmsgid;
        }
    },

    /**
     * 保存文章到数据库中
     * @param msgInfo
     */
    writePost: function (msgInfo) {
        var id = msgInfo.id;
        var fileid = msgInfo.fileid;
        var author = msgInfo.author;
        var title = msgInfo.title;
        var contentUrl = msgInfo.content_url.replace(/amp;/g, "");
        var biz = this.getBizFromUrl(contentUrl);
        var mid = this.getMidFromUrl(contentUrl);
        var cover = msgInfo.cover; //.replace(/\\\//g, "/");
        var digest = msgInfo.digest;
        var idx = msgInfo.idx;
        var sourceUrl = msgInfo.source_url;
        var createTime = new Date(msgInfo.datetime * 1000);
        db.insertOne(id, fileid, author, biz, mid, title, contentUrl, cover, digest, idx, sourceUrl, createTime);
    },

    /**
     * 下一篇文章跳转地址
     * @param url
     * @param delay
     * @param nonce
     * @returns {string|string}
     */
    injectNextArticleJs: function (url, delay, nonce) {
        if (!url) {
            return '';
        }
        var next = nonce ? '<script nonce="' + nonce + '" type="text/javascript">' : '<script type="text/javascript">';
        next += 'setTimeout(function(){window.location.href="' + url + '";},' + DELAY + ');';
        next += '</script>';
        return next;
    },
    /**
     * 拿一篇未获取阅读数的文章，除当前文章
     * @param mid
     * @param nonce
     */
    getNextPostUrl: function (mid, nonce, callback) {
        db.getNextUnupdatedPostContentUrl(mid, nonce, callback);
    },
    /**
     * 处理公众号全部历史消息页面
     * @param serverResData 原始页面内容
     */
    historyPage: function (serverResData) {
        try {
            // serverResData为页面html数据，使用正则从页面上提取公众号列表数据
            var reg = /var msgList = \'(.*?)\';/;
            var ret = reg.exec(serverResData.toString());
            // 数据中有"号转义的字符，进行替换
            var ret = ret[1].replace(/&quot;/g, '"');

            this.savePosts(ret);

            let tips = '<h1 style="color:red; font-size:20px; text-align: center; margin-top: 10px; margin-bottom: 10px; position: absolute ;top: 50px;z-index: 9999">每间隔' + DELAY / 1000 + '秒后将自动下一页</h1>';
            let injectAutoNextJs = '<script type="text/javascript">setInterval(function(){document.body.scrollTop = document.body.scrollHeight;}, ' + DELAY + ');</script>'
            let articleUrl = 'http://mp.weixin.qq.com/s?__biz=MzIwNjIzMzIzNA==&mid=2247483801&idx=1&sn=844b9b3902f760a5143f9ec83b35119c&chksm=97258a64a0520372f5282a6bbf253013024ddd20d65ea3317dfa8c32c67db9945d573e26f57a&scene=27#wechat_redirect'
            let injectAutoReadJs = '<script type="text/javascript">setInterval(function(){ if(document.body.scrollTop + document.body.offsetHeight>=document.body.scrollHeight){window.location.href=\'' + articleUrl + '\'}}, ' + (DELAY + 3000) + ');</script>'
            return injectAutoReadJs + serverResData + tips + injectAutoNextJs;
        } catch (e) {
            console.log(e);
        }
    },
    /**
     * 文章列表数据rest接口
     * @param serverResData
     * {"ret":0,"errmsg":"ok","msg_count":10,"can_msg_continue":1,"general_msg_list":"{}",next_offset":21,"video_count":1,"use_video_tab":1,"real_type":0}
     *
     * @param serverResData
     */
    nextPage: function (serverResData) {
        //serverResData为下一页接口返回json数据
        try {
            let result = JSON.parse(serverResData.toString());
            // 文章列表string
            let ret = result.general_msg_list;
            this.savePosts(ret);
            return serverResData;
        } catch (e) {
            console.log(e);
        }
    },
    /**
     * 文章详情页面处理
     */
    articleDetail: function (req, response) {
        let serverResData = response.body.toString();
        var that = this;
        try {
            var biz = this.getBizFromUrl(req.url);
            var mid = this.getMidFromUrl(req.url);
            var idx = this.getIdxFromUrl(req.url);
            // 获取公众号名称
            var ret = /<strong class=\"profile_nickname\">(.*?)<\/strong>/.exec(serverResData.toString());
            // 获取静态页面上的公众号名称，更新入库
            if (ret) {
                db.updateOne(biz, mid, idx, {
                    accountName: ret[1],
                    updateAt: new Date()
                });
            }
            var nonce = 0;
            var reg = /<script nonce=\"(.*?)\"/;
            var ret = reg.exec(serverResData);
            if (ret) {
                nonce = ret[1];
            }

            return new Promise(resolve => {
                    // 从数据库中获取下一篇要更新的文章，构造js注入页面
                    this.getNextPostUrl(mid, nonce, function (nextUrl, nonce) {
                        let next = that.injectNextArticleJs(nextUrl, DELAY, nonce);
                        let tips = '<h1 style="color:red; font-size:20px; text-align: center; margin-top: 10px; margin-bottom: 10px;">' + DELAY / 1000 + '秒后自动浏览下一篇文章</h1>';
                        response.body = tips + serverResData + next;
                        resolve({response: response});
                    });
                }
            );
        } catch
            (e) {
            console.log(e);
        }
    },
    /**
     * 文章扩展信息处理，如阅读数，点赞数
     * @param serverResData
     * {"advertisement_num":0,"advertisement_info":[],
     *   "appmsgstat":{"show":true,"is_login":true,"liked":false,"read_num":46438,"like_num":59,"ret":0,"real_read_num":0},
     *   "comment_enabled":1,"reward_head_imgs":[],"only_fans_can_comment":false,"comment_count":66,"is_fans":1,
     *   "nick_name":"zhoutao","logo_url":"http:\/\/wx.qlogo.cn\/mmopen\/ajNVdqHZLLC7KWHtBs86UHPwHSNN5ZReyI98XSgdrKwzMfkN21QyX3kiagmWlKNshIugKltXRpwyicf5uGouxPyw\/132",
     *   "friend_comment_enabled":1,
     *   "base_resp":{"wxtoken":777}}
     */
    articleExtInfo: function (req, serverResData) {
        try {
            var appmsgext = JSON.parse(serverResData.toString());
            //没有阅读数，点赞数，直接返回
            if (!appmsgext.appmsgstat) {
                return serverResData;
            }

            let requestData = req.requestData.toString();
            console.log('requestData:', requestData);

            var biz = decodeURIComponent(this.parseQuery(requestData).__biz);
            var mid = this.parseQuery(requestData).mid;
            var idx = this.parseQuery(requestData).idx;

            db.updateOne(biz, mid, idx, {
                readNum: appmsgext.appmsgstat.read_num,
                likeNum: appmsgext.appmsgstat.like_num,
                rewardNum: appmsgext.reward_total_count,
                updateAt: new Date()
            });

            return serverResData;
        } catch (e) {
            console.log(e);
        }
    }
    ,
    /**
     * 文章评论处理
     * @param req
     * @param serverResData
     */
    articleComment: function (req, serverResData) {
        try {
            var appmsgComment = JSON.parse(serverResData.toString());
            var biz = this.getBizFromUrl(req.url);
            var mid = this.getMidFromUrl(req.url);
            var idx = this.getIdxFromUrl(req.url);
            db.updateOne(biz, mid, idx, {
                electedCommentNum: appmsgComment.elected_comment_total_cnt,
                updateAt: new Date()
            });
            return serverResData;
        } catch (e) {
            console.log(e);
        }
    }
    ,

    /**
     * 替换服务器响应的数据
     */
    beforeSendResponse: function (requestDetail, responseDetail) {
        let serverResData = responseDetail.response.body.toString();
        let url = requestDetail.url;

        if (/mp\/profile_ext\?action=getmsg/i.test(url)) {
            // 文章列表下一页
            responseDetail.response.body = this.nextPage(serverResData);
        } else if (/mp\/profile_ext\?action=home/i.test(url)) {
            // 文章历史消息页面
            responseDetail.response.body = this.historyPage(serverResData);
        } else if (/s\?__biz=/i.test(url)) {
            // 文章详情页面静态
            return this.articleDetail(requestDetail, responseDetail.response);
        } else if (/mp\/getappmsgext\?/i.test(url)) {
            // 文章阅读数等数据接口
            responseDetail.response.body = this.articleExtInfo(requestDetail, serverResData);
        } else if (/mp\/appmsg_comment\?action=getcommen/i.test(url)) {
            //这个是回复列表
            responseDetail.response.body = this.articleComment(requestDetail, serverResData);
        }
        return responseDetail
    }
};