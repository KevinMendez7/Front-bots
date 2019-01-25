let socket = null
let usersOnline = []
let userBox = {}
let actualUser = null;
let $button, $text, $chat, $closeButton, $userChat, $layout, currentUserChat

const $userList = document.getElementById('chatbox__user-list')

console.log(window.location)

var url = new URL(window.location)

//Get URL parameters
const getParameters = (param) => {

  var options = url.searchParams.getAll(param)
  console.log('options', options, options.length)
  if(options.length > 1){
    return options
  }

  return options[0]

  // var removePlus = new RegExp(/\+/g)
  // var sPageURL = window.location.search.substring(1);
  // var sURLVariables = sPageURL.split('&');
  // for(var i = 0; i < sURLVariables.length; i++){
  //   var sParameterName = sURLVariables[i].split('=');
  //   if (sParameterName[0] == param){
  //     return sParameterName[1].replace(removePlus, ' ');
  //   }
  // }

}

const id = getParameters('Id')
const username = getParameters('User')
const room = getParameters('room')

//Change page title
const setTitle = (user) => {

  let title = document.title
  document.title = title + ' ' + user

}

setTitle(username)

//Open connection to chat server
//socket = io('http://69.163.46.110:3000', {transports: ['websocket'], upgrade: false})//ConnectChat.openChat()
socket = io('http://localhost:3000', {transports: ['websocket'], upgrade: false})//ConnectChat.openChat()

/*
  chat server event
  send(emit) event new_agent : connect a new agent user to chat server in a specific room.
  Observations: If a room doesn't exist, create a new room, if exist, only joined it
  object sent:
  {
    id: 1,
    username: 'pedro14',
    room: 'Existencias y ventas'
  }
  Optional: callback(What to do if callback true)
*/
socket.emit('new_agent',{ id, username, room})

/*
  chat server event
  send(emit) event get_users : Request for users from a specific room.(server Event emit send_users event to client)
  Observations: If a room hasn't users, emit send_users event with {}
  object sent:
  {
    room: 'Existencias y ventas'
  }
*/
socket.emit('get_users_by_id', { id } );

/*
  chat client event
  wait(on) event send_users : Get users from a specific room, emited by get_users event.
  Observations: If a room hasn't users, return {}
  Action: execute updateUserConnected function
  object received:
  {
    76361723: {
      socket : 'GDJ63572FJISW', name : 'Kevin', lastname : 'Mendez', room : 'Existencias y ventas'
    },
    53637238: {
      socket : 'DFASKHDW77WGQH', name : 'Diego', lastname : 'Mendez', room : 'Existencias y ventas'
    },
  }
  Optional: callback(What to do if callback true)
*/
socket.on('send_users', (data) => {
  console.log(data)
  if(!data.message.error){

    updateUserConnected(data.message)
  }

})

socket.on('user_busy', (data) => {
  let id = Object.keys(data).toString()
  if(userBox[id]){
    let div = document.getElementById(userBox[id].socket)
    div.childNodes[0].classList.remove('chatbox__user--active')
    div.childNodes[0].classList.add('chatbox__user--busy')
  }
})

socket.on('get_disconnection', (data) => {
  if(Object.keys(userBox).length>0){
    for(let user in userBox){
      if(Object.keys(data).toString()===user){
        let userObj = userBox[user]
        console.log(userBox[user])
        document.getElementById(userObj.socket).remove()
        delete userBox[user]
      }
    }
  }
})

/*
  chat client event
  wait(on) event agent_message : Get message from subscriber.
  Observations: If a room hasn't users, return {}
  Action: Adds message to object message chat and if agent is in subscriber view execute getMessage function
  object received:
  {
    id: data.id,
    message: data.message
  }
  }
  Optional: callback(What to do if callback true)
*/
socket.on('agent_message', (data) => {
  userBox[data.id].message.push({ from : data.id, body : data.message, type : 'in', time: new Date()})
  if(data.id==actualUser){
    getMessage(data.message)
  }
})

