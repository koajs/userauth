TESTS = test/*.test.js
REPORTER = tap
TIMEOUT = 3000
MOCHA_OPTS =
REGISTRY = --registry=http://r.cnpmjs.org

install:
	@npm install $(REGISTRY) \
		--disturl=http://dist.cnpmjs.org

jshint: install
	@-./node_modules/.bin/jshint ./

test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--harmony-generators \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		--require should \
		$(MOCHA_OPTS) \
		$(TESTS)

test-cov:
	@NODE_ENV=test node --harmony \
		node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha \
		-- -u exports \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		--require should \
		$(MOCHA_OPTS) \
		$(TESTS)

test-travis:
	@NODE_ENV=test node --harmony \
		node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha \
		--report lcovonly \
		-- -u exports \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		--require should \
		$(MOCHA_OPTS) \
		$(TESTS)

autod:
	@./node_modules/.bin/autod $(REGISTRY) -w --prefix="~" -k should
	@$(MAKE) install

.PHONY: test test-all
