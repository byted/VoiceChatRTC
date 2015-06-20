# VoiceChatRTC

Add a voice chat via WebRTC to a website.

## example usage

* run npm install to fetch dependencies
* run signaling server: node wsServer.js
* serve index.html (e.g.: python -m SimpleHTTPServer )
* every user visiting the index.html will participate in the voice chat

## real usage

* run signaling server somewhere where it is reachable
* in your website, include voiceChatRTC.js and voiceChatRTC.css
* when the page is fully loaded, call VoiceChat.init('path\_to\_signaling\_server:port', 'room_id')

done.