//Update users list from room and create dom components to view, if user is not refreshed execute usersRefreshEvent fuction,
//else do nothing
const updateUserConnected = (subscriber) => {
    if(Object.keys(subscriber).length>0){
      for(let user in subscriber){
        if(!userBox[user]){
          userBox[user] = subscriber[user]
        }
        let userObj = userBox[user]
        console.log('antes de refresh')
        if(!userObj.refreshed){
          console.log('creo nuevo user')
          var divM = document.createElement('div')
          divM.classList.add('chatbox_user')
          var div = document.createElement('div')
          divM.setAttribute("id", userObj.socket);
          var span = document.createElement('span')
          div.classList.add('chatbox__user--active')
          var usernameSpan = document.createTextNode(userObj.name + ' ' + userObj.lastname);
          span.appendChild(usernameSpan)
          span.classList.add('user-name')
          divM.appendChild(div)
          divM.appendChild(span)
          $userList.appendChild(divM)
          userBox[user].refreshed = true
          userBox[user].message = new Array()
          usersRefreshEvent()
        }
      }
    }
}

// Adds event click to each user
const usersRefreshEvent = () => {
  $userChat = document.getElementsByClassName('chatbox_user')
  for(let user of $userChat){
    user.addEventListener('click', openChat)
  }
}

//Send disconnection to current user
/*
  chat server event
  send(emit) event disconnet_user : Send for users disconnection to chat.
  object sent: '467346734' user id
*/
const closeConnection = () => {
  if(Object.keys(userBox).length>0){
    for(let user in userBox){
      if(actualUser===user){
        let userObj = userBox[user]
        let div = document.getElementById(userObj.socket)
        div.parentNode.removeChild(div);
      }
    }
  }
  socket.emit('disconnet_user',actualUser)
  delete userBox[actualUser]
  $layout.innerHTML = ""
}

//Template to render all messages to view
const renderMessages = (user) => {
  return Number(user.message.length) ? `
    ${user.message.map(msg => `
      <div class="chatbox__messages__user-message--m">
        <div class="chatbox__messages__user-message--m--${msg.type}">
          <div class="message">${msg.body}</div>
            <div>
              <span id="span-time--${msg.type}"></span>
              <div class="chatbox__messages__user-message--m--${msg.type}" id="time--${msg.type}">
                ${msg.time.getHours() +':'+ (msg.time.getMinutes().toString().length > 0 ?
                  msg.time.getMinutes() : '0'+ msg.time.getMinutes()) + ' ' + (msg.time.getHours() > 11 ? 'PM' : 'AM')}
              </div>
            </div>
          </div>
      </div>`).join(' ')}
` : Array.prototype.slice.call('')
}

//Template to create layout from user
const createLayout = (user) => {
  return `<div class="user-chat">
    <header>
       <h2>${user.name +' '+ user.lastname}</h2>
       <div id='close' class='close'>X</div>
    </header>
    <div id="chatbox__messages" class="chatbox__messages">
      ${renderMessages(user)}
    </div>
    <footer>
      <form>
        <input id="text-area" class="text-area" type="text" placeholder="Type Message">
        <button type="button" name="send" id="btn-send" class="btn btn-bot">send</button>
      </form>
    </footer>
  </div>`
}

// Create layout from user clicked
const openChat = (e) => {
  let userConversationId = e.target.parentElement.id
  if(currentUserChat ? currentUserChat.socket!==userConversationId : true){
    for(user in userBox){

      if(userBox[user].socket === userConversationId){
        actualUser = user
        currentUserChat = userBox[user]
      }
    }
    let layer = createLayout(currentUserChat)
    $layout = document.getElementById('chatbox__messages__user-message')
    $layout.innerHTML = layer
    $chat = document.getElementById('chatbox__messages')
    $button = document.getElementById('btn-send')
    $text = document.getElementById('text-area')
    $closeButton = document.getElementById('close')
    $closeButton.addEventListener('click', closeConnection)
    $button.addEventListener('click',sendMessage)
    $text.addEventListener('input', typing)
    createTarget()
  }
}

