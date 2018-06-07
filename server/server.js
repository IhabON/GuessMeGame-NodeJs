const net = require('net');
var users = []


let server = net.createServer(function(socket) {
	// Increment user id of incoming connections
	guestId++;

	socket.nickname = "Guest_" + guestId;
    var clientName = socket.nickname;
   
    users.push(clientName);

	sockets.push(socket);

    // Broadcast to others excluding this socket
    socket.on('connect', function () {
		status.text('status: online | Click Ready to draw! button to start drawing');
        chatinput.removeProp('disabled');
        chatinput.focus();

        
    });     
    // Log it to the server output
	console.log(clientName + ' joined this chat.\n');
    broadcast(clientName, clientName + ' joined this chat.');

    function PlayTheGame()
    {

        if(users.length < 2)
    {
        PartieComplete = false;
        console.log("il manque des joueur");
    }
    else{
        PartieComplete = true;
        server.emit('userlist', users);
        var	words = [
            "Pomme", "Soleil", "Lune", "Voiture", "Stylo", "Police", "Chien",
            "Son", "Eau", "baguette", "statue", "maison", "main", "vache",
            "loup", "chaise", "poubelle", "monde", "tete", "banane", "ecole",
            "fleure", "champignon", "oeil", "arbre", "ferme", "livre", "mer", "nuit", "jour", 
            "vie", "nord", "sud", "est", "ouest", "mort", "velo", 
            "chat", "guitarre", "pile", "bateau", "Power Rangers", "pied", "ordinateur", "telephone", 
            "internet", "ami", "idea", "poisson", "montagne", "cheval", "montre", "bouclier", "argent", 
            "bois", "list", "oiseau", "body", "famille", "song", "porte", "foret", "vent", "avion", "parachute",
            "pierre", "Captain Planet", "feu", "ours", "roi", "espace", "baleine", "epee", "plume", "pigeon"
        ];

        function newWord() {
            wordcount = Math.floor(Math.random() * (words.length));
            return words[wordcount];
        };

         // if the user is first to join OR 'drawer' room has no connections
         if (users.length == 1 || typeof io.sockets.adapter.rooms['drawer'] === 'undefined') {
    
            // place user into 'drawer' room
            socket.join('drawer');

            // server submits the 'drawer' event to this user
            server.in(socket.username).emit('drawer', socket.username);
            console.log(socket.username + ' is a drawer');

            // send the random word to the user inside the 'drawer' room
            server.in(socket.username).emit('draw word', newWord());
        //	console.log(socket.username + "'s draw word (join event): " + newWord());
        } 

        // if there are more than one names in users 
        // or there is a person in drawer room..
        else {

            // additional users will join the 'guesser' room
            socket.join('guesser');

            // server submits the 'guesser' event to this user
            server.in(socket.username).emit('guesser', socket.username);
            console.log(socket.username + ' is a guesser');
        }
    
        // update all clients with the list of users
        server.emit('userlist', users);

        // submit drawing on canvas to other clients
        socket.on('draw', function(obj) {
            socket.broadcast.emit('draw', obj);
        });
    
        // submit each client's guesses to all clients
        socket.on('guessword', function(data) {
            server.emit('guessword', { username: data.username, guessword: data.guessword})
            console.log('guessword event triggered on server from: ' + data.username + ' with word: ' + data.guessword);
        });
    
        
    }
    }

    function LancerPartie(){
        PlayTheGame();
    }
    

	// When client sends data
	socket.on('data', function(data) {
		var message = clientName + '> ' + data.toString();
		broadcast(clientName, message);
		// Log it to the server output
		process.stdout.write(message + "\n");
    });
    
    socket.on('new drawer', function(name) {
    
        // remove user from 'guesser' room
        socket.leave('guesser');

        // place user into 'drawer' room
        socket.join('drawer');
        console.log('new drawer emit: ' + name);

        // submit 'drawer' event to the same user
        socket.emit('drawer', name);
        
        // send a random word to the user connected to 'drawer' room
        server.in('drawer').emit('draw word', newWord());
    
    });

    // initiated from drawer's 'dblclick' event in Player list
    socket.on('swap rooms', function(data) {

        // drawer leaves 'drawer' room and joins 'guesser' room
        socket.leave('drawer');
        socket.join('guesser');

        // submit 'guesser' event to this user
        socket.emit('guesser', socket.username);

        // submit 'drawer' event to the name of user that was doubleclicked
        server.in(data.to).emit('drawer', data.to);

        // submit random word to new user drawer
        server.in(data.to).emit('draw word', newWord());
    
        server.emit('reset', data.to);

    });

    socket.on('correct answer', function(data) {
        server.emit('correct answer', data);
        console.log(data.username + ' guessed correctly with ' + data.guessword);
    });

    socket.on('clear screen', function(name) {
        server.emit('clear screen', name);
    });

	// When client leaves
	socket.on('end', function() {
		var message = clientName + ' left this chat\n';
		// Log it to the server output
		process.stdout.write(message);
		// Remove client from socket array
		removeSocket(socket);
		// Notify all clients
        broadcast(clientName, message);
        
        for (var i = 0; i < users.length; i++) {

            // remove user from users list
            if (users[i] == socket.username) {
                users.splice(i, 1);
            };
        };
        console.log(socket.username + ' has disconnected.');

        // submit updated users list to all clients
        server.emit('userlist', users);

        // if 'drawer' room has no connections..
        if ( typeof io.sockets.adapter.rooms['drawer'] === "undefined") {
            
            // generate random number based on length of users list
            var x = Math.floor(Math.random() * (users.length));
            console.log(users[x]);

            // submit new drawer event to the random user in userslist
            server.in(users[x]).emit('new drawer', users[x]);
        };
    });

	// When socket gets errors
	socket.on('error', function(error) {
		console.log('Socket got problems: ', error.message);
	});
});


// Broadcast to others, excluding the sender
function broadcast(from, message) {
	// If there are no sockets, then don't broadcast any messages
	if (sockets.length === 0) {
		process.stdout.write('Everyone left the chat\n');
		return;
	}

	// If there are clients remaining then broadcast message
	sockets.forEach(function(socket, index, array){
		// Dont send any messages to the sender
		if(socket.nickname === from) return;
		socket.write(message);
	});

};

// Remove disconnected client from sockets array
function removeSocket(socket) {
	sockets.splice(sockets.indexOf(socket), 1);
};



// Listening for any problems with the server
server.on('error', function(error) {
	console.log("So we got problems!", error.message);
});

// Listen for a port to telnet to
// then in the terminal just run 'telnet localhost [port]'
server.listen(port, function() {
	console.log("Server listening at http://localhost:" + port);
});

/////
const LancerPartie = () => {
    PlayTheGame();
    ;}

/////
/////

    

