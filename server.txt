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
global.plc_length = 0;

function writefiles(){
	global.done = false;
	// Connect to Database
	con.connect(function(err) {
		if (err) throw err;
		console.log('\x1b[32m%s\x1b[0m', "Database " + databaseObject.database + " connected!");
		var plc_array = [];

		// Read PLCs from database
		var plcs_read_sql = "SELECT * FROM PLCs"
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
							console.log(ADDRESS.Label + ' written to ' + 't' + plc.PLC_ID + '.txt');		
						});
						tags.push('P' + plc.PLC_ID + '/' + ADDRESS.Label);
						if(count == ADDRESS_result.length) {
							// write tags array to a file;
							fs.writeFile('tags' + plc.PLC_ID + '.txt',tags, function(err) {
								// If an error occurred, show it and return
								if(err) return console.error(err);
								console.log('Tags ' + tags + ' written to file tags' + plc.PLC_ID + '.txt');
							});
							
						}
					}, function(err, results) {
					});
					
				});

			});
			
		});

	});

}

writefiles();
setTimeout(connect_plcs, 1000);

function connect_plcs(){

	// Read PLCs from database
	var plcs_read_sql = "SELECT * FROM PLCs"
	con.query(plcs_read_sql, function (err, PLC_result, fields) {
		if (err) throw err;
		var config = [];
		var plc_freq = [];
		// Iterate in PLCs
		PLC_result.forEach(plc => {
			config.push({ tagFileDir: '.', controllers: [ { host: plc.IP, connection_name: 'P'+plc.PLC_ID, port: 1281, slot: 1, type: 'mcprotocol', tagfile: './t'+plc.PLC_ID+'.txt' } ] }) ;
			plc_freq.push(plc.Frequency)
			global.config = config;
			global.plc = plc;
			
		});

		for(var i = 0; i<PLC_result.length;i++){
			(function(i){
				setTimeout(function(){
					fs.readFile('tags'+(i+1)+'.txt', 'utf8', (err, data) => {
						if (err) throw err;
						tags = data.split(",");
						honcho.configure(config[i], function(){ honcho.createSubscription(tags, readDone, plc_freq[i]); });
					});
			  }, 200 * i)
			 })(i);
			
		}

	});

	function readDone(err, vars) {

		// Get current date and time
		dateTime = GetDateTime();

		// Get address value
		const address_vallues_array = Object.entries(vars)
		address_vallues_array.forEach(address_vallue => {

		// Add address log to Mysql table
		AddValue(address_vallue, dateTime)
		})

	}

	// Function to get date and time
	function GetDateTime(){
		var today = new Date();
		var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
		var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
		var dateTime = date+' '+time;
		return dateTime
	}

	// Function to insert label, value and dateTime to table Device_Log
	function AddValue(add_val, datetime){
		var plc_address_array = add_val[0].split("/");
		plc_p = plc_address_array[0];
		plc_str = plc_p.substr(1);

		// Parse the plc value from string to int to be inserted in database
		plc = parseInt(plc_str);
		label = plc_address_array[1];
		value_str = add_val[1];

		// Convert boolean true/false value to boolean 1/0 to be inserted in database
		if(value_str === true){
			value_str = 1;
		} else if(value_str === false){
			value_str = 0;
		}

		// parse value from int to float (not necessary, just in case of future error as our datatype in database is set to float)
		value = parseFloat(value_str);
		
		// console.log('PLC: ' + plc_str + ' \tAddress: ' + label + '\tValue: ' + value + '\tDate_Time: ' + datetime);

		// Query to insert to database
		var sql = "INSERT INTO Device_Log (PLC_ID, Label, Value, Date_Time) VALUES (" + plc + ", '" + label + "', '" + value + "', '" + datetime + "')";
		con.query(sql, function (err, result) {
			if (err) throw err;
			console.log("Value " + value + " inserted to PLC " + plc + " table " + label + ' at ' + datetime);
		});
	}
}
