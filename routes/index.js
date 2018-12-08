const express = require("express");
const contentModel = require("../models/content");
const marked = require("marked");
const pagination = require("../modules/pagination");
const passport = require("passport");
const emailModel = require("../models/emailvalidation");
const userModel = require("../models/user");
const router = express.Router();


// Markdown Support
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: false,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});


router.get("/", (req, res) => {
  pagination({
    limit: 2,
    model: contentModel,
    url: "/",
    ejs: "main/index",
    where: {},
    res: res,
    req: req,
    populate: ["category", "author"],
    // 其他数据
    data: {},
  });
});



// user log in
router.get("/users/login", (req, res) => {
  res.render("users/login", { referer: req.headers.referer });
});

router.get("/test", (req, res)=>{
  res.render("main/test");
});


// user register
router.get("/users/register", (req, res) => {
  res.render("users/register");
});

router.post("/users/login", function (req, res, next) {
  passport.authenticate("local.login", function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.send({ success: false, message: "authentication failed" });
    }
    if(user.status!=1){
      return res.send({success:false, message:"email is not validated"});
    }
    req.login(user, loginErr => {
      if (loginErr) {
        return next(loginErr);
      }
      if (req.body.referer && (req.body.referer !== undefined && req.body.referer.slice(-6) !== "/login")) {
        res.redirect(req.body.referer);
      } else {
        res.redirect("/");
      }
    });
  })(req, res, next);
});


router.get("/users/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

router.post("/users/register", function(req, res, next) {
  passport.authenticate("local.register", function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.send(info);
    }
    return res.redirect("/users/login");
  })(req, res, next);
});


router.get("/emailvalidation", function(req, res, next){
  let code = req.query.v;
  emailModel.findOne({code:code}, (err, emailval)=>{
    if(err){
      return res.render("main/emailval", { success: false, msg: err});
    }
    if(!emailval){
      return res.render("main/emailval", {success:false, msg: "该链接不存在或已经失效！"});
    }
    let id = emailval.userId;
    userModel.findById(id, (err, user)=>{
      if(err){
        return res.render("main/emailval", { success: false, msg:err});
      }
      user.status = 1;
      user.save();
      res.set("refresh", "5;url=/users/login");
      return res.render("main/emailval", { success: true, msg: "邮箱认证成功！"});
    });
    
  })
  // res.json({code : code});
});

router.get("/me", (req, res) => {
  if (req.isAuthenticated() && req.user.status == 1){
    res.render("main/user",{username:req.user.username});
  }
  else{
    res.render("main/error", {message: "用户没有登录"});
  }
});


router.get("/views", (req, res) => {
  let contentid = req.query.contentId;
  contentModel.findById(contentid).populate(["category", "author"]).then((content) => {
    let contentHtml = marked(content.content);
    res.render("main/views", {
      contentHtml: contentHtml,
      content: content,
      userinfo:req.user || {},
    });
    content.views++;
    content.save();
  });
});

// 将其暴露给外部使用
module.exports = router;