var server = require('http').createServer()
	, webRTC = require('webrtc.io').listen(server);


function sendToOthers(srcSocket, data) {
	var listOfSocketsInRoom = webRTC.rtc.rooms[srcSocket.room];
	if(listOfSocketsInRoom) {
		listOfSocketsInRoom.forEach(function(socketId) {
			if(socketId !== srcSocket.id) {
				webRTC.rtc.getSocket(socketId).send(JSON.stringify(data)), function(error) {
		            if (error) {console.log(error);}
		            else { console.log('[userInfoUpdate]: sent update to', socketId); }
	          	};
			}
		});
	}
	else { console.log('WARNING: room', srcSocket.room, 'not found'); }
}

webRTC.rtc.on('join_room', function(data, socket) {
	console.log(data.room);
	socket.room = data.room;

	//for each registered user, send userInfo to newly connected user
	webRTC.rtc.rooms[socket.room].forEach(function(registeredSocketId) {
		if(registeredSocketId !== socket.id) {
			var registeredSocket = webRTC.rtc.getSocket(registeredSocketId);
			socket.send(JSON.stringify({
					eventName: 'userInfoUpdate',
					data: {
						username: registeredSocket.username,
						isMicMuted: registeredSocket.isMicMuted,
						areSpeakersMuted: registeredSocket.areSpeakersMuted,
						socketId: registeredSocket.id
					}
			}));
		}
	});
});

webRTC.rtc.on('userInfoUpdate', function(info, socket) {
	console.log('[userInfoUpdate]:', info)
	socket.username = info.username;
	socket.isMicMuted = info.isMicMuted;
	socket.areSpeakersMuted = info.areSpeakersMuted;
	console.log('[userInfoUpdate]:', socket.id, 'was updated.');

	info.socketId = socket.id;
	sendToOthers(socket, {eventName: 'userInfoUpdate', data: info});
});

var port = process.env.PORT || 8090;
server.listen(port);