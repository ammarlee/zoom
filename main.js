const urlParams = new URLSearchParams(window.location.search);
const meetingId = urlParams.get("meetingId");
const userId = window.prompt("enter your id ");
let local_div
const usersDiv = document.getElementById("users");
const users = [];
let peers_connection = []
let peers_connection_ids =[]
let remote_vid_stream =[]
let remote_audio_stream =[]
let SDP_function,serverProcecess
let myConnectionId 
let socket;
let isAudioMuted =true
let audio
let rtp_audio_senders = []
let rtp_video_senders = []
let videoState = {
  none:0,
  camera:1,
  screenShare:2
}
let video_st= videoState.none
let videoCamTrack

async  function setOffer(connectionId){
  let connection = peers_connection[connectionId]
  let offer = await connection.createOffer()
  await connection.setLocalDescription(offer)
  serverProcecess(JSON.stringify({offer:connection.localDescription}),connectionId)
}
function connection_status(connection) {
  if (connection &&(connection.connectionState =="connecting" ||connection.connectionState =="connected" ||connection.connectionState =="new")) {
    return true
  }else{
    return false 
  }

}
async function updateMediaSenders(track,rtp_senders) {
  for (let con_id in peers_connection_ids){
    if (connection_status(peers_connection[con_id])) {
      if (rtp_senders[con_id] &&rtp_senders[con_id].track) {
        rtp_senders[con_id].replaceTrack(track);
      }else{
        rtp_senders[con_id]=peers_connection[con_id].addTrack(track);
      }

      
    }
  }

}

async function VideoProcess(newVideoState){
  let vstream =null
  let constraintObj = { 
    audio: false, 
    video: { 
        facingMode: "user", 
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 } 
    } 
}; 
  try {
    if (newVideoState ==videoState.camera) {
      vstream = await  navigator.mediaDevices.getUserMedia(constraintObj)
      
    }else if (newVideoState ==videoState.screenShare){
      vstream = await  navigator.mediaDevices.getDisplayMedia( { 
        audio: false, 
        video: { 
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 } 
        } 
    }
    )

    }
    if (vstream && vstream.getVideoTracks().length >0) {
      videoCamTrack =vstream.getVideoTracks()[0]
      if (videoCamTrack) {
        debugger
        local_div.srcObject = new MediaStream([videoCamTrack]) 
        updateMediaSenders(videoCamTrack,rtp_video_senders)

        
      }
      
    }
    video_st =newVideoState
    
  } catch (error) {
    console.log(error);
  }


} 

class Myapp {

  static init(meetingId, userId) {
    alert(`hello guyes ${meetingId} || ${userId}`);
  }

  static async SDPProcess(msg,from){
    msg = JSON.parse(msg);
    if (msg.answer) {
      await peers_connection[from].setRemoteDescription(new RTCSessionDescription(msg.answer))

      
    }else if (msg.offer){
      if (!peers_connection[from]) {
        this.set_New_Connection_To_Rtc({connectionId:from})
        
      }
      await peers_connection[from].setRemoteDescription(new RTCSessionDescription(msg.answer))

      let answer = await peers_connection[from].createAnswer() 
      await peers_connection[from].setLocalDescription(answer)
      serverProcecess(JSON.stringify({answer: answer}),from)

    }else if (msg.icecandidate){
      if (!peers_connection[from]) {
       this.set_New_Connection_To_Rtc({connectionId:from})
      }
      try {
        await peers_connection[from].addIceCandidate(msg.icecandidate)
        
      } catch (error) {
        console.log(error);
        
      }
    }

  }
  static eventProcess(){
    $("#miceMuteOfOn").on("click", async function(){
      if (!audio) {
        await this.loadAudio()
      }
      if (!audio) {
        alert("audio permission denied")
        return
      }
      if (isAudioMuted) {
        audio.enable =true
        updateMediaSenders(audio,rtp_audio_senders)
        
      }else{
        audio.enable =false
        removeMediaSenders(rtp_audio_senders)

      }
      isAudioMuted = !isAudioMuted


    })

    $("#VideoOfOn").on("click", async function(){
      if (video_st ==videoState.camera) {
        await VideoProcess(videoState.none)
      }else{
        await VideoProcess(videoState.camera)
      }

    }) 
    $("#screenshare").on("click", async function(){
      if (video_st ==videoState.screenShare) {
        await VideoProcess(videoState.none)
      }else{
        await VideoProcess(videoState.screenShare)
      }

    })
    
  }
  
