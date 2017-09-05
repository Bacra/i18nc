var debug			= require('debug')('i18nc:emitter');
var EventEmitter	= require('events').EventEmitter;

/**
 * [Event List]
 * 
 * loadTranslateJSON
 * 		获取 emitData.ast 作为返回值
 * 
 * newTranslateJSON
 * 		获取 emitData.newTranslateJSONCode 作为返回值
 * 
 * cutword
 * 		获取 emitData.words 作为返回值
 */

var emitter = exports.emitter = new EventEmitter;

exports.proxy = function(obj)
{
	// 注意:
	// 不提供prependXXX once这些方法
	// 设计的时候，忽略添加的先后顺序
	// once容易出错，毕竟有scope等情况，容易导成误解
	[
		'on', 'addListener',
		'removeListener', 'removeAllListeners',
		'eventNames',
		'emit',
		'setMaxListeners', 'listenerCount', 'getMaxListeners'
	]
	.forEach(function(name)
	{
		var handler = emitter[name];
		if (typeof handler == 'function')
		{
			obj[name] = handler.bind(emitter);
		}
		else
		{
			debug('handler is not function:%s', name);
		}
	});


	obj.off = function(eventName, handler)
	{
		if (handler)
		{
			return emitter.removeListener.apply(emitter, arguments);
		}
		else
		{
			return emitter.removeAllListeners.apply(emitter, arguments);
		}
	};
}