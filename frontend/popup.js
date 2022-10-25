// This is the function that listens to chrome events from content.js via background.js 
// It listens for the current URL and whether it has been indexed. The second part is kind of redundant as
//of now

let timeToStop = 1;
let isThisFirstSearch = null
let addPersistantData = true
//Main function that displays the query results
const displayQueryResults = (results) => {
    let navBar = document.getElementById("navigation-mit")
    let valueOfCurrentNode = 0
    let numberOfResultsReturned = `<h1> ${results.length} results returned </h1>`
    navBar.innerHTML += numberOfResultsReturned
    for (value of results) {
        let valueOfHref = null
        valueOfCurrentNode = valueOfCurrentNode + 1


        //If it is a link then use the link that is returned by ElasticSearch, else use # to not open anything. 
        if (value.typeof === "Link") {
            valueOfHref = value.contenturl
        } else {
            valueOfHref = "#"
        }
        let searchResultsHTML = `<div > 
          <a class = 'search-results-penden ${value.typeof} ${valueOfHref}' data-penden-url = '${valueOfHref}'  id = ${value.xpath} href = "#"> ${valueOfCurrentNode}) Penden Text - ${value.text}. Type - ${value.typeof}</a>
        </div>
        <div class = 'seperator'>`
        navBar.innerHTML += searchResultsHTML
    }
    //Getting the elements to focus
    focusElements()
}

// This function sets focus to all elements one the query results have come. Called from displayQueryResults()
const focusElements = () => {
    let searchNodes = document.getElementsByClassName('search-results-penden')

    for (let i = 0; i < searchNodes.length; i++) {
        let tempElement = searchNodes[i]
        tempElement.addEventListener('keyup', function (e) {
            // If it is not a link that focus it by sending the message to content.js
            if (e.key === "Enter" && e.target.className.includes('Link') === false) {
                e.preventDefault()

                focusElementsOnTheWebpage(e)

            } //If it is a link then open the think in a new window 
            else if (e.target.className.includes('Link') === true && e.key === "Enter") {
                e.preventDefault()

                //open the clicked link a new tab
                window.open(e.target.dataset.pendenUrl)
            }
        })

    }

}




//This sends a message to content.js to retrieve the cached search data from any previous search 
let msg = {
    command: "retreieve-search-data"
}
chrome.runtime.sendMessage(msg);

msg = {
    command: "is-index-present"
}
chrome.runtime.sendMessage(msg);
const constSendMessageForURL = () => {
    let msg = {
        command: "send-current-url"
    }
    chrome.runtime.sendMessage(msg);

}
// Everytime popop.js is loaded, a request is sent to content.js to get the current URL of the page. 
//This is because popup.js cannot get the current URL as it is an iFrame. Also, since it is removed everytime
// sessionStorage does not last
constSendMessageForURL()



var dialog = document.getElementById("dialog-penden")
dialog.showModal()
let searchBar = document.getElementById("search-bar-penden")
let navBar = document.getElementById("navigation-mit")


// Function to enforce sleep. Only works with async function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// let isReady = "false"

//MAIN - Listens to the enter key, and calls queryRequest() as well as displayResults()
searchBar.addEventListener("keypress", async function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        let navBar = document.getElementById("navigation-mit")
        navBar.innerHTML = ''




        //If this is the firstsearch then stp for 4s, just to make sure indexing has take place. 
        //If it isn't, wait for 2 seconds to make sure that "PENDEN SEARCHING" is read out. 
        if (isThisFirstSearch) {
            console.log('5s', timeToStop)
            navBar.innerHTML += `<div class = 'message-style'>  PENDEN SEARCHING LONG </div>`
            await sleep(timeToStop * 1000);
            isThisFirstSearch = false

        } else {
            console.log('1s', timeToStop)
            navBar.innerHTML += `<div class = 'message-style'>  PENDEN SEARCHING  </div>`
            await sleep(1000);
        }

        //On every ENTER it clears the previous results in the navBar
        navBar.innerHTML = ''

        //The searched value and the username. This is then logged to our database for logging. 
        let searchedValue = searchBar.value
        let currentUserName = 'KRNPBMAnotitsme'

        //The main function that fetches the results, dispays them and make them focusable/clickable.
        queryRequest(searchedValue, currentUserName)


    }


})

