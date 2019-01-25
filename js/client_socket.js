const io = require('socket.io-client')
// let ConnectChat = null

const openChat = () => {

  return io('http://localhost:3000', {transports: ['websocket'], upgrade: false})

}

function activateListener(socket){
  socket.on('push', function(data, callback){
    console.log(data)
    return data
  })
}

function sendMessage(socket, msg, name){
  socket.emit('new_user',name ,function(msg)/*calllback function*/{
    console.log(msg)
  })
}

module.exports = {
  openChat,
  activateListener,
  sendMessage
}