// Create messages on screen from new messages, occurs when same user view sends a new message
const getMessage = (msg) => {
  let currTime = new Date()
  var parentDiv = document.createElement('div')
  var timeContainer = document.createElement('div')
  var spanTime = document.createElement('span')
  var time = document.createElement('div')
  var div = document.createElement('div')
  var br = document.createElement('br')
  var message = document.createElement('div')
  message.classList.add('message')
  spanTime.setAttribute('id','span-time--in')
  parentDiv.classList.add('chatbox__messages__user-message--m')
  time.classList.add('chatbox__messages__user-message--m--in')
  time.setAttribute('id', 'time--in')
  time.textContent = `${currTime.getHours()+':'+ (currTime.getMinutes().toString().length > 0 ?
  currTime.getMinutes() : '0'+currTime.getMinutes()) + ' ' + (currTime.getHours() > 11 ? 'PM' : 'AM') }`
  message.textContent = msg
  div.appendChild(message)
  timeContainer.appendChild(spanTime)
  timeContainer.appendChild(time)
  div.appendChild(timeContainer)
  div.classList.add('chatbox__messages__user-message--m--in')
  parentDiv.appendChild(div)
  $chat.appendChild(parentDiv)
  createTarget()
}

//create target to handle view to lastone message
const createTarget = () => {
  let $target = document.getElementById('span-view')
  if($target){
    $target.parentNode.removeChild($target)
  }
  let span = document.createElement('span')
  span.setAttribute('id','span-view')
  $chat.appendChild(span)
  document.getElementById('span-view').scrollIntoView(true)
}

// create message sent to screen and sent to subcriber
/*
  chat server event
  send(emit) event private_message : send message to subscriber
  object sent:
  {
    agent : {
    id : 1,
    username : 'pedro14'
    },
     user : 756737374,
     message : 'Buenos dias Kevin'
   }
*/
const sendMessage = () => {
  if($text.value){
    let currTime = new Date()
    userBox[actualUser].message.push({ from : id, body : $text.value, type : 'se', time: currTime})
    var parentDiv = document.createElement('div')
    var timeContainer = document.createElement('div')
    var spanTime = document.createElement('span')
    var time = document.createElement('div')
    var div = document.createElement('div')
    var br = document.createElement('br')
    var message = document.createElement('div')
    message.classList.add('message')
    spanTime.setAttribute('id','span-time--se')
    parentDiv.classList.add('chatbox__messages__user-message--m')
    time.classList.add('chatbox__messages__user-message--m--se')
    time.setAttribute('id', 'time--se')
    time.textContent = `${currTime.getHours()+':'+ (currTime.getMinutes().toString().length > 1 ?
    currTime.getMinutes() : '0'+currTime.getMinutes()) + ' ' + (currTime.getHours() > 11 ? 'PM' : 'AM') }`
    message.textContent = $text.value
    div.classList.add('chatbox__messages__user-message--m--se')
    div.appendChild(message)
    timeContainer.appendChild(spanTime)
    timeContainer.appendChild(time)
    div.appendChild(timeContainer)
    parentDiv.appendChild(div)
    $chat.appendChild(parentDiv)
    createTarget()
    socket.emit('private_message', {
      agent : { id, username },
       user : actualUser,
       message : $text.value
     })
    $text.value = ''
  }
}

// Send typing event to subscriber
/*
  chat server event
  send(emit) event disconnet_user : Send for users disconnection to chat.
  object sent:
  {
    agent :{
      id: 1,
      username: 'pedro14'
    },
    user: 7463837733
  }
*/
const typing = () => {
  socket.emit('typing', {
    agent : { id, username },
     user : actualUser
   })
}
