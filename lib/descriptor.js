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