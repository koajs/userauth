/**
 * Copyright(c) koajs and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <fengmk2@gmail.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

var request = require('supertest');
var koa = require('koa');
var session = require('koa-generic-session');
var route = require('koa-route');
var pedding = require('pedding');
var userauth = require('..');
var createApp = require('./app');

describe('ignore.test.js', function () {
  it('should ignore /api/xxx', function (done) {
    var app = createApp(null, '/api');
    request(app)
    .get('/api/xxx')
    .expect(200)
    .expect({
      user: null,
      message: 'GET /api/xxx'
    }, done);
  });

  it('should ignore /api/xxx regex', function (done) {
    var app = createApp(null, /^\/api\//);
    request(app)
    .get('/api/xxx')
    .expect(200)
    .expect({
      user: null,
      message: 'GET /api/xxx'
    }, done);
  });

  it('should ignore /api/xxx when ignore is a function', function (done) {
    done = pedding(2, done);
    var app = createApp(null, function (path) {
      return path.indexOf('/api/') >= 0;
    });
    request(app)
    .get('/api/xxx')
    .expect(200)
    .expect({
      user: null,
      message: 'GET /api/xxx'
    }, done);

    request(app)
    .get('/user/xxx')
    .expect(302)
    .expect('Location', '/login?redirect=%2Fuser%2Fxxx', done);
  });

  it('should /user 302 when ignore /api', function (done) {
    var app = createApp(null, '/api');
    request(app)
    .get('/user/xxx')
    .expect(302)
    .expect('Location', '/login?redirect=%2Fuser%2Fxxx', done);
  });

  it('should not match any path when match and ignore all missing', function (done) {
    var app = createApp();
    request(app)
    .get('/')
    .expect(200)
    .expect({
      user: null,
      message: 'GET /'
    }, done);
  });
});
