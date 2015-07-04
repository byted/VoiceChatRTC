var server = require('http').createServer()
	, webRTC = require('webrtc.io').listen(server);

webRTC.rtc.on('userInfoUpdate', function(info, socket) {
	console.log('[userInfoUpdate]:', info)
	socket.username = info.username;
	socket.isMicMuted = info.micMuted;
	socket.areSpeakersMuted = info.areSpeakersMuted;
	console.log('[userInfoUpdate]:', socket.id, 'was updated.');

	info.socketId = socket.id;
	// find the room the user belongs to
	var listOfSocketsInRoom;
	for(var room in webRTC.rtc.rooms) {
		if (webRTC.rtc.rooms.hasOwnProperty(room)
			&& webRTC.rtc.rooms[room].indexOf(socket.id) >= 0) {

			listOfSocketsInRoom = webRTC.rtc.rooms[room];
			break;
		}
	}

	listOfSocketsInRoom.forEach(function(socketId) {
		if(socketId !== socket.id) {
			webRTC.rtc.getSocket(socketId).send(JSON.stringify({
				eventName: 'userInfoUpdate',
				data: info
			}), function(error) {
	            if (error) {console.log(error);}
	            else { console.log('[userInfoUpdate]: sent update to', socketId); }
          	});
		}
	});
});


// webRTC.on('connection', function(ws) {
// 	ws.on('message', function(json) {
// 		var data = JSON.parse(json);
// 		if(data.type === 'game') {
// 			//we expect properties 'company', 'role', 'action' on 'payload'
// 			console.log('got ingame message from', ws.id, ': ');
// 			console.log(data.payload);

// 			webRTC.rtc.sockets.forEach(function each(client) {
// 				console.log('send out to', client.id, ':', JSON.stringify(data.payload));
// 				client.send(JSON.stringify({
// 					eventName: 'game update',
// 					data: data.payload
// 				}));
// 				//eventName hinzufügen
// 			});
// 		}		
// 	});
//});

var port = process.env.PORT || 8090;
server.listen(port);