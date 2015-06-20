var VoiceChat = (function() {
    var exports = {}
        , videos = []
        , myStream
        , PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection;

    function removeVideo(socketId) {
        var video = document.getElementById('remote' + socketId);
        if(video) {
            videos.splice(videos.indexOf(video), 1);
            video.parentNode.removeChild(video);
        }
    }

    function toggleMuteOthers() {
        videos.forEach(function(video) {
            video.muted = !video.muted;
        });
        document.getElementById('voiceChat-MuteOthersBtn').textContent = videos[0].muted ? 'Unmute' : 'Mute';
    }

    function toggleMuteMe() {
        var tracks = myStream.getAudioTracks();
        tracks.forEach(function(track) {
            track.enabled = !track.enabled;
        });
        document.getElementById('voiceChat-MuteMeBtn').textContent = tracks[0].enabled ? 'Disable Mic' : 'Enable Mic';
    }

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

        container.id = 'voiceChat';
        videoContainer.id = 'voiceChat-videos';
        roomName.id = 'voiceChat-roomName';
        muteOthersBtn.id = 'voiceChat-MuteOthersBtn';
        muteMeBtn.id = 'voiceChat-MuteMeBtn';

        roomLabel.innerText = 'Room: ';
        roomName.innerText = '';
        infoBar.appendChild(roomLabel);
        infoBar.appendChild(roomName);

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
            muteMeBtn: muteMeBtn
        }
    }

    exports.init = function(signalingServer, roomId) {
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

        var vcElements = buildHtml();

        vcElements.roomName.innerText = roomId;
        rtc.connect(signalingServer, roomId);

        rtc.on('add remote stream', function(stream, socketId) {
            console.log("ADDING REMOTE STREAM...");
            var videoTag = document.createElement('video');
            videoTag.id = 'remote' + socketId;
            videoTag.setAttribute('class', 'voiceChat remoteStream');
            videoTag.setAttribute('autoplay', '');
            vcElements.videoContainer.appendChild(videoTag);
            
            rtc.attachStream(stream, videoTag.id);
            videos.push(videoTag);
        });

        rtc.on('disconnect stream', function(data) {
            console.log('remove ' + data);
            removeVideo(data);
        });

        vcElements.container.style.visibility = 'visible';
        vcElements.muteOthersBtn.addEventListener('click', toggleMuteOthers);
        vcElements.muteMeBtn.addEventListener('click', toggleMuteMe);
    }

    return exports;
}());