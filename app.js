const express = require('express');
const path = require('path');
const app = express();
const server = app.listen(3000,()=>{
    console.log('listen to port 7000');
})
const io =require('socket.io')(server);
app.use(express.static(path.join(__dirname,"/")))

const userConnected = []
io.on('connection',(socket)=>{
    console.log(`new connection to sockit ${socket.id}`);

    socket.on("userConnect",data=>{

        let other_users = userConnected.filter(i=>{
            return i.meetingId ==data.meetingId;
        })

        userConnected.push({
            connectionId : socket.id,
            name:data.name,
            meetingId:data.meetingId,
        })

        other_users.forEach(i=>{
            io.to(i.connectionId).emit('tell-other-about-new-member',{
                connectionId : socket.id,
                name:data.name,
                meetingId:data.meetingId,
            })
        })
        socket.emit("inform-me-about-other-users",other_users)
        // socket.join(data.meetingId)
    })
    socket.on('SDPProcess',({ message,to_connId})=>{
        console.log({message,to_connId});
        socket.to(to_connId).emit("SDPProcess",{
            message:message,
            from_connId:socket.id
        })
    })
})
;