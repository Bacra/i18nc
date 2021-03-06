'use strict';

const _ = require('lodash');
const debug = require('debug')('i18nc-core:i18n_placeholder');
const DEF = require('./def');
const emitter = require('./emitter');
const astUtil = require('i18nc-ast').util;
const i18ncDB = require('i18nc-db');
const jsoncode = require('i18nc-jsoncode');
const i18nTpl = require('./i18n_func/render');
const i18nParser = require('./i18n_func/parser');
const LanguageVarsReg = /\$LanguageVars\.([\w$]+)\$/g;

exports.I18NPlaceholder = I18NPlaceholder;

// ast 解析的时候，必须要有range
function I18NPlaceholder(
	codeTranslateWords,
	completedCode,
	options,
	originalAst
) {
	this.codeTranslateWords = codeTranslateWords;
	this.completedCode = completedCode;
	this.options = options;
	this.originalAst = originalAst;

	this.renderType = null;
	this.handlerName = null;
	this._parseResult = null;
}

_.extend(I18NPlaceholder.prototype, {
	toString: function() {
		const options = this.options;
		const renderType = this.getRenderType();
		debug('renderType:%s', renderType);

		switch (renderType) {
			case 'partial':
				return this._updatePartialCode();

			case 'original':
				return this.originalAst ? this._keepOldCode() : '';

			case 'empty':
				return '';

			case 'simple':
				return this._updateSimpleFunctionCode();

			case 'complete':
			default: {
				let newCode = this._updateTotalCode();
				// 如果没有originalAst，表明是新的code，那么就多添加两个换行吧
				if (!this.originalAst) {
					newCode =
						'\n' +
						options.I18NHandler.tpl.newHeaderCode +
						newCode +
						options.I18NHandler.tpl.newFooterCode +
						'\n';
				}

				return newCode;
			}
		}
	},
	getRenderType: function() {
		const options = this.options;
		if (this.renderType) return this.renderType;
		if (this.originalAst && !options.I18NHandler.upgrade.enable) {
			return 'original';
		}

		const funcInfo = this.parse();
		if (funcInfo.isNotI18NHandler) {
			// 判断是否不需要插入新的i18n函数，直接使用原来代码
			const codeTranslateWords = this.codeTranslateWords || {};
			const defaults_length =
				codeTranslateWords.DEFAULTS &&
				codeTranslateWords.DEFAULTS.length;
			const subkeys_length =
				codeTranslateWords.SUBKEYS &&
				Object.keys(codeTranslateWords.SUBKEYS).length;

			if (!defaults_length && !subkeys_length) {
				debug('ignore generate I18NHandler');
				return 'original';
			}
		} else {
			const I18NHandlerConfig = options.I18NHandler;
			const I18NHandlerStyleConfig = I18NHandlerConfig.style;
			const proxyGlobalHandlerConfig =
				I18NHandlerStyleConfig.proxyGlobalHandler;
			const fullHandlerConfig = I18NHandlerStyleConfig.fullHandler;
			const FUNCTION_VERSION = funcInfo.__FUNCTION_VERSION__ || '';
			// 只更新翻译数据
			// 值为true，则此项安全，可以进行局部更新
			const checkPartialItems = {
				options: I18NHandlerConfig.upgrade.partial,
				originalAst: this.originalAst,
				translateJSON: funcInfo.__TRANSLATE_JSON__ast,
				handlerName:
					!this.handlerName ||
					funcInfo.handlerName == this.handlerName,
				I18NFunctionVersion:
					!I18NHandlerConfig.upgrade.checkVersion ||
					FUNCTION_VERSION[0] == DEF.I18NFunctionVersion,

				// 代码风格判断
				fullHandler:
					fullHandlerConfig.keepThisStyle ||
					FUNCTION_VERSION[1] != DEF.I18NFunctionSubVersion.FULL,
				proxyGlobalHandler:
					proxyGlobalHandlerConfig.keepThisStyle ||
					FUNCTION_VERSION[1] != DEF.I18NFunctionSubVersion.GLOBAL,
				proxyGlobalHandlerName: !(
					proxyGlobalHandlerConfig.ignoreFuncCodeName &&
					funcInfo.globalHandlerName &&
					funcInfo.globalHandlerName != proxyGlobalHandlerConfig.name
				)
			};
			const ret = _.some(checkPartialItems, function(val, name) {
				if (val) return false;

				switch (name) {
					case 'handlerName':
						debug(
							'not partial, because %s <funcInfo:%s, this:%s>',
							name,
							funcInfo.handlerName,
							this.handlerName
						);
						break;

					case 'I18NFunctionVersion':
						debug(
							'not partial, because %s <funcInfo:%s DEF:%s>',
							name,
							funcInfo.__FUNCTION_VERSION__,
							DEF.I18NFunctionVersion
						);
						break;

					case 'proxyGlobalHandlerName':
						debug(
							'not partial, because %s <funcInfo:%s option:%s>',
							name,
							funcInfo.globalHandlerName,
							proxyGlobalHandlerConfig.name
						);
						break;

					default:
						debug('not partial, because %s: %o', name, val);
				}

				return true;
			});

			if (!ret) return 'partial';
		}

		return 'complete';
	},
	parse: function() {
		const options = this.options;
		if (!this._parseResult) {
			if (this.originalAst) {
				this._parseResult = i18nParser.parse(this.originalAst, options);
				// 处理解析出来的handler
				// this._parseResult.handlerName = this.originalAst.id && this.originalAst.id.name;
			}

			if (!this._parseResult || !this._parseResult.__FILE_KEY__) {
				this._parseResult = _.extend(
					{
						handlerName: options.I18NHandlerName,
						__FILE_KEY__: options.I18NHandler.data.defaultFileKey,
						__FUNCTION_VERSION__: DEF.I18NFunctionVersion,
						__TRANSLATE_JSON__: {}
					},
					this._parseResult,
					{
						isNotI18NHandler: true
					}
				);
			}
		}

		return this._parseResult;
	},
	getTranslateJSON: function() {
		const options = this.options;
		const funcInfo = this.parse();
		const ignoreFuncWords = options.I18NHandler.data.ignoreFuncWords;

		const info = {
			FILE_KEY: funcInfo.__FILE_KEY__,
			onlyTheseLanguages: options.I18NHandler.data.onlyTheseLanguages,
			funcTranslateWords: ignoreFuncWords
				? null
				: funcInfo.__TRANSLATE_JSON__,
			dbTranslateWords: options.dbTranslateWords,
			codeTranslateWords: this.codeTranslateWords
		};

		return i18ncDB.mergeTranslateData(info);
	},
	_getRenderTranslateJSONCode: function() {
		const options = this.options;
		if (options.I18NHandler.upgrade.updateJSON) {
			return this._getNewRenderTranslateJSONCode();
		} else {
			return this._getOldRenderTranslateJSONCode();
		}
	},
	_getOldRenderTranslateJSONCode: function() {
		const funcInfo = this.parse();

		if (funcInfo.__TRANSLATE_JSON__ast) {
			const range = funcInfo.__TRANSLATE_JSON__ast.range;
			let code = this.completedCode.slice(range[0], range[1]);

			// 需要去掉原来的缩进，后面的逻辑会重新计算缩进
			const codeArr = code.split('\n');
			if (codeArr.length > 1) {
				let rmBlank = codeArr[codeArr.length - 1].match(/^\s+/);
				debug('rmBlank:%o', rmBlank);
				if (rmBlank) {
					rmBlank = rmBlank[0];
					const rmBlankLen = rmBlank.length;
					code = codeArr
						.map(function(str) {
							return str.substr(0, rmBlankLen) == rmBlank
								? str.substr(rmBlankLen)
								: str;
						})
						.join('\n');
				}
			}

			return code;
		}

		return '{}';
	},
	_getNewRenderTranslateJSONCode: function() {
		const options = this.options;
		const myI18NGenerator = jsoncode.getGenerator(
			this.getRenderType() != 'complete' &&
				this.parse().__FUNCTION_VERSION__
		);
		const translateJSON = myI18NGenerator.toTranslateJSON(
			this.getTranslateJSON()
		);
		if (options.I18NHandler.style.comment4nowords) {
			myI18NGenerator.fillNoUsedCodeTranslateWords(
				translateJSON,
				this.codeTranslateWords,
				options.I18NHandler.data.defaultLanguage
			);
		}
		const translateJSONCode = myI18NGenerator.genTranslateJSONCode(
			translateJSON
		);

		const emitData = {
			result: translateJSONCode,
			options: options,
			original: translateJSONCode,
			originalJSON: translateJSON
		};

		emitter.trigger('newTranslateJSON', emitData);

		return '' + emitData.result;
	},
	_updatePartialCode: function() {
		const options = this.options;
		const funcInfo = this.parse();
		let newJSONCode = this._getRenderTranslateJSONCode();

		// 压缩这个代码的时候，需要加上()
		// 不然esprima会报错
		if (options.I18NHandler.style.minFuncJSON) {
			newJSONCode = astUtil.mincode('(' + newJSONCode + ')').slice(1);
			// 删除添加的)的时候，要考虑到escodegen会多加一个;
			// 所以用一个for循环来删除最后的)
			for (let i = newJSONCode.length; i--; ) {
				if (newJSONCode[i] == ')') {
					newJSONCode = newJSONCode.slice(0, i);
					break;
				}
			}
		}

		newJSONCode = this._beautifyCode(
			newJSONCode,
			funcInfo.__TRANSLATE_JSON__ast
		);

		const json_ast_range = funcInfo.__TRANSLATE_JSON__ast.range;
		const newCode =
			this.completedCode.slice(
				this.originalAst.range[0],
				json_ast_range[0]
			) +
			newJSONCode +
			this.completedCode.slice(
				json_ast_range[1],
				this.originalAst.range[1]
			);

		return newCode;
	},
	_updateTotalCode: function() {
		const options = this.options;
		const isMinCode = options.I18NHandler.style.minFuncCode;
		const funcInfo = this.parse();
		const TRANSLATE_JSON_CODE = this._getRenderTranslateJSONCode();

		// 添加的代码缩进：多一个tab
		// 将这个tab放到了render函数中做
		// TRANSLATE_JSON_CODE = TRANSLATE_JSON_CODE.split('\n').join('\n\t');
		let getLanguageCode = options.I18NHandler.tpl.getLanguageCode;

		if (typeof getLanguageCode == 'function') {
			getLanguageCode = getLanguageCode.toString();
		}
		getLanguageCode = getLanguageCode.trim();

		if (isMinCode) {
			getLanguageCode = i18nTpl.min(
				getLanguageCode.replace(/^function\s*\(/, 'function a(')
			);
		}

		getLanguageCode = getLanguageCode.replace(
			/^function \s*[\w$]+\s*\(/,
			'function('
		);
		if (getLanguageCode.substr(0, 9) == 'function(') {
			getLanguageCode = '(' + getLanguageCode + ')';
		}

		const languageVars = options.I18NHandler.tpl.languageVars || {};
		getLanguageCode = getLanguageCode.replace(LanguageVarsReg, function(
			all,
			name
		) {
			return languageVars[name] || all;
		});

		// 更新整个函数
		const renderData = {
			handlerName:
				this.handlerName ||
				funcInfo.handlerName ||
				options.I18NHandlerName,
			getLanguageCode: getLanguageCode,
			FILE_KEY: funcInfo.__FILE_KEY__,
			FUNCTION_VERSION:
				DEF.I18NFunctionVersion + DEF.I18NFunctionSubVersion.FULL,
			TRANSLATE_JSON_CODE: TRANSLATE_JSON_CODE
		};

		let newCode;
		const I18NHandlerStyleConfig = options.I18NHandler.style;
		const proxyGlobalHandlerConfig =
			I18NHandlerStyleConfig.proxyGlobalHandler;
		const useFullHanlder =
			I18NHandlerStyleConfig.fullHandler.autoConvert &&
			funcInfo.codeStyle == 'fullHandler';
		const useProxyGlobalHandler =
			!useFullHanlder &&
			I18NHandlerStyleConfig.codeStyle == 'proxyGlobalHandler';

		if (
			(proxyGlobalHandlerConfig.autoConvert &&
				funcInfo.codeStyle == 'proxyGlobalHandler') ||
			// 初始化的时候，使用global进行初始化
			(useProxyGlobalHandler && funcInfo.isNotI18NHandler) ||
			// 启动全量更新，同时启动globalHandler
			(useProxyGlobalHandler && !options.I18NHandler.upgrade.partial)
		) {
			renderData.globalHandlerName = proxyGlobalHandlerConfig.ignoreFuncCodeName
				? proxyGlobalHandlerConfig.name
				: funcInfo.globalHandlerName || proxyGlobalHandlerConfig.name;
			renderData.FUNCTION_VERSION =
				DEF.I18NFunctionVersion + DEF.I18NFunctionSubVersion.GLOBAL;

			debug('i18n global function renderdata: %o', renderData);
			newCode = i18nTpl.renderGlobal(renderData, isMinCode);
		} else {
			debug('i18n full fucntion renderdata: %o', renderData);
			newCode = i18nTpl.render(renderData, isMinCode);
		}

		return this._beautifyCode(newCode, this.originalAst);
	},

	_keepOldCode: function() {
		const old_range = this.originalAst.range;
		return this.completedCode.slice(old_range[0], old_range[1]);
	},

	_updateSimpleFunctionCode: function() {
		const options = this.options;
		const isMinCode = options.I18NHandler.style.minFuncCode;
		const funcInfo = this.parse();
		const SIMPLE_VERSION =
			DEF.I18NFunctionVersion + DEF.I18NFunctionSubVersion.SIMPLE;

		if (funcInfo.__FUNCTION_VERSION__ == SIMPLE_VERSION) {
			return this._keepOldCode();
		}

		let newCode = i18nTpl.renderSimple(
			{
				FILE_KEY: funcInfo.__FILE_KEY__,
				FUNCTION_VERSION: SIMPLE_VERSION,
				handlerName:
					this.handlerName ||
					funcInfo.handlerName ||
					options.I18NHandlerName
			},
			isMinCode
		);

		newCode = this._beautifyCode(newCode, this.originalAst);

		return newCode;
	},

	_beautifyCode: function(code, ast) {
		// 获取原来代码锁进
		let codeIndent = '';
		if (ast) {
			codeIndent = astUtil.codeIndent(ast, this.completedCode);
			debug('codeIndent:%s, len:%d', codeIndent, codeIndent.length);
		}

		return code.split('\n').join('\n' + codeIndent);
	}
});
