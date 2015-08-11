var path = require('path')
    , url = require('url')
	, http = require('http')
	, fs = require('fs')
	, webrtcIO = require('webrtc.io');

var HTMLFILE = '/index.html'
	, CSSFILE = '/voiceChatRTC.css'
	, JSFILE = '/voiceChatRTC.js'
	, WEBRTCIOFILE = '/node_modules/webrtc.io-client/lib/webrtc.io.js';

var server = http.createServer(function (req, res) {
	var uri = url.parse(req.url).pathname;
	uri = uri === '/' ? HTMLFILE : uri;
	var mimeTypes = {
	    "html": "text/html",
	    "js": "text/javascript",
	    "css": "text/css"
	};

	function errorResponse() {
		res.writeHead(200, {'Content-Type': 'text/plain'});
	    res.write('404 Not Found\n');
	    res.end();
	}
		console.log(uri);

	if(uri === WEBRTCIOFILE || uri === HTMLFILE || uri === CSSFILE || uri === JSFILE) {
		var filename = path.join(process.cwd(), uri);
		console.log(filename);
		fs.exists(filename, function(exists) {
	        if(!exists) {
	            console.log("file not exist: " + filename);
	            errorResponse();
	            return;
	        }
	        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
	        res.writeHead(200, mimeType);

	        var fileStream = fs.createReadStream(filename);
	        fileStream.pipe(res);
	    });
	} else { errorResponse(); }
});

var webRTC = webrtcIO.listen(server);


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