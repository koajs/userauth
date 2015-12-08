/**
 * Copyright(c) koajs and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com>
 *   fengmk2 <fengmk2@gmail.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

var koa = require('koa');
var session = require('koa-generic-session');
var userauth = require('..');
var route = require('koa-route');

module.exports = function(match, ignore) {
  var app = koa();
  app.keys = ['i m secret'];
  app.use(session());

  app.use(function* (next) {
    try {
      yield* next;
    } catch (err) {
      this.status = 500;
      this.body = {
        error: err.message,
        message: this.method + ' ' + this.url
      };
    }
  });

  app.use(userauth({
    match: match,
    ignore: ignore,
    loginURLForamter: function (url) {
      return '/mocklogin?redirect=' + url;
    },

    getUser: function* (ctx) {
      if (ctx.get('mockerror')) {
        var err = new Error('mock getUser error');
        err.data = {url: ctx.url};
        throw err;
      }

      if (ctx.get('mockempty')) {
        return null;
      }

      var user = ctx.session.user;
      if (ctx.get('mocklogin')) {
        user = {
          nick: 'mock user',
          userid: 1234
        };
      }

      if (ctx.get('mocklogin_redirect')) {
        user.loginRedirect = ctx.get('mocklogin_redirect');
      }

      if (ctx.get('mocklogin_callbackerror')) {
        user.loginError = ctx.get('mocklogin_callbackerror');
      }

      if (ctx.get('mocklogout_redirect')) {
        user.logoutRedirect = ctx.get('mocklogout_redirect');
      }

      if (ctx.get('mocklogout_callbackerror')) {
        user.logoutError = ctx.get('mocklogout_callbackerror');
      }
      return user;
    },

    loginCallback: function* (ctx, user) {
      if (user.loginError) {
        throw new Error(user.loginError);
      }
      return [user, user.loginRedirect];
    },


    logoutCallback: function* (ctx, user) {
      ctx.set('X-Logout', 'logoutCallback header');
      if (user.logoutError) {
        throw new Error(user.logoutError);
      }
      return user.logoutRedirect;
    }
  }));

  app.use(route.get('/mocklogin', function* (next) {
    this.redirect(this.query.redirect);
  }));

  app.use(function* (next) {
    this.body = {
      user: this.session.user || null,
      message: this.method + ' ' + this.url
    };
  });
  return app.callback();
};
