/*!
 * koa-userauth - index.js
 * Copyright(c) 2014 dead_horse <dead_horse@qq.com>
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 */

var pedding = require('pedding');
var mm = require('mm');
var userauth = require('../');
var should = require('should');
var request = require('supertest');
var createApp = require('./app');

function match(path) {
  return path.indexOf('/user') === 0;
}


describe('userauth.test.js', function () {
  [
    ['string', '/user'],
    ['regexp', /^\/user/],
    ['function', match],
  ].forEach(function (matchs) {
    var type = matchs[0];
    var match = matchs[1];
    var app = createApp(match);
    describe('with ' + type, function () {
      afterEach(function () {
        mm.restore();
      });

      it('should request /login redirect to /mocklogin', function (done) {
        done = pedding(5, done);

        request(app)
        .get('/login')
        .expect('Location', /^\/mocklogin\?redirect\=/)
        .expect('Location', /\/login\/callback$/)
        .expect('Set-Cookie', /^koa\.sid\=/)
        .expect(302, function (err, res) {
          should.not.exist(err);
          var cookie = res.headers['set-cookie'].join(';');

          // should login redirect to /
          request(app)
          .get('/login/callback')
          .set('Cookie', cookie)
          .expect('Location', '/')
          .expect(302, done);
        });

        request(app)
        .get('/login?foo=bar')
        .expect('Location', /^\/mocklogin\?redirect\=/)
        .expect('Location', /\/login\/callback$/)
        .expect(302, done);

        request(app)
        .get('/login?foo=bar')
        .set('Accept', 'application/json')
        .expect('Location', /^\/mocklogin\?redirect\=/)
        .expect({ error: '401 Unauthorized' })
        .expect(401, done);

        request(app)
        .get('/login?redirect=user/index')
        .expect('Location', /^\/mocklogin\?redirect\=/)
        .expect('Set-Cookie', /^koa\.sid\=/)
        .expect(302, function (err, res) {
          should.not.exist(err);
          var cookie = res.headers['set-cookie'].join(';');
          // should login redirect to /
          request(app)
          .get('/login/callback')
          .set('Cookie', cookie)
          .expect('Location', '/')
          .expect(302, done);
        });

        request(app)
        .get('/login?redirect=/index2')
        .expect('Location', /^\/mocklogin\?redirect\=/)
        .expect('Set-Cookie', /^koa\.sid\=/)
        .expect(302, function (err, res) {
          should.not.exist(err);
          var cookie = res.headers['set-cookie'].join(';');
          // should login redirect to /
          request(app)
          .get('/login/callback')
          .set('Cookie', cookie)
          .expect('Location', '/index2')
          .expect(302, done);
        });
      });

      it('should login success and visit /user/foo status 200', function (done) {
        request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .expect('Location', '/')
        .expect('Set-Cookie', /^koa\.sid\=/)
        .expect(302, function (err, res) {
          var cookie = res.headers['set-cookie'].join(';');
          request(app)
          .get('/user/foo')
          .set('Cookie', cookie)
          .expect({"user":{"nick":"mock user","userid":1234},"message":"GET /user/foo"})
          .expect(200, done);
        });
      });

      it('should login callback redirect success with referer', function (done) {
        done = pedding(4, done);

        request(app)
        .get('/login?redirect=')
        .set('Referer', 'http://demo.com/foo')
        .expect('Location', /^\/mocklogin\?redirect\=/)
        .expect('Set-Cookie', /^koa\.sid\=/)
        .expect(302, function (err, res) {
          should.not.exist(err);
          var cookie = res.headers['set-cookie'].join(';');
          // should login redirect to /
          request(app)
          .get('/login/callback')
          .set('Cookie', cookie)
          .set('mocklogin', 1)
          .expect('Location', '/')
          .expect(302, done);
        });

        request(app)
        .get('/login')
        .set('Referer', 'foo/bar')
        .expect('Location', /^\/mocklogin\?redirect\=/)
        .expect('Set-Cookie', /^koa\.sid\=/)
        .expect(302, function (err, res) {
          should.not.exist(err);
          var cookie = res.headers['set-cookie'].join(';');
          // should login redirect to /
          request(app)
          .get('/login/callback')
          .set('Cookie', cookie)
          .set('mocklogin', 1)
          .expect('Location', '/')
          .expect(302, done);
        });

        request(app)
        .get('/login')
        .set('Referer', '/foo/bar')
        .expect('Location', /^\/mocklogin\?redirect\=/)
        .expect('Set-Cookie', /^koa\.sid\=/)
        .expect(302, function (err, res) {
          should.not.exist(err);
          var cookie = res.headers['set-cookie'].join(';');
          // should login redirect to /
          request(app)
          .get('/login/callback')
          .set('Cookie', cookie)
          .set('mocklogin', 1)
          .expect('Location', '/foo/bar')
          .expect(302, done);
        });

        request(app)
        .get('/login')
        .set('Referer', '/login')
        .expect('Location', /^\/mocklogin\?redirect\=/)
        .expect('Set-Cookie', /^koa\.sid\=/)
        .expect(302, function (err, res) {
          should.not.exist(err);
          var cookie = res.headers['set-cookie'].join(';');
          // should login redirect to /
          request(app)
          .get('/login/callback?foo')
          .set('Cookie', cookie)
          .set('mocklogin', 1)
          .expect('Location', '/')
          .expect(302, done);
        });
      });

      it('should redirect to /login when not auth user visit /user*', function (done) {
        done = pedding(5, done);

        request(app)
        .get('/user')
        .expect('Location', '/login?redirect=%2Fuser')
        .expect(302, done);

        // fixed: encodeURIComponent(url) error: URIError: URI malformed
        request(app)
        .get('/user/' + String.fromCharCode(0xDFFF))
        // .expect('Location', '/login?redirect=/user/' + String.fromCharCode(0xDFFF))
        .expect(302, done);

        request(app)
        .get('/user/foo')
        .set({ Cookie: 'cookie2=' })
        .expect('Location', '/login?redirect=%2Fuser%2Ffoo')
        .expect(302, done);

        request(app)
        .get('/user/')
        .set({ Cookie: 'cookie2= ;foo=bar' })
        .expect('Location', '/login?redirect=%2Fuser%2F')
        .expect(302, done);

        request(app)
        .get('/user?foo=bar')
        .set('Accept', 'application/json')
        .expect('Location', '/login?redirect=%2Fuser%3Ffoo%3Dbar')
        .expect({ error: '401 Unauthorized' })
        .expect(401, done);
      });

      it('should 200 status when request url no need to login', function (done) {
        done = pedding(3, done);

        request(app)
        .get('/')
        .expect({
          user: null,
          message: 'GET /'
        })
        .expect(200, done);

        request(app)
        .get('/use')
        .set({ Cookie: 'cookie2=' })
        .expect({
          user: null,
          message: 'GET /use'
        })
        .expect(200, done);

        request(app)
        .get('/use/foo/bar')
        .set({ Cookie: 'cookie2= ;foo=bar' })
        .expect({
          user: null,
          message: 'GET /use/foo/bar'
        })
        .expect(200, done);
      });

      it('should login directly when use contain logined token', function (done) {
        request(app)
        .get('/user/foo')
        .set('mocklogin', 1)
        .expect({"user":{"nick":"mock user","userid":1234},"message":"GET /user/foo"})
        .expect(200, done);
      });

      it('should return 302 when getUser directly', function (done) {
        request(app)
        .get('/user/foo')
        .set('mockerror', 1)
        .expect('Location', '/login?redirect=%2Fuser%2Ffoo')
        .expect(302, done);
      });

      it('should return 200 status and user info after user logined', function (done) {
        request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .expect('Location', '/')
        .expect(302, function (err, res) {
          should.not.exist(err);
          var cookie = res.headers['set-cookie'].join(';');
          request(app)
          .get('/')
          .set({ Cookie: 'cookie2=1234; ' + cookie })
          .expect({
            user: {
              nick: 'mock user',
              userid: 1234
            },
            message: 'GET /'
          })
          .expect(200, function (err, res) {
            // logout
            should.not.exist(err);
            request(app)
            .get('/logout')
            .set({ Cookie: 'cookie2=1234; ' + cookie })
            .expect('Location', '/')
            .expect(302, function () {
              request(app)
              .get('/logout')
              .set({ referer: '/login' })
              .expect('Location', '/login')
              .expect(302, done);
            });
          });
        });
      });

      it('should return 302 to / what ever visit logincallback', function (done) {
        request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .expect('Location', '/')
        .expect(302, function (err, res) {
          should.not.exist(err);
          var cookie = res.headers['set-cookie'].join(';');
          var times = 10;
          done = pedding(times, done);
          for (var i = 0; i < times; i++) {
            request(app)
            .get('/login/callback')
            .set('Cookie', cookie)
            .expect('Location', '/')
            .expect(302, done);
          }
        });
      });

      it('should return error when /login/callback request session proxy error', function (done) {
        request(app)
        .get('/login/callback')
        .set({ mockerror: 'true' })
        .expect({
          error: 'mock getUser error',
          message: 'GET /login/callback'
        })
        .expect(500, done);
      });

      it('should user login fail when getUser return empty', function (done) {
        done = pedding(2, done);

        request(app)
        .get('/login/callback')
        .set({ mockempty: '1' })
        .expect('Location', '/')
        .expect(302, function (err, res) {
          res.should.not.have.header('set-cookie');
          done();
        });

        request(app)
        .get('/login/callback')
        .set({ Cookie: 'cookie2=wrong', mockempty: '1' })
        .set('Accept', 'application/json')
        .expect('Location', '/')
        .expect({ error: '401 Unauthorized' })
        .expect(401, function (err, res) {
          res.should.not.have.header('set-cookie');
          done();
        });
      });

      it('should logout success', function (done) {
        done = pedding(4, done);

        request(app)
        .get('/logout')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/')
        .expect(302, done);

        request(app)
        .get('/logout?redirect=/foo')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/foo')
        .expect(302, done);

        request(app)
        .get('/logout?redirect=foo')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/')
        .expect(302, done);

        request(app)
        .get('/logout')
        .set('Referer', '/logout?foo=bar')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/')
        .expect(302, done);
      });

      it('should logout redirect to login page when the referer require user auth', function (done) {
        request(app)
        .get('/logout')
        .set('Referer', '/user/article')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/user/article')
        .expect(302, function (err, res) {
          request(app)
          .get('/user/article')
          .expect('Location', '/login?redirect=%2Fuser%2Farticle')
          .expect(302, done);
        });
      });

      it('should mock loginCallback error', function (done) {
        request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .set('mocklogin_callbackerror', 'mock login callback error')
        .expect({
          error: 'mock login callback error',
          message: 'GET /login/callback'
        })
        .expect(500, done);
      });

      it('should mock loginCallback redirect to new url', function (done) {
        request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .set('mocklogin_redirect', '/newurl')
        .expect('Location', '/newurl')
        .expect(302, done);
      });

      it('should directly login with mock loginCallback redirect to new url', function (done) {
        request(app)
        .get('/user')
        .set('mocklogin', 1)
        .set('mocklogin_redirect', '/user/newurl')
        .expect('Location', '/user/newurl')
        .expect(302, done);
      });

      it('should mock logoutCallback error', function (done) {
        request(app)
        .get('/user/foo')
        .set('mocklogin', 1)
        .set('mocklogout_callbackerror', 'mock logout callback error')
        .expect(302, function (err, res) {
          var cookie = res.headers['set-cookie'].join(';');
          request(app)
          .get('/logout')
          .set('Cookie', cookie)
          .expect('X-Logout', 'logoutCallback header')
          .expect({
            error: 'mock logout callback error',
            message: 'GET /logout'
          })
          .expect(500, done);
        });
      });

      it('should mock loginCallback error', function (done) {
        request(app)
        .get('/user/foo')
        .set('mocklogin', 1)
        .set('mocklogin_callbackerror', 'mock login callback error')
        .expect({
          error: 'mock login callback error',
          message: 'GET /user/foo'
        })
        .expect(500, done);
      });

      it('should mock logoutCallback redirect to new url', function (done) {
        request(app)
        .get('/user/foo')
        .set('mocklogin', 1)
        .set('mocklogout_redirect', '/user/foo/newurl')
        .end(function (err, res) {
          should.not.exist(err);
          res.statusCode.should.equal(200);
          var cookie = res.headers['set-cookie'].join(';');
          request(app)
          .get('/logout')
          .set('Cookie', cookie)
          .expect('Location', '/user/foo/newurl')
          .expect(302, done);
        });
      });
    });
  });
});
