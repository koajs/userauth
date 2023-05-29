TESTS = test/*.test.js
REPORTER = spec
TIMEOUT = 3000
MOCHA_OPTS =
REGISTRY = --registry=https://registry.npmmirror.com

install:
	@npm install $(REGISTRY)

jshint: install
	@-./node_modules/.bin/jshint ./

test:
	@NODE_ENV=test node \
		./node_modules/mocha/bin/_mocha \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		--require should \
		--require should-http \
		$(MOCHA_OPTS) \
		$(TESTS)

test-cov:
	@NODE_ENV=test node_modules/.bin/istanbul cover ./node_modules/mocha/bin/_mocha \
		-- -u exports \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		--require should \
		--require should-http \
		$(MOCHA_OPTS) \
		$(TESTS)

.PHONY: test test-all
