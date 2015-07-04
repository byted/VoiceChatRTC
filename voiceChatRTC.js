var VoiceChat = (function() {
    var exports = {}
        , participants = []
        , myStream
        , PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection
        , username, isMicMuted, areSpeakersMuted, mySocketId, htmlContainer;

    // HTML related private methods

    function buildHtml() {
        var body = document.getElementsByTagName('body')[0]
            , container = document.createElement('div')
            , infoBar = document.createElement('div')
            , roomLabel = document.createElement('span')
            , roomName = document.createElement('span')
            , buttonBar = document.createElement('div')
            , muteOthersBtn = document.createElement('button')
            , muteMeBtn = document.createElement('button')
            , videoContainer = document.createElement('div')
            , userContainer = document.createElement('ul')

        container.id = 'voiceChat';
        videoContainer.id = 'voiceChat-videos';
        userContainer.id = 'voiceChat-user'
        roomName.id = 'voiceChat-roomName';
        muteOthersBtn.id = 'voiceChat-MuteOthersBtn';
        muteMeBtn.id = 'voiceChat-MuteMeBtn';

        roomLabel.innerText = '';
        roomName.innerText = '';
        infoBar.appendChild(roomLabel);
        infoBar.appendChild(roomName);
        infoBar.appendChild(userContainer);

        muteOthersBtn.textContent = 'Mute';
        muteMeBtn.textContent = 'Disable Mic';
        buttonBar.appendChild(muteOthersBtn);
        buttonBar.appendChild(document.createElement('br'));
        buttonBar.appendChild(muteMeBtn);

        videoContainer.style.height = '0';

        container.appendChild(infoBar);
        container.appendChild(buttonBar);
        container.appendChild(videoContainer);

        body.appendChild(container);
        return {
            container: container,
            roomName: roomName,
            videoContainer: videoContainer,
            muteOthersBtn: muteOthersBtn,
            muteMeBtn: muteMeBtn,
            userContainer: userContainer
        }
    }

    function createUserInfo(socketId) {
        var userInfo = document.createElement('li');
        userInfo.id = 'userInfo' + socketId;
        return userInfo;
    }

    function createVideoTag(socketId) {
        var videoTag = document.createElement('video');
        videoTag.id = 'remote' + socketId;
        videoTag.setAttribute('class', 'voiceChat remoteStream');
        videoTag.setAttribute('autoplay', '');
        return videoTag;
    }

// User operations: adding, removing, etc.

    function addUser(socketId) {
        var videoTag = createVideoTag(socketId)
        , userInfoTag = createUserInfo(socketId);

        htmlContainer.videoContainer.appendChild(videoTag);
        htmlContainer.userContainer.appendChild(userInfoTag); 
        participants.push({
            socketId: socketId,
            videoTag: videoTag,
            userInfoTag: userInfoTag
        });
    }

    function removeUser(socketId) {
        var video = document.getElementById('remote' + socketId);
        if(video) {
            video.parentNode.removeChild(video);
        }

        var userInfo = document.getElementById('userInfo' + socketId);
        if(userInfo) {
            userInfo.parentNode.removeChild(userInfo);
        }

        participants.filter(function(participant) {
            return participant.socketId !== socketId;
        });
    }

    function updateUserInfo(info) {
        var infoElement = document.getElementById('userInfo' + info.socketId);
        infoElement.innerText = info.username;
        infoElement.classList.toggle('micMuted', info.isMicMuted);
        infoElement.classList.toggle('speakersMuted', info.areSpeakersMuted);
    }

    function updateConnectionStatus(socketId) {
        var infoElement = document.getElementById('userInfo' + socketId);
        infoElement.classList.toggle('connected');
    }

// Chat operations: muting etc.

    function toggleMuteOthers() {
        participants.forEach(function(p) {
            p.videoTag.muted = !p.videoTag.muted;
        });
        areSpeakersMuted = participants[0].videoTag.muted || false;
        document.getElementById('voiceChat-MuteOthersBtn').textContent = areSpeakersMuted ? 'Unmute' : 'Mute';
        sendMyUserInfoUpdate();
    }

    function toggleMuteMe() {
        var tracks = myStream.getAudioTracks();
        tracks.forEach(function(track) {
            track.enabled = !track.enabled;
        });
        isMicMuted = !tracks[0].enabled || false;
        document.getElementById('voiceChat-MuteMeBtn').textContent = !isMicMuted ? 'Disable Mic' : 'Enable Mic';
        sendMyUserInfoUpdate();
    }

// Server communication

    function sendMyUserInfoUpdate() {
        var message = {
            eventName: 'userInfoUpdate',
            data: {
                username: username,
                isMicMuted: isMicMuted || null,
                areSpeakersMuted: areSpeakersMuted || null,
            }
        }
        rtc._socket.send(JSON.stringify(message), function(error) {
            if(error) { console.log(error); }
            else { console.log('sent', message)};
        });
    }

// Start the whole thing

    exports.init = function(signalingServer, roomId, user, keepAlive) {
        username = user;
        if(PeerConnection) {
            rtc.createStream({
                "video": false,
                "audio": true
            }, function(stream) {
                myStream = stream;
            });
        } else {
            alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
        }

        // atm we assume we're already connected
        // TODO: do it after successfull connection
        htmlContainer = buildHtml();
        htmlContainer.roomName.innerText = roomId;
        htmlContainer.container.style.visibility = 'visible';
        htmlContainer.muteOthersBtn.addEventListener('click', toggleMuteOthers);
        htmlContainer.muteMeBtn.addEventListener('click', toggleMuteMe);

        rtc.connect(signalingServer, roomId);

        rtc.on('get_peers', function(data) {
            console.log('[get_peers]: we\'re new and may have to connect to established users');
            data.connections.forEach(function(socketId) { addUser(socketId); });
            sendMyUserInfoUpdate();
        });

        rtc.on('userInfoUpdate', function(data) {
            console.log('[userInfoUpdate]: received', data);
            updateUserInfo(data);
        });

        rtc.on('new_peer_connected', function(data) {
            console.log('[new_peer_connected]: new peer so create DOM for him');
            addUser(data.socketId);
        });

        rtc.on('add remote stream', function(stream, socketId) {
            console.log('[add remote stream]: adding remote stream for', socketId);
            var videoTag = participants.filter(function(p) { return p.socketId === socketId; })[0].videoTag;                     
            rtc.attachStream(stream, videoTag.id);
            //we're connected to the user so show in UI
            updateConnectionStatus(socketId);
        });

        rtc.on('disconnect stream', function(data) {
            console.log('remove ' + data);
            removeUser(data);
        });

        if(keepAlive) {
            setInterval(function() {
                if (rtc._socket.bufferedAmount === 0 && rtc._socket.readyState === 1) {
                    console.log("keeping ws connection alive");
                    rtc._socket.send(JSON.stringify({
                        'eventName': 'keep-alive'
                    }), function(error){
                      if(error){console.log(error);}
                    });
                }
            }, 50000);
        }
    }

    return exports;
}());