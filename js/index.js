
const $form = document.getElementById('form1')
const user = document.getElementById('username-id')

function login(username) {
    const requestOptions = {
        method: 'GET',
        headers: {
          accept: 'application/json'
        }
    };
    console.log(requestOptions)
    return fetch("./chat-room.html", requestOptions)
        .then(response => {

        } )
}

$form.addEventListener('submit', login)
