



//Function executes at the beginning of a page being loaded and checks whether that page has been indexed before or not and
//sets the variable accordingly to sessionStorage (NOTE: In future deploy a more resilient solution - localStorage, IndexedDB,
//chrome.storage etc.)
let getCleanUrl = function (url) {
    return url.replace(/#.*$/, '').replace(/\?.*$/, '');
};

//Checks presence for the two different indices. Current page one and that of hte entire page and sets the session storage variables
//accordingly. These variables are used to determine whether to index, full or partial, and the time delay when searching.
const checkPresence = () => {
    let currentTabURL = window.location.toString()

    let msg = {
        command: "current-page-url",
        url: currentTabURL
    }

    chrome.runtime.sendMessage(msg); //sending the current page URL to the iFrame to use it to search in the query late ron


    window.sessionStorage.setItem('penden-current-secure-url', currentTabURL)

    const payload = JSON.stringify({ url: currentTabURL })
    const url = "https://us-central1-ey-project-315506.cloudfunctions.net/check-presence" //redundant URL, enter your own hosted model 

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var json = JSON.parse(xhr.responseText);
            let checkPresenceVar = json.main
            let checkPreseneDomain = json.scraper

            //store whether the current has been parsed

            let urlPresenceVariableName = currentTabURL + '-penden-storage'
            let checkPresenceDomainName = currentTabURL + '-penden-storage-domain'

            window.sessionStorage.setItem(urlPresenceVariableName, checkPresenceVar)
            window.sessionStorage.setItem(checkPresenceDomainName, checkPreseneDomain)



        } else {
            //If check-presence is down for example, revert to indexing it everytime (and then possibly gettting rejected by ES)
            let urlPresenceVariableName = currentTabURL + '-penden-storage'
            let checkPresenceDomainName = currentTabURL + '-penden-storage-domain'

            window.sessionStorage.setItem(urlPresenceVariableName, 'false')
            window.sessionStorage.setItem(checkPresenceDomainName, 'false')
        };

    }
    var data = payload
    xhr.send(data);

}
//Run the function everytime a webpage loads. 
checkPresence()

// -----------------------------------------------Functions for Indexing------------------------------------------------------------------------------------

//Generates the XPath which is sent to the endpoint for querying
const getPathTo = (element) => {
    if (element.id !== '')
        return "//*[@id='" + element.id + "']";

    if (element === document.body)
        return element.tagName.toLowerCase();

    var ix = 0;
    var siblings = element.parentNode.childNodes;
    for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];

        if (sibling === element) return getPathTo(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';

        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++;
        }
    }
}

//Prepares the first list searching different HTML elements and extracting text from them if they fulfil some criterias. Returns a 
//list with the phrase, type of element and the raw HTML of the ParentNode.
const prepareListForXpath = (listOfPhrases, listOfElementsToSearch) => {
    let elementsFindXPath = []

    for (let iter in listOfElementsToSearch) {

        let listToKeepTabOnDuplicates = []


        let tempElements = $(listOfElementsToSearch[iter])
        let tempElementsContent = tempElements.contents()


        for (let i = 0; i < tempElementsContent.length; i++) {
            let typeOfElement = listOfElementsToSearch[iter]
            shouldAdd = true
            let superTemp = tempElementsContent[i].textContent
            let isElementVisible = $(tempElementsContent[i].parentNode).css('visibility') !== 'hidden'
            if (superTemp !== undefined && superTemp.length < 200 && superTemp.trim().length > 2 && listToKeepTabOnDuplicates.includes(superTemp) === false) {

                // let interimStore = $(tempElementsContent[i])[0].parentNode.outerHTML 
                let urlOfElement = "null"
                if (typeOfElement === "a" && tempElementsContent[i].parentNode.href !== "#" && tempElementsContent[i].parentNode.href.length > 2) {
                    urlOfElement = tempElementsContent[i].parentNode.href
                    shouldAdd = true
                } else if (isElementVisible === true) {
                    typeOfElement = "span"
                    shouldAdd = false
                }

                if (typeOfElement === "span" || typeOfElement === "button" || typeOfElement === "form") {
                    if (isElementVisible) {
                        shouldAdd = true
                    } else {
                        shouldAdd = false
                    }
                }

                if (shouldAdd) {
                    listToKeepTabOnDuplicates.push(superTemp)
                    elementsFindXPath.push({ "phrase": [superTemp, $(tempElementsContent[i])[0].parentNode, typeOfElement, urlOfElement] })

                }

            }
        }
    }
    return elementsFindXPath


}

//This takes the raw list from the function prepareListForXpath(), generates the XPaths with the function getPathTo(). This is the
//final list that will be sent to index. 
const listOfPreparedPaths = []
const prepareForIndex = (elementsFindXPath) => {

    for (let i = 0; i < elementsFindXPath.length; i++) {

        let phraseCurrent = elementsFindXPath[i].phrase[0]
        let currentXpath = elementsFindXPath[i].phrase[1]
        let typeOfElement = elementsFindXPath[i].phrase[2]
        let urlOfElement = elementsFindXPath[i].phrase[3]

        let pathToCurrent = getPathTo(currentXpath)
        listOfPreparedPaths.push({ "phrase": [phraseCurrent, pathToCurrent, typeOfElement, urlOfElement] })
    }
    return listOfPreparedPaths
}



