(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.owalk = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require("../lib/descriptor");
require("../lib/rql");
module.exports = require("../lib/finder");
},{"../lib/descriptor":3,"../lib/finder":4,"../lib/rql":5}],2:[function(require,module,exports){
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * owalk namespace
 */
module.exports = {
    print: function(node) {
        if (!node)
            console.log('node is null');
        else if (!node.__owalk_node__ && !node.__owalk_array__)
            console.log('pure property : ', node);
        else if (node.forEach)
            node.forEach(function(n) {
                if (n)
                    console.log('> node : %s : ', n.path, n.value);
            });
        else
            console.log('node : %s : ', node.path, node.value);
    }
};
},{}],3:[function(require,module,exports){
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * owalk Descriptor : Simple property node descriptor : a simple object that hold information about an object's property (parent, path, schema, depth, ...)
 */
var owalk = require("../index");

var Descriptor = function(parent, key) {
    var path;
    if (parent) {
        this.parent = parent;
        path = parent.path;
        if (!parent.key)
            path += key;
        else
            path += "/" + key;
        if (parent.schema) {
            if (!owalk.getSchemaByPath)
                throw new Error("no method 'getSchemaByPath' founded in owalk. could not use schema in it.");
            this.schema = owalk.getSchemaByPath(parent.schema, key, "/");
        }
        this.value = parent.value[key];
        this.depth = parent.depth + 1;
        this.root = parent.root || parent;
    }
    this.__owalk_node__ = true;
    this.path = path;
    this.key = key;
}

Descriptor.prototype = {
    set: function(value) {
        this.value = value;
        if (this.parent)
            this.parent.value[this.key] = value;
        return value;
    },
    clone: function() {
        if (this.parent)
            return new Descriptor(this.parent, this.key);
        return Descriptor.root(this.value, this.schema);
    }
};

Descriptor.root = function(obj, schema) {
    if (obj && obj._deep_undefined_)
        obj = undefined;
    var node = new Descriptor();
    node.value = obj;
    node.path = "/";
    node.schema = schema;
    node.depth = 0;
    return node;
};

owalk.Descriptor = Descriptor;

module.exports = owalk;
},{"../index":2}],4:[function(require,module,exports){
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Todo : remove, replace
 */
var owalk = require("../index");
var step = /(?:(\/\/?)([^\/]*))|(\.\.?)/g,
    queryCache = {};

function parseStep(selector) {
    switch (selector[0]) {
        case "?":
            return {
                value: selector,
                type: "rql"
            };
            break;
        case "(":
            return {
                value: new RegExp(selector),
                type: "regex"
            };
            break;
        case ".":
            return {
                value: selector,
                type: "move"
            };
            break;
        case "[":
            return {
                value: selector.substring(1, selector.length - 1).split(",").map(parseStep),
                type: "union"
            };
            break;
        default:
            return {
                value: selector,
                type: "sel"
            };
            break;
    }
}

function parse(q) {
    if (queryCache[q])
        return queryCache[q];
    var match = null,
        tokens = [];
    while (match = step.exec(q)) {
        if (match[1] === "//")
            tokens.push({
                type: "recursion"
            });
        tokens.push(parseStep(match[3] ? match[3] : match[2]));
    }
    queryCache[q] = tokens;
    return tokens;
}

function select(obj, key, desc) {
    if (obj.forEach) {
        var output = [];
        for (var i = 0, len = obj.length; i < len; ++i) {
            var o = obj[i],
                v = desc ? o.value : o;
            if (v[key])
                output.push(desc ? new owalk.Descriptor(obj[i], key) : v[key]);
        }
        return output;
    } else {
        var v = desc ? obj.value : obj;
        if (v[key])
            return (desc ? new owalk.Descriptor(obj, key) : v[key]);
    }
}

function selectRegExp(obj, regex, desc) {
    var output = [],
        i, j, o, v = desc ? obj.value : obj;
    if (obj.forEach) {
        for (i = 0, len = obj.length; i < len; ++i) {
            o = obj[i], v = desc ? o.value : o;
            for (j in v)
                if (regex.test(j))
                    output.push(desc ? new owalk.Descriptor(o, j) : v[j]);
        }
    } else
        for (j in v)
            if (regex.test(j))
                output.push(desc ? new owalk.Descriptor(obj, j) : v[j]);
    return output;
}

function selectRQL(obj, rqlQuery, desc) {
    if (!owalk.rql)
        throw new Error("no rql-array module has been linked to owalk : you could not use rql in your query");
    if (obj.forEach)
        return owalk.rql(obj, rqlQuery);
    var res = owalk.rql([obj], rqlQuery);
    if (res)
        return res[0];
}

function selectChildren(obj, recursive, desc) {
    var output = [],
        i, j, o, v = (desc ? obj.value : obj);
    if (obj.forEach) {
        for (i = 0, len = obj.length; i < len; ++i) {
            o = obj[i], v = (desc ? o.value : o);
            if (typeof v === 'object')
                for (j in v) {
                    var child = (desc ? new owalk.Descriptor(o, j) : v[j]),
                        cv = desc ? child.value : child;
                    output.push(child);
                    if (recursive && cv && typeof cv === 'object')
                        output = output.concat(selectChildren(child, true, desc));
                }
        }
    } else if (typeof v === 'object')
        for (j in v) {
            var child = desc ? new owalk.Descriptor(obj, j) : v[j],
                cv = desc ? child.value : child;
            output.push(child);
            if (recursive && cv && typeof cv === 'object')
                output = output.concat(selectChildren(child, true, desc));
        }
    return output;
}

function selectParent(obj, desc) {
    if (!desc)
        return;
    var cacheCheck = {};
    if (obj.forEach) {
        var output = [],
            i, j;
        for (i = 0, len = obj.length; i < len; ++i) {
            var o = obj[i];
            if (!cacheCheck[o.parent.path]) {
                output.push(o.parent);
                cacheCheck[o.parent.path] = true;
            }
        }
        return output;
    } else
        return obj.parent;
}

function applyStep(obj, step, desc) {
    switch (step.type) {
        case "rql":
            return selectRQL(obj, step.value, desc);
        case "move":
            switch (step.value) {
                case ".": // skip
                    return obj;
                case "..":
                    return selectParent(obj, desc);
                default:
                    throw new Error("dpath : bad move parsing");
            }
            break;
        case "recursion":
            return selectChildren(obj, true, desc);
        case "sel":
            switch (step.value) {
                case "":
                    return obj;
                case "*":
                    return selectChildren(obj, false, desc);
                default:
                    return select(obj, step.value, desc);
            }
            break;
        case "union":
            var res = [],
                output;
            for (var i = 0, len = step.value.length; i < len; ++i) {
                output = applyStep(obj, step.value[i], desc)
                if (typeof output !== "undefined")
                    res = res.concat(output);
            }
            return res;
        case "regex":
            return selectRegExp(obj, step.value, desc);
        default:
            throw new Error("desc.find : step type unrecognised : " + step.type);
    }
}

function find(q, obj, desc) {
    if (!obj)
        return;
    if (desc && !owalk.Descriptor)
        throw new Error("owalk descriptor module has not been loaded. You could not ask owalk Descriptor response.");
    var tokens = parse(q),
        tmp = desc ? (obj.__owalk_node__ ? obj : owalk.Descriptor.root(obj)) : obj;
    if (desc && tokens[0] && !tokens[0].type == "move")
        obj = obj.root || obj;
    for (var i = 0, len = tokens.length; tmp && i < len; ++i) {
        tmp = applyStep(tmp, tokens[i], desc);
        if (tmp && tmp.forEach && !tmp.length)
            return;
    }
    if (desc && tmp && tmp.forEach)
        tmp.__owalk_array__ = true;
    return tmp;
}

owalk.find = find;
owalk.parseQuery = parse;
module.exports = owalk;
},{"../index":2}],5:[function(require,module,exports){
/**
 * A deep oriented implementation of RQL for JavaScript arrays based on rql/js-array from Kris Zyp (https://github.com/persvr/rql).
 *	What's different from js-array ? It could handle schema properties, and node's type and/or depth when filtering.
 *	It handle also dotted notation for properties path.
 *	Schema, type, and depth need __owalk_node__ to work. for this, use it through deep's chains.
 * @module deep
 * @submodule deep-rql
 * @example
 * rql([{a:{b:3}},{a:3}], "a.b=3") -> [{a:{b:3}]
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */


"use strict";
var parser = require("rql/parser"),
	owalk = require("../index");

function getJSPrimitiveType(obj) {
	if (obj && obj.forEach)
		return "array";
	return typeof obj;
};

function inArray(inArr, what) {
	//console.log("inArray : what : "+JSON.stringify(what) + " - in : "+JSON.stringify(inArr));
	if (!inArr || !inArr.forEach)
		return false;
	if (what.forEach) {
		var test = {};
		inArr.forEach(function(e) {
			test[e] = true;
		});
		var okCount = 0;
		what.forEach(function(e) {
			if (test[e])
				okCount++;
		});
		if (okCount == what.length)
			return true;
		return false;
	}
	return inArr.some(function(e) {
		return what === e;
	});
}
var rqlParser = parser.parseQuery;

var queryCache = {};

var rql = function(array, query) {
	// console.log('rql : array, query : ', array, query);
	if (query[0] == "?")
		query = query.substring(1);
	if (queryCache[query])
		return queryCache[query].call(array);
	return rql.compile(query).call(array);
};

rql.parse = function(input) {
	try {
		var r = rqlParser(input);
		r.toString = function() {
			return input;
		};
		return r;
	} catch (e) {
		return null;
	}
};

rql.compile = function(query) {
	var parsed = rql.parse(query);
	var func = rqlNodeToFunc(parsed);
	queryCache[query] = func;
	return func;
};

rql.ops = {
	isPresent: function(path, items) {
		var res = [];
		var len = items.length;
		for (var i = 0; i < len; ++i)
			if (retrieve(items[i], path))
				res.push(items[i]);
		return res;
	},
	sort: function() {
		var terms = [];
		for (var i = 0; i < arguments.length; i++) {
			var sortAttribute = arguments[i];
			var firstChar = sortAttribute.charAt(0);
			var term = {
				attribute: sortAttribute,
				ascending: true
			};
			if (firstChar == "-" || firstChar == "+") {
				if (firstChar == "-")
					term.ascending = false;
				term.attribute = term.attribute.substring(1);
			}
			terms.push(term);
		}
		this.sort(function(a, b) {
			for (var term, i = 0; term = terms[i]; i++) {
				var ar = retrieve(a, term.attribute);
				var br = retrieve(b, term.attribute);
				if (ar != br)
					return term.ascending == ar > br ? 1 : -1;
			}
			return 0;
		});
		return this;
	},
	match: filter(function(value, regex) {
		return new RegExp(regex).test(value);
	}),
	"in": filter(function(value, values) {
		var ok = false;
		var count = 0;
		while (!ok && count < values.length)
			if (values[count++] == value)
				ok = true;
		return ok;
	}),
	out: filter(function(value, values) {
		var ok = true;
		var count = 0;
		while (ok && count < values.length)
			if (values[count++] == value)
				ok = false;
		return ok;
	}),
	contains: filter(inArray),
	excludes: filter(function(array, value) {
		return !inArray(array, value);
	}),
	or: function() {
		var items = [];
		//TODO: remove duplicates and use condition property
		for (var i = 0; i < arguments.length; ++i) {
			var a = arguments[i];
			if (typeof a == 'function')
				items = items.concat(a.call(this));
			else
				items = items.concat(rql.ops.isPresent(a, items));
		}
		return items;
	},
	and: function() {
		var items = this;
		for (var i = 0; i < arguments.length; ++i) {
			var a = arguments[i];
			if (typeof a == 'function')
				items = a.call(items);
			else
				items = rql.ops.isPresent(a, items);
		}
		return items;
	},
	select: function() {
		var args = arguments;
		var argc = arguments.length;
		var res = this.map(function(object) {
			var selected = {};
			for (var i = 0; i < argc; i++) {
				var propertyName = args[i];
				var value = evaluateProperty(object, propertyName);
				if (typeof value != "undefined")
					selected[propertyName] = value;
			}
			return selected;
		});
		return res;
	},
	/* _______________________________________________ WARNING : NOT IMPLEMENTED WITH PREFIX*/
	unselect: function() {
		var args = arguments;
		var argc = arguments.length;
		return this.map(function(object) {
			var selected = {};
			for (var i in object)
				if (object.hasOwnProperty(i))
					selected[i] = object[i];
			for (var i = 0; i < argc; i++)
				delete selected[args[i]];
			return selected;
		});
	},
	values: function(first) {
		if (arguments.length == 1)
			return this.map(function(object) {
				return retrieve(object, first);
			});
		var args = arguments;
		var argc = arguments.length;
		return this.map(function(object) {
			var realObject = retrieve(object);
			var selected = [];
			if (argc === 0) {
				for (var i in realObject)
					if (realObject.hasOwnProperty(i))
						selected.push(realObject[i]);
			} else
				for (var i = 0; i < argc; i++) {
					var propertyName = args[i];
					selected.push(realObject[propertyName]);
				}
			return selected;
		});
	},
	limit: function(limit, start, maxCount) {
		var totalCount = this.length;
		start = start || 0;
		var sliced = this.slice(start, start + limit);
		if (maxCount) {
			sliced.start = start;
			sliced.end = start + sliced.length - 1;
			sliced.totalCount = Math.min(totalCount, typeof maxCount === "number" ? maxCount : Infinity);
		}
		return sliced;
	},
	distinct: function() {
		var primitives = {};
		var needCleaning = [];
		var newResults = this.filter(function(value) {
			value = retrieve(value);
			if (value && typeof value == "object") {
				if (!value.__found__) {
					value.__found__ = function() {}; // get ignored by JSON serialization
					needCleaning.push(value);
					return true;
				}
				return false;
			}
			if (!primitives[value]) {
				primitives[value] = true;
				return true;
			}
			return false;
		});
		needCleaning.forEach(function(object) {
			delete object.__found__;
		});
		return newResults;
	},
	recurse: function(property) {
		// TODO: this needs to use lazy-array
		var newResults = [];

		function recurse(value) {
			if (value.forEach)
				value.forEach(recurse);
			else {
				newResults.push(value);
				if (property) {
					value = value[property];
					if (value && typeof value == "object")
						recurse(value);
				} else
					for (var i in value)
						if (value[i] && typeof value[i] == "object")
							recurse(value[i]);
			}
		}
		recurse(retrieve(this));
		return newResults;
	},
	aggregate: function() {
		var distinctives = [];
		var aggregates = [];
		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (typeof arg === "function")
				aggregates.push(arg);
			else
				distinctives.push(arg);
		}
		var distinctObjects = {};
		var dl = distinctives.length;
		this.forEach(function(object) {
			object = retrieve(object);
			var key = "";
			for (var i = 0; i < dl; i++)
				key += '/' + object[distinctives[i]];
			var arrayForKey = distinctObjects[key];
			if (!arrayForKey)
				arrayForKey = distinctObjects[key] = [];
			arrayForKey.push(object);
		});
		var al = aggregates.length;
		var newResults = [];
		for (var key in distinctObjects) {
			var arrayForKey = distinctObjects[key];
			var newObject = {};
			for (var i = 0; i < dl; i++) {
				var property = distinctives[i];
				newObject[property] = arrayForKey[0][property];
			}
			for (var i = 0; i < al; i++) {
				var aggregate = aggregates[i];
				newObject[i] = aggregate.call(arrayForKey);
			}
			newResults.push(newObject);
		}
		return newResults;
	},
	between: filter(function(value, range) {
		value = retrieve(value);
		return value >= range[0] && value < range[1];
	}),
	sum: reducer(function(a, b) {
		a = retrieve(a);
		b = retrieve(b);
		return a + b;
	}),
	mean: function(property) {
		return rql.ops.sum.call(this, property) / this.length;
	},
	max: reducer(function(a, b) {
		a = retrieve(a);
		b = retrieve(b);
		return Math.max(a, b);
	}),
	min: reducer(function(a, b) {
		a = retrieve(a);
		b = retrieve(b);
		return Math.min(a, b);
	}),
	count: function() {
		return this.length;
	},
	first: function() {
		return this[0];
	},
	last: function() {
		return this[this.length - 1];
	},
	random: function() {
		return this[Math.round(Math.random() * (this.length - 1))];
	},
	one: function() {
		if (this.length > 1)
			throw new Error("RQLError : More than one object found");
		return this[0];
	}
};

function rqlNodeToFunc(node) {
	if (typeof node === 'object') {
		var name = node.name;
		var args = node.args;
		if (node.forEach)
			return node.map(rqlNodeToFunc);
		else {
			var b = args[0],
				path = null;
			if (args.length == 2) {
				path = b;
				b = args[1];
			}
			var func = null;
			var isFilter = false;
			switch (name) {
				case "eq":
					isFilter = true;
					func = function eq(a) {
						return (retrieve(a, path) || undefined) === b;
					};
					break;
				case "ne":
					isFilter = true;
					func = function ne(a) {
						return (retrieve(a, path) || undefined) !== b;
					};
					break;
				case "le":
					isFilter = true;
					func = function le(a) {
						return (retrieve(a, path) || undefined) <= b;
					};
					break;
				case "ge":
					isFilter = true;
					func = function ge(a) {
						return (retrieve(a, path) || undefined) >= b;
					};
					break;
				case "lt":
					isFilter = true;
					func = function lt(a) {
						return (retrieve(a, path) || undefined) < b;
					};
					break;
				case "gt":
					isFilter = true;
					func = function gt(a) {
						return (retrieve(a, path) || undefined) > b;
					};
					break;
				default:
					var ops = rql.ops[name];
					if (!ops)
						throw new Error("RQLError : no operator found in rql with : " + name);
					if (args && args.length > 0) {
						args = args.map(rqlNodeToFunc);
						func = function() {
							return ops.apply(this, args);
						};
					} else
						func = function() {
							return ops.call(this);
						};
			}
			if (isFilter)
				return function() {
					var r = this.filter(func);
					return r;
				};
			else
				return func;
		}
	} else
		return node;
}

function retrieve(obj, path) {
	if (!path) {
		if (obj.__owalk_node__)
			return obj.value;
		return obj;
	}
	var splitted = path.split(".");
	var tmp = obj;
	switch (splitted[0]) {
		case '_schema':
			if (obj.__owalk_node__) {
				splitted.shift();
				tmp = obj.schema;
			} else
				return undefined;
			break;
		case '_depth':
			if (obj.__owalk_node__)
				return obj.depth;
			return undefined;
		case '_type':
			if (obj.__owalk_node__)
				return getJSPrimitiveType(obj.value);
			return getJSPrimitiveType(obj);
		default:
			if (obj.__owalk_node__)
				tmp = tmp.value;
	}
	if (!tmp)
		return tmp;
	var len = splitted.length,
		needtype = false;
	if (splitted[len - 1] == "_type") {
		len--;
		needtype = true;
		splitted.pop();
	}
	if (len < 5) {
		var res;
		switch (len) {
			case 1:
				res = tmp[splitted[0]];
				break;
			case 2:
				res = tmp[splitted[0]] && tmp[splitted[0]][splitted[1]];
				break;
			case 3:
				res = tmp[splitted[0]] && tmp[splitted[0]][splitted[1]] && tmp[splitted[0]][splitted[1]][splitted[2]];
				break;
			case 4:
				res = tmp[splitted[0]] && tmp[splitted[0]][splitted[1]] && tmp[splitted[0]][splitted[1]][splitted[2]] && tmp[splitted[0]][splitted[1]][splitted[2]][splitted[3]];
				break;
		}
		if (typeof res !== 'undefined' && needtype)
			return getJSPrimitiveType(res);
		return res;
	}
	tmp = tmp[splitted[0]] && tmp[splitted[0]][splitted[1]] && tmp[splitted[0]][splitted[1]][splitted[2]] && tmp[splitted[0]][splitted[1]][splitted[2]][splitted[3]];
	if (typeof tmp === 'undefined')
		return undefined;
	var count = 4,
		part = splitted[count];
	while (part && tmp[part]) {
		tmp = tmp[part];
		part = splitted[++count];
	}
	if (count === len) {
		if (needtype)
			return getJSPrimitiveType(tmp);
		return tmp;
	}
	return undefined;
}

function filter(condition, not) {
	var filtr = function doFilter(property, second) {
		if (typeof second == "undefined") {
			second = property;
			property = undefined;
		}
		var args = arguments;
		var filtered = [];
		for (var i = 0, length = this.length; i < length; i++) {
			var item = this[i];
			if (condition(evaluateProperty(item, property), second))
				filtered.push(item);
		}
		return filtered;
	};
	filtr.condition = condition;
	return filtr;
}

function reducer(func) {
	return function(property) {
		if (property)
			return this.map(function(object) {
				return retrieve(object, property);
			}).reduce(func);
		else
			return this.reduce(func);
	};
}

function evaluateProperty(object, property) {
	if (property && property.forEach)
		return retrieve(object, decodeURIComponent(property));
	if (typeof property === 'undefined')
		return retrieve(object);
	return retrieve(object, decodeURIComponent(property));
}

owalk.rql = rql;
module.exports = owalk;
},{"../index":2,"rql/parser":6}],6:[function(require,module,exports){
/**
 * This module provides RQL parsing. For example:
 * var parsed = require("./parser").parse("b=3&le(c,5)");
 */
({define:typeof define!="undefined"?define:function(deps, factory){module.exports = factory(exports, require("./util/contains"));}}).
define(["exports", "./util/contains"], function(exports, contains){

var operatorMap = {
	"=": "eq",
	"==": "eq",
	">": "gt",
	">=": "ge",
	"<": "lt",
	"<=": "le",
	"!=": "ne"
};


exports.primaryKeyName = 'id';
exports.lastSeen = ['sort', 'select', 'values', 'limit'];
exports.jsonQueryCompatible = true;

function parse(/*String|Object*/query, parameters){
	if (typeof query === "undefined" || query === null)
		query = '';
	var term = new exports.Query();
	var topTerm = term;
	topTerm.cache = {}; // room for lastSeen params
	if(typeof query === "object"){
		if(query instanceof exports.Query){
			return query;
		}
		for(var i in query){
			var term = new exports.Query();
			topTerm.args.push(term);
			term.name = "eq";
			term.args = [i, query[i]];
		}
		return topTerm;
	}
	if(query.charAt(0) == "?"){
		throw new URIError("Query must not start with ?");
	}
	if(exports.jsonQueryCompatible){
		query = query.replace(/%3C=/g,"=le=").replace(/%3E=/g,"=ge=").replace(/%3C/g,"=lt=").replace(/%3E/g,"=gt=");
	}
	if(query.indexOf("/") > -1){ // performance guard
		// convert slash delimited text to arrays
		query = query.replace(/[\+\*\$\-:\w%\._]*\/[\+\*\$\-:\w%\._\/]*/g, function(slashed){
			return "(" + slashed.replace(/\//g, ",") + ")";
		});
	}
	// convert FIQL to normalized call syntax form
	query = query.replace(/(\([\+\*\$\-:\w%\._,]+\)|[\+\*\$\-:\w%\._]*|)([<>!]?=(?:[\w]*=)?|>|<)(\([\+\*\$\-:\w%\._,]+\)|[\+\*\$\-:\w%\._]*|)/g,
	                     //<---------       property        -----------><------  operator -----><----------------   value ------------------>
			function(t, property, operator, value){
		if(operator.length < 3){
			if(!operatorMap[operator]){
				throw new URIError("Illegal operator " + operator);
			}
			operator = operatorMap[operator];
		}
		else{
			operator = operator.substring(1, operator.length - 1);
		}
		return operator + '(' + property + "," + value + ")";
	});
	if(query.charAt(0)=="?"){
		query = query.substring(1);
	}
	var leftoverCharacters = query.replace(/(\))|([&\|,])?([\+\*\$\-:\w%\._]*)(\(?)/g,
	                       //    <-closedParan->|<-delim-- propertyOrValue -----(> |
		function(t, closedParan, delim, propertyOrValue, openParan){
			if(delim){
				if(delim === "&"){
					setConjunction("and");
				}
				if(delim === "|"){
					setConjunction("or");
				}
			}
			if(openParan){
				var newTerm = new exports.Query();
				newTerm.name = propertyOrValue;
				newTerm.parent = term;
				call(newTerm);
			}
			else if(closedParan){
				var isArray = !term.name;
				term = term.parent;
				if(!term){
					throw new URIError("Closing paranthesis without an opening paranthesis");
				}
				if(isArray){
					term.args.push(term.args.pop().args);
				}
			}
			else if(propertyOrValue || delim === ','){
				term.args.push(stringToValue(propertyOrValue, parameters));

				// cache the last seen sort(), select(), values() and limit()
				if (contains(exports.lastSeen, term.name)) {
					topTerm.cache[term.name] = term.args;
				}
				// cache the last seen id equality
				if (term.name === 'eq' && term.args[0] === exports.primaryKeyName) {
					var id = term.args[1];
					if (id && !(id instanceof RegExp)) id = id.toString();
					topTerm.cache[exports.primaryKeyName] = id;
				}
			}
			return "";
		});
	if(term.parent){
		throw new URIError("Opening paranthesis without a closing paranthesis");
	}
	if(leftoverCharacters){
		// any extra characters left over from the replace indicates invalid syntax
		throw new URIError("Illegal character in query string encountered " + leftoverCharacters);
	}

	function call(newTerm){
		term.args.push(newTerm);
		term = newTerm;
		// cache the last seen sort(), select(), values() and limit()
		if (contains(exports.lastSeen, term.name)) {
			topTerm.cache[term.name] = term.args;
		}
	}
	function setConjunction(operator){
		if(!term.name){
			term.name = operator;
		}
		else if(term.name !== operator){
			throw new Error("Can not mix conjunctions within a group, use paranthesis around each set of same conjuctions (& and |)");
		}
	}
    function removeParentProperty(obj) {
    	if(obj && obj.args){
	    	delete obj.parent;
	    	var args = obj.args;
			for(var i = 0, l = args.length; i < l; i++){
		    	removeParentProperty(args[i]);
		    }
    	}
        return obj;
    };
    removeParentProperty(topTerm);
    return topTerm;
};

exports.parse = exports.parseQuery = parse;

/* dumps undesirable exceptions to Query().error */
exports.parseGently = function(){
	var terms;
	try {
		terms = parse.apply(this, arguments);
	} catch(err) {
		terms = new exports.Query();
		terms.error = err.message;
	}
	return terms;
}

exports.commonOperatorMap = {
	"and" : "&",
	"or" : "|",
	"eq" : "=",
	"ne" : "!=",
	"le" : "<=",
	"ge" : ">=",
	"lt" : "<",
	"gt" : ">"
}
function stringToValue(string, parameters){
	var converter = exports.converters['default'];
	if(string.charAt(0) === "$"){
		var param_index = parseInt(string.substring(1)) - 1;
		return param_index >= 0 && parameters ? parameters[param_index] : undefined;
	}
	if(string.indexOf(":") > -1){
		var parts = string.split(":",2);
		converter = exports.converters[parts[0]];
		if(!converter){
			throw new URIError("Unknown converter " + parts[0]);
		}
		string = parts[1];
	}
	return converter(string);
};

var autoConverted = exports.autoConverted = {
	"true": true,
	"false": false,
	"null": null,
	"undefined": undefined,
	"Infinity": Infinity,
	"-Infinity": -Infinity
};

exports.converters = {
	auto: function(string){
		if(autoConverted.hasOwnProperty(string)){
			return autoConverted[string];
		}
		var number = +string;
		if(isNaN(number) || number.toString() !== string){
/*			var isoDate = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(date);
			if (isoDate) {
				return new Date(Date.UTC(+isoDate[1], +isoDate[2] - 1, +isoDate[3], +isoDate[4], +isoDate[5], +isoDate[6]));
			}*/
			string = decodeURIComponent(string);
			if(exports.jsonQueryCompatible){
				if(string.charAt(0) == "'" && string.charAt(string.length-1) == "'"){
					return JSON.parse('"' + string.substring(1,string.length-1) + '"');
				}
			}
			return string;
		}
		return number;
	},
	number: function(x){
		var number = +x;
		if(isNaN(number)){
			throw new URIError("Invalid number " + number);
		}
		return number;
	},
	epoch: function(x){
		var date = new Date(+x);
		if (isNaN(date.getTime())) {
			throw new URIError("Invalid date " + x);
		}
		return date;
	},
	isodate: function(x){
		// four-digit year
		var date = '0000'.substr(0,4-x.length)+x;
		// pattern for partial dates
		date += '0000-01-01T00:00:00Z'.substring(date.length);
		return exports.converters.date(date);
	},
	date: function(x){
		var isoDate = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(x);
		if (isoDate) {
			date = new Date(Date.UTC(+isoDate[1], +isoDate[2] - 1, +isoDate[3], +isoDate[4], +isoDate[5], +isoDate[6]));
		}else{
			date = new Date(x);
		}
		if (isNaN(date.getTime())){
			throw new URIError("Invalid date " + x);
		}
		return date;

	},
	"boolean": function(x){
		return x === "true";
	},
	string: function(string){
		return decodeURIComponent(string);
	},
	re: function(x){
		return new RegExp(decodeURIComponent(x), 'i');
	},
	RE: function(x){
		return new RegExp(decodeURIComponent(x));
	},
	glob: function(x){
		var s = decodeURIComponent(x).replace(/([\\|\||\(|\)|\[|\{|\^|\$|\*|\+|\?|\.|\<|\>])/g, function(x){return '\\'+x;}).replace(/\\\*/g,'.*').replace(/\\\?/g,'.?');
		if (s.substring(0,2) !== '.*') s = '^'+s; else s = s.substring(2);
		if (s.substring(s.length-2) !== '.*') s = s+'$'; else s = s.substring(0, s.length-2);
		return new RegExp(s, 'i');
	}
};

// exports.converters["default"] can be changed to a different converter if you want
// a different default converter, for example:
// RP = require("rql/parser");
// RP.converters["default"] = RQ.converter.string;
exports.converters["default"] = exports.converters.auto;

// this can get replaced by the chainable query if query.js is loaded
exports.Query = function(){
	this.name = "and";
	this.args = [];
};
return exports;
});

},{"./util/contains":7}],7:[function(require,module,exports){
({define:typeof define!=='undefined'?define:function(deps, factory){module.exports = factory(exports);}}).
define([], function(){
return contains;

function contains(array, item){
	for(var i = 0, l = array.length; i < l; i++){
		if(array[i] === item){
			return true;
		}
	}
}
});

},{}]},{},[1])(1)
});