(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.owalk = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require("../lib/descriptor");
module.exports = require("../lib/finder");
},{"../lib/descriptor":3,"../lib/finder":4}],2:[function(require,module,exports){
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
},{"../index":2}]},{},[1])(1)
});