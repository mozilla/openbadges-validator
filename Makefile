tests := $(shell ls test/*.test.js)
cover-each = $(notdir $(tests))

test-cov: $(cover-each)
	@sleep 1 # combine doesn't seem to get all the runs without this
	@cover combine
	@cover report html

$(cover-each):
	@cover run test/$@

clean:
	rm -rf cover_html
	rm -rf .coverage_data