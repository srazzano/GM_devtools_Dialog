// ==UserScript==
// @name        GM_devtools_Dialog
// @id          GM_devtools_Dialog
// @version     1.0.0
// @description Settings dialog
// @author      Ryan Chatham (https://github.com/cletusc/), reposted by Sonny Razzano
// @namespace   srazzano
// @include     *
// @license     CC-NC-SA; http://creativecommons.org/licenses/by-nc-sa/3.0/
// @icon        https://cloud.githubusercontent.com/assets/6841810/4498687/700b33e2-4a7a-11e4-9e0f-a1f2004f19a6.png
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

  function $(q, root, single, context) {
    root = root || document;
    context = context || root;
    if (q[0] == '#') return root.getElementById(q.substr(1));
    if (q.match(/^[\/*]|^\.[\/\.]/)) {
      if (single) return root.evaluate(q, context, null, 9, null) .singleNodeValue;
      var arr = [], xpr = root.evaluate(q, context, null, 7, null);
      for (var i = 0; i < xpr.snapshotLength; i++) arr.push(xpr.snapshotItem(i));
      return arr;
    }
    if (q[0] == '.') {
      if (single) return root.getElementsByClassName(q.substr(1)) [0];
      return root.getElementsByClassName(q.substr(1));
    }
    if (single) return root.getElementsByTagName(q) [0];
    return root.getElementsByTagName(q);
  }

  function $c(type, props, evls) {
    var node = document.createElement(type);
    if (props && typeof props == 'object') {
      for (prop in props) {
        if (typeof node[prop] == 'undefined') node.setAttribute(prop, props[prop]);
        else node[prop] = props[prop];
    } }
    if (evls instanceof Array) {
      for (var i = 0; i < evls.length; i++) {
        var evl = evls[i];
        if (typeof evl.type == 'string' && typeof evl.fn == 'function') node.addEventListener(evl.type, evl.fn, false);
    } }
    return node;
  }

  function toCustStr(num) {
    return num.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
  }

  String.prototype.toCustNum = function () {
    return parseInt(this.replace(/,|-|\./g, ''));
  }
  
  function insertAfter(newNode, refNode) {
    if (refNode.nextSibling) return refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
    else return refNode.parentNode.appendChild(newNode);
  }

  function remove(node) {
    if (node) node.parentNode.removeChild(node);
  }

  function ucFirst(str) {
    var firstLetter = str.slice(0, 1);
    return firstLetter.toUpperCase() + str.substring(1);
  }

  function capAll(str) { 
    var words = str.toLowerCase().split(' '); 
    for (var i = 0; i < words.length; i++) { 
      var wd = words[i], first = wd.substr(0, 1), rest = wd.substr(1, wd.length - 1);
      words[i] = first.toUpperCase() + rest;
    } 
    return words.join(' '); 
  }

  if (typeof devtools == 'undefined') var devtools = {};
	
  if (typeof devtools.JSON == 'undefined') {
	  devtools.JSON = {};
	  devtools.JSON.stringify = function (obj) {
		  obj = JSON.stringify(obj);
		  return obj.replace(/"/g, '!~dq~!').replace(/'/g, '!~sq~!');
	  };
	  devtools.JSON.parse = function (str) {
		  str = str.replace(/!~dq~!/g, '"').replace(/!~sq~!/g, "'");
		  return JSON.parse(str);
	  };
  }
	
  devtools.dialog = {
	  open: function (options, id) {
		  this.__setVars(options);
		  if (!id) id = (new Date()).getTime() + '-' + Math.floor(Math.random() * 100001);
		  this.__var.lastDialogId = id;
		  var wrapper = document.getElementById('devtools-wrapper');
		  if (!wrapper) {
			  wrapper = document.createElement('div');
			  wrapper.id = 'devtools-wrapper';
			  wrapper.innerHTML = '\
<div class="grid">\
<div id="devtools-cell-topleft" class="dialog-wrapper top left"><div><div></div></div></div>\
<div id="devtools-cell-top" class="dialog-wrapper top"><div><div></div></div></div>\
<div id="devtools-cell-topright" class="dialog-wrapper top right"><div><div></div></div></div>\
<div id="devtools-cell-left" class="dialog-wrapper left"><div><div></div></div></div>\
<div id="devtools-cell-center" class="dialog-wrapper center"><div><div></div></div></div>\
<div id="devtools-cell-right" class="dialog-wrapper right"><div><div></div></div></div>\
<div id="devtools-cell-bottomleft" class="dialog-wrapper bottom left"><div><div></div></div></div>\
<div id="devtools-cell-bottom" class="dialog-wrapper bottom"><div><div></div></div></div>\
<div id="devtools-cell-bottomright" class="dialog-wrapper bottom right"><div><div></div></div></div>\
</div>';
        document.body.appendChild(wrapper);
			  wrapper = document.getElementById('devtools-wrapper');
			  this.__handleHooks();
		  }
		  wrapper.className = (this.__setting.mask) ? 'mask' : '';
		  var dialog = document.getElementById('devtools-dialog-' + id);
		  if (!dialog || dialog.parentNode.parentNode.parentNode.id !== 'devtools-cell-' + this.__setting.location.replace('-', '')) {
			  if (dialog) dialog.parentNode.removeChild(dialog);
			  dialog = document.createElement('div');
			  dialog.id = 'devtools-dialog-' + id;
			  dialog.className = 'dialog' + ((this.__setting.class && this.__setting.class != '') ? ' ' + this.__setting.class : '');
			  dialog.innerHTML = '\
<div class="dialog-close"><span>X</span></div>\
<div class="dialog-title"><span></span></div>\
<div class="dialog-content"></div>\
<div class="dialog-footer"></div>';
			  wrapper.querySelector('#devtools-cell-' + this.__setting.location.replace('-', '') + ' > div > div').appendChild(dialog);
			  dialog = document.getElementById('devtools-dialog-' + id);
			  dialog.querySelector('.dialog-close').addEventListener('click', function () {
				  devtools.dialog.close(this.parentNode.getAttribute('id').replace(/^devtools-dialog-/, ''));
			  }, false);
		  }
		  dialog.querySelector('.dialog-close').style.display = (this.__setting.closeButton) ? 'block' : 'none';
		  dialog.querySelector('.dialog-title').firstElementChild.textContent = this.__setting.title;
		  dialog.querySelector('.dialog-content').innerHTML = this.__parseTokens(this.__setting.message);
		  dialog.querySelector('.dialog-footer').textContent = '';
		  var button, buttonImg, i;
		  for (i = 0; i < this.__setting.buttons.length; i++) {
			  button = document.createElement('button');
			  button.textContent = this.__setting.buttons[i].text;
			  button.setAttribute('data-devtools-dialog-button', this.__setting.buttons[i].text);
			  if (this.__setting.buttons[i].icon) {
				  buttonImg = document.createElement('img');
				  buttonImg.setAttribute('src', this.__setting.buttons[i].icon);
				  buttonImg.setAttribute('alt', '');
				  button.insertBefore(buttonImg, button.firstChild);
			  }
			  if (typeof this.__setting.buttons[i].tooltip == 'string') button.setAttribute('title', this.__setting.buttons[i].tooltip);
			  button.addEventListener('click', this.__setting.buttons[i].callback, false);
			  dialog.querySelector('.dialog-footer').appendChild(button);
		  }
		  var style = document.getElementById('devtools-dialog-style');
		  if (!style || style.className != this.__setting.theme) {
			  if (style) style.parentNode.removeChild(style);
			  style = document.createElement('style');
			  style.id = 'devtools-dialog-style';
			  style.className = this.__setting.theme;
			  style.setAttribute('type', 'text/css');
			  style.textContent = this.__themes[this.__setting.theme].finalcss || (this.__themes._base.css + '\n' + this.__themes[this.__setting.theme].css);
			  document.querySelector('head').appendChild(style);
		  }
		  return id;
	  },

	  close: function (id) {
		  if (!id) {
			  if (!this.__var.lastDialogId) return false;
			  id = this.__var.lastDialogId;
		  }
		  var dialog = document.getElementById('devtools-dialog-' + id);
		  if (!dialog) return false;
		  else {
			  dialog.querySelector('.dialog-close').removeEventListener('click', function () {
				  devtools.dialog.close(this.parentNode.getAttribute('id').replace(/^devtools-dialog-/, ''));
			  }, false);
			  var inputs = this.getInputs(id);
			  dialog.parentNode.removeChild(dialog);
		  }
		  if (document.querySelector('div[id*="devtools-dialog-"]') == null) {
			  var wrapper = document.getElementById('devtools-wrapper');
			  wrapper.parentNode.removeChild(wrapper);
			  var styles = document.querySelectorAll('head style[id^="devtools-dialog-theme-"]');
			  for (var i = 0; i < styles.length; i++) styles[i].parentNode.removeChild(styles[i]);
		  }
		  return inputs;
	  },

	  setDefaults: function (options) {
		  this.__userDefaults = {};
		  for (var i in options) {
			  if (this.__defaults.hasOwnProperty(i)) this.__userDefaults[i] = options[i];
		  }
	  },

	  defineToken: function (tag, attributes, replacement) {
		  if (typeof tag != 'string' || /^\w+$/.test(tag) === false) return false;
		  if (typeof this.__tokens[tag] != 'undefined') return false;
		  if (typeof attributes == 'object' && attributes != null) {
			  for (var a in attributes) {
				  if (!attributes.hasOwnProperty(a)) continue;
				  if (typeof attributes[a].validation == 'undefined') return false;
		  } }
		  else attributes = {};
		  if (typeof replacement != 'function' && typeof replacement != 'string') return false;
		  this.__tokens[tag] = {
			  attributes: attributes,
			  replacement: replacement
		  };
		  return true;
	  },

	  defineTheme: function (name, css, base) {
		  if (typeof name != 'string' || typeof css != 'string') return false;
		  if (!/^\w+$/.test(name) || name == 'default') return false;
		  var cssOut = '';
		  var bases = {};
		  var baseTmp = base;
		  if (typeof base == 'string') {
			  for (var i = 0; i < 5; i++) {
				  if (this.__themes[baseTmp] && !bases[baseTmp]) {
					  cssOut = '/* devtools.dialog prerequisite theme: ' + baseTmp + ' */\n' + this.__themes[baseTmp].css + '\n\n' + cssOut;
					  bases[baseTmp] = true;
					  baseTmp = this.__themes[baseTmp].base;
				  }
				  else break;
		  } }
		  else base = null;
		  cssOut = ('/* devtools.dialog base reset */\n' + this.__themes._base.css + "\n\n" + cssOut + '/* devtools.dialog theme: ' + name + ' */\n' + css).replace('%theme%', name);
		  this.__themes[name] = {
			  base: base,
			  finalcss: cssOut,
			  css: css
		  };
		  return true;
	  },

	  defineHook: function (name, func) {
		  if (typeof this.__hooks[name] != 'undefined' || typeof func != 'function') return false;
		  this.__hooks[name] = func;
		  return true;
	  },

	  getInputs: function (id) {
		  if (!id) {
			  if (!this.__var.lastDialogId) return false;
			  id = this.__var.lastDialogId;
		  }
		  var dialog = document.querySelector('#devtools-dialog-' + id);
		  if (dialog) {
			  var out = {}, i, j;
			  var simpleInputs = dialog.querySelectorAll('[data-devtools-input="text"], [data-devtools-input="select"]');
			  for (i = 0; i < simpleInputs.length; i++) out[simpleInputs[i].getAttribute('name')] = simpleInputs[i].value;
			  var checkboxInputs = dialog.querySelectorAll('[data-devtools-input="checkbox"]');
			  for (i = 0; i < checkboxInputs.length; i++) out[checkboxInputs[i].getAttribute('name')] = (checkboxInputs[i].checked) ? true : false;
			  var radioInputs = dialog.querySelectorAll('[data-devtools-input="radio"]');
			  var radios;
			  for (i = 0; i < radioInputs.length; i++) {
				  radios = radioInputs[i].querySelectorAll('input');
				  for (j = 0; j < radios.length; j++) {
					  if (radios[j].checked) {
						  out[radios[j].getAttribute('name').split('-')[0]] = radios[j].value;
						  break;
			  } } }
			  return out;
		  }
		  return false;
	  },

	  __var: {
		  lastDialogId: false
	  },

	  __defaults: {
		  title: 'Script Notification',
		  message: 'This is a dialog from a userscript.',
		  mask: true,
		  closeButton: true,
		  location: 'center',
		  buttons: null,
		  theme: 'default',
		  class: ''
	  },

	  __settingsValidation: {
		  title: ['type', 'string'],
		  message: ['type', 'string'],
		  mask: ['type', 'boolean'],
		  closeButton: ['type', 'boolean'],
		  location: ['match', /^(top-left|top|top-right|left|center|right|bottom-left|bottom|bottom-right)$/],
		  buttons: null,
		  theme: null,
		  class: ['match', /^[\w- ]+$/]
	  },

	  __themes: {
		  '_base': {
			  css: '\
#devtools-wrapper, #devtools-wrapper * {border-radius: 0 !important; box-shadow: none !important; background: transparent !important; border: none !important; border-collapse: separate !important; border-spacing: 0 !important; color: #000 !important; float: none !important; font-family: Arial, sans-serif !important; font-size: 12px !important; font-weight: 400; height: auto !important; letter-spacing: normal !important; line-height: 18px !important; margin: 0 !important; max-height: none !important; max-width: none !important; min-height: 0 !important; min-width: 0 !important; opacity: 1.0 !important; padding: 0 !important; text-align: center !important; text-decoration: none !important; text-shadow: none !important; text-transform: none !important; vertical-align: middle !important; visibility: hidden !important; white-space: normal !important; width: auto !important}\
#devtools-wrapper .dialog-content fieldset > label > input {position:relative; top:0}\
#devtools-wrapper {background-color: rgba(0, 0, 0, 0.8) !important; height: 100% !important; left: 0 !important; overflow: auto !important; position: fixed !important; top: 0 !important; visibility: hidden !important; width: 100% !important; z-index: 2147483640 !important}\
#devtools-wrapper.mask {background-color: rgba(0, 0, 0, 0.8) !important; visibility: visible !important}\
#devtools-wrapper .grid {display :table !important; height: 100% !important; position: fixed !important; visibility: hidden !important; width: 100% !important}\
#devtools-wrapper .center, #devtools-wrapper .top, #devtools-wrapper .bottom, #devtools-wrapper .left, #devtools-wrapper .right {display: table-cell !important; padding: 15px !important}\
#devtools-wrapper .left, #devtools-wrapper .center, #devtools-wrapper .right {vertical-align: middle !important}\
#devtools-wrapper .top {vertical-align: top !important}\
#devtools-wrapper .bottom {vertical-align: bottom !important}\
#devtools-wrapper .left .dialog {clear: both !important; float: left !important}\
#devtools-wrapper .right .dialog {clear: both !important; float: right !important}\
#devtools-wrapper .center .dialog, #devtools-wrapper .bottom .dialog, #devtools-wrapper .top .dialog {margin-left: auto !important; margin-right: auto !important}\
#devtools-wrapper .dialog, #devtools-wrapper .dialog * {visibility: visible !important}\
#devtools-wrapper .dialog fieldset {border: 1px solid #000 !important; margin-bottom: 10px !important; padding: 5px !important}\
#devtools-wrapper .dialog legend {padding: 0 5px !important}\
#devtools-wrapper .dialog input[type="text"] ,#devtools-wrapper input[type="password"], #devtools-wrapper textarea, #devtools-wrapper select {-moz-appearance: none !important; box-sizing: border-box !important; background: #444 !important; border: 1px solid transparent !important; box-sizing: border-box !important; color: #FFF !important}\
#devtools-wrapper .dialog input[type="checkbox"], #devtools-wrapper input[type="radio"] {margin-right: 6px !important; vertical-align: top !important}\
#devtools-wrapper .dialog input[type="radio"] + span {margin-right: 12px !important; vertical-align: middle !important}\
#devtools-wrapper .dialog .progress-bar {box-sizing: border-box !important; background-color: #fff !important; border: 1px solid #000 !important; box-sizing: border-box !important; height: 20px !important; margin-left: auto !important; margin-right: auto !important; overflow: hidden !important; position: relative !important; width: 100% !important}\
#devtools-wrapper .dialog .progress-bar-inner {background-color: #000 !important; height: 100% !important; left: 0 !important; position: absolute !important; top: 0 !important}\
#devtools-wrapper .dialog .progress-bar-text {height: 100% !important; position: relative !important; text-align: center !important; width: 100% !important; z-index: 1 !important}\
#devtools-wrapper .dialog .dialog-content br:first-child, #devtools-wrapper .dialog .dialog-content br:last-child {display: none !important}\
#devtools-wrapper .dialog strong {font-weight: bold !important}\
#devtools-wrapper .dialog em {font-style: italic !important}\
#devtools-wrapper .dialog ins {text-decoration: underline !important}\
#devtools-wrapper .dialog a:link, #devtools-wrapper .dialog a:hover {color: #EE0000 !important; text-decoration: underline !important}\
#devtools-wrapper .dialog a:visited {color: #74198b !important}\
		  '},

		  'default': {
			  css: '\
#devtools-wrapper .dialog {border-radius: 10px !important; box-shadow: 0 0 50px #000 !important; background-color: #eee !important; margin-bottom: 5px !important; margin-top: 5px !important; padding: 4px !important; position: relative !important}\
#devtools-wrapper .dialog .dialog-close span {color: #eee !important; font-size: 18p x!important; font-weight: 700; line-height: 25px !important; vertical-align: middle !important}\
#devtools-wrapper .dialog .dialog-title {border-radius: 5px !important; background-color: #444 !important; color: #eee !important; height: 22px !important; padding: 0 !important; text-align: center !important}\
#devtools-wrapper .dialog .dialog-title span {color: #eee !important; font-size: 14px !important; font-weight: 700}\
#devtools-wrapper .dialog .dialog-footer {text-align: center !important; width: 100% !important}\
#devtools-wrapper .dialog .dialog-footer button {background: linear-gradient(#555, #222) !important; border: 1px solid #333 !important; box-shadow: 0 0 1px #666 inset !important; border-radius: 10px !important; color: #FFF !important; cursor: pointer !important; display: inline-block !important; height: 25px !important; margin-left: 2px !important; margin-right: 2px !important; padding: 2px 5px 1px !important}\
#devtools-wrapper .dialog .dialog-footer button:hover {background: linear-gradient(#222, #555) !important}\
#devtools-wrapper .dialog hr {background-color: #ddd !important; margin:7px 0 !important}\
#devtools-wrapper .dialog fieldset {border-radius: 4px !important; border: 1px solid #aaa !important}\
#devtools-wrapper .dialog label {-moz-box-align: center !important ;display: block !important; font-weight: bold !important}\
#devtools-wrapper .dialog label span {font-weight: normal !important; position: relative !important; top: -3px !important}\
#devtools-wrapper .dialog legend {font-weight: bold !important}\
#devtools-wrapper .dialog input[type="text"], #devtools-wrapper input[type="password"], #devtools-wrapper textarea, #devtools-wrapper select {border-radius: 4px !important; background: #444 !important; border: 1px solid transparent !important; color: #FFF !important}\
#devtools-wrapper .dialog input[type="text"]:focus, #devtools-wrapper input[type="password"]:focus, #devtools-wrapper textarea:focus, #devtools-wrapper select:focus {border: 1px solid #444 !important}\
#devtools-wrapper .dialog input[type="checkbox"] label {display: block !important}\
#devtools-wrapper .dialog .progress-bar {border-radius: 5px !important; background-color: #fafafa !important; border: 1px solid #ddd !important}\
#devtools-wrapper .dialog .progress-bar-inner {border-radius: 5px !important; background-color: #444 !important}\
#devtools-wrapper .dialog .progress-bar-text {text-shadow: #f2f2f2 -1px 0 3px #f2f2f2 0 -1px 3px #f2f2f2 1px 0 3px #f2f2f2 0 1px 3px #f2f2f2 -1px -1px 3px #f2f2f2 1px 1px 3px !important}\
#devtools-wrapper .dialog-content div:nth-child(2) label span {position: relative !important; top: 0 !important}\
#devtools-wrapper .dialog-content > div:nth-child(2) > label > span {position: relative !important; top: -3px !important}\
		  '}
	  },

	  __tokens: {
		  'progressbar': {
			  attributes: {
				  'percent': {
					  defaultValue: '',
					  validation: /^(100|\d{1,2})$/
				  },
				  'calculate': {
					  defaultValue: '',
					  validation: /^\s*\d+\s*\/\s*\d+\s*$/
				  }
			  },
			  replacement: function (tag) {
				  var p;
				  if (tag.attributes.calculate != '') {
					  p = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(tag.attributes.calculate);
					  if (p) {
						  p = (p[1] / p[2]) * 10000;
						  p = Math.round(p) / 100;
					  }
					  else p = 0;
				  }
				  else if (tag.attributes.percent != '') p = tag.attributes.percent;
				  else return false;
				  if (p > 100) p = 100;
				  if (p < 0) p = 0;
				  p += '%';
				  return '<div class="progress-bar"><div class="progress-bar-text">' + p + '</div><div class="progress-bar-inner" style="width: ' + p + ' !important;"></div></div>';
			  }
		  },
		  'input': {
			  attributes: {
				  'type': {
					  validation: /^(text|textarea|radio|checkbox|select|password)$/
				  },
				  'name': {
					  validation: /^\w+$/
				  },
				  'label': {
					  defaultValue: '',
					  validation: false
				  },
				  'options': {
					  defaultValue: '',
					  validation: /^{.+}$/
				  },
				  'defaultValue': {
					  defaultValue: '',
					  validation: false
				  },
				  'hook': {
					  defaultValue: '',
					  validation: /^\w+$/
				  }
			  },
			  replacement: function (tag) {
				  var r = false;
				  switch (tag.attributes.type) {
					  case 'text':
						  r = '<label>' + tag.attributes.label + '<input type="text" name="' + tag.attributes.name + '" value="' + tag.attributes.defaultValue + '" data-devtools-input="text"/></label>';
					    break;
					  case 'password':
						  r = '<label>' + tag.attributes.label + '<input type="password" name="' + tag.attributes.name + '" value="' + tag.attributes.defaultValue + '" data-devtools-input="text"/></label>';
					    break;
					  case 'textarea':
						  r = '<label>' + tag.attributes.label + '<textarea name="' + tag.attributes.name + '" data-devtools-input="text">' + tag.attributes.defaultValue + '</textarea></label>';
					    break;
					  case 'checkbox':
						  r = '<div><label><input type="checkbox" name="' + tag.attributes.name + '"' + ((tag.attributes.defaultValue == 'true') ? ' checked' : '') + ' data-devtools-input="checkbox"/><span>' + tag.attributes.label + '</span></label></div>';
					    break;
					  case 'radio':
						  try {
							  var options = devtools.JSON.parse(tag.attributes.options);
							  var hash = Math.floor(Math.random() * 100000);
							  r = '<div data-devtools-input="radio"><fieldset><legend>' + tag.attributes.label + '</legend>';
							  for (var key in options) {
								  r += '<label><input type="radio" name="' + tag.attributes.name + '-' + hash + '" value="' + options[key] + '"';
								  r += ((tag.attributes.defaultValue == options[key]) ? ' checked' : '') + '/><span>' + key + '</span></label>';
							  }
							  r += '</fieldset></div>';
						  } catch (e) {return false;}
					    break;
					  case 'select':
						  try {
							  var options = devtools.JSON.parse(tag.attributes.options);
							  r = '<div><label>' + tag.attributes.label + '</label>';
							  r += '<select name="' + tag.attributes.name + '"' + ((tag.attributes.hook == 'color') ? ' data-devtools-hook="' + tag.attributes.hook + '"' : '') + ' data-devtools-input="select">';
							  for (var key in options) {
								  if (typeof options[key] == 'string') {
									  r += '<option value="' + options[key] + '"';
									  r += (tag.attributes.hook == 'color' && /^#[0-9a-f]{3,6}$/i.test(options[key])) ? ' style="background-color:' + options[key] + ' !important;"' : '';
									  r += ((tag.attributes.defaultValue == options[key]) ? ' selected' : '') + '>' + key + '</option>';
							  } }
							  r += '</select></div>';
						  } catch (e) {return false;}
					    break;
				  }
				  return r;
		  } }
	  },

	  __hooks: {
		  'color': function () {
			  var el = document.querySelectorAll('[data-devtools-hook="color"]');
			  if (!el) return;
			  setInterval(function () {
				  var el = document.querySelectorAll('[data-devtools-hook="color"]');
				  if (el) {
					  for (var i = 0; i < el.length; i++) {
						  if (/^#[0-9a-f]{3,6}$/i.test(el[i].value)) el[i].setAttribute('style', 'background-color: ' + el[i].value + ' !important');
				  } }
			  }, 500);
		  }
	  },

	  __userDefaults: {},

	  __setting: {},

	  __handleHooks: function () {
		  for (var hook in this.__hooks) this.__hooks[hook]();
	  },

	  __setVars: function (options) {
		  this.__setting = {};
		  var out = this.__copyObj(this.__defaults);
		  var setting, validationCopy, validationCount, valid;
		  for (setting in this.__userDefaults) {
			  if (this.__defaults.hasOwnProperty(setting)) out[setting] = this.__copyObj(this.__userDefaults[setting]);
		  }
		  if (typeof options == 'object') {
			  for (setting in options) {
				  if (this.__defaults.hasOwnProperty(setting)) out[setting] = options[setting];
		  } }
		  for (setting in out) {
			  if (setting == 'buttons') {
				  this.__setting[setting] = this.__validateButtons(out[setting]);
				  continue;
			  }
			  if (setting == 'theme') {
				  this.__setting[setting] = this.__validateTheme(out[setting]);
				  continue;
			  }
			  if (this.__settingsValidation.hasOwnProperty(setting)) {
				  validationCopy = this.__copyObj(this.__settingsValidation[setting]);
				  valid = false;
				  switch(validationCopy.shift()) {
					  case 'type':
						  for (validationCount = 0; validationCount < validationCopy.length; validationCount++) {
							  if (validationCopy[validationCount] == 'array') {
								  if (out[setting] instanceof Array) {
									  valid = true;
									  this.__setting[setting] = out[setting];
									  break;
								  }
								  else if (this.__userDefaults[setting] instanceof Array) {
									  valid = true;
									  this.__setting[setting] = this.__userDefaults[setting];
									  break;
							  } }
							  else if (typeof out[setting] == validationCopy[validationCount]) {
								  valid = true;
								  this.__setting[setting] = out[setting];
								  break;
							  }
							  else if (typeof this.__userDefaults[setting] == validationCopy[validationCount]) {
								  valid = true;
								  this.__setting[setting] = this.__userDefaults[setting];
								  break;
						  } }
					    break;
					  case 'match':
						  for (validationCount = 0; validationCount < validationCopy.length; validationCount++) {
							  if (validationCopy[validationCount].test(out[setting])) {
								  valid = true;
								  this.__setting[setting] = out[setting];
								  break;
							  }
							  else if (validationCopy[validationCount].test(this.__userDefaults[setting])) {
								  valid = true;
								  this.__setting[setting] = this.__userDefaults[setting];
								  break;
						  } }
					  break;
				  }
				  if (!valid) this.__setting[setting] = this.__copyObj(this.__defaults[setting]);
		  } }
	  },

	  __validateButtons: function (buttons) {
		  var btns = [];
		  if (typeof buttons == 'object' && buttons instanceof Array) {
			  var btnNum, btnAttr, o;
			  button:
			  for (btnNum = 0; btnNum < buttons.length; btnNum++) {
				  if (typeof buttons[btnNum] != 'object') {continue button;}
				  for (btnAttr in buttons[btnNum]) {
					  o = buttons[btnNum][btnAttr];
					  switch(btnAttr) {
						  case 'text':
							  if (typeof o != 'string') o = '';
						    break;
						  case 'tooltip':
							  if (typeof o != 'string') o = false;
						    break;
						  case 'icon':
							  if (typeof o != 'string') o = false;
						    break;
						  case 'callback':
							  if (typeof o != 'function') continue button;
						    break;
				  } }
				  btns.push(buttons[btnNum]);
		  } }
		  return btns;
	  },

	  __validateTheme: function (theme) {
		  if (typeof theme != 'string' || theme == '') return this.__defaults.theme;
		  if (typeof this.__themes[theme] == 'object' && this.__themes[theme] !== null) {
			  var t = this.__themes[theme];
			  if (t.base) {
				  if (typeof this.__themes[t.base] == 'object' && this.__themes[t.base] !== null) return theme;
				  else return this.__defaults.theme;
			  }
			  else return theme;
		  }
		  return this.__defaults.theme;
	  },

	  __parseTokens: function (text) {
		  var tagSplitRegex = /({\s*\w+\s*(?:\w+(?:\s*=\s*(?:".*?"|'.*?'))?\s*)*})/;
		  var tagRegex = /{\s*(\w+)/;
		  var attrRegex = /(\w+)\s*=\s*(".*?"|'.*?')/g;
		  var text_obj =  text.split(tagSplitRegex);
		  var i, match, attr, tag, temptext;
		  token_search:
		  for (i = 1; i < text_obj.length; i += 2) {
			  tag = {};
			  match = tagRegex.exec(text_obj[i]);
			  temptext = text_obj[i].replace(tagRegex, '');
			  tag.name = match[1];
			  tag.attributes = {};
			  if (typeof this.__tokens[tag.name] == 'undefined') continue;
			  if (typeof temptext != '') {
				  while ((attr = attrRegex.exec(temptext)) != null) {
					  attr[2] = attr[2].substring(1, attr[2].length - 1);
					  if (typeof this.__tokens[tag.name].attributes[attr[1]] == 'undefined') continue;
					  if (this.__tokens[tag.name].attributes[attr[1]].validation === false) tag.attributes[attr[1]] = attr[2];
					  else if (this.__tokens[tag.name].attributes[attr[1]].validation.test(attr[2])) tag.attributes[attr[1]] = attr[2];
					  else if (typeof this.__tokens[tag.name].attributes[attr[1]].defaultValue == 'string') tag.attributes[attr[1]] = this.__tokens[tag.name].attributes[attr[1]].defaultValue;
					  else continue token_search;
			  } }
			  for (attr in this.__tokens[tag.name].attributes) {
				  if (!this.__tokens[tag.name].attributes.hasOwnProperty(attr)) continue;
				  if (typeof tag.attributes[attr] == 'undefined') {
					  if (typeof this.__tokens[tag.name].attributes[attr].defaultValue == 'string') tag.attributes[attr] = this.__tokens[tag.name].attributes[attr].defaultValue;
					  else continue token_search;
			  } }
			  var rep = this.__tokens[tag.name].replacement;
			  if (typeof rep == 'string') text_obj[i] = rep;
			  else if (typeof rep == 'function') {
				  var rep_result = rep(tag);
				  if (typeof rep_result != 'string') continue token_search;
				  text_obj[i] = rep_result;
		  } }
		  return text_obj.join('');
	  },

	  __copyObj: function (obj) {
		  if (obj == null || typeof(obj) != 'object' || obj instanceof RegExp) return obj;
		  var c = new obj.constructor();
		  for (var key in obj) c[key] = this.__copyObj(obj[key]);
		  return c;
	} }

  if (typeof devtools.dialog != 'undefined') {
		devtools.config = {
			open: function() {
				var msg = (typeof this.__options.html == 'string') ? this.__options.html + '<hr/>' : '';
				for(var name in this.__options.settings) msg += this.__options.settings[name].input;
				devtools.dialog.open({
					message: msg,
					title:this.__options.title,
					mask:true,
					buttons: [{
						text: 'Save',
						icon: this.__icons.save,
						callback: this.__save},
						{text: 'Save & Reload', icon: this.__icons.save, callback: function() {devtools.config.__save(); document.location.reload();}},
						{text: 'Close', icon:this.__icons.close, callback:this.close
					}],
					theme: (typeof this.__options.theme.css == 'string') ? 'devtoolsconfig' : 'default'}, 'devtools-config')
			},

		  close: function () {
			  devtools.dialog.close('devtools-config');
		  },

		  get: function (name) {
			  if (this.__options.settings[name] !== null && typeof this.__options.settings[name] != 'undefined') return GM_getValue('devtools-config-' + name, this.__options.settings[name].defaultValue);
			  return undefined;
		  },

		  getAll: function () {
			  var vals = {}, val;
			  var allVals = GM_listValues();
			  for (var i = 0; i < allVals.length; i++) {
				  val = allVals[i];
				  if (/^devtools-config-/.test(val)) vals[val.replace(/^devtools-config-/, '')] = this.get(val.replace(/^devtools-config-/, ''));
			  }
			  return vals;
		  },

		  init: function (options) {
			  if (typeof options != 'object' || !options) return false;
			  if (!options.settings) return false;
			  if (options.prefix) this.__options.prefix = options.prefix;
			  if (typeof options.callback == 'function') this.__options.callback = options.callback;
			  else this.__options.callback = function () {};
			  this.__options.title = (typeof options.title == 'string') ? options.title : 'Configuration Options';
			  var setting, name;
			  for (name in options.settings) {
				  if (!/^\w+$/.test(name) || !options.settings.hasOwnProperty(name)) continue;
				  this.__options.settings[name] = {};
				  setting = options.settings[name];
				  if (typeof setting.type == 'string') {
					  if (setting.type == 'text' || setting.type == 'textarea' || setting.type == 'password') {
						  this.__options.settings[name].defaultValue = (typeof setting.defaultValue == 'string') ? setting.defaultValue : '';
						  this.__options.settings[name].input = '{input type="' + setting.type + '" name="' + name + '" defaultValue="' + (this.get(name) || this.__options.settings[name].defaultValue) + '" label="' + ((typeof setting.label == 'string') ? setting.label : '') + '"}';
					  }
					  if (setting.type == 'checkbox') {
						  this.__options.settings[name].defaultValue = (setting.defaultValue == true || setting.defaultValue == 'true') ? true : false;
						  this.__options.settings[name].input = '{input type="' + setting.type + '" name="' + name + '" defaultValue="' + ((typeof this.get(name) == 'boolean') ? this.get(name) : this.__options.settings[name].defaultValue) + '" label="' + ((typeof setting.label == 'string') ? setting.label : '') + '"}';
					  }
					  if (setting.type == 'radio' || setting.type == 'select') {
						  this.__options.settings[name].defaultValue = (typeof setting.defaultValue == 'string') ? setting.defaultValue : '';
						  this.__options.settings[name].input = '{input type="' + setting.type + '" name="' + name + '" defaultValue="' + (this.get(name) || this.__options.settings[name].defaultValue) + '" label="' + ((typeof setting.label == 'string') ? setting.label : '') + '"';
						  this.__options.settings[name].input += ' options="' + ((typeof setting.options == 'object') ? devtools.JSON.stringify(setting.options) : '') + '"';
						  this.__options.settings[name].input += ((setting.colorHook === true && setting.type == 'select') ? ' hook="color"' : '') + '}';
			  } } }
			  this.__options.html = (typeof options.html == 'string') ? options.html : false;
			  this.__options.theme.useBase = (options.useBase === false) ? false : true;
			  this.__options.theme.css = (typeof options.css == 'string') ? options.css : null;
			  if (typeof this.__options.theme.css == 'string') {
				  devtools.dialog.defineTheme('devtoolsconfig', this.__options.theme.css, ((this.__options.theme.useBase) ? 'default' : null));
			  }
			  this.__initSettings = options;
			  return true;
		  },

		  __initSettings: null,
		  __save: function (options) {
			  options = devtools.dialog.getInputs('devtools-config');
			  for (var name in options) {
				  if (!options.hasOwnProperty(name)) continue;
				  GM_setValue('devtools-config-' + name, options[name]);
			  }
			  var img = document.querySelector('#devtools-dialog-devtools-config [data-devtools-dialog-button="Save"] img');
			  img.src = devtools.config.__icons.savecomplete;
			  setTimeout(function () {img.src = devtools.config.__icons.save;}, 2000);
			  devtools.config.init(devtools.config.__initSettings);
			  return true;
		  },

		  __options: {
			  title: '',
			  html: '',
			  theme: {useBase: true, css: false},
			  settings: {},
			  prefix: 'my_storage_prefix'
		  },

		  __icons: {
			  save: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAKCSURBVHjaYj\
TL3lPIwMAgD8Q2QKwExDwMDP9ZgDQjw38GMGBmYmRgAuL///8x/PvH8IGNleHO95+/O09N81wDEEAghVqzS61SQOrVpdnBev7/+8/w6w8Q//4H1szJzsTAyMjA8OX7P4YvP/7y33v+xWDhzrszzLK28QMEEBNQvS1I1/pTn\
xiA+oC2/GfIm3waaBOQA9TFygKxHWTgd6CBf/4xMP5lYGKJd1cW5mRnmwoQQCADJEC2gjT8Bsr+/gNx928gn4WZAWwASO77L6gc0IIDlz8zsLEyM3z/+YcNIIBAXuD68w/scLAiEGACufc/SDPQ6UD4A2jz95//gS78D3Yl\
iH729gfIMEaAAGIBBdhfoAAQMfyE2l6bYADWDEQMv//+Z/j2E+R0cAACzQXCfyDX/AUHKkAAgUP7318GsNOaF5wHehvoZ0aY7QwMINf9AXoNGiFgICAgBDSAGawHIIBYGMBOApn+l0FMXBoUGZD4A+uAOhlo4///UC+AnAG\
05PfvP6DoYgAIIJALGP7+BRsGBoxwBgPEyf8h4QOh/oPlQU7//RuSLgACCGzAn7//GKBWgv0ICjgGsEKIf8H+Btv+F5xGgCyGn7//g10AEECgQGT4+w/i5LpIGQZiQOnsq8BwgbgEIIBYQFH2Fxa6QEMmHkvBqznPcjbQy3\
/ACQukASCAWCB+/Q8OcRCwkokl6IJ/QBv//gYnPwaAAGIB+u0/0AuMsDA49mQxXs0msnZAF/wFpw+QXoAAYgFa/uDXn3+Kxspc4AxTYD2HoAvEeYEu+Au28D1AADGaZe3qBxqkBnSBJdBIQZCzwFH3/x84kJBpWMxAIv3/Z\
wZGpssAAQYAIXxui1/HoMEAAAAASUVORK5CYII%3D',
			  close: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAD2SURBVHjax\
FM7DoMwDH2pOESHHgDPcB223gKpAxK34EAMMIe1FCQOgFQxuflARVBSVepQS5Ht2PHn2RHMjF/ohB8p2gSZpprtyxEHX8dGTeMG0A5UlsD5rCSGvF55F4SpqpSm1GmCzPO3LXJy1LXllwvodoMsCpNVy2hbYBjCLRiaZ8u7\
Dng+QXlu9b4H7ncvBmKbwoYBWR4kaXv3YmAMyoEpjv2PdWUHcP1j1ECqFpyj777YA6Yss9KyuEeDaW0cCsCUJMDjYUE8kr5TNuOzC+JiMI5uz2rmJvNWvidwcJXXx8IAuwb6uMqrY2iVgzbx99/4EmAAarFu0IJle5oAAAA\
ASUVORK5CYII%3D'
  } } }
