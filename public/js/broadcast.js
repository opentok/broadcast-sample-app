(function() {

window.onload = function() {
flowplayer('#hlsjslive', {
    splash: false,
    embed: false,
    ratio: 9 / 16,
    autoplay: true,
    clip: {
        autoplay: true,
        live: true,
        sources: [{
            type: 'application/x-mpegurl',
            src: '<%=broadcast.broadcastUrl%>'
        }]
    }
});
}


}());