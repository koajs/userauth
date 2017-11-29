'use strict';

var debug = require('debug')('koa-userauth');
var path = require('path');
var is = require('is-type-of');
var copy = require('copy-to');
var urlparse = require('url').parse;
var route = require('path-match')({
  end: false,
  strict: false,
  sensitive: false
});

var defaultOptions = {
  userField: 'user',
  rootPath: '/',
  loginPath: '/login',
  logoutPath: '/logout'
};

/**
 * User auth middleware.
 *
 * @param {String|Regex|Function(pathname, ctx)} match, detect which url need to check user auth.
 * @param {Object} options
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
 * @return {Async Function (next)} userauth middleware
 * @public
 */

module.exports = function (options) {
  // userauth(match, options)
  if (arguments.length === 2) {
    options = arguments[1];
    options.match = arguments[0];
  }

  copy(defaultOptions).to(options);

  options.loginCallbackPath = options.loginCallbackPath
    || options.loginPath + '/callback';

  if (options.rootPath !== '/') {
    if (process.platform === 'win32') {
      // rtrim last /, '/foo/' => '/foo'
      var rootPath = options.rootPath.replace(/\/+$/, '');
      options.loginPath = rootPath + options.loginPath;
      options.logoutPath = rootPath + options.logoutPath;
      options.loginCallbackPath = rootPath + options.loginCallbackPath;
    } else {
      options.loginPath = path.join(options.rootPath, options.loginPath);
      options.logoutPath = path.join(options.rootPath, options.logoutPath);
      options.loginCallbackPath = path.join(options.rootPath, options.loginCallbackPath);
    }
  }

  // all the typos. T_T
  options.loginURLFormatter = options.loginURLFormatter || options.loginURLFormater || options.loginURLForamter;
  options.getUser = options.getUser;
  options.redirectHandler = options.redirectHandler || defaultRedirectHandler;

  var match = options.match;
  var ignore = options.ignore;

  // need login checker
  var needLogin;

  if (is.string(match)) {
    needLogin = route(match);
  } else if (is.regExp(match)) {
    needLogin = function (path) {
      return match.test(path);
    };
  } else if (is.function(match)) {
    needLogin = match;
  }

  if (!is.function(needLogin)) {
    if (is.string(ignore)) {
      var pathMatch = route(ignore);
      needLogin = function (path) {
        return !pathMatch(path);
      };
    } else if (is.regExp(ignore)) {
      needLogin = function (path) {
        return !(path && path.match(ignore));
      };
    } else if (is.function(ignore)) {
      needLogin = function (path, context) {
        return !ignore(path, context);
      };
    } else {
      // ignore all
      needLogin = function () {};
      debug('ignore all paths');
    }
  }

  options.loginCallback = options.loginCallback || defaultLoginCallback;
  options.logoutCallback = options.logoutCallback || defaultLogoutCallback;
  options.loginCheck = options.loginCheck || defaultLoginCheck;

  var loginHandler = login(options);
  var loginCallbackHandler = loginCallback(options);
  var logoutHandler = logout(options);

  /**
   * login flow:
   *
   * 1. unauth user, redirect to `$loginPath?redirect=$currentURL`
   * 2. user visit `$loginPath`, redirect to `options.loginURLFormatter()` return login url.
   * 3. user visit $loginCallbackPath, handler login callback logic.
   * 4. If user login callback check success, will set `req.session[userField]`,
   *    and redirect to `$currentURL`.
   * 5. If login check callback error, next(err).
   * 6. user visit `$logoutPath`, set `req.session[userField] = null`, and redirect back.
   */

  return async function userauth(ctx, next) {
    var loginRequired = !!needLogin(ctx.path, ctx);
    debug('url: %s, path: %s, loginPath: %s, session exists: %s, login required: %s',
      ctx.url, ctx.path, options.loginPath, !!ctx.session, loginRequired);

    if (!ctx.session) {
      debug('ctx.session not exists');
      // ignore not match path
      if (!loginRequired) {
        debug('not match needLogin path, %j', ctx.path);
        return await next();
      }
      debug('relogin again');
      return await loginHandler.call(ctx, next);
    }

    // get login path
    if (ctx.path === options.loginPath) {
      debug('match login path');
      return await loginHandler.call(ctx, next);
    }

    // get login callback
    if (ctx.path === options.loginCallbackPath) {
      debug('match login clalback path');
      return await loginCallbackHandler.call(ctx, next);
    }

    // get logout
    if (ctx.path === options.logoutPath) {
      debug('match logout path');
      return await logoutHandler.call(ctx, next);
    }

    // ignore not match path
    if (!loginRequired) {
      debug('ignore %j', ctx.path);
      return await next();
    }

    if (ctx.session[options.userField]
      && options.loginCheck(ctx)) {
      // 4. user logined, next() handler
      debug('already logined');
      return await next();
    }

    // try to getUser directly
    var user;
    try {
      user = await options.getUser(ctx);
    } catch (err) {
      console.error('[koa-userauth] options.getUser error: %s', err.stack);
    }

    if (!user) {
      debug('can not get user');

      // make next handle a generator
      // so it can use await next in redirectHandle
      var nextHandler = async function () {
        var redirectURL = ctx.url;
        try {
          redirectURL = encodeURIComponent(redirectURL);
        } catch (e) {
          // URIError: URI malformed
          // use source url
        }
        var loginURL = options.loginPath + '?redirect=' + redirectURL;
        debug('redirect to %s', loginURL);
        redirect(ctx, loginURL);
      };

      return await options.redirectHandler.call(ctx, nextHandler, next);
    }

    debug('get user directly');
    var res = await options.loginCallback(ctx, user);
    debug('get user directly: ', res);
    var loginUser = res[0];
    var redirectURL = res[1];
    ctx.session[options.userField] = loginUser;
    if (redirectURL) {
      return redirect(ctx, redirectURL);
    }
    await next();
  };
};

