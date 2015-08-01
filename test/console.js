var owalk = require("../dist/owalk.full.min.js");
//require("../lib/descriptor");
var r,
	//q = "./bloupi/goldberg/yes/../../no/../bouhi/../[no,bouhi]";
	// q = "./(bloup)/[no,(bou)]";
	// q = "./bloupi/../bloupi/goldberg/*";
	// q = "./bloupi/goldberg/yes/../../no/../bouhi/../no";
	// q = "./bloupi/goldberg/yes/../../no/../(bouh)/../[no,bouhi]";
	// q = "/bloupi/goldberg/y/es";
	// q = "/bloupi/goldberg/*";
	q = "//";
// q = "//?yes";
console.time("t");

for (var i = 0; i < 10000; i++)
	r = owalk.find(q, {
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
owalk.print(r);