//This functions sends the request for the indexing.
const sendRequest = (finalPayload, fullOrPartial) => {
    let curURL = window.location.toString()



    const payload = JSON.stringify({ data: finalPayload, url: curURL, is_present: "FALSE", index_name: "test1_index", full_or_partial: fullOrPartial })
    const url = "https://us-central1-ey-project-315506.cloudfunctions.net/semantic-search"
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var json = JSON.parse(xhr.responseText);
            let currentTabURL = window.location.toString()
            let urlPresenceVariableName = currentTabURL + '-penden-storage'
            let checkPresenceDomainName = currentTabURL + '-penden-storage-domain'
            window.sessionStorage.setItem(urlPresenceVariableName, "true")
            window.sessionStorage.setItem(checkPresenceDomainName, "true")

            //DRDM
            if (json.text_list.result === "Success") {
                let msg = {
                    command: "ready-to-search",
                    result: "true"
                }
                chrome.runtime.sendMessage(msg);
                //DRDM
            } else {
                let msg = {
                    command: "ready-to-search",
                    result: "false"
                }
                chrome.runtime.sendMessage(msg);
            }

        };

    }

    var data = payload
    xhr.send(data);
}

const indexData = (fullOrPartial) => {
    let elementsFindXPath = []
    let listOfElementsToSearch = ['a', 'span', 'button', 'form', 'div']
    let initString = document.body.textContent
    let splitString = initString.split('\n')
    let listOfPhrasesPre = splitString.filter((item) => {
        return item.length < 30 //maximum length
            && item.trim().length > 2 //remove empty string + strip to remove spaces
            && item.toLowerCase().indexOf("\t") === -1 //remove JS stuff with /t
    })
    let listOfPhrases = [...new Set(listOfPhrasesPre)];
    elementsFindXPath = prepareListForXpath(listOfPhrases, listOfElementsToSearch) //Step 1 
    let finalPayload = prepareForIndex(elementsFindXPath) //Step 2
    sendRequest(finalPayload, fullOrPartial) //Step 3 
}
// -----------------------------------------------------------------------------------------------------------------------------------


const getElementsByXPath = (xpath, parent) => {
    let results = [];
    let query = document.evaluate(xpath, parent || document,
        null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0, length = query.snapshotLength; i < length; ++i) {
        results.push(query.snapshotItem(i));
    }
    return results;
}

//Main function
const listener = (request, sender, sendResponse) => {
    if (request.command === "show-popup") {
        var iframe = document.createElement('iframe');
        iframe.src = chrome.extension.getURL("popup.html");
        iframe.className = 'css-isolation-popup';

        iframe.frameBorder = 0;
        document.body.appendChild(iframe);

        //Call for index
        let currentTabURL = window.location.toString()
        let finalURL = currentTabURL + '-penden-storage'
        let isPresent = window.sessionStorage.getItem(finalURL)
        if (isPresent === "false") {
            let fullDomain = currentTabURL + '-penden-storage-domain'
            let domainIsPresent = window.sessionStorage.getItem(fullDomain)

            if (domainIsPresent === "false") {
                fullOrPartial = "full"
            } else if (domainIsPresent === "true") {
                fullOrPartial = "partial"
            }
            console.log("fullOrPartial", fullOrPartial)
            indexData(fullOrPartial)
        } else {
            let msg = {
                command: "ready-to-search",
                result: "true"
            }
            chrome.runtime.sendMessage(msg);
        }



    }
    //remove on escape 
    else if (request.command === 'remove-popup') {
        function removeElementsByClass(className) {
            const elements = document.getElementsByClassName(className);
            while (elements.length > 0) {
                elements[0].parentNode.removeChild(elements[0]);
            }
        }

        removeElementsByClass('css-isolation-popup')
    }
    //send URLs from content to popup
    else if (request.command === "send-current-url") {
        let currentTabURL = window.location.toString()

        let msg = {
            command: "current-url-to-popup",

            url: currentTabURL
        }
        chrome.runtime.sendMessage(msg);
    }
    else if (request.command === "focus-element") {
        function removeElementsByClass(className) {
            const elements = document.getElementsByClassName(className);
            while (elements.length > 0) {
                elements[0].parentNode.removeChild(elements[0]);
            }
        }


        let elementComponentBig = getElementsByXPath(request.xpath)
        let elementComponent = elementComponentBig[0]
        elementComponent.setAttribute('tabindex', '-1')

        removeElementsByClass('css-isolation-popup')
        elementComponent.focus()

    } else if (request.command === "store-search-data") {
        let data = request.data
        let searchTerm = request.term
        window.sessionStorage.setItem('penden-current-search-data', data)
        window.sessionStorage.setItem('penden-current-search-term', searchTerm)



    } else if (request.command === "retreieve-search-data") {
        let data = window.sessionStorage.getItem('penden-current-search-data')
        let searchTerm = window.sessionStorage.getItem('penden-current-search-term')
        let msg = {
            command: "search-data-retreived",
            data: data,
            term: searchTerm
        }
        chrome.runtime.sendMessage(msg);
    }
    else if (request.command === "is-index-present") {
        let currentTabURL = window.location.toString()

        let urlPresenceVariableName = currentTabURL + '-penden-storage'
        let checkPresenceDomainName = currentTabURL + '-penden-storage-domain'
        let thisPage = window.sessionStorage.getItem(urlPresenceVariableName)
        let wholeDomain = window.sessionStorage.getItem(checkPresenceDomainName)

        let msg = {
            command: "index-present-is",
            page: thisPage,
            whole: wholeDomain
        }
        chrome.runtime.sendMessage(msg)

    }
}

//Listening to keyevents 
document.addEventListener("keydown", function (zEvent) {
    if (zEvent.ctrlKey && zEvent.altKey && zEvent.key.toUpperCase() === "P") {  // case sensitive
    }
});

chrome.runtime.onMessage.addListener(listener)