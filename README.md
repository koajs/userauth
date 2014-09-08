koa-userauth
=======


`koa` user auth abstraction layer middleware.

## Install

```bash
$ npm install koa-userauth
```

## Usage

`koa-userauth` is dependent on [koa-generic-session](https://github.com/koajs/generic-session).

```js
var koa = require('koa');
var userauth = require('koa-userauth');
var session = require('koa-generic-session');

var app = koa();
app.keys = ['i m secret'];

app.use(session());
app.use(userauth('/user', {
  // auth system login url
  loginURLForamter: function (url) {
    return 'http://login.demo.com/login?redirect=' + url;
  },
  // login callback and getUser info handler
  getUser: function* (this) {
    var token = this.query.token;
    // get user
    return user;
  }
}));
```

### Arguments

```js
/**
 * User auth middleware.
 *
 * @param {String|Regex|Function(pathname, ctx)} match, detect which url need to check user auth.
 * @param {Object} [options]
 *  - {Function(url, rootPath)} loginURLForamter, format the login url.
 *  - {String} [rootPath], custom app url root path, default is '/'.
 *  - {String} [loginPath], default is '/login'.
 *  - {String} [loginCallbackPath], default is `options.loginPath + '/callback'`.
 *  - {String} [logoutPath], default is '/logout'.
 *  - {String} [userField], logined user field name on `this.session`, default is 'user', `this.session.user`.
 *  - {Function* (ctx)} getUser, get user function, must get user info with `req`.
 *  - {Function* (ctx, user)} [loginCallback], you can handle user login logic here,return [user, redirectUrl]
 *  - {Function(ctx)} [loginCheck], return true meaning logined. default is `true`.
 *  - {Function* (ctx, user)} [logoutCallback], you can handle user logout logic here.return redirectUrl
 * @return {Function* (next)} userauth middleware
 * @public
 */
```

## Login flow

1. unauth user, redirect to `$loginPath?redirect=$currentURL`
2. user visit `$loginPath`, redirect to `options.loginURLForamter()` return login url.
3. user visit $loginCallbackPath, handler login callback logic.
4. If user login callback check success, will set `req.session[userField]`,
   and redirect to `$currentURL`.
5. If login check callback error, next(err).
6. user visit `$logoutPath`, set `req.session[userField] = null`, and redirect back.

## License

MIT
