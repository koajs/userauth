'use strict';

const request = require('supertest');
const koa = require('koa');
const session = require('koa-generic-session');
const route = require('koa-route');
const userauth = require('..');
const createApp = require('./app');

describe('test/ignore.test.js', () => {
  it('should ignore /api/xxx', () => {
    const app = createApp({ match: null, ignore: '/api' });
    return request(app)
    .get('/api/xxx')
    .expect(200)
    .expect({
      user: null,
      message: 'GET /api/xxx'
    });
  });

  it('should ignore /api/xxx regex', async () => {
    const app = createApp({ match: null, ignore: /^\/api\//g });
    await request(app)
    .get('/api/xxx')
    .expect(200)
    .expect({
      user: null,
      message: 'GET /api/xxx'
    });

    await request(app)
    .get('/api/xxx')
    .expect(200)
    .expect({
      user: null,
      message: 'GET /api/xxx'
    });
  });

  it('should ignore /api/xxx when ignore is a function', async () => {
    const app = createApp({ match: null, ignore: path => path.indexOf('/api/') >= 0 });
    await request(app)
    .get('/api/xxx')
    .expect(200)
    .expect({
      user: null,
      message: 'GET /api/xxx'
    });

    await request(app)
    .get('/user/xxx')
    .expect(302)
    .expect('Location', '/login?redirect=%2Fuser%2Fxxx');
  });

  it('should /user 302 when ignore /api', () => {
    const app = createApp({ match: null, ignore: '/api' });
    return request(app)
    .get('/user/xxx')
    .expect(302)
    .expect('Location', '/login?redirect=%2Fuser%2Fxxx');
  });

  it('should not match any path when match and ignore all missing', () => {
    const app = createApp();
    return request(app)
    .get('/')
    .expect(200)
    .expect({
      user: null,
      message: 'GET /'
    });
  });
});
