
$(function () {
  const urlPrams = new URLSearchParams(window.location.search);
  var meeting_id = urlPrams.get("meetingId");
  var user_id = window.prompt("Enter your userid");
  if (!user_id || !meeting_id) {
    alert("User id or meeting id missing");
    window.location.href = "/index.html";
    return;
  }
  $("#meetingContainer").show();
  myApp._init(user_id, meeting_id);
});
var AppProcess = (function () {
  var peers_connection_ids = [];
  var peers_connection = [];
  let my_connection_id =null;
  var remote_vid_stream = [];
  var remote_aud_stream = [];
  var local_div;
  var serverProcess;
  var audio;
  var isAudioMute = true;
  var rtp_aud_senders = [];
  var rtp_vid_senders = [];

  var video_states = {
    None: 0,
    Camera: 1,
    ScreenShare: 2,
  };
  var video_st = video_states.None;
  var videoCamTrack;


  async function _init(SDP_function, my_connid) {
    serverProcess = SDP_function;
    my_connection_id = my_connid;
    eventProcess();
    local_div = document.getElementById("localVideoPlayer");
  }
  function eventProcess() {
    $("#miceMuteUnmute").on("click", async function () {
      if (!audio) {
        await loadAudio();
      }
      if (!audio) {
        alert("Audio permission has not granted");
        return;
      }
      if (isAudioMute) {
        audio.enabled = true;
        $(this).html(
          "<span class='material-icons' style='width:100%'>mic</span>"
        );
        updateMediaSenders(audio, rtp_aud_senders);
      } else {
        audio.enabled = false;
        $(this).html(
          "<span class='material-icons' style='width: 100%'>mic_off</span>"
        );
        removeMediaSenders(rtp_aud_senders);
      }
      isAudioMute = !isAudioMute;
    });
    $("#videoCamOnOff").on("click", async function () {
      if (video_st == video_states.Camera) {
        await videoProcess(video_states.None);
      } else {
        await videoProcess(video_states.Camera);
      }
    });
    $("#ScreenShareOn").on("click", async function () {
      if (video_st == video_states.ScreenShare) {
        await videoProcess(video_states.None);
      } else {
        await videoProcess(video_states.ScreenShare);
      }
    });
  }
  async function loadAudio() {
    try {
      var astream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      audio = astream.getAudioTracks()[0];
      audio.enabled = false;
    } catch (err) {
      console.log(err);
    }
  }
  function connection_status(connection) {
    if (
      connection &&
      (connection.connectionState == "new" ||
        connection.connectionState == "connecting" ||
        connection.connectionState == "connected")
    ) {
      return true;
    } else {
      return false;
    }
  }
  async function updateMediaSenders(track, rtp_senders) {
    for (var con_id in peers_connection_ids) {
      if (connection_status(peers_connection[con_id])) {
        if (rtp_senders[con_id] && rtp_senders[con_id].track) {
          rtp_senders[con_id].replaceTrack(track);
        } else {
          rtp_senders[con_id] = peers_connection[con_id].addTrack(track);
        }
      }
    }
  }
  function removeMediaSenders(rtp_senders) {
    for (var con_id in peers_connection_ids) {
      if (rtp_senders[con_id] && connection_status(peers_connection[con_id])) {
        peers_connection[con_id].removeTrack(rtp_senders[con_id]);
        rtp_senders[con_id] = null;
      }
    }
  }
  function removeVideoStream(rtp_vid_senders) {
    if (videoCamTrack) {
      videoCamTrack.stop();
      videoCamTrack = null;
      local_div.srcObject = null;
      removeMediaSenders(rtp_vid_senders);
    }
  }
  async function videoProcess(newVideostate) {
    if (newVideostate == video_states.None) {
      $("#videoCamOff").html(
        "<span class='matrial-icons' style='width:100%'>videocam_off</span>"
      );
      video_st = newVideostate;
      removeVideoStream(rtp_vid_senders);
      return;
    }
    if (newVideostate == video_states.Camera) {
      $("#videoCamOff").html(
        "<span class='matrial-icons' style='width:100%'>videocam_on</span>"
      );
    }
    try {
      var vstream = null;
      let constraintObj = { 
        audio: false, 
        video: { 
            facingMode: "user", 
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 } 
        } 
    }; 
      if (newVideostate == video_states.Camera) {
        vstream = await navigator.mediaDevices.getUserMedia(constraintObj)
      } else if (newVideostate == video_states.ScreenShare) {
        vstream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
      }
      if (vstream && vstream.getVideoTracks().length > 0) {
        videoCamTrack = vstream.getVideoTracks()[0];
        if (videoCamTrack) {
          local_div.srcObject = new MediaStream([videoCamTrack]);
          updateMediaSenders(videoCamTrack, rtp_vid_senders);
        }
      }
    } catch (err) {
      console.log(err);
      return;
    }
    video_st = newVideostate;
  }
  var iceConfiguration = {
    iceSevers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
      },
    ],
  };
  async function setConnection(connId) {
    var connection = new RTCPeerConnection(iceConfiguration);

    connection.onnegotiationneeded = async function (event) {
      await setOffer(connId);
    };
    connection.onicecandidate = function (event) {
      if (event.candidate) {
        serverProcess(
          JSON.stringify({ icecandidate: event.candidate }),
          connId
        );
      }
    };
    connection.ontrack = function (event) {
      if (!remote_vid_stream[connId]) {
        remote_vid_stream[connId] = new MediaStream();
      }
      if (!remote_aud_stream[connId]) {
        remote_aud_stream[connId] = new MediaStream();
      }
      if (event.track.kind == "video") {
        remote_vid_stream[connId]
          .getVideoTracks()
          .forEach((t) => remote_vid_stream[connId].removeTrack(t));
        remote_vid_stream[connId].addTrack(event.track);
        var remoteVideoPlay = document.getElementById("v_" + connId);
        remoteVideoPlay.srcObject = null;
        remoteVideoPlay.srcObject = remote_vid_stream[connId];
        remoteVideoPlay.load();
      } else if (event.track.kind == "audio") {
        remote_aud_stream[connId]
          .getAudioTracks()
          .forEach((t) => remote_aud_stream[connId].removeTrack(t));
        remote_aud_stream[connId].addTrack(event.track);
        var remoteAudioPlay = document.getElementById("a_" + connId);
        remoteAudioPlay.srcObject = null;
        remoteAudioPlay.srcObject = remote_aud_stream[connId];
        remoteAudioPlay.load();
      }
    };
    peers_connection_ids[connId] = connId;
    peers_connection[connId] = connection;
    if (
      video_st == video_states.Camera ||
      video_st == video_states.ScreenShare
    ) {
      if (videoCamTrack) {
        updateMediaSenders(videoCamTrack, rtp_vid_senders);
      }
    }
    return connection;
  }

  async function setOffer(connId) {
    var connection = peers_connection[connId];
    await connection.createOffer();
    var offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    serverProcess(
      JSON.stringify({
        offer: connection.LocalDescription,
      }),
      connId
    );
  }
  async function SDPProcess(message, from_connid) {
    message = JSON.parse(message);
    if (message.answer) {
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
    } else if (message.offer) {
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
      var answer = await peers_connection[from_connid].createAnswer();
      await peers_connection[from_connid].setLocalDescription(answer);
      serverProcess(
        JSON.stringify({
          offer: answer,
        }),
        from_connid
      );
    } else if (message.icecandidate) {
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }
      try {
        debugger
        await peers_connection[from_connid].addIceCandidate(
          message.icecandidate
        );
        let s = await peers_connection[from_connid].addIceCandidate(
          message.icecandidate)
        console.log(s)
      } catch (e) {
        console.log(e);
      }
    }
  }
  return {
    setNewConnection: async function (connId) {
      await setConnection(connId);
    },
    init: async function (SDP_function, my_connid) {
      await _init(SDP_function, my_connid);
    },
    processClientFunc: async function (data, from_connid) {
      await SDPProcess(data, from_connid);
    },
  };
})();
var myApp = (function () {
  var socket = null;
  var user_id = "";
  var meeting_id = "";
  function init(uid, mid) {
    user_id = uid;
    meeting_id = mid;
    $("#meetingcontainer").show();
    $("#me h2").text(user_id + "Me");
    document.title = user_id;
    event_process_for_signaling_server();
  }
  function event_process_for_signaling_server() {
    socket = io.connect();

    var SDP_function= function (data, to_connid) {
      socket.emit("SDPProcess", {
        message: data,
        to_connid: to_connid,
      });
    };
    console.log({ socket });
    socket.on("connect", () => {
      if (socket.connected) {
        AppProcess.init(SDP_function, socket.id);
        if (user_id != "" && meeting_id != "") {
          socket.emit("userconnect", {
            displayName: user_id,
            meetingid: meeting_id,
          });
        }
      }
    });
    socket.on("inform_others_about_me", function (data) {
      addUser(data.other_user_id, data.connId);
      AppProcess.setNewConnection(data.connId);
    });
    socket.on("inform_me_about_other_user", function (other_users) {
      if (other_users) {
        for (var i = 0; i < other_users.length; i++) {
          addUser(other_users[i].user_id, other_users[i].connectionId);
          AppProcess.setNewConnection(other_users[i].connectionId);
        }
      }
    });

    socket.on("SDPProcess", async function (data) {
      console.log(data);
      await AppProcess.processClientFunc(data.message, data.from_connid);
    });
  }
  function addUser(other_user_id, connId) {
    var newDivId = $("#otherTemplate").clone();
    newDivId = newDivId.attr("id", connId).addClass("other");
    newDivId.find("h2").text(other_user_id);
    newDivId.find("video").attr("id", "v_" + connId);
    newDivId.find("audio").attr("id", "v_" + connId);
    newDivId.show();
    $("#divUsers").append(newDivId);
  }
  return {
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();
