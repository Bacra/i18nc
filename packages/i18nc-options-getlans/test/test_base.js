'use strict';

const expect = require('expect.js');
const getlans = require('./i18n_getlans');
const Domain = require('domain');

describe('#base', function() {
	it('#webCookeAndProcssDomian', function() {
		const dm = Domain.create();
		dm.run(function() {
			dm.__i18n_lan__ = 'zh-tw,cht';
			const cache = {};
			expect(getlans.webCookeAndProcssDomian(cache)).to.be('zh-tw,cht');
			expect(cache.p).to.be(1);
			expect(getlans.webCookeAndProcssDomian(cache)).to.be('zh-tw,cht');
		});
	});

	it('#webNavigatorAndProcessDomain', function() {
		const dm = Domain.create();
		dm.run(function() {
			dm.__i18n_lan__ = 'zh-tw,cht';
			const cache = {};
			expect(getlans.webNavigatorAndProcessDomain(cache)).to.be(
				'zh-tw,cht'
			);
			expect(cache.p).to.be(1);
			expect(getlans.webNavigatorAndProcessDomain(cache)).to.be(
				'zh-tw,cht'
			);
		});
	});
});
