var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var userCount = 0;

var fs = require("fs");
var db_file_name = "chats.db";
// var exists = fs.existsSync(db_file_name);

// if(!exists) {
//   console.log("Creating DB file.");
//   fs.openSync(db_file_name, "w");
// }

var sqlite3 = require("sqlite3").verbose();
var database = new sqlite3.Database(db_file_name);


app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

database.serialize(function() {
  // if(!exists) {
  //   database.run("CREATE TABLE chats (text TEXT, time TEXT)");
  // }
	io.on('connection', function(socket) {
		userCount += 1;
		var fName, lName;
		console.log('A user ' + userCount + ' connected.');
		socket.on('login', function(FName, LName) {
			fName = FName;
			lName = LName;
			console.log('User Name: ' + fName + ' ' + lName + ', User #' + userCount);
			database.each("SELECT rowid AS id, first, last, text, time FROM chats", function(err, row) {
				socket.emit('chat history', row.first, row.last, row.text, row.time);
			});
		});
		socket.on('chat message', function(f, l, msg, time) {
			var stmt = database.prepare("INSERT INTO chats VALUES (?, ?, ? ,?)");
			stmt.run(f, l, msg, time);
			stmt.finalize();
			// database.run("INSERT INTO chats VALUES (\"" + f + "\",\"" + l + "\",\"" + msg + "\",\"" + time + "\")");
			console.log('Message: ' + f + ' | ' + l + ' | ' + msg + ' | ' + time);
			io.emit('chat message', f, l, msg, time);
		});
		socket.on('disconnect', function() {
			console.log('User #' + userCount + ': ' + fName + ' ' + lName + ' disconnected.');
		});
	});
});
// database.close();

http.listen(51717, function() {
  console.log('Listening on *:51717');
  console.log("Creating DB file."); // Maybe want to use old db if server closes by mistake
  fs.openSync(db_file_name, "w");
  database.run("CREATE TABLE chats (first TEXT, last TEXT, text TEXT, time TEXT)");
});

