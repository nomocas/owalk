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