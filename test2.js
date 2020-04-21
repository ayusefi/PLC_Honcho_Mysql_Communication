var honcho = require('honcho');
config1 = { tagFileDir: '.', controllers: [ { host: '192.168.3.248', connection_name: 'P1', port: 1281, slot: 1, type: 'mcprotocol', tagfile: './t1.txt' } ] } ;
config2 = { tagFileDir: '.', controllers: [ { host: '192.168.3.249', connection_name: 'P2', port: 1281, slot: 1, type: 'mcprotocol', tagfile: './t2.txt' } ] } ;

tags1 = ['P1/D100', 'P1/D200'];
tags2 = ['P2/D202'];

console.log(tags1)
honcho.configure(config1, function(){ honcho.createSubscription(tags1, readDone, 1777); });

honcho.configure(config2, function(){ honcho.createSubscription(tags2, readDone, 888); });

function readDone(err, vars) {
	console.log(vars);
	// Or stream to a Websocket, etc
}

