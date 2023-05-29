
2.2.0 / 2023-05-29
==================

**others**
  * [[`fd9e7a9`](http://github.com/koajs/userauth/commit/fd9e7a92d4284219e6a455a506c92959637a5bee)] - deps: use ^ instead of ~ (#42) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`6d848cb`](http://github.com/koajs/userauth/commit/6d848cbdea4e8fb7dfe50418e009c120bdd1cab9)] - chore: fix typos & drop legacy workaround (#38) (Chen Yangjian <<252317+cyjake@users.noreply.github.com>>)

2.1.0 / 2018-11-15
==================

**features**
  * [[`dcbdb0a`](http://github.com/koajs/userauth/commit/dcbdb0a6356253a52bb5a2b27571b28b873b351f)] - feat: support options.getRedirectTarget (#37) (Yiyu He <<dead_horse@qq.com>>)

**fixes**
  * [[`f79d431`](http://github.com/koajs/userauth/commit/f79d43107381dbafe14e0681df0dd6c474cae08d)] - fix: should cleanup userauthLoginReferer on session (#33) (fengmk2 <<fengmk2@gmail.com>>),

2.0.1 / 2018-04-12
==================

**features**
  * [[`e4dc3fc`](http://github.com/koajs/userauth/commit/e4dc3fc828f47a08ff85025694402884b0568831)] - feat: support koa2 (#32) (Hengfei Zhuang <<zhuanghengfei@gmail.com>>)

**fixes**
  * [[`f79d431`](http://github.com/koajs/userauth/commit/f79d43107381dbafe14e0681df0dd6c474cae08d)] - fix: should cleanup userauthLoginReferer on session (#33) (fengmk2 <<fengmk2@gmail.com>>)

1.4.3 / 2017-10-19
==================

**fixes**
  * [[`891720f`](http://github.com/koajs/userauth/commit/891720f86348d1a8470926c6b3c416d9a3b5b53a)] - fix: use prefix match on referer detect (#30) (fengmk2 <<fengmk2@gmail.com>>)

1.4.2 / 2017-08-25
==================

**fixes**
  * [[`4074ec8`](http://github.com/koajs/userauth/commit/4074ec88bce1c22fc73be0737633144535f910bf)] - fix: support custom rootPaht on Windows (#29) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`1a17fbb`](http://github.com/koajs/userauth/commit/1a17fbb7f8adc4c7ffae1b2862156186d6ecf41d)] - docs: mention koa-session (#26) (Evgeny <<mahnunchik@gmail.com>>)

1.4.1 / 2017-07-25
==================

  * fix: package.json to reduce vulnerabilities (#25)

1.4.0 / 2017-02-15
==================

  * feat: add next parameter to redirectHandler (#21)

1.3.1 / 2017-02-14
==================

  * fix: request twice when ignore is reg (#20)

1.3.0 / 2016-10-28
==================

  * feat: loginURLFormatter support context (#19)

1.2.3 / 2016-03-22
==================

  * fix: add context parameter to ignore

1.2.2 / 2015-12-08
==================

 * test: add https protocol test case
 * fix: auto detect protocol from ctx

1.2.1 / 2015-07-16
==================

  * fix typo

1.2.0 / 2015-05-21
==================

  * feat: add ctx in needLogin

1.1.5 / 2015-05-12
==================

 * deps: upgrade copy-to

1.1.4 / 2015-04-26
==================

  * deps: upgrade debug to the latest

1.1.3 / 2014-12-15
==================

  * Merge pull request #5 from koajs/cookie-session-hotfix
  * fix: koa-session don't support key start with '_'

1.1.2 / 2014-10-14
==================

  * fix typo, fix #3

1.1.1 / 2014-09-26
==================

  * Merge pull request #2 from koajs/refactor
  * compatibility: userauth("", options) and improve ctx.session not exists case

1.1.0 / 2014-09-23
==================

  * support options.ignore

1.0.0 / 2014-09-08
==================

  * update badges
  * bump dependencies

0.0.1 / 2014-04-17
==================

  * update readme
  * koa userauth
  * Initial commit
