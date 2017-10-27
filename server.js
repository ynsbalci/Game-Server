/**
 * @Author: Yunus BALCI
 * @Date:   2017-10-20T22:06:11+03:00
 * @Email:  ynsbalci@outlook.com
 * @Filename: server.js
 * @Last modified by:   Yunus BALCI
 * @Last modified time: 2017-10-27T23:27:09+03:00
 */



var io              = require('socket.io')(8000);
var userId          = require('shortid');
var roomId          = require('shortid');

var players = [];
var usableRooms = [];
var fullRooms = [];


console.log(">> Server Is Runing");

io.sockets.on('connection', function(socket) {

    var currentPlayer = {
    	playerId: userId.generate(),
    	playerNick:"",
    	playerVehicleId:"",
    };

    var currentRoom = {
      roomId:"",
		  roomName:"",
  		roomPassword:"",
  		roomReady:0,
  		roomSpawned:0,
  		roomMaxSize:0,
  		roomLevelId:"",
  		roomUsers:[]
    };

	players[currentPlayer.playerId] = currentPlayer;
	players.push(currentPlayer);

  console.log(">> " + currentPlayer.playerId + " Connected");
  console.log(">> Players Length: " + players.length)

  socket.emit('CONNECT', currentPlayer)

	socket.on('JOIN_OR_CREATE_ROOM', function (data){
	   console.log(">> JOIN_OR_CREATE_ROOM");
	   console.log("usableRooms: " + usableRooms.length);

	   var isJoined = false;
	   if (usableRooms.length > 0) {
		     JoinRoom(data);
	   }
     else {
       console.log("bos oda yok");
     }

	/*if (!isJoined) {

		currentRoom.roomId = roomId.generate();
		currentRoom.roomName = data.roomName;
		currentRoom.roomPassword = data.roomPassword;
		currentRoom.roomMaxSize = data.roomMaxSize;
		currentRoom.roomLevelId = data.roomLevelId;
		currentRoom.roomUsers = [];
		currentRoom.roomUsers.push(currentPlayer);

		socket.join(currentRoom.roomId);
		usableRooms.push(currentRoom);

		socket.emit('JOIN_OR_CREATE_ROOM', currentRoom);
		console.log("CREATED " + currentRoom.roomId + " " + currentRoom.roomName + " " + currentRoom.roomPassword + " " + currentRoom.roomUsers.length);
	}*/

	});



  socket.on('JOIN_ROOM', function (data){
    //
    if (usableRooms.length > 0) {
      //
      JoinRoom(data);
  	}
    else {
      //
      socket.emit('JOIN_ROOM_ERROR', "no founs room");
    }

  });


  socket.on('CREATE_ROOM', function (data){
    //
    currentRoom.roomId = roomId.generate();
		currentRoom.roomName = data.roomName;
		currentRoom.roomPassword = data.roomPassword;
		currentRoom.roomMaxSize = data.roomMaxSize;
		currentRoom.roomLevelId = data.roomLevelId;
		currentRoom.roomUsers = [];
		currentRoom.roomUsers.push(currentPlayer);

		socket.join(currentRoom.roomId);
		usableRooms.push(currentRoom);

		socket.emit('CREATE_ROOM', currentRoom);
		console.log("CREATED " + currentRoom.roomId + " " + currentRoom.roomName + " " + currentRoom.roomPassword + " " + currentRoom.roomUsers.length);

  });


  socket.on('JOIN_OR_CREATE_ROOM', function (data){

	console.log(">> JOIN_OR_CREATE_ROOM");

	console.log("usableRooms: " + usableRooms.length);

	var isJoined = false;

	for (var i = 0; i < usableRooms.length; i++) {

		if (usableRooms.length > 0) {
				//

			if (usableRooms[i].roomUsers.length < parseInt(usableRooms[i].roomMaxSize) && usableRooms[i].roomName == data.roomName && usableRooms[i].roomPassword == data.roomPassword) {
					//

				usableRooms[i].roomUsers.push(currentPlayer);
				socket.join(usableRooms[i].roomId);

				currentRoom = usableRooms[i];

				socket.emit('JOIN_OR_CREATE_ROOM', currentRoom);
				console.log("JOINED " + currentRoom.roomId + " " + currentRoom.roomName + " " + currentRoom.roomPassword + " " + currentRoom.roomMaxSize + " " + currentRoom.roomUsers.length);

				isJoined = true;
				break;
			}
		}
	}
	if (!isJoined) {

		currentRoom.roomId = roomId.generate();
		currentRoom.roomName = data.roomName;
		currentRoom.roomPassword = data.roomPassword;
		currentRoom.roomMaxSize = data.roomMaxSize;
		currentRoom.roomLevelId = data.roomLevelId;
		currentRoom.roomUsers = [];
		currentRoom.roomUsers.push(currentPlayer);

		socket.join(currentRoom.roomId);
		usableRooms.push(currentRoom);

		socket.emit('JOIN_OR_CREATE_ROOM', currentRoom);
		console.log("CREATED " + currentRoom.roomId + " " + currentRoom.roomName + " " + currentRoom.roomPassword + " " + currentRoom.roomUsers.length);
	}

	});


	socket.on('READY', function (data){

		currentRoom.roomReady++;
		if (currentRoom.roomReady == parseInt(currentRoom.roomMaxSize)) {
			//
			io.sockets.to(currentRoom.roomId).emit('READY', currentRoom);
			console.log(">> READY");

			//allRooms.push(usableRooms.pop(usableRooms));
		}

		for (var i = 0; i < usableRooms.length; i++) {
			console.log("READY: " + usableRooms[i].roomReady + " " + currentRoom.roomReady)
		}


	});

    socket.on('SPAWN', function (data){

		console.log(">> SPAWN");

		currentPlayer.playerNick = data.playerNick;
		currentPlayer.playerVehicleId = data.playerVehicleId;

		socket.emit('SPAWN', currentPlayer)

		socket.broadcast.to(currentRoom.roomId).emit('USER_CONNECTED',currentPlayer);

		//düzeltilcek
		for (var i = 0; i < currentRoom.roomUsers.length; i++) {
			//
			if (currentRoom.roomUsers[i] != currentPlayer) {
				//
				socket.emit('USER_CONNECTED', currentRoom.roomUsers[i])
			}

		}


		currentRoom.roomSpawned++;

		if (currentRoom.roomSpawned == parseInt(currentRoom.roomMaxSize)) {
			//
			io.sockets.to(currentRoom.roomId).emit('START', currentRoom);
			console.log(currentRoom.roomId + " Game Started");
		}


	});

    socket.on('MOVE', function (data){

		socket.broadcast.to(currentRoom.roomId).emit('MOVE', {

			playerId: currentPlayer.playerId,
			playerPosition: data.playerPosition,
			playerRotation: data.playerRotation
		});

	});

	socket.on('SCORE', function (data){

		io.sockets.to(currentRoom.roomId).emit('SCORE', {
			playerId: currentPlayer.playerId,
			playerOrder: data.playerOrder,
			playerScore: data.playerScore
		});

	});

	socket.on('PLAYER_LIST_IN_ROOMS', function (){

		for (var roomUsers in currentRoom.roomUsers) {

			socket.emit('PLAYER_LIST_IN_ROOMS', {
				playerId: roomUsers.playerId,
				playerNick: roomUsers.playerNick
			});
		}
	});

	socket.on('PLAYER_LIST_ALL', function (){

		console.log(">> PLAYER_LIST_ALL");

		for (var i = 0; i < players.length; i++) {
			socket.emit('PLAYER_LIST_ALL', {
				playerId: players[i].playerId,
				playerNick: players[i].playerNick

			});
		}
	});

	socket.on('ROOM_LIST', function (){
		//
		console.log(">> ROOM_LIST: " + usableRooms.length);
		for (var i = 0; i < usableRooms.length; i++) {
			socket.emit('ROOM_LIST', usableRooms[i]);
		}


	});

	socket.on('EXIT', function (){
		//odadan sildim
		console.log("EXIT");
		for (var i = 0; i < usableRooms.length; i++) {
			if (usableRooms[i] == currentRoom) {
				//
				for (var j = 0; j < usableRooms[i].roomUsers.length; j++) {
					if (usableRooms[i].roomUsers[j] == currentPlayer) {
						//
						console.log("odadan sildim");
						usableRooms[i].roomUsers.splice(j, 1);
					}
				}
				if (usableRooms[i].roomUsers == 0) {
					//
					console.log("odayı sildim");
					usableRooms.splice(i, 1)
				}
			}
		}

		socket.emit('EXIT');

	});

	socket.on('disconnect', function (){

		//players dan sildim
		console.log(">> disconnect");
		for (var i = 0; i < players.length; i++) {
			if (players[i].playerId == currentPlayer.playerId) {
				//
				players.splice(i,1);
				console.log("player sildim");
			}
		}

		//odadan sildim
		for (var i = 0; i < usableRooms.length; i++) {
			if (usableRooms[i] == currentRoom) {
				//
				for (var j = 0; j < usableRooms[i].roomUsers.length; j++) {
					if (usableRooms[i].roomUsers[j] == currentPlayer) {
						//
						console.log("odadan sildim");
						usableRooms[i].roomUsers.splice(j, 1);
					}
				}
				if (usableRooms[i].roomUsers == 0) {
					//
					console.log("odayı sildim");
					usableRooms.splice(i, 1)
				}
			}
		}

		socket.broadcast.to(currentRoom.roomId).emit('DISCONNECTED', {
			playerId: currentPlayer.playerId
		});

	});

});

function JoinRoom(socket, data) {
  console.log("JoinRoom");
  for (var i = 0; i < usableRooms.length; i++) {

    if (usableRooms[i].roomId != data.roomId) {
      socket.emit('JOIN_ROOM_ERROR', "room not found!");
    }
    else if (usableRooms[i].roomName != data.roomName) {
      socket.emit('JOIN_ROOM_ERROR', "room name wrong!")
    }
    else if (usableRooms[i].roomUsers.length > parseInt(usableRooms[i].roomMaxSize)) {
      //hata var
      socket.emit('JOIN_ROOM_ERROR', "room is full!")
    }
    else if (usableRooms[i].roomPassword != data.roomPassword) {
      socket.emit('JOIN_ROOM_ERROR', "room password wrong!")
    }
    else{
      //herşey yolunda
      usableRooms[i].roomUsers.push(currentPlayer);
      socket.join(usableRooms[i].roomId);
      currentRoom = usableRooms[i];
      socket.emit('JOIN_ROOM', currentRoom);
      console.log("JOINED " + currentRoom.roomId + " " + currentRoom.roomName + " " + currentRoom.roomPassword + " " + currentRoom.roomMaxSize + " " + currentRoom.roomUsers.length);
    }
  }
}
