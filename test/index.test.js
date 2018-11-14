'use strict';

const mm = require('mm');
const request = require('supertest');
const koa = require('koa');
const session = require('koa-generic-session');
const userauth = require('../');
const createApp = require('./app');

function match(path) {
  return path.indexOf('/user') === 0;
}

describe('test/index.test.js', () => {
  describe('userauth([match, ]options)', () => {
    it('should support match="" to match all', () => {
      const app = new koa();
      app.keys = ['i m secret'];
      app.use(session());
      app.use(userauth('', {
        loginURLFormater: () => 'http://auth.example.com/login',
        getUser: async () => null,
      }));
      return request(app.callback())
      .get('/')
      .expect('Location', '/login?redirect=%2F')
      .expect(302);
    });

    it('should support options.match="" to match all', () => {
      const app = new koa();
      app.keys = ['i m secret'];
      app.use(session());
      app.use(userauth({
        match: '',
        loginURLFormater: () => 'http://auth.example.com/login',
        getUser: async () => null,
      }));
      return request(app.callback())
      .get('/')
      .expect('Location', '/login?redirect=%2F')
      .expect(302);
    });

    it('should support options.match=null to not match all', () => {
      const app = new koa();
      app.keys = ['i m secret'];
      app.use(session());
      app.use(userauth({
        match: null,
        loginURLFormater: () => 'http://auth.example.com/login',
        getUser: async () => null,
      }));
      app.use(async ctx => ctx.body = 'pass');
      return request(app.callback())
      .get('/')
      .expect('pass')
      .expect(200);
    });

    it('should GET /login redirect to login url', () => {
      const app = new koa();
      app.keys = ['i m secret'];
      app.use(session());
      app.use(userauth({
        match: '',
        loginURLFormater: () => 'http://auth.example.com/login',
        getUser: async () => null,
      }));
      return request(app.callback())
      .get('/login')
      .expect('Location', 'http://auth.example.com/login')
      .expect(302);
    });

    it('should support https', () => {
      const app = new koa();
      app.proxy = true;
      app.keys = ['i m secret'];
      app.use(session());
      app.use(userauth({
        match: '',
        loginURLFormater: url => 'https://auth.example.com/login?callback=' + url,
        getUser: async () => null,
      }));
      return request(app.callback())
      .get('/login')
      .set('X-Forwarded-Proto', 'https')
      .expect('Location', /https:\/\/auth\.example\.com\/login\?callback=https:\/\//)
      .expect(302);
    });

    it('should support rootPath=/foo', () => {
      const app = new koa();
      app.keys = ['i m secret'];
      app.use(session());
      app.use(userauth({
        match: '',
        rootPath: '/foo',
        loginURLFormater: () => 'http://auth.example.com/login',
        getUser: async () => null,
      }));
      return request(app.callback())
      .get('/foo/login')
      .expect('Location', 'http://auth.example.com/login')
      .expect(302);
    });

    it('should always redirect to login page when session not exists', () => {
      const app = new koa();
      app.keys = ['i m secret'];
      app.use(userauth({
        match: '/user',
        loginURLFormater: () => 'http://auth.example.com/login',
        getUser: async () => null,
      }));
      return request(app.callback())
      .get('/user')
      .expect('Location', 'http://auth.example.com/login')
      .expect(302);
    });

    it('should pass when session not exists and not match need login', () => {
      const app = new koa();
      app.keys = ['i m secret'];
      app.use(userauth({
        match: '/user',
        loginURLFormater: () => 'http://auth.example.com/login',
        getUser: async () => null,
      }));
      app.use(async ctx => ctx.body = 'pass');
      return request(app.callback())
      .get('/')
      .expect('pass')
      .expect(200);
    });
  });

  [
    ['string', '/user'],
    ['regexp', /^\/user/],
    ['function', match],
  ].forEach(function (matchs) {
    const type = matchs[0];
    const match = matchs[1];
    const app = createApp({ match });
    describe('with ' + type, () => {
      afterEach(mm.restore);

      it('should request /login redirect to /mocklogin', async () => {
        let res = await request(app)
        .get('/login')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect('Location', /\/login\/callback$/)
        .expect('Set-Cookie', /^koa\.sid/)
        .expect(302);

        let cookie = res.headers['set-cookie'].join(';');
        // should login redirect to /
        await request(app)
        .get('/login/callback')
        .set('Cookie', cookie)
        .expect('Location', '/')
        .expect(302);

        await request(app)
        .get('/login?foo=bar')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect('Location', /\/login\/callback$/)
        .expect(302);

        await request(app)
        .get('/login?foo=bar')
        .set('Accept', 'application/json')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect({ error: '401 Unauthorized' })
        .expect(401);

        res = await request(app)
        .get('/login?redirect=user/index')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect('Set-Cookie', /^koa\.sid/)
        .expect(302);

        cookie = res.headers['set-cookie'].join(';');
        // should login redirect to /
        await request(app)
        .get('/login/callback')
        .set('Cookie', cookie)
        .expect('Location', '/')
        .expect(302);

        res = await request(app)
        .get('/login?redirect=/index2')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect('Set-Cookie', /^koa\.sid/)
        .expect(302);

        cookie = res.headers['set-cookie'].join(';');
        // should login redirect to /
        await request(app)
        .get('/login/callback')
        .set('Cookie', cookie)
        .expect('Location', '/index2')
        .expect(302);
      });

      it('should login success and visit /user/foo status 200', async () => {
        let res = await request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .expect('Location', '/')
        .expect('Set-Cookie', /^koa\.sid/)
        .expect(302);

        let cookie = res.headers['set-cookie'].join(';');
        await request(app)
        .get('/user/foo')
        .set('Cookie', cookie)
        .expect({"user":{"nick":"mock user","userid":1234},"message":"GET /user/foo"})
        .expect(200);
      });

      it('should login callback redirect success with referer', async () => {
        let res = await request(app)
        .get('/login?redirect=')
        .set('Referer', 'http://demo.com/foo')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect('Set-Cookie', /^koa\.sid/)
        .expect(302);

        let cookie = res.headers['set-cookie'].join(';');
        // should login redirect to /
        await request(app)
        .get('/login/callback')
        .set('Cookie', cookie)
        .set('mocklogin', 1)
        .expect('Location', '/')
        .expect(302);

        res = await request(app)
        .get('/login')
        .set('Referer', 'foo/bar')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect('Set-Cookie', /^koa\.sid/)
        .expect(302);

        cookie = res.headers['set-cookie'].join(';');
        // should login redirect to /
        await request(app)
        .get('/login/callback')
        .set('Cookie', cookie)
        .set('mocklogin', 1)
        .expect('Location', '/')
        .expect(302);

        res = await request(app)
        .get('/login')
        .set('Referer', '/foo/bar')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect('Set-Cookie', /^koa\.sid/)
        .expect(302);

        cookie = res.headers['set-cookie'].join(';');
        // should login redirect to /
        await request(app)
        .get('/login/callback')
        .set('Cookie', cookie)
        .set('mocklogin', 1)
        .expect('Location', '/foo/bar')
        .expect(302);

        res = await request(app)
        .get('/login')
        .set('Referer', '/login')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect('Set-Cookie', /^koa\.sid/)
        .expect(302);

        cookie = res.headers['set-cookie'].join(';');
        // should login redirect to /
        await request(app)
        .get('/login/callback?foo')
        .set('Cookie', cookie)
        .set('mocklogin', 1)
        .expect('Location', '/')
        .expect(302);
      });

      it('should login callback redirect success with ctx.getRedirectTarget', async () => {
        let res;
        let cookie;
        const app = createApp({
          match,
          getRedirectTarget(ctx) {
            return '/foo';
          }
        })
        res = await request(app)
        .get('/login')
        .set('Referer', '/foo/bar')
        .expect('Location', /^\/mocklogin\?redirect/)
        .expect('Set-Cookie', /^koa\.sid/)
        .expect(302);

        cookie = res.headers['set-cookie'].join(';');
        // should login redirect to /
        await request(app)
        .get('/login/callback')
        .set('Cookie', cookie)
        .set('mocklogin', 1)
        .expect('Location', '/foo')
        .expect(302);
      });

      it('should redirect to /login when not auth user visit /user*',  async () => {
        await request(app)
        .get('/user')
        .expect('Location', '/login?redirect=%2Fuser')
        .expect(302);

        // fixed: encodeURIComponent(url) error: URIError: URI malformed
        await request(app)
        .get('/user/' + String.fromCharCode(0xDFFF))
        // .expect('Location', '/login?redirect=/user/' + String.fromCharCode(0xDFFF))
        .expect(302);

        await request(app)
        .get('/user/foo')
        .set({ Cookie: 'cookie2=' })
        .expect('Location', '/login?redirect=%2Fuser%2Ffoo')
        .expect(302);

        await request(app)
        .get('/user/')
        .set({ Cookie: 'cookie2= ;foo=bar' })
        .expect('Location', '/login?redirect=%2Fuser%2F')
        .expect(302);

        await request(app)
        .get('/user?foo=bar')
        .set('Accept', 'application/json')
        .expect('Location', '/login?redirect=%2Fuser%3Ffoo%3Dbar')
        .expect({ error: '401 Unauthorized' })
        .expect(401);
      });

      it('should 200 status when request url no need to login', async () => {
        await request(app)
        .get('/')
        .expect({
          user: null,
          message: 'GET /'
        })
        .expect(200);

        await request(app)
        .get('/use')
        .set({ Cookie: 'cookie2=' })
        .expect({
          user: null,
          message: 'GET /use'
        })
        .expect(200);

        await request(app)
        .get('/use/foo/bar')
        .set({ Cookie: 'cookie2= ;foo=bar' })
        .expect({
          user: null,
          message: 'GET /use/foo/bar'
        })
        .expect(200);
      });

      it('should login directly when use contain logined token', () => {
        return request(app)
        .get('/user/foo')
        .set('mocklogin', 1)
        .expect({"user":{"nick":"mock user","userid":1234},"message":"GET /user/foo"})
        .expect(200);
      });

      it('should return 302 when getUser directly', () => {
        return request(app)
        .get('/user/foo')
        .set('mockerror', 1)
        .expect('Location', '/login?redirect=%2Fuser%2Ffoo')
        .expect(302);
      });

      it('should return 200 status and user info after user logined', async () => {
        let res = await request(app)
        .get('/login?redirect=%2F')
        .expect(302);

        let cookie = res.headers['set-cookie'].join(';');

        res = await request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .set({ Cookie: 'cookie2=1234; ' + cookie })
        .expect('Location', '/')
        .expect(302);

        res = await request(app)
        .get('/')
        .set({ Cookie: 'cookie2=1234; ' + cookie })
        .expect({
          user: {
            nick: 'mock user',
            userid: 1234
          },
          message: 'GET /'
        })
        .expect(200);

        res = await request(app)
        .get('/logout')
        .set({ Cookie: 'cookie2=1234; ' + cookie })
        .expect('Location', '/')
        .expect(302);

        await request(app)
        .get('/logout')
        .set({ referer: '/login' })
        .expect('Location', '/login')
        .expect(302);
      });

      it('should return 302 to / what ever visit logincallback', async () => {
        let res = await request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .expect('Location', '/')
        .expect(302);

        let cookie = res.headers['set-cookie'].join(';');
        let times = 10;
        for (let i = 0; i < times; i++) {
          await request(app)
          .get('/login/callback')
          .set('Cookie', cookie)
          .expect('Location', '/')
          .expect(302);
        }
      });

      it('should return error when /login/callback request session proxy error', () => {
        return request(app)
        .get('/login/callback')
        .set({ mockerror: 'true' })
        .expect({
          error: 'mock getUser error',
          message: 'GET /login/callback'
        })
        .expect(500);
      });

      it('should user login fail when getUser return empty', async () => {
        let res = await request(app)
        .get('/login/callback')
        .set({ mockempty: '1' })
        .expect('Location', '/')
        .expect(302);
        res.should.not.have.header('set-cookie');

        res = await request(app)
        .get('/login/callback')
        .set({ Cookie: 'cookie2=wrong', mockempty: '1' })
        .set('Accept', 'application/json')
        .expect('Location', '/')
        .expect({ error: '401 Unauthorized' })
        .expect(401);
        res.should.not.have.header('set-cookie');
      });

      it('should logout success', async () => {
        await request(app)
        .get('/logout')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/')
        .expect(302);

        await request(app)
        .get('/logout?redirect=/foo')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/foo')
        .expect(302);

        await request(app)
        .get('/logout?redirect=foo')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/')
        .expect(302);

        await request(app)
        .get('/logout')
        .set('Referer', '/logout?foo=bar')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/')
        .expect(302);
      });

      it('should logout redirect to login page when the referer require user auth', async () => {
        await request(app)
        .get('/logout')
        .set('Referer', '/user/article')
        .set({ Cookie: 'cookie2=1234' })
        .expect('Location', '/user/article')
        .expect(302);

        await request(app)
        .get('/user/article')
        .expect('Location', '/login?redirect=%2Fuser%2Farticle')
        .expect(302);
      });

      it('should mock loginCallback error', () => {
        return request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .set('mocklogin_callbackerror', 'mock login callback error')
        .expect({
          error: 'mock login callback error',
          message: 'GET /login/callback'
        })
        .expect(500);
      });

      it('should mock loginCallback redirect to new url', () => {
        return request(app)
        .get('/login/callback')
        .set('mocklogin', 1)
        .set('mocklogin_redirect', '/newurl')
        .expect('Location', '/newurl')
        .expect(302);
      });

      it('should directly login with mock loginCallback redirect to new url', () => {
        return request(app)
        .get('/user')
        .set('mocklogin', 1)
        .set('mocklogin_redirect', '/user/newurl')
        .expect('Location', '/user/newurl')
        .expect(302);
      });

      it('should mock logoutCallback error', async () => {
        let res = await request(app)
        .get('/user/foo')
        .set('mocklogin', 1)
        .set('mocklogout_callbackerror', 'mock logout callback error')
        .expect(200);

        let cookie = res.headers['set-cookie'].join(';');
        await request(app)
        .get('/logout')
        .set('Cookie', cookie)
        .expect('X-Logout', 'logoutCallback header')
        .expect({
          error: 'mock logout callback error',
          message: 'GET /logout'
        })
        .expect(500);
      });

      it('should mock loginCallback error', () => {
        return request(app)
        .get('/user/foo')
        .set('mocklogin', 1)
        .set('mocklogin_callbackerror', 'mock login callback error')
        .expect({
          error: 'mock login callback error',
          message: 'GET /user/foo'
        })
        .expect(500);
      });

      it('should mock logoutCallback redirect to new url', async () => {
        let res = await request(app)
        .get('/user/foo')
        .set('mocklogin', 1)
        .set('mocklogout_redirect', '/user/foo/newurl')
        .expect(200);

        res.statusCode.should.equal(200);
        let cookie = res.headers['set-cookie'].join(';');
        await request(app)
        .get('/logout')
        .set('Cookie', cookie)
        .expect('Location', '/user/foo/newurl')
        .expect(302);
      });
    });
  });
});
