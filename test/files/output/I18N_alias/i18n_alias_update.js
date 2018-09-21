module.exports = function code()
{
	var result;       // 中文注释
	result = I18NNew('中文0');
	result += I18NNew('中文1')+1;

	var c5 = {
		'中文key in object': I18NNew('中文val in object'),
	};
	c5[I18NNew('中文key')] = I18NNew('中文val');
	result += c5[I18NNew('中文key')];

	function print(msg) {
		return I18NNew('print信息，') + msg;
	}

	// 中文注释
	result += print(I18NNew('argv中文'));     // 中文注释

	function switch_print(name)
	{
		switch(name)
		{
			case I18NNew('中文case'):
			result += name;
			break;
		}
	}

	switch_print(I18NNew('中文case'));

	if (I18NNew('中文if'))
	{
		result += true ? I18NNew('中午true') : I18NNew('中文false')
	}

	I18NNew('中文I18N');
	I18NNew('中文I18N subtype', 'subtype');

	// I18N
	function I18NNew(msg, tpldata, subtype)
	{
		var self = I18NNew,
			data = self.$ || (self.$ = {}),
			translateJSON,
			replace_index = 0,
			lanIndexArr, i, lanIndex, msgResult, translateValues,
			LAN = (function(cache) {
				if (!cache.global) {
					cache.global = (typeof window == 'object' && window)
						|| (typeof global == 'object' && global)
						|| {};
				}
			
				return cache.global.__i18n_lan__;
			})(data);
	
		if (!tpldata || !tpldata.join) {
			subtype = tpldata;
			tpldata = [];
		}
	
		if (LAN && LAN.split) {
			if (self.L != LAN) {
				self.K = '*';
				self.V = 'Gf';
				self.D = {
					'$': [],
					'*': {
						// 'argv中文':
						// 'print信息，':
						// '中午true':
						// '中文0':
						// '中文1':
						// '中文I18N':
						// '中文case':
						// '中文false':
						// '中文if':
						// '中文key':
						// '中文val':
						// '中文val in object':
						// '简体':
					},
					'subtype': {
						// 'I18N(中文)':
						// '中文I18N subtype':
					},
					'subtype2': {
						// 'I18N(中文)':
					}
				};
				translateJSON = self.D;
	
				var dblans = translateJSON.$,
					dblansMap = {},
					lanKeys = LAN.split(',');
				lanIndexArr = self.M = [];
				for(i = dblans.length; i--;) dblansMap[dblans[i]] = i;
				for(i = lanKeys.length; i--;) {
					lanIndex = dblansMap[lanKeys[i]];
					if (lanIndex || lanIndex === 0) lanIndexArr.push(lanIndex);
				}
				self.L = LAN;
			}
	
			lanIndexArr = self.M;
			translateJSON = self.D;
			var _getVaule = function(subtype) {
				translateValues = translateJSON[subtype] && translateJSON[subtype][msg];
				if (translateValues) {
					msgResult = translateValues[lanIndex];
					if (typeof msgResult == 'number') msgResult = translateValues[msgResult];
				}
			};
			for(i = lanIndexArr.length; !msgResult && i--;) {
				lanIndex = lanIndexArr[i];
				if (subtype) _getVaule(subtype);
				if (!msgResult) _getVaule('*');
			}
	
			if (msgResult) msg = msgResult;
		}
	
		msg += '';
		if (!tpldata.length || msg.indexOf('%') == -1) return msg;
	
		return msg.replace(/%s|%\{.+?\}/g, function(all) {
			var newVal = tpldata[replace_index++];
			return newVal === undefined ? all : newVal === null ? '' : newVal;
		});
	}

	result += I18NNew('I18N(中文)', 'subtype');
	result += I18NNew('I18N(中文)', 'subtype2');
	result += I18NNew('简体');

	return result;
}
