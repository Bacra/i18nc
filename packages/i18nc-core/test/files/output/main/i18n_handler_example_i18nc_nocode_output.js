module.exports = function I18N(msg, tpldata, subtype)
{
	if (!msg) return msg === undefined || msg === null ? '' : '' + msg;

	var self = I18N,
		data = self.$ || (self.$ = {}),
		translateJSON,
		replace_index = 0,
		options = {},
		lanIndexArr, i, lanIndex, msgResult, translateValues;

	if (!tpldata || !tpldata.join) {
		subtype = tpldata;
		tpldata = [];
	}
	if (subtype && typeof subtype == 'object') {
		options = subtype;
		subtype = options.subtype;
	}

	var LAN = options.language || (function(){return global.__i18n_lan__})(data);

	if (LAN && LAN.split) {
		if (self.L != LAN) {
			self.K = 'i18n_handler_example';
			self.V = 'Kf';
			self.D = {};
			translateJSON = self.D;

			var dblans = translateJSON.$ || [],
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

	return msg.replace(/%\{(\d+)\}/g, function(all, index) {
			var newVal = tpldata[+index];
			return newVal === undefined ? '' : newVal;
		})
		.replace(/%s|%p|%\{.+?\}/g, function() {
			var newVal = tpldata[replace_index++];
			return newVal === undefined ? '' : newVal;
		});
}
