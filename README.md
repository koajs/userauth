koa-userauth
=======

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Coveralls][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]

[npm-image]: https://img.shields.io/npm/v/koa-userauth.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-userauth
[travis-image]: https://img.shields.io/travis/koajs/userauth.svg?style=flat-square
[travis-url]: https://travis-ci.org/koajs/userauth
[coveralls-image]: https://img.shields.io/coveralls/koajs/userauth.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/koajs/userauth?branch=master
[david-image]: https://img.shields.io/david/koajs/userauth.svg?style=flat-square
[david-url]: https://david-dm.org/koajs/userauth


`koa` user auth abstraction layer middleware.

## Install

```bash
$ npm install koa-userauth
```

## Usage

`koa-userauth` is dependent on [koa-session](https://github.com/koajs/session) or [koa-generic-session](https://github.com/koajs/generic-session).

```js
var koa = require('koa');
var userauth = require('koa-userauth');
var session = require('koa-generic-session');

var app = new koa();
app.keys = ['i m secret'];

app.use(session());
app.use(userauth({
  match: '/user',
  // auth system login url
  loginURLFormatter: function (url) {
    return 'http://login.demo.com/login?redirect=' + url;
  },
  // login callback and getUser info handler
  getUser: async ctx => {
    var token = this.query.token;
    // get user
    return user;
  }
}));
```

### Arguments

If `options.match` or `options.ignore` is `String` instance,
we will use [path-match](https://github.com/expressjs/path-match) transfer it to `Regex` instance.

```js
/**
 * User auth middleware.
 *
 * @param {Object} [options]
 *  - {String|Regex|Function(pathname, ctx)} match, detect which url need to check user auth.
 *      `''` empty string meaning match all, @see `path-match` package.
 *  - {String|Regex|Function(pathname, ctx)} ignore, detect which url no need to check user auth.
 *      If `match` exists, this argument will be ignored.
 *  - {Function(url, rootPath, ctx)} loginURLFormatter, format the login url.
 *  - {String} [rootPath], custom app url root path, default is '/'.
 *  - {String} [loginPath], default is '/login'.
 *  - {String} [loginCallbackPath], default is `options.loginPath + '/callback'`.
 *  - {String} [logoutPath], default is '/logout'.
 *  - {String} [userField], logined user field name on `this.session`, default is 'user', `this.session.user`.
 *  - {Async Function (ctx)} getUser, get user function, must get user info with `req`.
 *  - {Async Function (ctx, user)} [loginCallback], you can handle user login logic here,return [user, redirectUrl]
 *  - {Function(ctx)} [loginCheck], return true meaning logined. default is `true`.
 *  - {Async Function (ctx, user)} [logoutCallback], you can handle user logout logic here.return redirectUrl
 *  - {Function(ctx)} [getRedirectTarget], customize how to get the redirect target after login
 * @return {Async Function (next)} userauth middleware
 * @public
 */
```

## Login flow

1. unauth user, redirect to `$loginPath?redirect=$currentURL`
2. user visit `$loginPath`, redirect to `options.loginURLFormatter()` return login url.
3. user visit $loginCallbackPath, handler login callback logic.
4. If user login callback check success, will set `req.session[userField]`,
   and redirect to `$currentURL`.
5. If login check callback error, next(err).
6. user visit `$logoutPath`, set `req.session[userField] = null`, and redirect back.

![userauth flow](https://www.lucidchart.com/publicSegments/view/54ede23d-a75c-4690-9408-33a30a008a99/image.png)

> [Source image file](https://www.lucidchart.com/documents/edit/4749f226-b75f-42ef-934f-b89f7bd68c7f?driveId=0ACmMEQjF7GJGUk9PVA)


## License

[MIT](LICENSE)
