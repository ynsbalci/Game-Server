/**
 * @Author: Yunus BALCI
 * @Date:   2017-10-20T22:06:11+03:00
 * @Email:  ynsbalci@outlook.com
 * @Filename: server.js
 * @Last modified by:   Yunus BALCI
 * @Last modified time: 2017-10-31T19:58:15+03:00
 */


 var io = require('socket.io')(8000);
 var playerId = require('shortid');
 var roomId = require('shortid');

 var players=[];
 var usableRooms=[];

 console.log('\x1b[33m%s\x1b[0m',">> SERVER IS RUNNING");


 io.sockets.on('connection', function(socket) {

   var player = {
     id:playerId.generate(),
     nick:null,
     veh_id:0,
     spawn:false,
   };

   var room = null;

   players.push(player);

   //
   socket.emit('CONNECT', player);

   console.log(">> " + player.id + " CONNECTED");

   socket.on('TEST', function (data){
     //
     console.log(">> TEST");
     console.log(data);
     socket.emit('TEST', data);
   });

   //
   socket.on('JOIN_ROOM', function (data){
     //daha önce katılmışsa
     //console.log("JOIN_ROOM " + data.type);
     if (room == null) {
       //
       room = JoinRoom(data);
       //odaya gir
       if (room) {
         room.players.push(player);
         socket.join(room.Id);
         socket.emit('JOIN_ROOM', room);
         console.log(">> JOINED " + room.id + " " + room.name + " " + room.pass + " " + room.max + " " + room.players.length);

       }
       else {
         console.log(">> JOIN_ROOM_ERROR");
         socket.emit('JOIN_ROOM_ERROR', data);
       }
     }
     else {
       console.log(">> I HAVE ONE ROOM");
     }

   });

   //
   socket.on('JOIN_RANDOM', function (data){
     //daha önce katılmamış sa
     //console.log("JOIN_RANDOM " + data.type);
     if (room == null) {

       room = JoinRandom(data);
       //odaya gir
       if (room) {
         room.players.push(player);
         socket.join(room.Id);
         socket.emit('JOIN_ROOM', room);
         console.log(">> JOINED " + room.id + " " + room.name + " " + room.pass + " " + room.type + " " + room.max + " " + room.players.length);

       }
       else {
         console.log(">> JOIN_RANDOM_ERROR" + data.type);
         socket.emit('JOIN_ROOM_ERROR', data);
       }
     }
     else {
       console.log(">> I HAVE ONE ROOM");
     }

   });

   //
   socket.on('CREATE_ROOM', function (data){
     //
     if (room == null) {
       room = CreateRoom(data);

       if (room != null) {

         //socket.emit('CREATE_ROOM', room);
         console.log(">> CREATED " + room.id + " " + room.name + " " + room.pass + " " + room.type + " " + room.max + " " + room.players.length);

         //room a katılım
         room.players.push(player);
         socket.join(room.Id);
         socket.emit('JOIN_ROOM', room);
         console.log(">> JOINED " + room.id + " " + room.name + " " + room.pass + " " + room.type + " " + room.max + " " + room.players.length);

       }
     }
     else {
       console.log(">> I HAVE ONE ROOM");
     }

   });

   //
   socket.on('JOIN_OR_CREATE_ROOM', function (data){
     //
     //
   });

   //
   socket.on('SPAWN', function (data){
     //
     console.log(">> SPAWNED " + player.id);

     player.nick = data.nick;
     player.veh_id = data.veh_id;

     for (var i = 0; i < room.players.length; i++) {
       if(room.players[i].spawn){
         //
         socket.emit('USER_CONNECTED', room.players[i]);
       }
     }
     socket.emit('SPAWN', player);
     player.spawn = true;
     socket.broadcast.to(room.id).emit('USER_CONNECTED',player);

     if (StartGame(room)) {
       //
       io.sockets.to(room.id).emit('START', room);
     }

   });

   //
   socket.on('MOVE', function (data){
     //console.log(">> MOVE: " + player.id + " " + room.id + " " + data.pos);
     socket.broadcast.to(room.id).emit('MOVE', {
       id: player.id,
       pos: data.pos,
       rot: data.rot
     });
   });

   //
   socket.on('FINISH', function (data){
     console.log(">> FINISH");
     console.log(data);
     io.sockets.to(room.id).emit('FINISH', {
       id: player.id,
       nick: player.nick,
       score: data.score
     });
   });

  //
  socket.on('EXIT', function (){
		console.log(">>EXIT");
    //oda ya katılmışsa
    if (room) {
      //
      console.log(">> " + player + " EXITED FROM " + room.id);
      RemoveInRoom(room, player);

      if (room.players.length == 0) {
        //
        DeleteRoom(room);
      }
      //
      socket.emit('EXIT');
      socket.broadcast.to(room.id).emit('DISCONNECTED', {
        id: player.id
      });
      room = null;


    }else {
      console.log(">> NO ROOM");
    }
  });

  //
  socket.on('ROOM_LIST', function (){
		//
		console.log(">> ROOM_LIST: " + usableRooms.length);
    for (var i = 0; i < usableRooms.length; i++) {
      socket.emit('ROOM_LIST', usableRooms[i]);
    }

	});

  //
  socket.on('PLAYER_LIST', function (){

		console.log(">> PLAYER_LIST: " + players.length);
		for (var i = 0; i < players.length; i++) {
			socket.emit('PLAYER_LIST', {
				id: players[i].id,
				nick: players[i].nick
			});
		}
	});

  //
  socket.on('PLAYERS_IN_ROOM', function (){
    if (room) {
      console.log(">> PLAYERS_IN_ROOM: " + room.players.length);
      for (var i = 0; i < room.players.length; i++) {
        socket.emit('PLAYERS_IN_ROOM', {
          id: room.players[i].id,
          nick: room.players[i].nick
        });
      }
    }else {
      console.log(">> NO ROOM");
    }
  });

  //
  socket.on('disconnect', function (){
    //
    if (room) {
      RemoveInRoom(room, player);
      if (room.players.length == 0) {
        //
        DeleteRoom(room);
      }
    }
    DeleteInPlayers(player);

  });


 });

 //FUNCTIONS
 function JoinRoom(data) {
   //
   for (var i = 0; i < usableRooms.length; i++) {

     if (usableRooms[i].id != data.id) {
       return null;
     }
     else if (usableRooms[i].players.length > parseInt(usableRooms[i].max)) {
       //hata var
       return null;
     }
     else if (usableRooms[i].pass != data.pass) {
       return null;
     }
     else{
       return  usableRooms[i];
     }//else
   }//for
 }//function

 function JoinRandom(data) {
   //
   if (usableRooms.length > 0) {

   for (var i = 0; i < usableRooms.length; i++) {

     if (usableRooms[i].type == data.type) {
       return usableRooms[i];
       break;
     }

   }//for
 }else {
   return null;
 }
 }//function

 function CreateRoom(data) {
   try {
     var room = {
       id:roomId.generate(),
       name:data.name,
       pass:data.pass,
       ready:null,
       max:data.max,
       scene:data.scene,
       type:data.type,
       players:[],
     };
     usableRooms.push(room);
     return room;
   } catch (e) {
     return null
   }
 }

 function StartGame(room) {
   //
   for (var i = 0; i < room.players.length; i++) {
     if (!room.players[i].spawn) {
       return false;
     }
   }
   return true;

 }

 function RemoveInRoom(room, player) {
   console.log(">> " + player.id + " REMOVED FROM " + room.id);
   room.players.splice(room.players.indexOf(player), 1);
   console.log(">> PLAYERS.IN.ROOM: " + room.players.length);
 }

 function DeleteRoom(room) {
   console.log(">> " + room.id + "DELETED");
   usableRooms.splice(usableRooms.indexOf(room), 1);
   console.log(">> ROOMS.LENGTH: " + usableRooms.length);
 }

 function DeleteInPlayers(player) {
   console.log(">> " + player.id + " DISCONNECTED");
   players.splice(players.indexOf(player), 1);
   console.log(">> PLAYERS.LENGTH: " + players.length);
 }
