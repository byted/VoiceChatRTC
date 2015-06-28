var server = require('http').createServer()
	, webRTC = require('webrtc.io').listen(server);

var port = process.env.PORT || 8090;
server.listen(port);