#!/usr/bin/env bash

browserify lib/finder.js  -s owalk -o dist/owalk.finder.js
uglifyjs dist/owalk.finder.js -c -o dist/owalk.finder.min.js 

browserify bundle/owalk.finder.desc.js  -s owalk -o dist/owalk.finder.desc.js
uglifyjs dist/owalk.finder.desc.js -c -o dist/owalk.finder.desc.min.js 

browserify bundle/owalk.full.js  -s owalk -o dist/owalk.full.js
uglifyjs dist/owalk.full.js -c -o dist/owalk.full.min.js 