//This function remove elements by class. Used to clear stuff.
function removeElementsByClass(className) {
    const elements = document.getElementsByClassName(className);
    while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}



//Function that retreives the data, displays them and makes them focusable.
const queryRequest = (queryValue, currentUserName) => {

    //To get the current URL
    const queryURL = window.sessionStorage.getItem('penden-current-page-url')

    //Main payload. We sent the current URL (for filtering), the value and the username (for logging)
    const payload = JSON.stringify({ query: queryValue, url: queryURL, name: currentUserName })
    const url = "https://us-central1-ey-project-315506.cloudfunctions.net/semantic-search-query"

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let json = JSON.parse(xhr.responseText);
            let data = json.data

            let msg = {
                command: "store-search-data",
                data: JSON.stringify(data),
                term: queryValue
            }
            chrome.runtime.sendMessage(msg);

            //If search results have been returned
            if (data.length > 2) {
                // Once the results have come back, this function displays it within the navBar.
                displayQueryResults(data)
            } else {
                //If not search results, then display this message. The screen reader will read it out aloud
                // as it is the navBar which has aria-live = 'assertive'
                navBar.innerHTML = `
                <div class = 'message-style'> 
                NO RESULT FOUND. PLEASE OPEN AGAIN AND TRY
                </div>`
            }


        };

    }
    var data = payload
    xhr.send(data);

}

//This function is used when there is the need to make the elements focusable in case of span etc. to focus it. 
const getElementsByXPath = (xpath, parent) => {
    let results = [];
    let query = document.evaluate(xpath, parent || document,
        null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0, length = query.snapshotLength; i < length; ++i) {
        results.push(query.snapshotItem(i));
    }
    return results;
}

//This function sends the message to the content.js to focus the element when Enter is pressed on a span, button, heading etc.
const focusElementsOnTheWebpage = (e) => {

    msg = {
        command: "focus-element",
        xpath: e.target.id
    }
    chrome.runtime.sendMessage(msg);

}





//Code to triger the remove of the popup via content.js. This prevents the iFrame from intefering with the 
//website body once it has been closed. Without it links, buttons etc. are not clickable 
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {

        let msg = {
            command: "remove-popup"
        };
        chrome.runtime.sendMessage(msg);

    }

})

const retreiveCurrentURL = (request, sender, sendResponse) => {
    if (request.command === 'current-url-to-popup') {
        window.sessionStorage.setItem('penden-current-page-url', request.url)

    } //This code currently isn't doing much. some bug due to which message from content.js is not passing through
    else if (request.command === "ready-to-search") {
        if (request.result === "true") {
            isReady = request.result
            sessionStorage.setItem('ready-to-search', isReady)
            isThisFirstSearch = true

        } else {

            isThisFirstSearch = false

        }
    } else if (request.command === "search-data-retreived") {
        let data = request.data
        let searchTerm = request.term

        if (data !== null && searchTerm !== null) {
            data = JSON.parse(data)
            if (addPersistantData) { //This is a bit weird, but without this check, displayQueryResults was being run twice because two pings were being recieved from content.js. Workaround for that bug
                displayQueryResults(data)
                searchBar.value = searchTerm
                addPersistantData = false
            }


        }
        //Decides the time to stop for the first search, depending on how much is to be indexed. Eventually have to move to a dynamic system
    } else if (request.command === "index-present-is") {
        if (request.page === "false" && request.whole === "false") {
            isThisFirstSearch = true
            timeToStop = 15
        }

        else if (request.page === "false" && request.whole === "true") {
            isThisFirstSearch = true
            timeToStop = 7
        } else {
            isThisFirstSearch = false
            timeToStop = 1
        }
    }
}

//all listerners in 
chrome.runtime.onMessage.addListener(retreiveCurrentURL)