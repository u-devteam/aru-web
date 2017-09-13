$(function(){
  var urlargs = new URL(location.href).searchParams;
  if (urlargs.get("ip") != undefined) {
    $('#ip').val(urlargs.get("ip"));
  }
  $('#connect').click(function(){
    var channels;
    var lastuser = "";
    socket = io("http://" + $('#ip').val());
    console.log(socket);
    socket.emit('nickname', $('#nick').val())
    socket.emit('userlist','');
    socket.emit('channels','');
    $(".chat-info").text("Connected to: " + $('#ip').val());
    $(".app-user").text($('#nick').val());

    console.log($('#ip').val());

    socket.on('userlist', function(msg){
      console.log("userlist");
      Aru.deleteUsers();
      console.log(msg);
      var parsed = JSON.parse(msg);
      parsed["users"].forEach(function(entry){
        Aru.addUser(entry["nick"], entry["color"]);
      });
    });

    socket.on('channels', function(msg){
      if(!channels) {
        console.log("channels");
        console.log(msg);
        var parsed = JSON.parse(msg);
        parsed["channels"].forEach(function(entry){
          Aru.addChannel(entry["title"]);
        });
        Aru.setTitle($(".chat-container-invisible").first().attr('id'));
        $(".chat-container-invisible").first().toggleClass('chat-container-invisible chat-container');
        document.getElementsByClassName("chat-channel")[0].setAttribute("selected", "true");
        channels = true;
      }
    });

    $('#chat-input').keydown(function (e){
      if(e.keyCode == 13){
        var message = $('#chat-input').val();
        message = message.replace(/\\/g, "\\\\");
        message = message.replace(/"/g, '\\\"');
        var jsonsubmit = '{ "user":"' + $('#nick').val() + '", "channel":"' + $('.chat-container').attr('id') + '", "message":"' + message + '"}';
        socket.emit('message', jsonsubmit);
        $('#chat-input').val('');
      }
    });

    socket.on('message', function(msg){
      if(channels)
      {
        try {
          var json = JSON.parse(msg);
          Aru.addMessage(json["user"] + " ", json["message"], "#ffffff", json["channel"], lastuser);
          lastuser = json["user"];
        }
        catch(err) {
          Aru.addMessage("SERVER ", msg, "#ED145B", $('.chat-container').attr('id'));
        }
      }
    });

    socket.on('server_name', function(msg){
      Aru.serverName = msg;
      $('.chat-name').html(msg);
    });

    socket.on('error', function (err) {
      console.log(err);
    });
});
});
