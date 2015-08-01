# owalk

Extracted from [deepjs](https://github.com/deepjs/deepjs) core lib.

JavaScript Object Walker Tools.

## Install

```
> git clone https://github.com/nomocas/owalk.git
```
or

```
> npm install owalk
```
or 

```
> bower install owalk
```

## Usage

You could either use it as an AMD module (requirejs, almond, ...) in your browser, or as a CommonJS module under nodejs, or by including the file directly in a script tag in your html page (owalk will be accessible in global window).

Requirejs : 
```javascript 
define(["require", "owalk/dist/owalk.full.min.js"], function(require, owalk){
	// do something
});
```

Nodejs : 
```javascript 
var owalk = require("owalk/dist/owalk.full.js);
// do something
```

Window global :
```html
<script src="/path/to/lib/owalk/dist/owalk.full.min.js"></script>
```

## Examples



## Tests

### Under nodejs

You need to have mocha installed globally before launching test. 
```
> npm install -g mocha
```
Do not forget to install dev-dependencies. i.e. : from 'owalk' folder, type :
```
> npm install
```

then, always in 'owalk' folder simply enter :
```
> mocha
```

### In the browser

Simply serve "owalk" folder in you favorite web server then open ./index.html.

You could use the provided "gulp web server" by entering :
```
> gulp serve-test
```

## Licence

The [MIT](http://opensource.org/licenses/MIT) License

Copyright (c) 2015 Gilles Coomans <gilles.coomans@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
