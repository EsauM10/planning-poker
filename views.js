export function SignInFormHtml(onCreateUser) {
    const div = document.createElement('div')
    div.id = 'form'

    const input = document.createElement('input')
    input.id = 'username'
    input.type = 'text'
    input.placeholder = 'Username'

    const button = document.createElement('button')
    button.id = 'createUser'
    button.textContent = 'Create User'
    button.addEventListener('click', () => {
      const params = new URLSearchParams(window.location.search)
      const room = params.get('room')
      const username = input.value

      if(!room || username === '') {
          return
      }

      onCreateUser(room, username)
    })

    div.appendChild(input)
    div.appendChild(button)

    return div
}

export function SignInPageHtml() {
  return `
    <div id="form">
      <input type="text" placeholder="Room's name">
      <button id="createRoom">Create Room</button>
    </div>
  `
}

/**
 * @param {string} room
 * @param {string} username
 */
export function HomePageHtml(room) {
  return `
    <div id="home">
      <header>
        <h1>${room}</h1>
        <div id="active-users"></div>
      </header>

      <main>
        <div id="table">
          <div id="votes"></div>
          <div class="center">
              <button id="reveal">Reveal cards</button>
          </div>
          <div id="user"></div>
        </div>

        <h3>Choose your card 👇</h3>

        <div id="cards"></div>
      <main/>
    </div>
  `
}
