module.exports = function code()
{


	/* eslint-disable */
	function I18N(msg)
	{
		var self = I18N;
		var data = self.$;

		if (!data) {
			data = self.$ = {};
			self.K = '*';
			self.V = 'Gg';
			self.D = {
				'$': [],
				'*': {
					// '中文':
					// '中文2':
				}
			};
		}

		return ''+topI18N(msg, arguments, self.D, self.K, data, self);
	}
	/* eslint-enable */



	var word = I18N('中文');
	consol.log(word, I18N('中文2'));
}
