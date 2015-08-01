//var rql = require("rql");

// Todo : recursive, remove, replace

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
	while (match = step.exec(q))
		if (match[1] === "//")
			tokens.push({
				type: "recursion"
			});
		else
			tokens.push(parseStep(match[3] ? match[3] : match[2]));
	queryCache[q] = tokens;
	return tokens;
}

function select(obj, key, pnod) {
	if (obj.forEach) {
		var output = [];
		for (var i = 0, len = obj.length; i < len; ++i) {
			var o = obj[i],
				v = pnod ? o.value : o;
			if (v[key])
				output.push(pnod ? new Descriptor(obj[i], key) : v[key]);
		}
		return output;
	} else {
		var v = pnod ? obj.value : obj;
		if (v[key])
			return (pnod ? new Descriptor(obj, key) : v[key]);
	}
}

function selectRegExp(obj, regex, pnod) {
	var output = [],
		i, j, o, v = pnod ? obj.value : obj;
	if (obj.forEach) {
		for (i = 0, len = obj.length; i < len; ++i) {
			o = obj[i], v = pnod ? o.value : o;
			for (j in v)
				if (regex.test(j))
					output.push(pnod ? new Descriptor(o, j) : v[j]);
		}
	} else
		for (j in v)
			if (regex.test(j))
				output.push(pnod ? new Descriptor(obj, j) : v[j]);
	return output;
}

function selectRQL(obj, rqlQuery, pnod) {
	var output = [];
	if (obj.forEach) {
		for (var i = 0, len = obj.length; i < len; ++i)
			output.concat(rql.get(rqlQuery, obj[i]));
	} else
		return rql.get(rqlQuery, [obj]);
	return output;
}

function selectChildren(obj, recursive, pnod) {
	var output = [],
		i, j, o, v = (pnod ? obj.value : obj);
	if (obj.forEach) {
		for (i = 0, len = obj.length; i < len; ++i) {
			o = obj[i], v = (pnod ? o.value : o);
			if (typeof v === 'object')
				for (j in v) {
					var child = (pnod ? new Descriptor(o, j) : v[j]),
						cv = pnod ? child.value : child;
					output.push(child);
					if (recursive && cv && typeof cv === 'object')
						output = output.concat(selectChildren(child, true, pnod));
				}
		}
	} else if (typeof v === 'object')
		for (j in v) {
			var child = pnod ? new Descriptor(obj, j) : v[j],
				cv = pnod ? child.value : child;
			output.push(child);
			if (recursive && cv && typeof cv === 'object')
				output = output.concat(selectChildren(child, true, pnod));
		}
	return output;
}

function selectParent(obj, pnod) {
	if (!pnod)
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

function applyStep(obj, step, pnod) {
	switch (step.type) {
		case "rql":
			return selectRQL(obj, step.value, pnod);
		case "move":
			switch (step.value) {
				case ".": // skip
					return obj;
				case "..":
					return selectParent(obj, pnod);
				default:
					throw new Error("dpath : bad move parsing");
			}
			break;
		case "recursion":
			return selectChildren(obj, true, pnod);
		case "sel":
			switch (step.value) {
				case "":
					return obj;
				case "*":
					return selectChildren(obj, false, pnod);
				default:
					return select(obj, step.value, pnod);
			}
			break;
		case "union":
			var res = [],
				output;
			for (var i = 0, len = step.value.length; i < len; ++i) {
				output = applyStep(obj, step.value[i], pnod)
				if (typeof output !== "undefined")
					res = res.concat(output);
			}
			return res;
		case "regex":
			return selectRegExp(obj, step.value, pnod);
		default:
			throw new Error("pnod.find : step type unrecognised : " + step.type);
	}
}

function find(q, obj, pnod) {
	if (!obj)
		return;
	var tokens = parse(q),
		tmp = pnod ? (obj.__pnod_node__ ? obj : Descriptor.root(obj)) : obj;
	if (pnod && tokens[0] && !tokens[0].type == "move")
		obj = obj.root || obj;
	for (var i = 0, len = tokens.length; tmp && i < len; ++i) {
		tmp = applyStep(tmp, tokens[i], pnod);
		if (tmp && tmp.forEach && !tmp.length)
			return;
	}
	if (pnod && tmp && tmp.forEach)
		tmp.__pnod_array__ = true;
	return tmp;
}

//_______________________________________________________________ DESCRIPTOR

var Descriptor = function(parent, key) {
	var path;
	if (parent) {
		this.parent = parent;
		path = parent.path;
		if (!parent.key)
			path += key;
		else
			path += "/" + key;
		if (parent.schema)
			this.schema = schemaUtils.retrieveFullSchemaByPath(parent.schema, key, "/");
		this.value = parent.value[key];
		this.depth = parent.depth + 1;
		this.root = parent.root || parent;
	}
	this.__pnod_node__ = true;
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

var pnod = {};
pnod.Descriptor = Descriptor;
pnod.find = find;
pnod.parseQuery = parse;
pnod.print = function(node) {
	if (!node)
		console.log('node is null');
	else if (!node.__pnod_node__ && !node.__pnod_array__)
		console.log('pure property : ', node);
	else if (node.forEach)
		node.forEach(function(n) {
			if (n)
				console.log('> node : %s : ', n.path, n.value);
		});
	else
		console.log('node : %s : ', node.path, node.value);
};

var r,
	// q = "./bloupi/goldberg/yes/../../no/../bouhi/../[no,bouhi]";
	// q = "./(bloup)/[no,(bou)]";
	// q = "./bloupi/../bloupi/goldberg/*";
	// q = "./bloupi/goldberg/yes/../../no/../bouhi/../no";
	// q = "./bloupi/goldberg/yes/../../no/../(bouh)/../[no,bouhi]";
	// q = "/bloupi/goldberg/y/es";
	q = "/bloupi/goldberg/*";
// q = "//";
console.time("t");

for (var i = 0; i < 10000; i++)
	r = pnod.find(q, {
		bloupi: {
			goldberg: {
				yes: true,
				foo: "bar"
			},
			no: true,
			bouhi: "hello query"
		}
	}, false);
console.timeEnd("t");
console.log('query : ', q);
pnod.print(r);