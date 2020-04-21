const fs = require('fs');
var honcho = require('honcho');
var async = require('async');


// Read Database info from json file
var databaseObjectraw = fs.readFileSync('databse_info.json')
var databaseObject = JSON.parse(databaseObjectraw)

// Mysql database Connection
var mysql = require('mysql');
var con = mysql.createConnection({
    host: databaseObject.host,
    user: databaseObject.user,
    password: databaseObject.password,
    database: databaseObject.database
});

// Connect to Database
con.connect(function(err) {
    if (err) throw err;
	console.log('\x1b[32m%s\x1b[0m', "Database " + databaseObject.database + " connected!");
	var plc_array = [];

	// Read PLCs from database
    var plcs_read_sql = "SELECT * FROM PLCs WHERE PLC_ID = 1"
    con.query(plcs_read_sql, function (err, PLC_result, fields) {
		if (err) throw err;
		
		// Iterate in PLCs
		PLC_result.forEach(plc => {
			plc_array.push(plc);
			var ADDRESS_sql = "SELECT * FROM Device_Description WHERE PLC_ID = " + plc.PLC_ID
            con.query(ADDRESS_sql, function (err, ADDRESS_result, fields) {
				var tags = [];

				if (err) throw err;

				// Empty the tag file if exists;
				fs.writeFile('t' + plc.PLC_ID + '.txt','', function(err) {
					// If an error occurred, show it and return
					if(err) return console.error(err);
				});

				var count = 0;
				// Iterate in addresses of plc
				async.map(ADDRESS_result, function(ADDRESS, callback) {
					count++;

					fs.appendFile('t' + plc.PLC_ID + '.txt', ADDRESS.Label + '=' + ADDRESS.Label + ',1\n', function(err) {
						// If an error occurred, show it and return
						if(err) return console.error(err);
						// console.log(ADDRESS.Label + ' written to ' + 't' + plc.PLC_ID + '.txt');
						
						
						
					});
					tags.push('P' + plc.PLC_ID + '/' + ADDRESS.Label);
					if(count == ADDRESS_result.length) {
						console.log(tags)
						// Empty the tag file if exists;
						fs.writeFile('tags' + plc.PLC_ID + '.txt',tags, function(err) {
							// If an error occurred, show it and return
							if(err) return console.error(err);
						});
						config = { tagFileDir: '.', controllers: [ { host: plc.IP, connection_name: 'P' + plc.PLC_ID, port: 1281, slot: 1, type: 'mcprotocol', tagfile: './t' + plc.PLC_ID + '.txt' } ] } ;
						honcho.configure(config, function(){ honcho.createSubscription(tags, readDone, 10000); });
					}
					else (
						console.log('Not equal')
					)
				}, function(err, results) {
				});
					
				
	
				
			});
			
			
		
		});


		function readDone(err, vars) {
			console.log(vars);
			// Or stream to a Websocket, etc
		}
		

	});
	

});