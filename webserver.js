/**
 * This file contains the webserver code for FSE chat room project. The code is
 * written in node.js and make use of the following packages:-
 * 1. express
 * 2. http
 * 3. socket.io
 * 4. sqlite3
 * 5. file system
 */

var application = require('express')(); // variable 'application' stores 
                                        // reference to express package.

var http = require('http').Server(application); // variable 'http' stores
                                                // reference to http pacakge.

var io = require('socket.io')(http); // variable 'io' stores reference to
                                     // socket.io package.

var fs = require("fs"); // variable 'fs' to store the reference to file
                        // system package. 

var sqlite3 = require("sqlite3").verbose(); // variable 'sqlite3' stores the 
                                            // reference of the sqlite 
                                            // package.

var userCount = 0; // variale to store the total number of users connected 
                   // to the webserver.

var db_file_name = "chats.db"; // variable 'db_file_name' stores the 
                               // name of the database file.

var database = new sqlite3.Database(db_file_name); // Define a new database 
                                                   // using sqlite package.


/**
 * In response to the user connect request to the localhost at port 51717,
 * send the user an html file named 'index.html'. This file exists in the
 * same directory as the directory where this file exists.
 */
application.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

/**
 * Ths is the function where all the processing of the user requests are 
 * handled by the webserver. This function makes use to the socket.io 
 * infrastruture, to perform the following functions:-
 *
 * 1. Listen for new user connect reqests.
 * 2. Once a user logs in with his first name and last name on a socket, the 
 *    webserve looks up the database for all the chats that have happended 
 *    till date and sends them to the user on the same socket.
 * 3. If the webserver receives a chat message from a user, then the 
 *    webserver stores the chat message in the database and broadcasts the chat
 *    message to all the users that are currently connected to the webserver.
 * 4. If the user disconnects, the webserver, simply logs a message on the 
 *    console. 
 */
database.serialize(function() {

    /**
     * Handle user login request chat messages on the socket.
     */
    io.on('connection', function(socket) {
        
        /*
         * Increment the number of users currently connected.
         */
        userCount += 1;

        /*
         * Log a message on the console for debugging.
         */
		console.log('A user ' + userCount + ' connected.');

		var fName, lName;

        /*
         * Listen for event named "login" on the socket and handle the 
         * data received as a part of the login event.
         */
		socket.on('login', function(FName, LName) {

            /*
             * Store the firstname and lastname into the local variables.
             * 
             */
			fName = FName;
			lName = LName;

            /*
             * Log a message on the console for debugging.
             */
			console.log('User Name: ' + fName + ' ' + lName + ', User #' 
                        + userCount);

            /* 
             * Send the entire chat history to the frst time user. Select all
             * the rows from the database table and send them to the user.
             */
            database.each("SELECT rowid AS id, first, last, text, time FROM chats", 
                          function(err, row) {

                /*
                 * Respond to th user with the event name "chat history" with
                 * the data formatted as "<Firstname>, <Lastname>, 
                 * <contents of the chat>, <timestamp at which the chat was 
                 * generated>"
                 */
                socket.emit('chat history', row.first, row.last, row.text, 
                            row.time);
			});
		});

        /*
         * Listen for event named "chat message" on the socket and handle the 
         * data received as a part of this  event.
         */
		socket.on('chat message', function(f, l, msg, time) {
            
            /*
             * Add the chat received from the user in the format "<Firstname>, 
             * <Lastname>, <contents of the chat>, <timestamp at which the 
             * chat was generated>"
             */
			var stmt = database.prepare("INSERT INTO chats VALUES (?, ?, ? ,?)");
			stmt.run(f, l, msg, time);
			stmt.finalize();

            /*
             * Log a message on the console for debugging.
             */
			console.log('Message: ' + f + ' | ' + l + ' | ' + msg + ' | ' 
                        + time);

            /*
             * Send the chat to all the users who are connected to this 
             * char webserver. The data is formatted as "<Firstname>, 
             * <Lastname>, <contents of the chat>, <timestamp at which the 
             * chat was generated>"
             */
			io.emit('chat message', f, l, msg, time);
		});

        /**   
         * Print the details of the user who got disconnected.
         */
		socket.on('disconnect', function() {

            /*
             * Log a message on the console for debugging.
             */
			console.log('User ' + fName + ' ' + lName + ' disconnected.');
        
            /*
             * Decrement the number of users currently connected.
             */
            userCount -= 1;

            /*
             * Log a message on the console for debugging.
             */
            console.log("Number of users connected are " + userCount);
		});
	});
});

/**
 * This function creates a HTTP server on the localhost and port number
 * 51717. It also creates a database table named chats, once the webserver
 * is started.
 */
http.listen(51717, function() {
  console.log('Listening on *:51717');
  console.log("Creating DB file.");
  fs.openSync(db_file_name, "w");
  database.run("CREATE TABLE chats (first TEXT, last TEXT, text TEXT, time TEXT)");
});

