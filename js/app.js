var ws = null;
var isFirstUserjoin = true;
var userInfo = {}; // for storing information about yourself
var timeSinceLastOnTyping = 0;
var currentlyTyping = [];
var unreadMsg = 0;

function loadTemplate(template) {
  fetch("templates/" + template + ".hjs").then(function(data){
    return data.text();
  }).then(function(ret) {
    var tag = document.createElement("script");
    tag.id = "tmpl-" + template;
    tag.type = "text/x-handlebars-template";
    tag.innerHTML = ret;
    document.querySelector("head").appendChild(tag);
  }).catch(function(err){
    alert(err);
  });
}

function checkPageFocus() {
  if ( document.hasFocus() ) {
    userInfo["focus"] = true;
    unreadMsg = 0;
    Aru.setTitle(userInfo["name"], Aru.currentChannel, unreadMsg);
  } else {
    userInfo["focus"] = false;
  }
}

window.onload = function() {
  loadTemplate("message");
  loadTemplate("embed");
  loadTemplate("popper");
  if(window.process) {
    document.getElementById("controls").style.display = "inline-block";
  } else {
    setInterval(checkPageFocus, 2000);
  }
}
function beginConnection() {
  if (document.getElementById('isTLS').checked) {
    var protocol = "wss://";
  } else {
    var protocol = "ws://";
  }
  ws = new WebSocket(protocol + document.getElementById('ip').value + "/chat/" + document.getElementById('nick').value);
  ws.binaryType = "arraybuffer";

  ws.onopen = function() {
    document.getElementById('chat-status').innerHTML = "Connected to " + document.getElementById('ip').value;
    document.addEventListener('click', function(e) {
      e = e || window.event;
      var target = e.target || e.srcElement;
      if (target.parentNode.className != "chat-online-username") {
        document.getElementById('popper').style.display = "none";
        document.getElementById('popper').className = "";
      }   
    }, false);
    var userrequest = msgpack.encode({"type": "req", "req": "userlist"});
    var channelrequest = msgpack.encode({"type": "req", "req": "channellist"});
    ws.send(userrequest);
    ws.send(channelrequest);
    Notification.requestPermission();
  };

  ws.onmessage = function(msg) {
    var frame = msgpack.decode(new Uint8Array(msg.data));
    console.log(frame);
    if (frame["type"] == "client") {
      if(userInfo["focus"] == false) {
        unreadMsg += 1;
        Aru.setTitle(userInfo["name"], Aru.currentChannel, unreadMsg);
      }
      Aru.addMessage(frame["client"], frame["msg"], "#E7E7E9", frame["channel"], frame["avatar"], frame["embed"], frame["client_id"]);
      Aru.removeTyping(frame["client_id"]);
    } else if (frame["type"] == "update") {
      if (frame["update"] == "userlist") {
        var userlist = frame["users"];
        for(var i = 0; i < userlist.length; i++) {
          Aru.addUser(userlist[i]["name"], userlist[i]["discriminator"], userlist[i]["avatar"], userlist[i]["id"], userlist[i]["status"], "#E7E7E9");
        }
      } else if(frame["update"] == "channellist") {
        var channels = frame["channels"];
        for(var i = 0; i < channels.length; i++) {
          Aru.addChannel(channels[i]["name"], channels[i]["main"]);
        }
      } else if (frame["update"] == "user-leave") {
        document.getElementById("online").removeChild(document.getElementById('user-' + frame["id"].toString()));
      } else if (frame["update"] == "user-join") {
        if (isFirstUserjoin) {
          isFirstUserjoin = false; // Workaround since first user-join event (you joining) is also sent to you
          userInfo = {"name": frame["name"], "id": frame["id"], "avatar": frame["avatar"]};
          /*Aru.generateUserInfo(frame["avatar"], frame["name"] + "#" + frame["discriminator"]);*/
        } else {
          Aru.addUser(frame["name"], frame["discriminator"], frame["avatar"], frame["id"], frame["status"], "#E7E7E9");
        }
      } else if (frame["update"] == "user-avatar") {
        document.getElementById("img-" + frame["id"].toString()).style.backgroundImage = "url(" + frame["avatar"] + ")";
        userInfo["avatar"] = frame["avatar"];
      } else if (frame["update"] == "user-name") {
        document.getElementById("name-" + frame["id"].toString()).innerHTML = frame["name"] + '<span class="chat-online-typing">#' + frame["discriminator"] + '</span>';
        if (frame["id"] == userInfo["id"]) {
          userInfo["name"] = frame["name"];
          Aru.setTitle(userInfo["name"], Aru.currentChannel, unreadMsg);          
        }
      } else if (frame["update"] == "channel-create") {
        Aru.addChannel(frame["name"], false);
      } else if (frame["update"] == "channel-remove") {
        Aru.removeChannel(frame["name"]);
      } else if (frame["update"] == "server-name") {
        document.getElementById("chat-name").innerHTML = frame["name"];
      } else if (frame["update"] == "user-typing") {
        currentlyTyping.push({"name": frame["name"], "id": frame["id"]});
        Aru.updateTyping();
        setTimeout(function() {Aru.removeTyping(frame["id"])}, 15000);
      } else if (frame["update"] == "user-status") {
        document.getElementById("img-" + frame["id"].toString()).firstChild.className = "status " + frame["status"];
      } else if (frame["update"] == "user-presence") {
        Aru.updateUserPresence(frame["presence"], frame["id"]);
      }
    } else {
      Aru.addMessage("SERVER", frame["msg"], "#ED145B", "general", "");
    }
  };

  document.getElementById('chat-input').onkeypress = function(event) {
    var epoch = (new Date).getTime();
    if ((epoch - timeSinceLastOnTyping) >= 15000) {
      var req = msgpack.encode({"type": "req", "req": "sendtyping"});
      ws.send(req);
      timeSinceLastOnTyping = epoch;
    }
    if ((event.which == 13 || event.keyCode == 13) && event.shiftKey) {
      console.log("a");
    } else if (event.which == 13 || event.keyCode == 13) {
      sendMessage();
    }
    return true;
  };
}

function sendMessage() {
  var input = document.getElementById('chat-input');
  var payload = {"type": "msg", "msg": input.value, "channel": Aru.currentChannel, "markdown": true};
  var framed = msgpack.encode(payload);
  ws.send(framed);
  timeSinceLastOnTyping = 0;
  Aru.removeTyping(userInfo["id"]);
  input.value = '';
}