'use strict';

const debug = require('debug')('koa-userauth');
const path = require('path');
const is = require('is-type-of');
const copy = require('copy-to');
const urlparse = require('url').parse;
const route = require('path-match')({
  end: false,
  strict: false,
  sensitive: false
});

const defaultOptions = {
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
      const rootPath = options.rootPath.replace(/\/+$/, '');
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

  const match = options.match;
  const ignore = options.ignore;

  // need login checker
  let needLogin;

  if (is.string(match)) {
    needLogin = route(match);
  } else if (is.regExp(match)) {
    needLogin = path => match.test(path);
  } else if (is.function(match)) {
    needLogin = match;
  }

  if (!is.function(needLogin)) {
    if (is.string(ignore)) {
      const pathMatch = route(ignore);
      needLogin = path => !pathMatch(path);
    } else if (is.regExp(ignore)) {
      needLogin = path => !(path && path.match(ignore));
    } else if (is.function(ignore)) {
      needLogin = (path, context) => !ignore(path, context);
    } else {
      // ignore all
      needLogin = function () {};
      debug('ignore all paths');
    }
  }

  options.loginCallback = options.loginCallback || defaultLoginCallback;
  options.logoutCallback = options.logoutCallback || defaultLogoutCallback;
  options.loginCheck = options.loginCheck || defaultLoginCheck;

  const loginHandler = login(options);
  const loginCallbackHandler = loginCallback(options);
  const logoutHandler = logout(options);

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
    const loginRequired = !!needLogin(ctx.path, ctx);
    debug('url: %s, path: %s, loginPath: %s, session exists: %s, login required: %s',
      ctx.url, ctx.path, options.loginPath, !!ctx.session, loginRequired);

    if (!ctx.session || !ctx.session[options.userField]) {
      debug('ctx.session not exists');
      // ignore not match path
      if (!loginRequired) {
        debug('not match needLogin path, %j', ctx.path);
        return next();
      }
      debug('relogin again');
      return loginHandler(ctx);
    }

    // get login path
    if (ctx.path === options.loginPath) {
      debug('match login path');
      return loginHandler(ctx);
    }

    // get login callback
    if (ctx.path === options.loginCallbackPath) {
      debug('match login clalback path');
      return loginCallbackHandler(ctx);
    }

    // get logout
    if (ctx.path === options.logoutPath) {
      debug('match logout path');
      return logoutHandler(ctx);
    }

    // ignore not match path
    if (!loginRequired) {
      debug('ignore %j', ctx.path);
      return next();
    }

    if (ctx.session[options.userField]
      && options.loginCheck(ctx)) {
      // 4. user logined, next() handler
      debug('already logined');
      return next();
    }

    // try to getUser directly
    let user;
    try {
      user = await options.getUser(ctx);
    } catch (err) {
      console.error('[koa-userauth] options.getUser error: %s', err.stack);
    }

    if (!user) {
      debug('can not get user');

      // make next handle an Async Function
      // so it can use await next in redirectHandle
      const nextHandler = async function () {
        let redirectURL = ctx.url;
        try {
          redirectURL = encodeURIComponent(redirectURL);
        } catch (e) {
          // URIError: URI malformed
          // use source url
        }
        const loginURL = options.loginPath + '?redirect=' + redirectURL;
        debug('redirect to %s', loginURL);
        redirect(ctx, loginURL);
      };

      return options.redirectHandler(ctx, nextHandler, next);
    }

    debug('get user directly');
    const res = await options.loginCallback(ctx, user);
    debug('get user directly: ', res);
    const loginUser = res[0];
    const redirectURL = res[1];
    ctx.session[options.userField] = loginUser;
    if (redirectURL) {
      return redirect(ctx, redirectURL);
    }
    return next();
  };
};

function defaultRedirectHandler(ctx, nextHandler, next) {
  return nextHandler();
}

/* istanbul ignore next */
async function defaultLoginCallback(ctx, user) {
  return [user, null];
}

/* istanbul ignore next */
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
  const query = ctx.query;
  let referer = query.redirect || ctx.get('referer') || rootPath;
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
  const defaultHost = options.host;
  return async function loginHandler(ctx) {
    const loginCallbackPath = options.loginCallbackPath;
    const loginPath = options.loginPath;
    // ctx.session should be exists
    if (ctx.session) {
      ctx.session.userauthLoginReferer = formatReferer(ctx, loginPath, options.rootPath);
      debug('set loginReferer into session: %s', ctx.session.userauthLoginReferer);
    }

    const host = defaultHost || ctx.host;
    const protocol = options.protocol || ctx.protocol;
    const currentURL = protocol + '://' + host + loginCallbackPath;
    const loginURL = options.loginURLFormatter(currentURL, options.rootPath, ctx);
    debug('login redrect to loginURL: %s', loginURL);
    redirect(ctx, loginURL);
  };
}

/**
 * return a loginCallbackHandler
 * @param {Object} options
 * @return {Function}
 */

function loginCallback(options) {
  return async function loginCallbackHandler(ctx) {
    let referer = ctx.session.userauthLoginReferer || options.rootPath;
    debug('loginReferer in session: %j', ctx.session.userauthLoginReferer);
    // cleanup the userauthLoginReferer on session
    ctx.session.userauthLoginReferer = undefined;
    let user = ctx.session[options.userField];
    if (user) {
      // already login
      return redirect(ctx, referer);
    }
    user = await options.getUser(ctx);
    if (!user) {
      return redirect(ctx, referer);
    }

    const res = await options.loginCallback(ctx, user);
    const loginUser = res[0];
    const redirectURL = res[1];
    ctx.session[options.userField] = loginUser;
    if (redirectURL) {
      referer = redirectURL;
    }
    redirect(ctx, referer);
  };
}

/**
 * return a logoutHandler
 * @param {Object} options
 * @return {Function}
 */

function logout(options) {
  return async function logoutHandler(ctx) {
    let referer = formatReferer(ctx, options.logoutPath, options.rootPath);
    const user = ctx.session[options.userField];
    if (!user) {
      return redirect(ctx, referer);
    }

    const redirectURL = await options.logoutCallback(ctx, user);

    ctx.session[options.userField] = null;
    if (redirectURL) {
      referer = redirectURL;
    }
    redirect(ctx, referer);
  };
}