  static _initRTC(sd_func,my_connId) {
    serverProcecess = sd_func;
    myConnectionId = my_connId
    this.eventProcess()
    local_div = document.getElementById('localVideoPlayer')

  }

  static connectToSocket() {
    socket = io.connect();

    SDP_function = function(data,to_connId){
      socket.emit("SDPProcess", {
        message:data,
        to_connId:to_connId

      })
    }

    socket.on("connect", () => {

      this._initRTC(SDP_function,socket.id)

      socket.emit("userConnect", {
        name: userId,
        meetingId: meetingId,
      });

      socket.on('inform-me-about-other-users',(other_users)=>{
        if (other_users) {
          for(var i=0; i < other_users.length;i++){

            this.addUser({name:other_users[i].name,connectionId:other_users[i].connectionId});

            this.set_New_Connection_To_Rtc({connectionId:other_users[i].connectionId});
           
          
          }

          
        }
      })

      socket.on("tell-other-about-new-member", (data) => {
        this.addUser(data);
        this.set_New_Connection_To_Rtc(data);
      });
      socket.on("SDPProcess",async function(data) {
        console.log(" listen to socket (SDPProcess)" , data);
        this.SDPProcess( data.message,data.from_connId )
      })
    });
  }


  static set_New_Connection_To_Rtc({connectionId}) {
    debugger

    var configuration = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
        {
          urls: "stun:stun1.l.google.com:19302",
        },
      ],
    };

    var pc = new RTCPeerConnection(configuration);

    pc.onnegotiationneeded = async function(event) {
      await setOffer(connectionId)
    }
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        serverProcecess(JSON.stringify({icecandidate: event.candidate}),connectionId)

      } 
    }

    pc.ontrack= function(event){
      if (!remote_vid_stream[connectionId]) {
        remote_vid_stream[connectionId] = new MediaStream()
        
      }
      if (!remote_audio_stream[connectionId]) {
        remote_audio_stream[connectionId] = new MediaStream()
        
      }
      if (event.track.kind =="video") {
        remote_vid_stream[connectionId].getVideoTracks().forEach(i=>remote_vid_stream[connectionId].removeTrack(i))

        remote_vid_stream[connectionId].addTrack(event.track)
        let remoteVideoPlayer = document.getElementById('v'+connectionId)
        remoteVideoPlayer.srcObject = null
        remoteVideoPlayer.srcObject = remote_vid_stream[connectionId]
        remoteVideoPlayer.load()

        
      }else if(event.track.kind =="audio")

      remote_audio_stream[connectionId].getVideoTracks().forEach(i=>remote_audio_stream[connectionId].removeTrack(i))

        remote_audio_stream[connectionId].addTrack(event.track)
        let remoteAudioPlayer = document.getElementById('a'+connectionId)
        remoteAudioPlayer.srcObject = null
        remoteAudioPlayer.srcObject = remote_audio_stream[connectionId]
        remoteAudioPlayer.load()

    }
    peers_connection_ids[connectionId] =connectionId
    peers_connection =pc

    if (video_st ==videoState.camera ||video_st ==videoState.screenShare) {
      console.log('done here ');
      if (videoCamTrack) {
        updateMediaSenders(videoCamTrack,rtp_video_senders)
        
      }
    }


    return pc

  }


  static addUser(data) {
    console.log("add user");
    
    
    users.push(data);
    usersDiv.innerHTML += `
     <div class="col-md-4  other mr-2 ml-2 bg-info" id="${data.connectionId}">
    <h3>${data.name}</h3>
    <div>
    <video autoplay muted id="v-${data.connectionId}"></video>
    <audio autoplay controls  muted id="a-${data.connectionId}" ></audio>
    </div>
  
  </div>`;

    console.table(users);
  }
 
}

if (!meetingId || !userId) {
  alert("Please enter them");
  window.location.href = "/error.html";
}
Myapp.init(meetingId, userId);
Myapp.connectToSocket();