async function defaultRedirectHandler(nextHandler) {
  await nextHandler();
}

async function defaultLoginCallback(ctx, user) {
  return [user, null];
}

async function defaultLogoutCallback(ctx, user, callback) {
  return null;
}

function defaultLoginCheck() {
  return true;
}

/**
 * Send redirect response.
 *
 * @param  {Context} ctx
 * @param  {String} url, redirect URL
 * @param  {Number|String} status, response status code, default is `302`
 *
 * @api public
 */

function redirect(ctx, url, status) {
  if (ctx.accepts('html', 'json') === 'json') {
    ctx.set('Location', url);
    ctx.status = 401;
    ctx.body = {
      error: '401 Unauthorized'
    };
    return;
  }
  return ctx.redirect(url, status);
}

/**
 * formate referer
 * @param {Context} ctx
 * @param {String} pathname - login path or logout path
 * @param {String} rootPath
 * @return {String}
 *
 * @api private
 */

function formatReferer(ctx, pathname, rootPath) {
  var query = ctx.query;
  var referer = query.redirect || ctx.get('referer') || rootPath;
  if (referer[0] !== '/') {
    // ignore protocol://xxx/abc
    referer = rootPath;
  } else if (referer.indexOf(pathname) === 0) {
    // referer start with loginPath or logoutPath, just redirect to rootPath
    referer = rootPath;
  }
  return referer;
}

/**
 * return a loginHandler
 * @param {Object} options
 * @return {Function}
 */

function login(options) {
  var defaultHost = options.host;
  return async function loginHandler() {
    var loginCallbackPath = options.loginCallbackPath;
    var loginPath = options.loginPath;
    // this.session should be exists
    if (this.session) {
      this.session.userauthLoginReferer = formatReferer(this, loginPath, options.rootPath);
      debug('set loginReferer into session: %s', this.session.userauthLoginReferer);
    }

    var host = defaultHost || this.host;
    var protocol = options.protocol || this.protocol;
    var currentURL = protocol + '://' + host + loginCallbackPath;
    var loginURL = options.loginURLFormatter(currentURL, options.rootPath, this);
    debug('login redrect to loginURL: %s', loginURL);
    redirect(this, loginURL);
  };
}

/**
 * return a loginCallbackHandler
 * @param {Object} options
 * @return {Function}
 */

function loginCallback(options) {
  return async function loginCallbackHandler() {
    var referer = this.session.userauthLoginReferer || options.rootPath;
    debug('loginReferer in session: %j', this.session.userauthLoginReferer);
    var user = this.session[options.userField];
    if (user) {
      // already login
      return redirect(this, referer);
    }
    user = await options.getUser(this);
    if (!user) {
      return redirect(this, referer);
    }

    var res = await options.loginCallback(this, user);
    var loginUser = res[0];
    var redirectURL = res[1];
    this.session[options.userField] = loginUser;
    if (redirectURL) {
      referer = redirectURL;
    }
    redirect(this, referer);
  };
}

/**
 * return a logoutHandler
 * @param {Object} options
 * @return {Function}
 */

function logout(options) {
  return async function logoutHandler() {
    var referer = formatReferer(this, options.logoutPath, options.rootPath);
    var user = this.session[options.userField];
    if (!user) {
      return redirect(this, referer);
    }

    var redirectURL = await options.logoutCallback(this, user);

    this.session[options.userField] = null;
    if (redirectURL) {
      referer = redirectURL;
    }
    redirect(this, referer);
  };
}
