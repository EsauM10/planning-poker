import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, remove } from "firebase/database";
import { HomePageHtml, SignInFormHtml, SignInPageHtml } from "./views.js";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const fibonacciValues = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55]
const scheme = {
    rooms: 'rooms',
    users: 'users',
    votes: 'votes'
}

const userData = {
    username: '',
    room: {},
}

/**
 * @param {string} path 
 * @returns database reference
 */
function getDatabaseRef(path) {
    return ref(database, path)
}

async function fetchRoom(room) {
    const roomRef = getDatabaseRef(`${scheme.rooms}/${room}`)

    try {
      const snapshot = await get(roomRef);

      if (!snapshot.exists()) {
        return null;
      }
      const data = snapshot.val();
      userData.room = data
      userData.room['name'] = room
  } catch (error) {
    console.error("Room não encontrado.");
  }
}

/**
 * @param {string} room 
 */
function createRoom(room) {
    const db = getDatabaseRef(`${scheme.rooms}/${room}/show_votes`)
    set(db, false)
}

/**
 * @param {string} room 
 * @param {string} username 
 */
function createUser(room, username) {
    const db = getDatabaseRef(`${scheme.rooms}/${room}/${scheme.users}/${username}`)
    set(db, true)
}

/**
 * @param {string} room 
 * @param {string} username 
 */
function disconnectUser(room, username) {
    const db = getDatabaseRef(`${scheme.rooms}/${room}/${scheme.users}/${username}`)
    set(db, false)
}

function updateShowVotes(room, value) {
    const db = getDatabaseRef(`${scheme.rooms}/${room}/show_votes`)
    set(db, value)
}

function toggleShowVotes(room) {
  updateShowVotes(room, !userData.room.show_votes)
}

function updateVote(room, username, value) {
    const db = getDatabaseRef(`${scheme.rooms}/${room}/${scheme.votes}/${username}`)
    set(db, value)
}

function resetVotes() {
    remove(getDatabaseRef(`rooms/${userData.room.name}/votes`))

    document.querySelectorAll("#cards button").forEach(button => {
      button.classList.remove("active")
    });
}


/**
 * @param {string} html 
 */
function render(content) {
    const pages = document.getElementById('pages')
    if (content instanceof Element) {
        pages.innerHTML = ''
        pages.appendChild(content)
    } else {
        pages.innerHTML = content
    }
}

function renderActiveUsers() {
  const container = document.getElementById("active-users")
  if (!container) return

  const users = userData.room.users || {}
  container.innerHTML = ""

  Object.entries(users).forEach(([name, active]) => {
    if (!active) return
    const span = document.createElement("span")
    span.classList.add("user-avatar")
    span.textContent = name.charAt(0).toUpperCase()
    span.title = name
    container.appendChild(span)
  })
}

function renderHomePage(room) {
  render(HomePageHtml(room))
  renderCardButtons()
  updateRevealButton(room)

  document.getElementById("reveal").addEventListener("click", () => {
    toggleShowVotes(room)
  })
}

/**
 * @param {string} room 
 */
async function createHomePage(room) {
    await fetchRoom(room)

    if(!userData.room) {
      render(SignInPageHtml())
      window.location.href = "index.html";
    }
    else {
      render(SignInFormHtml(upsertUserInDB))
    }
}


function renderCardButtons() {
    const cards = document.getElementById("cards")
    const room = userData.room.name
    const username = userData.username
    
    fibonacciValues.forEach(value => {
        const button = document.createElement("button")
        button.textContent = value
        button.onclick = () => updateVote(room, username, value)
        cards.appendChild(button)
    }) 

    const buttons = document.querySelectorAll("#cards button");
    
    buttons.forEach(button => {
        button.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            button.classList.add("active");
        });
    });
}

function renderUserVoteCards() {
    const votesCard = document.getElementById("votes")
    const userVoteCard = document.getElementById("user")
    
    votesCard.innerHTML = ""
    userVoteCard.innerHTML = ""

    const cardClass = userData.room.show_votes ? "vote-value active" : "vote-value"
    const votes = userData.room.votes || {}

    Object.entries(votes).forEach(([user, vote]) => {
        const div = document.createElement("div")
        div.classList.add("card")
        div.innerHTML = `
            <div class="${cardClass}">${userData.room.show_votes ? vote : ""}</div>
            <p>${user}</p>
        `
        if(vote < 0) {
            return
        }
        if(user === userData.username) {
            userVoteCard.appendChild(div)
            return
        }

        votesCard.appendChild(div)
    });
}

function updateRevealButton() {
  const revealButton = document.getElementById("reveal")
  
  const startNewVoting = userData.room.show_votes
  const buttonText = startNewVoting ? 'Start new voting': 'Reveal cards' 
  revealButton.innerText = buttonText
}

/**
 * @param {string} room 
 * @param {string} username 
 */
function upsertUserInDB(room, username) {
    const showVotesRef = getDatabaseRef(`${scheme.rooms}/${room}/show_votes`)
    const votesRef = getDatabaseRef(`${scheme.rooms}/${room}/${scheme.votes}`)
    const usersRef = getDatabaseRef(`${scheme.rooms}/${room}/${scheme.users}`)

    createUser(room, username)

    userData.username = username
    renderHomePage(room)

    window.addEventListener("beforeunload", () => {
        disconnectUser(room, username)
    })

    onValue(showVotesRef, (snapshot) => {
        userData.room.show_votes = snapshot.val()
        renderUserVoteCards()
        updateRevealButton()
        if(!userData.room.show_votes) {
          resetVotes()
        }
    })

    onValue(votesRef, (snapshot) => {
        userData.room.votes = snapshot.val() || {}
        renderUserVoteCards()
    })

    onValue(usersRef, (snapshot) => {
        userData.room.users = snapshot.val() || {}
        renderActiveUsers()
    })
}

async function init() {
    const params = new URLSearchParams(window.location.search)
    let room = params.get("room")
    
    if(room) {
        await createHomePage(room)
    } else {
        render(SignInPageHtml())
    }
}


init()
//createRoom('roomName')
